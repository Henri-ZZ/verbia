import { describe, expect, it } from "vitest";
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
    expect(await response.json()).toMatchObject({ requestId: validRequest.requestId, draft: validRequest.intent.text, modelRoute: "baseline" });
  });

  it("rejects malformed and oversized bodies", async () => {
    const malformed = await handler(new Request("https://api.verbia.henriz.dev/v1/replies:generate", { method: "POST", body: "{" }));
    expect(malformed.status).toBe(400);
    const oversized = await handler(new Request("https://api.verbia.henriz.dev/v1/replies:generate", { method: "POST", body: "x".repeat(48_001) }));
    expect(oversized.status).toBe(413);
  });
});
