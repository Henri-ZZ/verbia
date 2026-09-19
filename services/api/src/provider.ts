import type { GenerateReplyRequest } from "@verbia/shared";
import { buildPrompt, STREAM_SYSTEM_PROMPT, SYSTEM_PROMPT } from "./prompt";

export type ModelRoute = "baseline" | "fallback";
export type ProviderResult = {
  draft: string;
  inputTokens?: number;
  outputTokens?: number;
  provider?: string;
  modelRoute?: ModelRoute;
};
export type ProviderStreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; inputTokens?: number; outputTokens?: number; provider?: string; modelRoute?: ModelRoute };

export interface ReplyProvider {
  readonly id: string;
  readonly model?: string;
  generate(request: GenerateReplyRequest, signal: AbortSignal): Promise<ProviderResult>;
  stream?(request: GenerateReplyRequest, signal: AbortSignal): AsyncGenerator<ProviderStreamEvent>;
}

export type ModelTelemetryContext = { requestId: string; country?: string; colo?: string };

export class ProviderError extends Error {
  constructor(message: string, public readonly status?: number, public readonly detail?: string, public readonly retryable = true) {
    super(message);
    this.name = "ProviderError";
  }
}

export class MockProvider implements ReplyProvider {
  readonly id = "mock";
  readonly model = "mock";
  async generate(request: GenerateReplyRequest): Promise<ProviderResult> {
    return { draft: request.intent.text, provider: this.id, modelRoute: "baseline" };
  }
  async *stream(request: GenerateReplyRequest): AsyncGenerator<ProviderStreamEvent> {
    yield { type: "delta", text: request.intent.text };
    yield { type: "done", provider: this.id };
  }
}

export class GeminiProvider implements ReplyProvider {
  readonly id = "gemini";
  constructor(private apiKey: string, readonly model: string, private maxOutputTokens: number, private temperature: number) {}

  async generate(request: GenerateReplyRequest, signal: AbortSignal): Promise<ProviderResult> {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`, {
      method: "POST", signal,
      headers: { "content-type": "application/json", "x-goog-api-key": this.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: buildPrompt(request) }] }],
        generationConfig: {
          temperature: this.temperature,
          maxOutputTokens: this.maxOutputTokens,
          responseMimeType: "application/json",
          responseSchema: draftJsonSchema
        }
      })
    });
    const raw = await response.json().catch(() => null) as GeminiResponse | null;
    if (!response.ok) throw responseError(response.status, raw);
    return {
      draft: parseDraft(raw?.candidates?.[0]?.content?.parts?.[0]?.text),
      inputTokens: raw?.usageMetadata?.promptTokenCount,
      outputTokens: raw?.usageMetadata?.candidatesTokenCount,
      provider: this.id
    };
  }

  async *stream(request: GenerateReplyRequest, signal: AbortSignal): AsyncGenerator<ProviderStreamEvent> {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:streamGenerateContent?alt=sse`, {
      method: "POST", signal,
      headers: { "content-type": "application/json", "x-goog-api-key": this.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: STREAM_SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: buildPrompt(request) }] }],
        generationConfig: { temperature: this.temperature, maxOutputTokens: this.maxOutputTokens, responseMimeType: "text/plain" }
      })
    });
    if (!response.ok) throw responseError(response.status, await response.json().catch(() => null));
    if (!response.body) throw new ProviderError("The model returned no stream.", undefined, "Gemini response body was empty.");
    let inputTokens: number | undefined;
    let outputTokens: number | undefined;
    for await (const data of sseData(response.body)) {
      const chunk = parseJson<GeminiResponse>(data);
      const text = chunk?.candidates?.[0]?.content?.parts?.map(part => part.text ?? "").join("") ?? "";
      if (text) yield { type: "delta", text };
      inputTokens = chunk?.usageMetadata?.promptTokenCount ?? inputTokens;
      outputTokens = chunk?.usageMetadata?.candidatesTokenCount ?? outputTokens;
    }
    yield { type: "done", inputTokens, outputTokens, provider: this.id };
  }
}

type OpenAiOptions = {
  id: "mistral" | "cloudflare" | "groq";
  apiKey: string;
  endpoint: string;
  model: string;
  maxOutputTokens: number;
  temperature: number;
  reasoningEffort?: string;
};

