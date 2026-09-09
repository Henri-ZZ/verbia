import { afterEach, describe, expect, it, vi } from "vitest";
import { createApiHandler } from "../services/api/src/app";

const handler = createApiHandler({ LLM_PROVIDER: "mock" });
const validRequest = {
  requestId: "11111111-1111-4111-8111-111111111111",
  schemaVersion: "1",
  platform: "universal",
  page: { urlOrigin: "https://example.com", locale: "en" },
  context: { relation: "none", truncated: false, extractorVersion: "test", confidence: "high" },
  intent: { text: "Politely decline the meeting.", source: "typed" },
  output: { language: "en", tone: "polite", length: "short" },
  client: { extensionVersion: "0.1.0", adapterVersion: "test" }
};

describe("API fetch handler", () => {
  afterEach(() => vi.restoreAllMocks());
  it("reports provider health", async () => {
    const response = await handler(new Request("https://api.verbia.henriz.dev/health"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, provider: "mock" });
  });

  it("generates a validated reply", async () => {
    const response = await handler(new Request("https://api.verbia.henriz.dev/v1/replies:generate", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(validRequest)
    }));
    expect(response.status).toBe(200);
    expect(response.headers.get("server-timing")).toMatch(/model;dur=/);
    expect(await response.json()).toMatchObject({ requestId: validRequest.requestId, draft: validRequest.intent.text, modelRoute: "baseline" });
  });

  it("rejects malformed and oversized bodies", async () => {
    const malformed = await handler(new Request("https://api.verbia.henriz.dev/v1/replies:generate", { method: "POST", body: "{" }));
    expect(malformed.status).toBe(400);
    const oversized = await handler(new Request("https://api.verbia.henriz.dev/v1/replies:generate", { method: "POST", body: "x".repeat(48_001) }));
    expect(oversized.status).toBe(413);
  });

  it("requires authentication for account usage", async () => {
    const response = await handler(new Request("https://api.verbia.henriz.dev/v1/account/usage"));
    expect(response.status).toBe(401);
  });

  it("requires a verified user and server secret for session handoff", async () => {
    const unauthenticated = await handler(new Request("https://api.verbia.henriz.dev/v1/auth/session-handoff", { method: "POST" }));
    expect(unauthenticated.status).toBe(401);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ id: "user-1", email: "user@example.com" }));
    const handoffHandler = createApiHandler({
      LLM_PROVIDER: "mock",
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_PUBLISHABLE_KEY: "public-key"
    });
    const unconfigured = await handoffHandler(new Request("https://api.verbia.henriz.dev/v1/auth/session-handoff", {
      method: "POST", headers: { authorization: "Bearer website-token" }
    }));
    expect(unconfigured.status).toBe(503);
  });

  it("creates a one-time handoff token for the verified user", async () => {
    const upstream = vi.spyOn(globalThis, "fetch").mockImplementation(async input => {
      const url = String(input);
      if (url.includes("/auth/v1/user")) return Response.json({ id: "user-2", email: "verified@example.com" });
      if (url.includes("/auth/v1/admin/generate_link")) return Response.json({ id: "user-2", email: "verified@example.com", hashed_token: "one-time-token", action_link: "", email_otp: "", redirect_to: "", verification_type: "magiclink" });
      return new Response(null, { status: 404 });
    });
    const handoffHandler = createApiHandler({
      LLM_PROVIDER: "mock",
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_PUBLISHABLE_KEY: "public-key",
      SUPABASE_SERVICE_ROLE_KEY: "sb_secret_server-key"
    });
    const response = await handoffHandler(new Request("https://api.verbia.henriz.dev/v1/auth/session-handoff", {
      method: "POST", headers: { authorization: "Bearer second-website-token" }
    }));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ tokenHash: "one-time-token" });
    const generateCall = upstream.mock.calls.find(([input]) => String(input).includes("/auth/v1/admin/generate_link"));
    expect(generateCall).toBeDefined();
    expect(JSON.parse(String(generateCall?.[1]?.body))).toMatchObject({ type: "magiclink", email: "verified@example.com" });
  });

  it("requires authentication and server configuration for checkout", async () => {
    const unauthenticated = await handler(new Request("https://api.verbia.henriz.dev/v1/billing/checkout", { method: "POST", body: "{}" }));
    expect(unauthenticated.status).toBe(401);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ id: "user-1", email: "user@example.com" }));
    const unconfigured = await createApiHandler({
      LLM_PROVIDER: "mock",
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_PUBLISHABLE_KEY: "public-key"
    })(new Request("https://api.verbia.henriz.dev/v1/billing/checkout", { method: "POST", headers: { authorization: "Bearer valid-token" }, body: "{}" }));
    expect(unconfigured.status).toBe(503);
  });

  it("rejects unsigned billing webhooks", async () => {
    const response = await handler(new Request("https://api.verbia.henriz.dev/v1/billing/webhook", { method: "POST", body: "{}" }));
    expect(response.status).toBe(401);
  });

  it("validates feedback and reports missing storage configuration", async () => {
    const empty = await handler(new Request("https://api.verbia.henriz.dev/v1/feedback", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: "website", category: "suggestion", message: "", locale: "en" })
    }));
    expect(empty.status).toBe(400);

    const unconfigured = await handler(new Request("https://api.verbia.henriz.dev/v1/feedback", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: "website", category: "suggestion", message: "Add Firefox support", locale: "en" })
    }));
    expect(unconfigured.status).toBe(503);
  });

  it("stores feedback without an unapproved contact email", async () => {
    const request = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 204 }));
    const feedbackHandler = createApiHandler({
      LLM_PROVIDER: "mock",
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "sb_secret_test-key",
      FEEDBACK_HASH_SALT: "test-only-salt"
    });
    const response = await feedbackHandler(new Request("https://api.verbia.henriz.dev/v1/feedback", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.10" },
      body: JSON.stringify({ source: "uninstall", category: "uninstall", reason: "not_working", message: "The panel did not open", contactEmail: "person@example.com", allowContact: false, locale: "en", extensionVersion: "0.1.0" })
    }));
    expect(response.status).toBe(201);
    const call = request.mock.calls[0];
    expect(call).toBeDefined();
    const [input, init] = call!;
    expect(String(input)).toContain("/rest/v1/rpc/submit_feedback");
    expect(JSON.parse(String(init?.body))).toMatchObject({ p_contact_email: null, p_allow_contact: false, p_reason: "not_working" });
    expect(new Headers(init?.headers).get("apikey")).toBe("sb_secret_test-key");
    expect(new Headers(init?.headers).has("authorization")).toBe(false);
  });

  it("does not trust a client-editable profile plan", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async input => {
      const url = String(input);
      if (url.includes("/auth/v1/user")) return Response.json({ id: "user-1", email: "user@example.com" });
      if (url.includes("/rest/v1/profiles")) return Response.json([{ plan: "premium" }]);
      if (url.includes("/rest/v1/quota_usage")) return Response.json([{ count: 4 }]);
      return new Response(null, { status: 404 });
    });
    const accountHandler = createApiHandler({
      LLM_PROVIDER: "mock",
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_PUBLISHABLE_KEY: "public-key",
      FREE_DAILY_QUOTA: "10",
      PREMIUM_DAILY_QUOTA: "100"
    });
    const response = await accountHandler(new Request("https://api.verbia.henriz.dev/v1/account/usage", {
      headers: { authorization: "Bearer valid-token" }
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ plan: "free", used: 4, limit: 10 });
  });
});
