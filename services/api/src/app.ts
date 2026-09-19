import { contextExtractionRequestSchema, contextExtractionResponseSchema, generateReplyRequestSchema, generateReplyResponseSchema, type AccountUsage, type ApiError, type GenerateReplyRequest, type ReplyStreamEvent } from "@verbia/shared";
import { BalancedProvider, GeminiProvider, MockProvider, OpenAiCompatibleProvider, generateWithTelemetry, streamWithTelemetry, type ReplyProvider } from "./provider";
import { createExtractor, extractEmailContext } from "./extraction";
import { billingConfigured, createCheckout, persistBillingWebhook, verifyBillingWebhook, type BillingCycle } from "./billing";
import { reportError } from "./monitoring";
import { verifyBearer, type AuthenticatedBearer } from "./auth";
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
    let logQuota: QuotaOutcome | undefined;
    // Reported by the client and carried into the request log: `platform` is the
    // prompt's own label, `siteMode` is how the client behaved on the page
    // (auto / email / universal). Together with `page.urlOrigin` they are what
    // make "the model cannot read this provider" separable from "our adapter
    // cannot" — which decides where the next adapter is worth writing.
    let logPlatform: string | undefined;
    let logSiteMode: string | undefined;
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
      const rawBody = await request.text();
      let event: ReturnType<typeof verifyBillingWebhook>;
      try {
        event = verifyBillingWebhook(rawBody, request.headers.get("x-waffo-signature"), env);
      } catch (error) {
        console.warn("[verbia-api] rejected Waffo webhook", error);
        return new Response("Invalid signature", { status: 401, headers: responseHeaders });
      }
      try {
        await persistBillingWebhook(event, env);
        console.log(`[verbia-api] persisted Waffo webhook ${event.id} ${event.eventType}`);
        return new Response("OK", { status: 200, headers: responseHeaders });
      } catch (error) {
        console.error("[verbia-api] Waffo webhook persistence failed", error);
        reportError(error, "billing_webhook_persistence", { eventType: event.eventType });
        // A non-2xx response asks Waffo to retry. Never acknowledge an event
        // until the entitlement transaction has committed in Supabase.
        return new Response("Storage unavailable", { status: 503, headers: responseHeaders });
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
    if (request.method === "POST" && path === "/v1/context:extract") {
      let requestId = "unknown";
      const timings: TimingMetric[] = [];
      try {
        const body = await readJson(request, maxBodyBytes);
        // `trigger` is part of the schema and must be "explicit_user_click", so
        // a missing gate in the UI costs a 400 here instead of a silent call.
        const parsed = contextExtractionRequestSchema.safeParse(body);
        if (!parsed.success) {
          logRejected(path, parsed.error);
          return apiError(400, requestId, "INVALID_REQUEST", false, "Verbia could not read the page text it collected.");
        }
        requestId = parsed.data.requestId;
        logRequestId = requestId;
        logPlatform = parsed.data.platform;
        logSiteMode = parsed.data.siteMode;
        const auth = await measure("auth", timings, () => verifyBearer(request.headers.get("authorization"), env));
        if (auth.status === "invalid") return apiError(401, requestId, "UNAUTHENTICATED", false, "Sign-in expired. Sign in again from Verbia settings.");
        if (auth.status === "none" && env.AUTH_REQUIRED === "1") return apiError(401, requestId, "UNAUTHENTICATED", false, "Sign in from Verbia settings to identify the context.");
        // Each identification is a model call, so it spends the same daily counter
        // a reply does — one press, one entry — and is refused the same way when
        // that counter is spent (@see checkGenerationQuota). Without this, the
        // repair button is the one unlimited path to the model. Nothing is
        // recorded here: the counter only moves after a usable answer exists.
        if (auth.status === "ok") {
          const quota = await measure("quota", timings, () => checkGenerationQuota(auth.token, env));
          logQuota = quota;
          if (quota === "exceeded") return withServerTiming(apiError(429, requestId, "QUOTA_EXCEEDED", false, "You have used your daily replies. Try again tomorrow."), timings);
        }
        const extractor = createExtractor(env);
        if (!extractor) return apiError(503, requestId, "NOT_CONFIGURED", false, "Context identification is not configured.");
        const started = performance.now();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), numberEnv(env, "EXTRACTOR_TIMEOUT_MS", 12_000));
        try {
          const result = await measure("model", timings, () => extractEmailContext(extractor, parsed.data, controller.signal));
          logProvider = extractor.id;
          // The model answered but nothing in it survived grounding: without this
          // line the likeliest failure of the whole feature leaves no trace. The
          // warning codes name the claim that did not trace back — no mail text
          // is logged.
          if (!result.validation.grounded) {
            // Nothing usable came out, so nothing is recorded: failed
            // identifications are free.
            console.warn(`[verbia-api] identification not grounded: ${result.validation.warnings.join(", ") || "no message"}`, { requestId, platform: parsed.data.platform });
          } else if (auth.status === "ok") {
            await measure("record", timings, () => recordGenerationQuota(auth.token, env));
          }
          const value = contextExtractionResponseSchema.parse({ requestId, ...result, latencyMs: Math.round(performance.now() - started) });
          return withServerTiming(json(200, value), timings);
        } finally { clearTimeout(timer); }
      } catch (error) {
        const err = error as { code?: string; status?: number; detail?: string; name?: string; message?: string };
        console.error(`[verbia-api] context extraction ${requestId} failed:`, err);
        if (err.code === "TOO_LARGE") return apiError(413, requestId, "TOO_LARGE", false, "The collected page text is too large.");
        if (err instanceof SyntaxError) return apiError(400, requestId, "INVALID_REQUEST", false, "Verbia could not read the page text it collected.");
        if (err.name === "AbortError") return apiError(504, requestId, "TIMEOUT", true, "Identifying the context timed out. Try again.");
        if (err.status === 429) return apiError(429, requestId, "RATE_LIMITED", true, "The model is busy or quota-limited. Try again shortly.", err.detail);
        reportError(error, "context_extraction", { requestId });
        return apiError(502, requestId, "PROVIDER_ERROR", true, "Verbia could not identify the context on this page. Select the text you are answering instead.", err.detail ?? err.message);
      }
    }
    if (request.method !== "POST" || path !== "/v1/replies:generate") return json(404, { error: "Not found" });
    let requestId = "unknown";
    const timings: TimingMetric[] = [];
    try {
      const body = await readJson(request, maxBodyBytes);
      const parsed = generateReplyRequestSchema.safeParse(body);
      if (!parsed.success) {
        logRejected(path, parsed.error);
        return apiError(400, requestId, "INVALID_REQUEST", false, "Check the intent and generation settings.");
      }
      requestId = parsed.data.requestId;
      logRequestId = requestId;
      logPlatform = parsed.data.platform;
      logSiteMode = parsed.data.siteMode;
      const auth = await measure("auth", timings, () => verifyBearer(request.headers.get("authorization"), env));
      if (auth.status === "invalid") return apiError(401, requestId, "UNAUTHENTICATED", false, "Sign-in expired. Sign in again from Verbia settings.");
      if (auth.status === "none" && env.AUTH_REQUIRED === "1") return apiError(401, requestId, "UNAUTHENTICATED", false, "Sign in from Verbia settings to generate a reply.");
      // Same policy as identification: refuse up front when the counter is
      // spent, but record nothing until a usable draft exists.
      if (auth.status === "ok") {
        const quota = await measure("quota", timings, () => checkGenerationQuota(auth.token, env));
        logQuota = quota;
        if (quota === "exceeded") return withServerTiming(apiError(429, requestId, "QUOTA_EXCEEDED", false, "You have used your daily replies. Try again tomorrow."), timings);
      }
      if (request.headers.get("accept")?.includes("application/x-ndjson")) {
        const cf = (request as Request & { cf?: { colo?: string; country?: string } }).cf;
        return streamReply(getProvider(), parsed.data, auth.status === "ok" ? auth.token : undefined, env, request.signal, { requestId, country: cf?.country, colo: cf?.colo });
      }
      const started = performance.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), numberEnv(env, "LLM_TOTAL_TIMEOUT_MS", numberEnv(env, "LLM_TIMEOUT_MS", 25_000)));
      try {
        const cf = (request as Request & { cf?: { colo?: string; country?: string } }).cf;
        const result = await measure("model", timings, () => generateWithTelemetry(getProvider(), parsed.data, controller.signal, { requestId, country: cf?.country, colo: cf?.colo }));
        logProvider = result.provider;
        logModelRoute = result.modelRoute ?? "baseline";
        const draft = cleanDraft(result.draft);
        if (!draft) {
          // Nothing usable came back, so nothing is recorded: failed
          // generations are free.
          throw new Error("The model returned an empty draft.");
        }
        const warnings = [parsed.data.context.confidence === "low" && "low_context_confidence", parsed.data.context.truncated && "context_truncated"].filter(Boolean) as Array<"low_context_confidence" | "context_truncated">;
        const value = generateReplyResponseSchema.parse({ requestId, draft, warnings, modelRoute: result.modelRoute ?? "baseline", usage: result.inputTokens || result.outputTokens ? { inputTokens: result.inputTokens, outputTokens: result.outputTokens } : undefined, latencyMs: Math.round(performance.now() - started) });
        if (auth.status === "ok") await measure("record", timings, () => recordGenerationQuota(auth.token, env));
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
      logRequest(request, path, response, requestStarted, { requestId: logRequestId, provider: logProvider, modelRoute: logModelRoute, quota: logQuota, platform: logPlatform, siteMode: logSiteMode });
    }
  };
}

