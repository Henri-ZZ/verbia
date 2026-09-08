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
