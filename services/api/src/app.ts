import { generateReplyRequestSchema, generateReplyResponseSchema, type AccountUsage, type ApiError } from "@verbia/shared";
import { BalancedProvider, GeminiProvider, MockProvider, OpenAiCompatibleProvider, type ReplyProvider } from "./provider";
import { billingConfigured, createCheckout, hasActiveProSubscription, verifyBillingWebhook, type BillingCycle } from "./billing";
import { reportError } from "./monitoring";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

export type ApiEnv = Record<string, string | undefined>;
const maxBodyBytes = 48_000;
const responseHeaders = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type, authorization", "access-control-allow-methods": "POST,GET,OPTIONS", "access-control-expose-headers": "server-timing", "cache-control": "no-store", "x-content-type-options": "nosniff" };

export function createApiHandler(env: ApiEnv) {
  let providerInstance: ReplyProvider | undefined;
  const getProvider = () => providerInstance ??= createProvider(env);
  return async (request: Request): Promise<Response> => {
    const path = new URL(request.url).pathname;
    const requestStarted = performance.now();
    let logRequestId: string | undefined;
    let logProvider: string | undefined;
    let logModelRoute: string | undefined;
    let response: Response | undefined;
    try {
      response = await (async (): Promise<Response> => {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: responseHeaders });
    if (request.method === "GET" && path === "/health") {
      try {
        const provider = getProvider();
        return json(200, { ok: true, provider: provider.id, routes: provider instanceof BalancedProvider ? provider.snapshot() : [{ provider: provider.id }] });
      } catch (error) {
        console.error("[verbia-api] health check failed:", error);
        reportError(error, "health");
        return json(503, { ok: false, error: "Generation service is not configured" });
      }
    }
    if (request.method === "GET" && path === "/v1/account/usage") {
      const timings: TimingMetric[] = [];
      const auth = await measure("auth", timings, () => verifyBearer(request.headers.get("authorization"), env));
      if (auth.status !== "ok") return apiError(401, "account-usage", "UNAUTHENTICATED", false, "Sign in from Verbia settings to view usage.");
      try {
        return withServerTiming(json(200, await readAccountUsage(auth, env, timings)), timings);
      } catch (error) {
        console.error("[verbia-api] account usage failed:", error);
        reportError(error, "account_usage");
        return apiError(502, "account-usage", "PROVIDER_ERROR", true, "Account usage is temporarily unavailable.");
      }
    }
    if (request.method === "POST" && path === "/v1/billing/checkout") {
      const timings: TimingMetric[] = [];
      const auth = await measure("auth", timings, () => verifyBearer(request.headers.get("authorization"), env));
      if (auth.status !== "ok") return apiError(401, "billing-checkout", "UNAUTHENTICATED", false, "Sign in before choosing Verbia Premium.");
      if (!billingConfigured(env)) return apiError(503, "billing-checkout", "NOT_CONFIGURED", false, "Billing is temporarily unavailable.");
      try {
        const body = await readJson(request, 2_000) as { cycle?: BillingCycle; locale?: string };
        const cycle = body.cycle === "annual" ? "annual" : "monthly";
        return json(200, await createCheckout(auth, cycle, body.locale ?? "en", env));
      } catch (error) {
        console.error("[verbia-api] checkout creation failed", error);
        reportError(error, "billing_checkout");
        return apiError(502, "billing-checkout", "PROVIDER_ERROR", true, "Checkout is temporarily unavailable. Try again.");
      }
    }
    if (request.method === "POST" && path === "/v1/billing/webhook") {
      try {
        const rawBody = await request.text();
        const event = verifyBillingWebhook(rawBody, request.headers.get("x-waffo-signature"), env);
        console.log(`[verbia-api] verified Waffo webhook ${event.id} ${event.eventType}`);
        return new Response("OK", { status: 200, headers: responseHeaders });
      } catch (error) {
        console.warn("[verbia-api] rejected Waffo webhook", error);
        return new Response("Invalid signature", { status: 401, headers: responseHeaders });
      }
    }
    if (request.method === "POST" && path === "/v1/feedback") {
      try {
        const parsed = feedbackSchema.safeParse(await readJson(request, 8_000));
        if (!parsed.success) return json(400, { error: "Check the feedback form and try again." });
        // Honeypot submissions receive a normal response so automated senders
        // cannot use the endpoint response to tune their payloads.
        if (parsed.data.company) return json(202, { ok: true });
        const auth = await verifyBearer(request.headers.get("authorization"), env);
        await submitFeedback(request, parsed.data, auth.status === "ok" ? auth.userId : undefined, env);
        return json(201, { ok: true });
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === "FEEDBACK_RATE_LIMITED") return json(429, { error: "Too many submissions. Please try again later." });
        if (code === "FEEDBACK_NOT_CONFIGURED") return json(503, { error: "Feedback is temporarily unavailable." });
        console.error("[verbia-api] feedback submission failed", error);
        reportError(error, "feedback_submission");
        return json(502, { error: "Feedback is temporarily unavailable." });
      }
    }
    if (request.method === "POST" && path === "/v1/auth/session-handoff") {
      const auth = await verifyBearer(request.headers.get("authorization"), env);
      if (auth.status !== "ok" || !auth.email) return json(401, { error: "A valid signed-in account is required." });
      try {
        return json(201, await createSessionHandoff(auth, env));
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === "HANDOFF_RATE_LIMITED") return json(429, { error: "Too many sign-in sync attempts. Try again shortly." });
        if (code === "HANDOFF_NOT_CONFIGURED") return json(503, { error: "Sign-in sync is temporarily unavailable." });
        console.error("[verbia-api] session handoff failed", error);
        reportError(error, "session_handoff");
        return json(502, { error: "Sign-in sync is temporarily unavailable." });
      }
    }
    if (request.method !== "POST" || path !== "/v1/replies:generate") return json(404, { error: "Not found" });
    let requestId = "unknown";
    const timings: TimingMetric[] = [];
    try {
      const body = await readJson(request, maxBodyBytes);
      const parsed = generateReplyRequestSchema.safeParse(body);
      if (!parsed.success) return apiError(400, requestId, "INVALID_REQUEST", false, "Check the intent and generation settings.");
      requestId = parsed.data.requestId;
      logRequestId = requestId;
      const auth = await measure("auth", timings, () => verifyBearer(request.headers.get("authorization"), env));
      if (auth.status === "invalid") return apiError(401, requestId, "UNAUTHENTICATED", false, "Sign-in expired. Sign in again from Verbia settings.");
      if (auth.status === "none" && env.AUTH_REQUIRED === "1") return apiError(401, requestId, "UNAUTHENTICATED", false, "Sign in from Verbia settings to generate a reply.");
      if (auth.status === "ok") {
        const plan = await measure("plan", timings, () => readAccountPlan(auth, env));
        const quota = await measure("quota", timings, () => consumeQuota(auth.token, plan, env));
        if (quota === "exceeded") return apiError(429, requestId, "QUOTA_EXCEEDED", false, "You have used your daily replies. Try again tomorrow.");
      }
      const started = performance.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), numberEnv(env, "LLM_TOTAL_TIMEOUT_MS", numberEnv(env, "LLM_TIMEOUT_MS", 25_000)));
      try {
        const result = await measure("model", timings, () => getProvider().generate(parsed.data, controller.signal));
        logProvider = result.provider;
        logModelRoute = result.modelRoute ?? "baseline";
        const warnings = [parsed.data.context.confidence === "low" && "low_context_confidence", parsed.data.context.truncated && "context_truncated"].filter(Boolean) as Array<"low_context_confidence" | "context_truncated">;
        const value = generateReplyResponseSchema.parse({ requestId, draft: cleanDraft(result.draft), warnings, modelRoute: result.modelRoute ?? "baseline", usage: result.inputTokens || result.outputTokens ? { inputTokens: result.inputTokens, outputTokens: result.outputTokens } : undefined, latencyMs: Math.round(performance.now() - started) });
        return withServerTiming(json(200, value), timings);
      } finally { clearTimeout(timer); }
    } catch (error) {
      const err = error as { code?: string; status?: number; detail?: string; name?: string; message?: string };
      console.error(`[verbia-api] request ${requestId} failed:`, err);
      if (err.code === "TOO_LARGE") return apiError(413, requestId, "TOO_LARGE", false, "The context or intent is too large.");
      if (err instanceof SyntaxError) return apiError(400, requestId, "INVALID_REQUEST", false, "Check the intent and generation settings.");
      if (err.name === "AbortError") return apiError(504, requestId, "TIMEOUT", true, "Generation timed out. Try again.");
      if (err.status === 429) return apiError(429, requestId, "RATE_LIMITED", true, "The model is busy or quota-limited. Try again shortly.", err.detail);
      reportError(error, "reply_generation", { requestId });
      const notConfigured = err.message?.startsWith("NOT_CONFIGURED");
      return apiError(notConfigured ? 503 : 502, requestId, notConfigured ? "NOT_CONFIGURED" : "PROVIDER_ERROR", !notConfigured, notConfigured ? "Generation service is not configured." : "The model service returned an invalid response. Try again.", notConfigured ? undefined : (err.detail ?? err.message));
    }
      })();
      return response;
    } finally {
      logRequest(request, path, response, requestStarted, logRequestId, logProvider, logModelRoute);
    }
  };
}