export class OpenAiCompatibleProvider implements ReplyProvider {
  readonly id: string;
  readonly model: string;
  constructor(private options: OpenAiOptions) { this.id = options.id; this.model = options.model; }

  async generate(request: GenerateReplyRequest, signal: AbortSignal): Promise<ProviderResult> {
    const body: Record<string, unknown> = {
      model: this.options.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildPrompt(request) }
      ],
      temperature: this.options.temperature,
      max_completion_tokens: this.options.maxOutputTokens,
      response_format: { type: "json_object" }
    };
    if (this.options.reasoningEffort) body.reasoning_effort = this.options.reasoningEffort;
    const response = await fetch(this.options.endpoint, {
      method: "POST", signal,
      headers: { authorization: `Bearer ${this.options.apiKey}`, "content-type": "application/json", "user-agent": "Verbia/0.1" },
      body: JSON.stringify(body)
    });
    const raw = await response.json().catch(() => null) as OpenAiResponse | null;
    if (!response.ok) throw responseError(response.status, raw);
    return {
      draft: parseDraft(raw?.choices?.[0]?.message?.content),
      inputTokens: raw?.usage?.prompt_tokens,
      outputTokens: raw?.usage?.completion_tokens,
      provider: this.id
    };
  }

  async *stream(request: GenerateReplyRequest, signal: AbortSignal): AsyncGenerator<ProviderStreamEvent> {
    const body: Record<string, unknown> = {
      model: this.options.model,
      messages: [
        { role: "system", content: STREAM_SYSTEM_PROMPT },
        { role: "user", content: buildPrompt(request) }
      ],
      temperature: this.options.temperature,
      max_completion_tokens: this.options.maxOutputTokens,
      stream: true
    };
    if (this.options.reasoningEffort) body.reasoning_effort = this.options.reasoningEffort;
    const response = await fetch(this.options.endpoint, {
      method: "POST", signal,
      headers: { authorization: `Bearer ${this.options.apiKey}`, "content-type": "application/json", "user-agent": "Verbia/0.1" },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw responseError(response.status, await response.json().catch(() => null));
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const raw = await response.json().catch(() => null) as OpenAiResponse | null;
      const text = raw?.choices?.[0]?.message?.content;
      if (!text) throw new ProviderError("The model returned no draft.", undefined, "Model returned empty content.");
      yield { type: "delta", text };
      yield { type: "done", inputTokens: raw?.usage?.prompt_tokens, outputTokens: raw?.usage?.completion_tokens, provider: this.id };
      return;
    }
    if (!response.body) throw new ProviderError("The model returned no stream.", undefined, `${this.id} response body was empty.`);
    let inputTokens: number | undefined;
    let outputTokens: number | undefined;
    for await (const data of sseData(response.body)) {
      if (data === "[DONE]") break;
      const chunk = parseJson<OpenAiStreamResponse>(data);
      const text = chunk?.choices?.[0]?.delta?.content ?? "";
      if (text) yield { type: "delta", text };
      inputTokens = chunk?.usage?.prompt_tokens ?? inputTokens;
      outputTokens = chunk?.usage?.completion_tokens ?? outputTokens;
    }
    yield { type: "done", inputTokens, outputTokens, provider: this.id };
  }
}

type RouterEntry = { provider: ReplyProvider; weight: number; attempts: number; failures: number; cooldownUntil: number };
export type RouterSnapshot = Array<{ provider: string; weight: number; attempts: number; failures: number; coolingDown: boolean }>;

export class BalancedProvider implements ReplyProvider {
  readonly id = "auto";
  private entries: RouterEntry[];
  private tieBreaker = 0;

  constructor(
    providers: Array<{ provider: ReplyProvider; weight?: number }>,
    private attemptTimeoutMs = 9_000,
    private cooldownMs = 30_000,
    private now: () => number = Date.now
  ) {
    if (!providers.length) throw new Error("NOT_CONFIGURED: no model providers configured");
    this.entries = providers.map(({ provider, weight = 1 }) => ({
      provider,
      weight: Number.isFinite(weight) && weight > 0 ? weight : 1,
      attempts: 0,
      failures: 0,
      cooldownUntil: 0
    }));
  }