function streamReply(
  provider: ReplyProvider,
  request: GenerateReplyRequest,
  authToken: string | undefined,
  env: ApiEnv,
  clientSignal: AbortSignal,
  telemetry: { requestId: string; country?: string; colo?: string }
): Response {
  const encoder = new TextEncoder();
  const timeout = AbortSignal.timeout(numberEnv(env, "LLM_TOTAL_TIMEOUT_MS", numberEnv(env, "LLM_TIMEOUT_MS", 25_000)));
  const streamController = new AbortController();
  const signal = AbortSignal.any([clientSignal, timeout, streamController.signal]);
  const started = performance.now();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ReplyStreamEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      let draft = "";
      let firstTokenMs: number | undefined;
      let chunkCount = 0;
      let largestChunkChars = 0;
      try {
        send({ type: "start", requestId: request.requestId });
        let metadata: { inputTokens?: number; outputTokens?: number; provider?: string; modelRoute?: "baseline" | "fallback" } = {};
        for await (const event of streamWithTelemetry(provider, request, signal, telemetry)) {
          if (event.type === "delta") {
            firstTokenMs ??= Math.round(performance.now() - started);
            chunkCount += 1;
            largestChunkChars = Math.max(largestChunkChars, event.text.length);
            draft += event.text;
            if (draft.length > 8_000) throw Object.assign(new Error("The model response is too large."), { code: "TOO_LARGE" });
            send({ type: "delta", requestId: request.requestId, text: event.text });
          } else metadata = event;
        }
        const cleaned = cleanDraft(draft);
        if (!cleaned) throw new Error("The model returned an empty draft.");
        const warnings = [request.context.confidence === "low" && "low_context_confidence", request.context.truncated && "context_truncated"].filter(Boolean) as Array<"low_context_confidence" | "context_truncated">;
        const result = generateReplyResponseSchema.parse({
          requestId: request.requestId,
          draft: cleaned,
          warnings,
          modelRoute: metadata.modelRoute ?? "baseline",
          usage: metadata.inputTokens || metadata.outputTokens ? { inputTokens: metadata.inputTokens, outputTokens: metadata.outputTokens } : undefined,
          latencyMs: Math.round(performance.now() - started)
        });
        if (authToken) await recordGenerationQuota(authToken, env);
        send({ type: "done", requestId: request.requestId, result });
        console.log(JSON.stringify({ event: "reply_stream", requestId: request.requestId, outcome: "success", provider: metadata.provider, modelRoute: result.modelRoute, firstTokenMs, durationMs: result.latencyMs, chunkCount, largestChunkChars, inputTokens: metadata.inputTokens, outputTokens: metadata.outputTokens }));
      } catch (error) {
        const err = error as { code?: string; status?: number; detail?: string; name?: string; message?: string };
        const cancelled = clientSignal.aborted || streamController.signal.aborted;
        if (cancelled) {
          console.log(JSON.stringify({ event: "reply_stream", requestId: request.requestId, outcome: "cancelled", firstTokenMs, durationMs: Math.round(performance.now() - started), chunkCount, largestChunkChars }));
        } else {
          const event: ReplyStreamEvent = timeout.aborted || err.name === "AbortError"
            ? { type: "error", requestId: request.requestId, code: "TIMEOUT", userMessage: "Generation timed out. Try again.", retryable: true }
            : err.status === 429
              ? { type: "error", requestId: request.requestId, code: "RATE_LIMITED", userMessage: "The model is busy or quota-limited. Try again shortly.", retryable: true, detail: err.detail }
              : { type: "error", requestId: request.requestId, code: err.code === "TOO_LARGE" ? "TOO_LARGE" : "PROVIDER_ERROR", userMessage: err.code === "TOO_LARGE" ? "The generated draft is too large." : "The model service returned an invalid response. Try again.", retryable: true, detail: err.detail ?? err.message };
          try { send(event); } catch { /* The browser disconnected. */ }
          console.log(JSON.stringify({ event: "reply_stream", requestId: request.requestId, outcome: event.code === "TIMEOUT" ? "timeout" : "error", firstTokenMs, durationMs: Math.round(performance.now() - started), chunkCount, largestChunkChars, code: event.code }));
          if (event.code !== "TIMEOUT") reportError(error, "reply_generation_stream", { requestId: request.requestId });
        }
      } finally {
        try { controller.close(); } catch { /* The client cancelled the stream. */ }
      }
    },
    cancel(reason) { streamController.abort(reason); }
  });
  return new Response(body, {
    status: 200,
    headers: { ...responseHeaders, "content-type": "application/x-ndjson; charset=utf-8" }
  });
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
  if (env.GROQ_API_KEY && env.GROQ_MODEL) providers.set("groq", new OpenAiCompatibleProvider({ id: "groq", apiKey: env.GROQ_API_KEY, model: env.GROQ_MODEL, endpoint: "https://api.groq.com/openai/v1/chat/completions", maxOutputTokens, temperature, reasoningEffort: env.GROQ_REASONING_EFFORT ?? "low" }));
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