const feedbackSchema = z.object({
  source: z.enum(["website", "popup", "settings", "uninstall"]),
  category: z.enum(["bug", "suggestion", "experience", "uninstall", "other"]),
  reason: z.string().trim().max(80).optional(),
  message: z.string().trim().max(2_000).default(""),
  contactEmail: z.string().trim().email().max(320).optional().or(z.literal("")),
  allowContact: z.boolean().default(false),
  locale: z.enum(["en", "zh"]).default("en"),
  extensionVersion: z.string().trim().max(40).optional(),
  browser: z.string().trim().max(180).optional(),
  company: z.string().max(200).optional()
}).refine(value => Boolean(value.reason || value.message), { message: "Feedback is empty" });
type FeedbackInput = z.infer<typeof feedbackSchema>;

const handoffAttempts = new Map<string, { count: number; resetAt: number }>();

async function createSessionHandoff(auth: AuthenticatedBearer, env: ApiEnv): Promise<{ tokenHash: string }> {
  const supabaseUrl = (env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const secretKey = env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!supabaseUrl || !secretKey) throw Object.assign(new Error("Session handoff is not configured"), { code: "HANDOFF_NOT_CONFIGURED" });
  const email = auth.email;
  if (!email) throw new Error("Session handoff user has no email");
  const now = Date.now();
  if (handoffAttempts.size > 1_000) {
    for (const [userId, value] of handoffAttempts) if (value.resetAt <= now) handoffAttempts.delete(userId);
  }
  const attempt = handoffAttempts.get(auth.userId);
  if (attempt && attempt.resetAt > now && attempt.count >= 5) throw Object.assign(new Error("Session handoff rate limited"), { code: "HANDOFF_RATE_LIMITED" });
  handoffAttempts.set(auth.userId, attempt && attempt.resetAt > now ? { ...attempt, count: attempt.count + 1 } : { count: 1, resetAt: now + 60_000 });

  const admin = createClient(supabaseUrl, secretKey, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  if (data.user.id !== auth.userId) throw new Error("Session handoff user mismatch");
  const tokenHash = data.properties.hashed_token;
  if (!tokenHash) throw new Error("Session handoff token is missing");
  return { tokenHash };
}

async function submitFeedback(request: Request, input: FeedbackInput, userId: string | undefined, env: ApiEnv): Promise<void> {
  const supabaseUrl = (env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const salt = env.FEEDBACK_HASH_SALT ?? "";
  if (!supabaseUrl || !serviceRoleKey || !salt) throw Object.assign(new Error("Feedback storage is not configured"), { code: "FEEDBACK_NOT_CONFIGURED" });
  const address = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const submitterHash = await sha256(`${salt}:${userId ?? address}`);
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/submit_feedback`, {
    method: "POST",
    // New sb_secret_* keys are opaque API keys and must not be sent as Bearer
    // JWTs. Legacy service_role JWTs still require the Authorization header.
    headers: {
      apikey: serviceRoleKey,
      ...(!serviceRoleKey.startsWith("sb_secret_") ? { authorization: `Bearer ${serviceRoleKey}` } : {}),
      "content-type": "application/json"
    },
    body: JSON.stringify({
      p_user_id: userId ?? null,
      p_submitter_hash: submitterHash,
      p_source: input.source,
      p_category: input.category,
      p_reason: input.reason || null,
      p_message: input.message,
      p_contact_email: input.allowContact && input.contactEmail ? input.contactEmail : null,
      p_allow_contact: input.allowContact,
      p_locale: input.locale,
      p_extension_version: input.extensionVersion || null,
      p_browser: input.browser || null
    })
  });
  if (response.ok) return;
  const body = await response.text();
  if (body.includes("FEEDBACK_RATE_LIMITED")) throw Object.assign(new Error("Feedback rate limited"), { code: "FEEDBACK_RATE_LIMITED" });
  throw new Error(`Supabase feedback insert returned ${response.status}`);
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export function createProvider(env: ApiEnv): ReplyProvider {
  const name = env.LLM_PROVIDER ?? "mock";
  if (name === "mock") return new MockProvider();
  const providers = configuredProviders(env);
  if (name === "auto") return new BalancedProvider(orderedProviders(providers, env).map(provider => ({ provider, weight: providerWeight(provider.id, env) })), numberEnv(env, "LLM_ATTEMPT_TIMEOUT_MS", 9_000), numberEnv(env, "LLM_COOLDOWN_MS", 30_000));
  const provider = providers.get(name);
  if (!provider) throw new Error(`NOT_CONFIGURED: missing or unsupported provider ${name}`);
  return provider;
}

function configuredProviders(env: ApiEnv): Map<string, ReplyProvider> {
  const providers = new Map<string, ReplyProvider>();
  const maxOutputTokens = numberEnv(env, "LLM_MAX_OUTPUT_TOKENS", 384);
  const temperature = numberEnv(env, "LLM_TEMPERATURE", 0.45);
  const geminiModel = env.GEMINI_MODEL ?? env.LLM_MODEL_BASELINE;
  if (env.GEMINI_API_KEY && geminiModel) providers.set("gemini", new GeminiProvider(env.GEMINI_API_KEY, geminiModel, maxOutputTokens, temperature));
  if (env.MISTRAL_API_KEY && env.MISTRAL_MODEL) providers.set("mistral", new OpenAiCompatibleProvider({ id: "mistral", apiKey: env.MISTRAL_API_KEY, model: env.MISTRAL_MODEL, endpoint: "https://api.mistral.ai/v1/chat/completions", maxOutputTokens, temperature }));
  if (env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN && env.CLOUDFLARE_MODEL) providers.set("cloudflare", new OpenAiCompatibleProvider({ id: "cloudflare", apiKey: env.CLOUDFLARE_API_TOKEN, model: env.CLOUDFLARE_MODEL, endpoint: `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(env.CLOUDFLARE_ACCOUNT_ID)}/ai/v1/chat/completions`, maxOutputTokens: numberEnv(env, "CLOUDFLARE_MAX_OUTPUT_TOKENS", Math.max(maxOutputTokens, 768)), temperature }));
  if (env.GROQ_API_KEY && env.GROQ_MODEL) providers.set("groq", new OpenAiCompatibleProvider({ id: "groq", apiKey: env.GROQ_API_KEY, model: env.GROQ_MODEL, endpoint: "https://api.groq.com/openai/v1/chat/completions", maxOutputTokens, temperature, reasoningEffort: env.GROQ_REASONING_EFFORT ?? "none" }));
  return providers;
}

function orderedProviders(providers: Map<string, ReplyProvider>, env: ApiEnv): ReplyProvider[] {
  const requested = (env.LLM_PROVIDER_ORDER ?? "gemini,mistral,cloudflare,groq").split(",").map(value => value.trim()).filter(Boolean);
  return [...new Set(requested)].map(id => providers.get(id)).filter((provider): provider is ReplyProvider => Boolean(provider));
}
function providerWeight(id: string, env: ApiEnv): number {
  const values = Object.fromEntries((env.LLM_PROVIDER_WEIGHTS ?? "").split(",").map(item => item.split(":", 2).map(value => value.trim())).filter(parts => parts.length === 2));
  const weight = Number(values[id]);
  return Number.isFinite(weight) && weight > 0 ? weight : 1;
}
async function readJson(request: Request, limit: number) {
  const declaredSize = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredSize) && declaredSize > limit) throw Object.assign(new Error("too large"), { code: "TOO_LARGE" });
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > limit) throw Object.assign(new Error("too large"), { code: "TOO_LARGE" });
  return JSON.parse(new TextDecoder().decode(bytes));
}
function cleanDraft(value: string) { return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, 8_000); }
function json(status: number, body: unknown) { return Response.json(body, { status, headers: responseHeaders }); }
function apiError(status: number, requestId: string, code: ApiError["code"], retryable: boolean, userMessage: string, detail?: string) { return json(status, { requestId, code, retryable, userMessage, detail } satisfies ApiError); }
function numberEnv(env: ApiEnv, name: string, fallback: number) { const value = Number(env[name]); return Number.isFinite(value) ? value : fallback; }

type BearerResult = { status: "none" | "invalid" } | { status: "ok"; userId: string; email?: string; token: string };
type AuthenticatedBearer = Extract<BearerResult, { status: "ok" }>;
type AccountPlan = AccountUsage["plan"];
const authCache = new Map<string, { result: BearerResult; expiresAt: number }>();
async function verifyBearer(header: string | null, env: ApiEnv): Promise<BearerResult> {
  if (!header?.startsWith("Bearer ")) return { status: "none" };
  const token = header.slice("Bearer ".length).trim();
  if (!token) return { status: "none" };
  const cached = authCache.get(token);
  if (cached && cached.expiresAt > Date.now()) return cached.result;
  const supabaseUrl = (env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const publishableKey = env.SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_ANON_KEY ?? "";
  if (!supabaseUrl || !publishableKey) { console.warn("[verbia-api] Authorization header sent but Supabase auth is not configured — ignoring"); return { status: "none" }; }
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: publishableKey, authorization: `Bearer ${token}` } });
    if (response.status === 200) {
      const user = await response.json() as { id?: string; email?: string };
      const result: BearerResult = user.id ? { status: "ok", userId: user.id, email: user.email, token } : { status: "invalid" };
      authCache.set(token, { result, expiresAt: Date.now() + numberEnv(env, "AUTH_CACHE_TTL_MS", 60_000) });
      return result;
    }
    if (response.status === 401 || response.status === 403) {
      const result: BearerResult = { status: "invalid" };
      authCache.set(token, { result, expiresAt: Date.now() + 5_000 });
      return result;
    }
    console.warn(`[verbia-api] token verification returned ${response.status}`); return { status: "none" };
  } catch (error) { console.warn("[verbia-api] token verification failed", error); reportError(error, "auth_verification"); return { status: "none" }; }
}
function quotaLimitForPlan(plan: AccountPlan, env: ApiEnv): number | null {
  const configured = plan === "premium" ? numberEnv(env, "PREMIUM_DAILY_QUOTA", 0) : numberEnv(env, "FREE_DAILY_QUOTA", 10);
  return configured > 0 ? configured : null;
}

async function readAccountPlan(auth: AuthenticatedBearer, env: ApiEnv): Promise<AccountPlan> {
  try {
    return await hasActiveProSubscription(auth, env) ? "premium" : "free";
  } catch (error) {
    console.warn("[verbia-api] subscription lookup failed; applying free plan", error);
    reportError(error, "subscription_lookup");
    return "free";
  }
}

async function readAccountUsage(auth: AuthenticatedBearer, env: ApiEnv, timings: TimingMetric[] = []): Promise<AccountUsage> {
  const period = new Date().toISOString().slice(0, 10);
  const [plan, quotaRows] = await Promise.all([
    measure("plan", timings, () => readAccountPlan(auth, env)),
    measure("quota", timings, () => supabaseRows<{ count?: number }>("quota_usage", { select: "count", user_id: `eq.${auth.userId}`, period: `eq.${period}`, limit: "1" }, auth.token, env))
  ]);
  const nextReset = new Date(`${period}T00:00:00.000Z`);
  nextReset.setUTCDate(nextReset.getUTCDate() + 1);
  return {
    plan,
    used: Math.max(0, Number(quotaRows[0]?.count) || 0),
    limit: quotaLimitForPlan(plan, env),
    resetsAt: nextReset.toISOString()
  };
}

async function supabaseRows<T>(table: string, query: Record<string, string>, token: string, env: ApiEnv): Promise<T[]> {
  const supabaseUrl = (env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const publishableKey = env.SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_ANON_KEY ?? "";
  if (!supabaseUrl || !publishableKey) throw new Error("Supabase is not configured");
  const url = new URL(`${supabaseUrl}/rest/v1/${table}`);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  const response = await fetch(url, { headers: { apikey: publishableKey, authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Supabase ${table} lookup returned ${response.status}`);
  const body = await response.json();
  if (!Array.isArray(body)) throw new Error(`Supabase ${table} returned an invalid payload`);
  return body as T[];
}