  snapshot(): RouterSnapshot {
    const now = this.now();
    return this.entries.map(entry => ({
      provider: entry.provider.id,
      weight: entry.weight,
      attempts: entry.attempts,
      failures: entry.failures,
      coolingDown: entry.cooldownUntil > now
    }));
  }

  async generate(request: GenerateReplyRequest, signal: AbortSignal, telemetry?: ModelTelemetryContext): Promise<ProviderResult> {
    const candidates = this.orderedCandidates();
    if (!candidates.length) {
      throw new ProviderError("All configured model providers are cooling down.", 429, "No provider is eligible until its cooldown expires.", true);
    }
    const errors: string[] = [];
    for (let attempt = 0; attempt < candidates.length; attempt += 1) {
      if (signal.aborted) throw signal.reason ?? new DOMException("Aborted", "AbortError");
      const entry = candidates[attempt]!;
      entry.attempts += 1;
      const timeoutSignal = AbortSignal.timeout(this.attemptTimeoutMs);
      try {
        const result = await observedAttempt(entry.provider, request, AbortSignal.any([signal, timeoutSignal]), telemetry, attempt + 1, attempt === 0 ? "baseline" : "fallback", () => timeoutSignal.aborted);
        entry.failures = 0;
        entry.cooldownUntil = 0;
        return { ...result, provider: entry.provider.id, modelRoute: attempt === 0 ? "baseline" : "fallback" };
      } catch (error) {
        if (signal.aborted) throw signal.reason ?? new DOMException("Aborted", "AbortError");
        entry.failures += 1;
        entry.cooldownUntil = this.now() + this.cooldownFor(error, entry.failures);
        errors.push(`${entry.provider.id}: ${errorDetail(error, timeoutSignal.aborted)}`);
        console.error(`[verbia-api] provider ${entry.provider.id} failed; trying fallback:`, error);
      }
    }
    throw new ProviderError("All configured model providers failed.", 502, errors.join(" | "), true);
  }

  async *stream(request: GenerateReplyRequest, signal: AbortSignal, telemetry?: ModelTelemetryContext): AsyncGenerator<ProviderStreamEvent> {
    const candidates = this.orderedCandidates();
    if (!candidates.length) throw new ProviderError("All configured model providers are cooling down.", 429, "No provider is eligible until its cooldown expires.", true);
    const errors: string[] = [];
    for (let attempt = 0; attempt < candidates.length; attempt += 1) {
      if (signal.aborted) throw signal.reason ?? new DOMException("Aborted", "AbortError");
      const entry = candidates[attempt]!;
      entry.attempts += 1;
      const timeoutSignal = AbortSignal.timeout(this.attemptTimeoutMs);
      const combinedSignal = AbortSignal.any([signal, timeoutSignal]);
      const started = performance.now();
      let emitted = false;
      try {
        for await (const event of providerStream(entry.provider, request, combinedSignal)) {
          if (event.type === "delta") emitted = true;
          if (event.type === "done") {
            entry.failures = 0;
            entry.cooldownUntil = 0;
            if (telemetry) logModelAttempt({ ...telemetry, provider: entry.provider.id, model: entry.provider.model, attempt: attempt + 1, route: attempt === 0 ? "baseline" : "fallback", outcome: "success", durationMs: Math.round(performance.now() - started), inputTokens: event.inputTokens, outputTokens: event.outputTokens });
            yield { ...event, provider: entry.provider.id, modelRoute: attempt === 0 ? "baseline" : "fallback" };
          } else yield event;
        }
        return;
      } catch (error) {
        if (signal.aborted) throw signal.reason ?? new DOMException("Aborted", "AbortError");
        entry.failures += 1;
        entry.cooldownUntil = this.now() + this.cooldownFor(error, entry.failures);
        if (telemetry) logModelAttempt({ ...telemetry, provider: entry.provider.id, model: entry.provider.model, attempt: attempt + 1, route: attempt === 0 ? "baseline" : "fallback", outcome: modelAttemptOutcome(error, combinedSignal.aborted, timeoutSignal.aborted), durationMs: Math.round(performance.now() - started), status: error instanceof ProviderError ? error.status : undefined });
        if (emitted) throw error;
        errors.push(`${entry.provider.id}: ${errorDetail(error, timeoutSignal.aborted)}`);
        console.error(`[verbia-api] provider ${entry.provider.id} failed before streaming; trying fallback:`, error);
      }
    }
    throw new ProviderError("All configured model providers failed.", 502, errors.join(" | "), true);
  }