type AccountPlan = AccountUsage["plan"];
function quotaLimitForPlan(plan: AccountPlan, env: ApiEnv): number | null {
  const configured = plan === "premium" ? numberEnv(env, "PREMIUM_DAILY_QUOTA", 0) : numberEnv(env, "FREE_DAILY_QUOTA", 10);
  return configured > 0 ? configured : null;
}

type AccountEntitlement = { plan: AccountPlan; premiumUntil?: string };

async function readAccountEntitlement(auth: AuthenticatedBearer, env: ApiEnv): Promise<AccountEntitlement> {
  try {
    const rows = await supabaseRows<{ plan?: string; subscription_status?: string; current_period_end?: string }>("profiles", { select: "plan,subscription_status,current_period_end", id: `eq.${auth.userId}`, limit: "1" }, auth.token, env);
    const profile = rows[0];
    if (profile?.plan !== "premium") return { plan: "free" };
    const periodEnd = profile.current_period_end ? Date.parse(profile.current_period_end) : Number.NaN;
    // A canceling subscription remains Premium through its paid period even
    // if the final cancellation webhook is delayed.
    if (profile.subscription_status === "canceling" && Number.isFinite(periodEnd) && periodEnd <= Date.now()) return { plan: "free" };
    // Report the lapse date in UTC at day precision so both the extension and
    // the website can render "Premium until <date>". Omitted when the record
    // carries no end date (open-ended manual grant).
    const premiumUntil = Number.isFinite(periodEnd) ? new Date(periodEnd).toISOString().slice(0, 10) : undefined;
    return { plan: "premium", premiumUntil };
  } catch (error) {
    console.warn("[verbia-api] profile plan lookup failed; applying free plan", error);
    reportError(error, "plan_lookup");
    return { plan: "free" };
  }
}

