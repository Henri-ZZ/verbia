import type { GenerateReplyRequest } from "@verbia/shared";
import { buildPrompt, SYSTEM_PROMPT } from "./prompt";

export type ModelRoute = "baseline" | "fallback";
export type ProviderResult = {
  draft: string;
  inputTokens?: number;
  outputTokens?: number;
  provider?: string;
  modelRoute?: ModelRoute;
};

export interface ReplyProvider {
  readonly id: string;
  generate(request: GenerateReplyRequest, signal: AbortSignal): Promise<ProviderResult>;
}

export class ProviderError extends Error {
  constructor(message: string, public readonly status?: number, public readonly detail?: string, public readonly retryable = true) {
    super(message);
    this.name = "ProviderError";
  }
}

export class MockProvider implements ReplyProvider {
  readonly id = "mock";
  async generate(request: GenerateReplyRequest): Promise<ProviderResult> {
    return { draft: request.intent.text, provider: this.id, modelRoute: "baseline" };
  }
}

export class GeminiProvider implements ReplyProvider {
  readonly id = "gemini";
  constructor(private apiKey: string, private model: string, private maxOutputTokens: number, private temperature: number) {}

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
  constructor(private options: OpenAiOptions) { this.id = options.id; }

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

  async generate(request: GenerateReplyRequest, signal: AbortSignal): Promise<ProviderResult> {
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
        const result = await entry.provider.generate(request, AbortSignal.any([signal, timeoutSignal]));
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

function mapProviderMessage(status: number) {
  if (status === 429) return "The model is busy or quota-limited. Try again shortly.";
  if (status === 401 || status === 403) return "The generation service credentials are invalid.";
  return "The model service is temporarily unavailable.";
}