  private orderedCandidates(): RouterEntry[] {
    const now = this.now();
    const offset = this.tieBreaker++ % this.entries.length;
    const rotated = [...this.entries.slice(offset), ...this.entries.slice(0, offset)];
    const byUse = (a: RouterEntry, b: RouterEntry) => (a.attempts / a.weight) - (b.attempts / b.weight);
    return rotated.filter(entry => entry.cooldownUntil <= now).sort(byUse);
  }

  private cooldownFor(error: unknown, failures: number): number {
    const status = error instanceof ProviderError ? error.status : undefined;
    if (status === 401 || status === 403 || (status !== undefined && status >= 400 && status < 500 && status !== 408 && status !== 429)) {
      return Math.max(this.cooldownMs, 5 * 60_000);
    }
    return Math.min(this.cooldownMs * (2 ** Math.max(0, failures - 1)), 5 * 60_000);
  }
}

export async function generateWithTelemetry(provider: ReplyProvider, request: GenerateReplyRequest, signal: AbortSignal, telemetry: ModelTelemetryContext): Promise<ProviderResult> {
  if (provider instanceof BalancedProvider) return provider.generate(request, signal, telemetry);
  const result = await observedAttempt(provider, request, signal, telemetry, 1, "baseline", () => false);
  return { ...result, provider: result.provider ?? provider.id, modelRoute: result.modelRoute ?? "baseline" };
}

export function streamWithTelemetry(provider: ReplyProvider, request: GenerateReplyRequest, signal: AbortSignal, telemetry: ModelTelemetryContext): AsyncGenerator<ProviderStreamEvent> {
  if (provider instanceof BalancedProvider) return provider.stream(request, signal, telemetry);
  return observedStream(provider, request, signal, telemetry);
}

async function* observedStream(provider: ReplyProvider, request: GenerateReplyRequest, signal: AbortSignal, telemetry: ModelTelemetryContext): AsyncGenerator<ProviderStreamEvent> {
  const started = performance.now();
  try {
    for await (const event of providerStream(provider, request, signal)) {
      if (event.type === "done") {
        logModelAttempt({ ...telemetry, provider: provider.id, model: provider.model, attempt: 1, route: "baseline", outcome: "success", durationMs: Math.round(performance.now() - started), inputTokens: event.inputTokens, outputTokens: event.outputTokens });
        yield { ...event, provider: event.provider ?? provider.id, modelRoute: "baseline" };
      } else yield event;
    }
  } catch (error) {
    logModelAttempt({ ...telemetry, provider: provider.id, model: provider.model, attempt: 1, route: "baseline", outcome: modelAttemptOutcome(error, signal.aborted, false), durationMs: Math.round(performance.now() - started), status: error instanceof ProviderError ? error.status : undefined });
    throw error;
  }
}

async function* providerStream(provider: ReplyProvider, request: GenerateReplyRequest, signal: AbortSignal): AsyncGenerator<ProviderStreamEvent> {
  if (provider.stream) {
    yield* provider.stream(request, signal);
    return;
  }
  const result = await provider.generate(request, signal);
  yield { type: "delta", text: result.draft };
  yield { type: "done", inputTokens: result.inputTokens, outputTokens: result.outputTokens, provider: result.provider ?? provider.id, modelRoute: result.modelRoute };
}

async function observedAttempt(
  provider: ReplyProvider,
  request: GenerateReplyRequest,
  signal: AbortSignal,
  telemetry: ModelTelemetryContext | undefined,
  attempt: number,
  route: ModelRoute,
  timedOut: () => boolean
): Promise<ProviderResult> {
  const started = performance.now();
  try {
    const result = await provider.generate(request, signal);
    if (telemetry) {
      logModelAttempt({
        ...telemetry,
        provider: provider.id,
        model: provider.model,
        attempt,
        route,
        outcome: "success",
        durationMs: Math.round(performance.now() - started),
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens
      });
    }
    return result;
  } catch (error) {
    const status = error instanceof ProviderError ? error.status : undefined;
    if (telemetry) {
      logModelAttempt({
        ...telemetry,
        provider: provider.id,
        model: provider.model,
        attempt,
        route,
        outcome: modelAttemptOutcome(error, signal.aborted, timedOut()),
        durationMs: Math.round(performance.now() - started),
        status
      });
    }
    throw error;
  }
}

