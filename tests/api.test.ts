import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { exportJWK, generateKeyPair, SignJWT, type JWK } from "jose";
import { createApiHandler } from "../services/api/src/app";

let privateKey: CryptoKey;
let publicJwk: JWK;

beforeAll(async () => {
  const pair = await generateKeyPair("ES256");
  privateKey = pair.privateKey;
  publicJwk = { ...(await exportJWK(pair.publicKey)), alg: "ES256", kid: "test-key", use: "sig" };
});

afterAll(() => vi.restoreAllMocks());

async function userToken(projectUrl: string, userId: string, email: string) {
  return new SignJWT({ email, role: "authenticated" })
    .setProtectedHeader({ alg: "ES256", kid: "test-key" })
    .setSubject(userId)
    .setIssuer(`${projectUrl}/auth/v1`)
    .setAudience("authenticated")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(privateKey);
}

function jwksResponse() { return Response.json({ keys: [publicJwk] }); }

const handler = createApiHandler({ LLM_PROVIDER: "mock" });
const validExtraction = {
  requestId: "22222222-2222-4222-8222-222222222222",
  schemaVersion: "1",
  trigger: "explicit_user_click",
  platform: "qqmail",
  page: { urlOrigin: "https://wx.mail.qq.com" },
  collected: { text: "Your invoice is overdue and the account will be suspended tomorrow.", truncated: false, nodeCount: 3 },
  client: { extensionVersion: "0.1.4", collectorVersion: "1.0.0" }
};
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

  it("determines plan and consumes quota with one Supabase RPC before generation", async () => {
    const projectUrl = "https://generate-quota.supabase.co";
    const upstream = vi.spyOn(globalThis, "fetch").mockImplementation(async input => {
      const url = String(input);
      if (url.includes("/.well-known/jwks.json")) return jwksResponse();
      if (url.includes("/rest/v1/rpc/consume_generation_quota")) return Response.json({ plan: "premium", remaining: 99 });
      return new Response(null, { status: 404 });
    });
    const generateHandler = createApiHandler({
      LLM_PROVIDER: "mock",
      SUPABASE_URL: projectUrl,
      SUPABASE_PUBLISHABLE_KEY: "public-key",
      AUTH_REQUIRED: "1",
      ENFORCE_QUOTA: "1",
      FREE_DAILY_QUOTA: "10",
      PREMIUM_DAILY_QUOTA: "100"
    });
    const token = await userToken(projectUrl, "11111111-1111-4111-8111-111111111111", "user@example.com");
    const response = await generateHandler(new Request("https://api.verbia.henriz.dev/v1/replies:generate", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(validRequest)
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("server-timing")).toMatch(/auth;dur=.*quota;dur=.*model;dur=/);
    expect(response.headers.get("server-timing")).not.toContain("plan;dur=");
    const urls = upstream.mock.calls.map(([input]) => String(input));
    expect(urls.filter(url => url.includes("/rest/v1/"))).toEqual([`${projectUrl}/rest/v1/rpc/consume_generation_quota`]);
    const quotaCall = upstream.mock.calls.find(([input]) => String(input).includes("consume_generation_quota"));
    expect(JSON.parse(String(quotaCall?.[1]?.body))).toEqual({ p_free_limit: 10, p_premium_limit: 100 });
  });

  it("does not call a model after the combined quota RPC rejects the request", async () => {
    const projectUrl = "https://generate-exceeded.supabase.co";
    const upstream = vi.spyOn(globalThis, "fetch").mockImplementation(async input => {
      const url = String(input);
      if (url.includes("/.well-known/jwks.json")) return jwksResponse();
      if (url.includes("/rest/v1/rpc/consume_generation_quota")) return Response.json({ message: "QUOTA_EXCEEDED" }, { status: 400 });
      return new Response(null, { status: 404 });
    });
    const generateHandler = createApiHandler({
      LLM_PROVIDER: "mock",
      SUPABASE_URL: projectUrl,
      SUPABASE_PUBLISHABLE_KEY: "public-key",
      AUTH_REQUIRED: "1",
      ENFORCE_QUOTA: "1"
    });
    const token = await userToken(projectUrl, "11111111-1111-4111-8111-111111111111", "user@example.com");
    const response = await generateHandler(new Request("https://api.verbia.henriz.dev/v1/replies:generate", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(validRequest)
    }));

    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ code: "QUOTA_EXCEEDED" });
    expect(upstream).toHaveBeenCalledTimes(2);
  });

  it("still drafts, but flags the quota as unavailable, when the database lacks the quota function", async () => {
    const projectUrl = "https://quota-schema-missing.supabase.co";
    const logs = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const warnings = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const upstream = vi.spyOn(globalThis, "fetch").mockImplementation(async input => {
      const url = String(input);
      if (url.includes("/.well-known/jwks.json")) return jwksResponse();
      // Exactly what PostgREST answers when a database is still on an older
      // docs/supabase-schema.sql: the RPC was never created.
      if (url.includes("/rest/v1/rpc/consume_generation_quota")) {
        return Response.json({ code: "PGRST202", message: "Could not find the function public.consume_generation_quota" }, { status: 404 });
      }
      return new Response(null, { status: 404 });
    });
    const generateHandler = createApiHandler({
      LLM_PROVIDER: "mock",
      SUPABASE_URL: projectUrl,
      SUPABASE_PUBLISHABLE_KEY: "public-key",
      AUTH_REQUIRED: "1",
      ENFORCE_QUOTA: "1"
    });
    const token = await userToken(projectUrl, "11111111-1111-4111-8111-111111111111", "user@example.com");
    const response = await generateHandler(new Request("https://api.verbia.henriz.dev/v1/replies:generate", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(validRequest)
    }));

    // Infrastructure never blocks a draft...
    expect(response.status).toBe(200);
    expect(upstream).toHaveBeenCalled();
    // ...but it is never silent either: the operator gets a named cause on the
    // request log instead of a reply that quietly was not counted.
    expect(warnings).toHaveBeenCalledWith(expect.stringContaining("consume_generation_quota is missing"));
    const requestLog = logs.mock.calls.map(([line]) => String(line)).find(line => line.includes('"event":"api_request"'));
    expect(JSON.parse(requestLog ?? "{}")).toMatchObject({ quota: "unavailable" });
  });

  it("identifies the context of a collected region", async () => {
    const response = await handler(new Request("https://api.verbia.henriz.dev/v1/context:extract", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(validExtraction)
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      requestId: validExtraction.requestId,
      task: "reply",
      currentMessage: validExtraction.collected.text,
      previousMessages: [],
      confidence: 0.9,
      validation: { grounded: true, warnings: [] }
    });
  });

  // The server-side half of the explicit-click gate: a request that did not come
  // from the button is refused before a model is paid for.
  it("refuses an identification that did not come from the button", async () => {
    const response = await handler(new Request("https://api.verbia.henriz.dev/v1/context:extract", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...validExtraction, trigger: "adapter_error" })
    }));
    expect(response.status).toBe(400);
  });

  // Each identification is a model call, so it spends the same daily counter a
  // reply does — one press, one entry.
  it("spends the same daily counter before identifying", async () => {
    const projectUrl = "https://identify-quota.supabase.co";
    const upstream = vi.spyOn(globalThis, "fetch").mockImplementation(async input => {
      const url = String(input);
      if (url.includes("/.well-known/jwks.json")) return jwksResponse();
      if (url.includes("/rest/v1/rpc/consume_generation_quota")) return Response.json({ plan: "premium", remaining: 98 });
      return new Response(null, { status: 404 });
    });
    const extractHandler = createApiHandler({
      LLM_PROVIDER: "mock",
      SUPABASE_URL: projectUrl,
      SUPABASE_PUBLISHABLE_KEY: "public-key",
      AUTH_REQUIRED: "1",
      ENFORCE_QUOTA: "1",
      FREE_DAILY_QUOTA: "10",
      PREMIUM_DAILY_QUOTA: "100"
    });
    const token = await userToken(projectUrl, "11111111-1111-4111-8111-111111111111", "user@example.com");
    const response = await extractHandler(new Request("https://api.verbia.henriz.dev/v1/context:extract", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(validExtraction)
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("server-timing")).toMatch(/auth;dur=.*quota;dur=.*model;dur=/);
    const quotaCall = upstream.mock.calls.find(([input]) => String(input).includes("consume_generation_quota"));
    expect(JSON.parse(String(quotaCall?.[1]?.body))).toEqual({ p_free_limit: 10, p_premium_limit: 100 });
  });

  it("identifies nothing once the daily counter is spent", async () => {
    const projectUrl = "https://identify-exceeded.supabase.co";
    const upstream = vi.spyOn(globalThis, "fetch").mockImplementation(async input => {
      const url = String(input);
      if (url.includes("/.well-known/jwks.json")) return jwksResponse();
      if (url.includes("/rest/v1/rpc/consume_generation_quota")) return Response.json({ message: "QUOTA_EXCEEDED" }, { status: 400 });
      return new Response(null, { status: 404 });
    });
    const extractHandler = createApiHandler({
      LLM_PROVIDER: "mock",
      SUPABASE_URL: projectUrl,
      SUPABASE_PUBLISHABLE_KEY: "public-key",
      AUTH_REQUIRED: "1",
      ENFORCE_QUOTA: "1"
    });
    const token = await userToken(projectUrl, "11111111-1111-4111-8111-111111111111", "user@example.com");
    const response = await extractHandler(new Request("https://api.verbia.henriz.dev/v1/context:extract", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(validExtraction)
    }));

    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ code: "QUOTA_EXCEEDED" });
    // jwks + the quota RPC: no model was paid for.
    expect(upstream).toHaveBeenCalledTimes(2);
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

    const projectUrl = "https://handoff-unconfigured.supabase.co";
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jwksResponse());
    const handoffHandler = createApiHandler({
      LLM_PROVIDER: "mock",
      SUPABASE_URL: projectUrl,
      SUPABASE_PUBLISHABLE_KEY: "public-key"
    });
    const token = await userToken(projectUrl, "11111111-1111-4111-8111-111111111111", "user@example.com");
    const unconfigured = await handoffHandler(new Request("https://api.verbia.henriz.dev/v1/auth/session-handoff", {
      method: "POST", headers: { authorization: `Bearer ${token}` }
    }));
    expect(unconfigured.status).toBe(503);
  });

  it("creates a one-time handoff token for the verified user", async () => {
    const projectUrl = "https://handoff-success.supabase.co";
    const upstream = vi.spyOn(globalThis, "fetch").mockImplementation(async input => {
      const url = String(input);
      if (url.includes("/.well-known/jwks.json")) return jwksResponse();
      if (url.includes("/auth/v1/admin/generate_link")) return Response.json({ id: "user-2", email: "verified@example.com", hashed_token: "one-time-token", action_link: "", email_otp: "", redirect_to: "", verification_type: "magiclink" });
      return new Response(null, { status: 404 });
    });
    const handoffHandler = createApiHandler({
      LLM_PROVIDER: "mock",
      SUPABASE_URL: projectUrl,
      SUPABASE_PUBLISHABLE_KEY: "public-key",
      SUPABASE_SERVICE_ROLE_KEY: "sb_secret_server-key"
    });
    const token = await userToken(projectUrl, "user-2", "verified@example.com");
    const response = await handoffHandler(new Request("https://api.verbia.henriz.dev/v1/auth/session-handoff", {
      method: "POST", headers: { authorization: `Bearer ${token}` }
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
    const projectUrl = "https://checkout.supabase.co";
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jwksResponse());
    const token = await userToken(projectUrl, "11111111-1111-4111-8111-111111111111", "user@example.com");
    const unconfigured = await createApiHandler({
      LLM_PROVIDER: "mock",
      SUPABASE_URL: projectUrl,
      SUPABASE_PUBLISHABLE_KEY: "public-key"
    })(new Request("https://api.verbia.henriz.dev/v1/billing/checkout", { method: "POST", headers: { authorization: `Bearer ${token}` }, body: "{}" }));
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

  it("reads the server-managed profile plan without querying Waffo", async () => {
    const projectUrl = "https://account-usage.supabase.co";
    vi.spyOn(globalThis, "fetch").mockImplementation(async input => {
      const url = String(input);
      if (url.includes("/.well-known/jwks.json")) return jwksResponse();
      if (url.includes("/rest/v1/profiles")) return Response.json([{ plan: "premium" }]);
      if (url.includes("/rest/v1/quota_usage")) return Response.json([{ count: 4 }]);
      return new Response(null, { status: 404 });
    });
    const accountHandler = createApiHandler({
      LLM_PROVIDER: "mock",
      SUPABASE_URL: projectUrl,
      SUPABASE_PUBLISHABLE_KEY: "public-key",
      FREE_DAILY_QUOTA: "10",
      PREMIUM_DAILY_QUOTA: "100"
    });
    const token = await userToken(projectUrl, "user-1", "user@example.com");
    const response = await accountHandler(new Request("https://api.verbia.henriz.dev/v1/account/usage", {
      headers: { authorization: `Bearer ${token}` }
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ plan: "premium", used: 4, limit: 100 });
  });
});