async function consumeQuota(token: string, plan: AccountPlan, env: ApiEnv): Promise<"ok" | "skipped" | "exceeded"> {
  const supabaseUrl = (env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const publishableKey = env.SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_ANON_KEY ?? "";
  const limit = quotaLimitForPlan(plan, env);
  if (env.ENFORCE_QUOTA !== "1" || limit === null || !supabaseUrl || !publishableKey) return "skipped";
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/consume_quota`, { method: "POST", headers: { apikey: publishableKey, authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ p_limit: limit }) });
    if (response.ok) return "ok";
    const body = await response.json().catch(() => null) as { message?: string } | null;
    if (body?.message?.includes("QUOTA_EXCEEDED")) return "exceeded";
    console.warn(`[verbia-api] consume_quota failed (${response.status})`, body?.message ?? "");
    reportError(new Error(`Supabase consume_quota returned ${response.status}`), "quota_write", { upstreamStatus: String(response.status) });
    return "ok";
  } catch (error) { console.warn("[verbia-api] consume_quota request failed", error); reportError(error, "quota_write"); return "ok"; }
}

type TimingMetric = { name: string; duration: number };
async function measure<T>(name: string, timings: TimingMetric[], operation: () => Promise<T>): Promise<T> {
  const started = performance.now();
  try { return await operation(); }
  finally { timings.push({ name, duration: performance.now() - started }); }
}
function withServerTiming(response: Response, timings: TimingMetric[]): Response {
  response.headers.set("server-timing", timings.map(({ name, duration }) => `${name};dur=${duration.toFixed(1)}`).join(", "));
  return response;
}

function logRequest(request: Request, path: string, response: Response | undefined, started: number, requestId?: string, provider?: string, modelRoute?: string) {
  const cf = (request as Request & { cf?: { colo?: string; country?: string } }).cf;
  const timing = Object.fromEntries((response?.headers.get("server-timing") ?? "").split(",").map(value => {
    const [name, duration] = value.trim().split(";dur=");
    return name && duration ? [name, Number(duration)] : [];
  }).filter(entry => entry.length === 2));
  console.log(JSON.stringify({
    event: "api_request",
    method: request.method,
    path,
    status: response?.status ?? 500,
    durationMs: Math.round(performance.now() - started),
    ...(requestId ? { requestId } : {}),
    ...(provider ? { provider } : {}),
    ...(modelRoute ? { modelRoute } : {}),
    ...(Object.keys(timing).length ? { timing } : {}),
    ...(cf?.colo ? { colo: cf.colo } : {}),
    ...(cf?.country ? { country: cf.country } : {})
  }));
}
