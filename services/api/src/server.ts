import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { generateReplyRequestSchema, generateReplyResponseSchema, type ApiError } from "@verbia/shared";
import { GeminiProvider, MockProvider, type ReplyProvider } from "./provider";

const port = Number(process.env.PORT ?? 8787);
const maxBodyBytes = 48_000;

export const server = createServer(async (request, response) => {
  cors(response);
  if (request.method === "OPTIONS") return end(response, 204);
  if (request.method === "GET" && request.url === "/health") return json(response, 200, { ok: true, provider: process.env.LLM_PROVIDER ?? "mock" });
  if (request.method !== "POST" || request.url !== "/v1/replies:generate") return json(response, 404, { error: "Not found" });

  let requestId = "unknown";
  try {
    const body = await readJson(request, maxBodyBytes);
    const parsed = generateReplyRequestSchema.safeParse(body);
    if (!parsed.success) return apiError(response, 400, requestId, "INVALID_REQUEST", false, "Check the intent and generation settings.");
    requestId = parsed.data.requestId;
    const started = performance.now();
    const provider = createProvider();
    const controller = new AbortController();
    const timeoutMs = numberEnv("LLM_TIMEOUT_MS", 12_000);
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const result = await provider.generate(parsed.data, controller.signal);
      const warnings = [parsed.data.context.confidence === "low" && "low_context_confidence", parsed.data.context.truncated && "context_truncated"].filter(Boolean) as Array<"low_context_confidence" | "context_truncated">;
      const value = generateReplyResponseSchema.parse({ requestId, draft: cleanDraft(result.draft), warnings, modelRoute: "baseline", usage: result.inputTokens || result.outputTokens ? { inputTokens: result.inputTokens, outputTokens: result.outputTokens } : undefined, latencyMs: Math.round(performance.now() - started) });
      return json(response, 200, value);
    } finally { clearTimeout(timer); }
  } catch (error) {
    const err = error as { code?: string; status?: number; detail?: string; name?: string; message?: string };
    // Always log the real failure server-side; the client only ever sees the
    // sanitised userMessage below.
    console.error(`[verbia-api] request ${requestId} failed:`, err);
    if (err.code === "TOO_LARGE") return apiError(response, 413, requestId, "TOO_LARGE", false, "The context or intent is too large.");
    if (err.name === "AbortError") return apiError(response, 504, requestId, "TIMEOUT", true, "Generation timed out. Try again.");
    if (err.status === 429) return apiError(response, 429, requestId, "RATE_LIMITED", true, "The model is busy or quota-limited. Try again shortly.", err.detail);
    const notConfigured = err.message?.startsWith("NOT_CONFIGURED");
    return apiError(response, notConfigured ? 503 : 502, requestId, notConfigured ? "NOT_CONFIGURED" : "PROVIDER_ERROR", !notConfigured, notConfigured ? "Generation service is not configured. Open Verbia settings." : "The model service returned an invalid response. Try again.", notConfigured ? undefined : (err.detail ?? err.message));
  }
});

function createProvider(): ReplyProvider {
  const name = process.env.LLM_PROVIDER ?? "mock";
  if (name === "mock") return new MockProvider();
  if (name !== "gemini") throw new Error("NOT_CONFIGURED: unsupported provider");
  const key = process.env.GEMINI_API_KEY; const model = process.env.LLM_MODEL_BASELINE;
  if (!key || !model) throw new Error("NOT_CONFIGURED: missing Gemini configuration");
  return new GeminiProvider(key, model, numberEnv("LLM_MAX_OUTPUT_TOKENS", 384), numberEnv("LLM_TEMPERATURE", 0.45));
}

async function readJson(request: IncomingMessage, limit: number) {
  const chunks: Buffer[] = []; let size = 0;
  for await (const chunk of request) { size += chunk.length; if (size > limit) throw Object.assign(new Error("too large"), { code: "TOO_LARGE" }); chunks.push(chunk); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
function cleanDraft(value: string) { return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, 8_000); }
function cors(response: ServerResponse) { response.setHeader("access-control-allow-origin", "*"); response.setHeader("access-control-allow-headers", "content-type"); response.setHeader("access-control-allow-methods", "POST,GET,OPTIONS"); response.setHeader("cache-control", "no-store"); response.setHeader("x-content-type-options", "nosniff"); }
function json(response: ServerResponse, status: number, body: unknown) { response.writeHead(status, { "content-type": "application/json; charset=utf-8" }); response.end(JSON.stringify(body)); }
function end(response: ServerResponse, status: number) { response.writeHead(status); response.end(); }
function apiError(response: ServerResponse, status: number, requestId: string, code: ApiError["code"], retryable: boolean, userMessage: string, detail?: string) { return json(response, status, { requestId, code, retryable, userMessage, detail } satisfies ApiError); }
function numberEnv(name: string, fallback: number) { const value = Number(process.env[name]); return Number.isFinite(value) ? value : fallback; }

if (process.env.NODE_ENV !== "test") server.listen(port, "127.0.0.1", () => console.log(`Verbia API listening on http://127.0.0.1:${port}`));