type ModelAttemptOutcome = "success" | "timeout" | "rate_limited" | "authentication" | "upstream_4xx" | "upstream_5xx" | "network" | "invalid_response" | "aborted";

function modelAttemptOutcome(error: unknown, aborted: boolean, timedOut: boolean): ModelAttemptOutcome {
  if (timedOut) return "timeout";
  if (aborted) return "aborted";
  if (!(error instanceof ProviderError)) return "network";
  if (error.status === 429) return "rate_limited";
  if (error.status === 401 || error.status === 403) return "authentication";
  if (error.status !== undefined && error.status >= 500) return "upstream_5xx";
  if (error.status !== undefined && error.status >= 400) return "upstream_4xx";
  return "invalid_response";
}

function logModelAttempt(event: {
  requestId?: string;
  provider: string;
  model?: string;
  attempt: number;
  route: ModelRoute;
  outcome: ModelAttemptOutcome;
  durationMs: number;
  status?: number;
  inputTokens?: number;
  outputTokens?: number;
  country?: string;
  colo?: string;
}) {
  console.log(JSON.stringify({ event: "model_attempt", ...event }));
}

const draftJsonSchema = { type: "OBJECT", properties: { draft: { type: "STRING" } }, required: ["draft"] };

function parseDraft(text: unknown): string {
  if (typeof text !== "string" || !text.trim()) throw new ProviderError("The model returned no draft.", undefined, "Model returned empty content.");
  let parsed: { draft?: unknown };
  try { parsed = JSON.parse(text) as { draft?: unknown }; }
  catch { throw new ProviderError("The model returned an invalid draft.", undefined, "Model output was not valid JSON."); }
  if (typeof parsed.draft !== "string" || !parsed.draft.trim()) {
    throw new ProviderError("The model returned an invalid draft.", undefined, "Response did not match the requested { draft } shape.");
  }
  return parsed.draft.trim();
}

function responseError(status: number, raw: unknown): ProviderError {
  const message = extractUpstreamMessage(raw);
  return new ProviderError(mapProviderMessage(status), status, message ? `${status} ${message}` : `Upstream HTTP ${status}`, status === 408 || status === 429 || status >= 500);
}

function extractUpstreamMessage(raw: unknown): string | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const error = (raw as { error?: unknown }).error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && typeof (error as { message?: unknown }).message === "string") return (error as { message: string }).message;
  const errors = (raw as { errors?: unknown }).errors;
  return Array.isArray(errors) ? errors.map(String).join(", ") : undefined;
}

function errorDetail(error: unknown, timedOut: boolean): string {
  if (timedOut) return "attempt timed out";
  if (error instanceof ProviderError) return error.detail ?? error.message;
  return error instanceof Error ? error.message : String(error);
}

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  error?: { message?: string };
};
type OpenAiResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
  errors?: unknown[];
};
type OpenAiStreamResponse = {
  choices?: Array<{ delta?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

function parseJson<T>(value: string): T | null {
  try { return JSON.parse(value) as T; } catch { return null; }
}

async function* sseData(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
      let boundary: number;
      while ((boundary = buffer.indexOf("\n\n")) >= 0) {
        const event = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const data = event.split("\n").filter(line => line.startsWith("data:")).map(line => line.slice(5).trimStart()).join("\n");
        if (data) yield data;
      }
      if (done) break;
    }
    const data = buffer.split("\n").filter(line => line.startsWith("data:")).map(line => line.slice(5).trimStart()).join("\n");
    if (data) yield data;
  } finally { reader.releaseLock(); }
}

function mapProviderMessage(status: number) {
  if (status === 429) return "The model is busy or quota-limited. Try again shortly.";
  if (status === 401 || status === 403) return "The generation service credentials are invalid.";
  return "The model service is temporarily unavailable.";
}