async function readAccountUsage(auth: AuthenticatedBearer, env: ApiEnv, timings: TimingMetric[] = []): Promise<AccountUsage> {
  const period = new Date().toISOString().slice(0, 10);
  const [entitlement, quotaRows] = await Promise.all([
    measure("plan", timings, () => readAccountEntitlement(auth, env)),
    measure("quota", timings, () => supabaseRows<{ count?: number }>("quota_usage", { select: "count", user_id: `eq.${auth.userId}`, period: `eq.${period}`, limit: "1" }, auth.token, env))
  ]);
  const nextReset = new Date(`${period}T00:00:00.000Z`);
  nextReset.setUTCDate(nextReset.getUTCDate() + 1);
  return {
    plan: entitlement.plan,
    premiumUntil: entitlement.premiumUntil,
    used: Math.max(0, Number(quotaRows[0]?.count) || 0),
    limit: quotaLimitForPlan(entitlement.plan, env),
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

// Outcome of the pre-flight quota check. `exceeded` refuses before any model is
// paid for; `unavailable` and `skipped` both mean "this reply will not be
// counted": the first is a failure, the second a configuration that does not
// track usage (ENFORCE_QUOTA off). They are kept apart because they need
// different reactions — one is a bug, the other is a deployment decision — and
// both travel to the request log so neither stays invisible.
type QuotaOutcome = "ok" | "skipped" | "exceeded" | "unavailable";

// Answers "may this user start another generation" without writing anything: a
// failure or a useless answer never spends the counter, because nothing is
// recorded until a usable result exists (@see recordGenerationQuota). The
// database stays the source of truth for plan and limits. `remaining` may go
// negative when concurrent requests slip past this check — the next check
// refuses them.
async function checkGenerationQuota(token: string, env: ApiEnv): Promise<QuotaOutcome> {
  const supabaseUrl = (env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const publishableKey = env.SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_ANON_KEY ?? "";
  if (env.ENFORCE_QUOTA !== "1" || !supabaseUrl || !publishableKey) return "skipped";
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/check_generation_quota`, {
      method: "POST",
      headers: { apikey: publishableKey, authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        p_free_limit: Math.max(0, numberEnv(env, "FREE_DAILY_QUOTA", 10)),
        p_premium_limit: Math.max(0, numberEnv(env, "PREMIUM_DAILY_QUOTA", 0))
      })
    });
    const body = await response.json().catch(() => null) as { remaining?: number; message?: string; code?: string } | null;
    if (response.ok) {
      // -1 means unlimited; anything else at or below zero means the counter is
      // spent (it can even be past the limit after concurrent requests).
      if (typeof body?.remaining === "number" && body.remaining !== -1 && body.remaining <= 0) return "exceeded";
      return "ok";
    }
    // PGRST202 is PostgREST reporting that the function does not exist, which
    // means the database is still on an older docs/supabase-schema.sql. Drafts
    // keep working (this gate never blocks on infrastructure), but nothing is
    // recorded and daily limits are silently unenforced — so this one gets an
    // unambiguous message and its own Sentry tag instead of a generic warning.
    if (body?.code === "PGRST202") {
      console.error("[verbia-api] check_generation_quota is missing from the database. Run section 2 of docs/supabase-schema.sql. Usage is NOT being recorded and daily quotas are NOT enforced.");
      reportError(new Error("Supabase is missing the check_generation_quota function"), "quota_schema_missing", { upstreamStatus: String(response.status) });
      return "unavailable";
    }
    console.warn(`[verbia-api] check_generation_quota failed (${response.status})`, body?.message ?? "");
    reportError(new Error(`Supabase check_generation_quota returned ${response.status}`), "quota_write", { upstreamStatus: String(response.status) });
    return "unavailable";
  } catch (error) { console.warn("[verbia-api] check_generation_quota request failed", error); reportError(error, "quota_write"); return "unavailable"; }
}

// Counts one generation that produced a usable result. Best-effort: a failed
// write only means the Account card undercounts by one; it never changes the
// response the user gets.
async function recordGenerationQuota(token: string, env: ApiEnv): Promise<void> {
  const supabaseUrl = (env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const publishableKey = env.SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_ANON_KEY ?? "";
  if (env.ENFORCE_QUOTA !== "1" || !supabaseUrl || !publishableKey) return;
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/record_generation_quota`, {
      method: "POST",
      headers: { apikey: publishableKey, authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({})
    });
    if (response.ok) return;
    const body = await response.json().catch(() => null) as { message?: string; code?: string } | null;
    if (body?.code === "PGRST202") {
      console.error("[verbia-api] record_generation_quota is missing from the database. Run section 2 of docs/supabase-schema.sql. Successful generations are NOT being counted.");
      reportError(new Error("Supabase is missing the record_generation_quota function"), "quota_write_schema_missing", { upstreamStatus: String(response.status) });
      return;
    }
    console.warn(`[verbia-api] record_generation_quota failed (${response.status})`, body?.message ?? "");
    reportError(new Error(`Supabase record_generation_quota returned ${response.status}`), "quota_write", { upstreamStatus: String(response.status) });
  } catch (error) { console.warn("[verbia-api] record_generation_quota request failed", error); reportError(error, "quota_write"); }
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

// A body the schema refused is answered with one sentence the user can read and
// nothing an operator can act on. That is how a rejection with a perfectly good
// cause — a client shipping a platform value the server did not know yet — arrived
// as a screenshot instead of a log line. Field paths and issue codes only: the
// payload holds the page's own text and the user's own words, and neither belongs
// in a log.
function logRejected(path: string, error: z.ZodError): void {
  const issues = error.issues.map(issue => `${issue.path.join(".") || "<body>"}: ${issue.code}`).join(", ");
  console.warn(`[verbia-api] ${path} rejected: ${issues}`);
}

function logRequest(request: Request, path: string, response: Response | undefined, started: number, details: { requestId?: string; provider?: string; modelRoute?: string; quota?: QuotaOutcome; platform?: string; siteMode?: string } = {}) {
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
    ...(details.requestId ? { requestId: details.requestId } : {}),
    ...(details.provider ? { provider: details.provider } : {}),
    ...(details.modelRoute ? { modelRoute: details.modelRoute } : {}),
    // Present on every signed-in generation, so logs answer "was this reply
    // counted?" without a second lookup.
    ...(details.quota ? { quota: details.quota } : {}),
    ...(details.platform ? { platform: details.platform } : {}),
    ...(details.siteMode ? { siteMode: details.siteMode } : {}),
    ...(Object.keys(timing).length ? { timing } : {}),
    ...(cf?.colo ? { colo: cf.colo } : {}),
    ...(cf?.country ? { country: cf.country } : {})
  }));
}
