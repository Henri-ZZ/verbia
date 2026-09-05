import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { generateReplyRequestSchema, generateReplyResponseSchema, type ApiError } from "@verbia/shared";
import { BalancedProvider, GeminiProvider, MockProvider, OpenAiCompatibleProvider, type ReplyProvider } from "./provider";

const port = Number(process.env.PORT ?? 8787);
const maxBodyBytes = 48_000;

// Supabase Auth (optional). When configured, a signed-in Bearer token is
// verified against /auth/v1/user and — if ENFORCE_QUOTA=1 with a positive
// FREE_DAILY_QUOTA — consumes one daily reply via the consume_quota RPC.
// Requests without a token keep working anonymously.
const SUPABASE_URL = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";

export const server = createServer(async (request, response) => {
  cors(response);
  if (request.method === "OPTIONS") return end(response, 204);
  if (request.method === "GET" && request.url === "/health") {
    const provider = getProvider();
    return json(response, 200, {
      ok: true,
      provider: provider.id,
      routes: provider instanceof BalancedProvider ? provider.snapshot() : [{ provider: provider.id }]
    });
  }
  if (request.method !== "POST" || request.url !== "/v1/replies:generate") return json(response, 404, { error: "Not found" });

  let requestId = "unknown";
  try {
    const body = await readJson(request, maxBodyBytes);
    const parsed = generateReplyRequestSchema.safeParse(body);
    if (!parsed.success) return apiError(response, 400, requestId, "INVALID_REQUEST", false, "Check the intent and generation settings.");
    requestId = parsed.data.requestId;

    const auth = await verifyBearer(request.headers.authorization);
    if (auth.status === "invalid") return apiError(response, 401, requestId, "UNAUTHENTICATED", false, "Sign-in expired. Sign in again from Verbia settings.");
    if (auth.status === "ok") {
      const quota = await consumeQuota(auth.token);
      if (quota === "exceeded") return apiError(response, 429, requestId, "QUOTA_EXCEEDED", false, "You have used your free daily replies. Try again tomorrow.");
      console.log(`[verbia-api] request ${requestId} user ${auth.userId}${auth.email ? ` (${auth.email})` : ""}`);
    }

    const started = performance.now();
    const provider = getProvider();
    const controller = new AbortController();
    const timeoutMs = numberEnv("LLM_TOTAL_TIMEOUT_MS", numberEnv("LLM_TIMEOUT_MS", 25_000));
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const result = await provider.generate(parsed.data, controller.signal);
      const warnings = [parsed.data.context.confidence === "low" && "low_context_confidence", parsed.data.context.truncated && "context_truncated"].filter(Boolean) as Array<"low_context_confidence" | "context_truncated">;
      const value = generateReplyResponseSchema.parse({ requestId, draft: cleanDraft(result.draft), warnings, modelRoute: result.modelRoute ?? "baseline", usage: result.inputTokens || result.outputTokens ? { inputTokens: result.inputTokens, outputTokens: result.outputTokens } : undefined, latencyMs: Math.round(performance.now() - started) });
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

let providerInstance: ReplyProvider | undefined;
function getProvider(): ReplyProvider { return providerInstance ??= createProvider(); }

export function createProvider(): ReplyProvider {
  const name = process.env.LLM_PROVIDER ?? "mock";
  if (name === "mock") return new MockProvider();
  const providers = configuredProviders();
  if (name === "auto") {
    return new BalancedProvider(
      orderedProviders(providers).map(provider => ({ provider, weight: providerWeight(provider.id) })),
      numberEnv("LLM_ATTEMPT_TIMEOUT_MS", 9_000),
      numberEnv("LLM_COOLDOWN_MS", 30_000)
    );
  }
  const provider = providers.get(name);
  if (!provider) throw new Error(`NOT_CONFIGURED: missing or unsupported provider ${name}`);
  return provider;
}

function configuredProviders(): Map<string, ReplyProvider> {
  const providers = new Map<string, ReplyProvider>();
  const maxOutputTokens = numberEnv("LLM_MAX_OUTPUT_TOKENS", 384);
  const temperature = numberEnv("LLM_TEMPERATURE", 0.45);
  const geminiModel = process.env.GEMINI_MODEL ?? process.env.LLM_MODEL_BASELINE;
  if (process.env.GEMINI_API_KEY && geminiModel) {
    providers.set("gemini", new GeminiProvider(process.env.GEMINI_API_KEY, geminiModel, maxOutputTokens, temperature));
  }
  if (process.env.MISTRAL_API_KEY && process.env.MISTRAL_MODEL) {
    providers.set("mistral", new OpenAiCompatibleProvider({
      id: "mistral", apiKey: process.env.MISTRAL_API_KEY, model: process.env.MISTRAL_MODEL,
      endpoint: "https://api.mistral.ai/v1/chat/completions", maxOutputTokens, temperature
    }));
  }
  if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_MODEL) {
    providers.set("cloudflare", new OpenAiCompatibleProvider({
      id: "cloudflare", apiKey: process.env.CLOUDFLARE_API_TOKEN, model: process.env.CLOUDFLARE_MODEL,
      endpoint: `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(process.env.CLOUDFLARE_ACCOUNT_ID)}/ai/v1/chat/completions`,
      maxOutputTokens: numberEnv("CLOUDFLARE_MAX_OUTPUT_TOKENS", Math.max(maxOutputTokens, 768)), temperature
    }));
  }
  if (process.env.GROQ_API_KEY && process.env.GROQ_MODEL) {
    providers.set("groq", new OpenAiCompatibleProvider({
      id: "groq", apiKey: process.env.GROQ_API_KEY, model: process.env.GROQ_MODEL,
      endpoint: "https://api.groq.com/openai/v1/chat/completions", maxOutputTokens, temperature,
      reasoningEffort: process.env.GROQ_REASONING_EFFORT ?? "none"
    }));
  }
  return providers;
}

function orderedProviders(providers: Map<string, ReplyProvider>): ReplyProvider[] {
  const requested = (process.env.LLM_PROVIDER_ORDER ?? "gemini,mistral,cloudflare,groq").split(",").map(value => value.trim()).filter(Boolean);
  const unique = [...new Set(requested)];
  return unique.map(id => providers.get(id)).filter((provider): provider is ReplyProvider => Boolean(provider));
}

function providerWeight(id: string): number {
  const values = Object.fromEntries((process.env.LLM_PROVIDER_WEIGHTS ?? "").split(",").map(item => item.split(":", 2).map(value => value.trim())).filter(parts => parts.length === 2));
  const weight = Number(values[id]);
  return Number.isFinite(weight) && weight > 0 ? weight : 1;
}

async function readJson(request: IncomingMessage, limit: number) {
  const chunks: Buffer[] = []; let size = 0;
  for await (const chunk of request) { size += chunk.length; if (size > limit) throw Object.assign(new Error("too large"), { code: "TOO_LARGE" }); chunks.push(chunk); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
function cleanDraft(value: string) { return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, 8_000); }
function cors(response: ServerResponse) { response.setHeader("access-control-allow-origin", "*"); response.setHeader("access-control-allow-headers", "content-type, authorization"); response.setHeader("access-control-allow-methods", "POST,GET,OPTIONS"); response.setHeader("cache-control", "no-store"); response.setHeader("x-content-type-options", "nosniff"); }
function json(response: ServerResponse, status: number, body: unknown) { response.writeHead(status, { "content-type": "application/json; charset=utf-8" }); response.end(JSON.stringify(body)); }
function end(response: ServerResponse, status: number) { response.writeHead(status); response.end(); }
function apiError(response: ServerResponse, status: number, requestId: string, code: ApiError["code"], retryable: boolean, userMessage: string, detail?: string) { return json(response, status, { requestId, code, retryable, userMessage, detail } satisfies ApiError); }
function numberEnv(name: string, fallback: number) { const value = Number(process.env[name]); return Number.isFinite(value) ? value : fallback; }

type BearerResult = { status: "none" | "invalid" } | { status: "ok"; userId: string; email?: string; token: string };

// Verifies a signed-in token against Supabase. "none" means the request is
// anonymous (or auth is unconfigured) and continues without attribution;
// "invalid" means the token was rejected by Supabase and the client should
// sign in again (the extension clears the session before this normally happens).
async function verifyBearer(header: string | string[] | undefined): Promise<BearerResult> {
  const value = Array.isArray(header) ? header[0] : header;
  if (!value?.startsWith("Bearer ")) return { status: "none" };
  const token = value.slice("Bearer ".length).trim();
  if (!token) return { status: "none" };
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("[verbia-api] Authorization header sent but SUPABASE_URL/SUPABASE_ANON_KEY are not set — ignoring");
    return { status: "none" };
  }
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, authorization: `Bearer ${token}` }
    });
    if (response.status === 200) {
      const user = (await response.json()) as { id?: string; email?: string };
      if (!user.id) return { status: "invalid" };
      return { status: "ok", userId: user.id, email: user.email, token };
    }
    if (response.status === 401 || response.status === 403) return { status: "invalid" };
    console.warn(`[verbia-api] token verification returned ${response.status}`);
    return { status: "none" };
  } catch (error) {
    console.warn("[verbia-api] token verification failed (network?)", error);
    return { status: "none" };
  }
}

// Optionally consumes one daily reply for the signed-in user. Enabled only by
// ENFORCE_QUOTA=1 with a positive FREE_DAILY_QUOTA; quota overflows surface
// as QUOTA_EXCEEDED from the security-definer consume_quota RPC.
async function consumeQuota(token: string): Promise<"ok" | "skipped" | "exceeded"> {
  const enforce = process.env.ENFORCE_QUOTA === "1";
  const limit = numberEnv("FREE_DAILY_QUOTA", 0);
  if (!enforce || limit <= 0 || !SUPABASE_URL || !SUPABASE_ANON_KEY) return "skipped";
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/consume_quota`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ p_limit: limit })
    });
    if (response.ok) return "ok";
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    if (body?.message?.includes("QUOTA_EXCEEDED")) return "exceeded";
    // Any other RPC failure must not block drafting — log and carry on.
    console.warn(`[verbia-api] consume_quota failed (${response.status})`, body?.message ?? "");
    return "ok";
  } catch (error) {
    console.warn("[verbia-api] consume_quota request failed (network?)", error);
    return "ok";
  }
}

if (process.env.NODE_ENV !== "test") server.listen(port, "127.0.0.1", () => console.log(`Verbia API listening on http://127.0.0.1:${port}`));
