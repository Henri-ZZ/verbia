import type { GenerateReplyRequest } from "@verbia/shared";
import { buildPrompt, SYSTEM_PROMPT } from "./prompt";

export type ProviderResult = { draft: string; inputTokens?: number; outputTokens?: number };

export interface ReplyProvider { generate(request: GenerateReplyRequest, signal: AbortSignal): Promise<ProviderResult>; }

export class MockProvider implements ReplyProvider {
  async generate(request: GenerateReplyRequest): Promise<ProviderResult> {
    const isEnglish = /^[\x00-\x7F\s\p{P}]*$/u.test(request.intent.text);
    const draft = isEnglish ? request.intent.text : `[Mock English draft] ${request.intent.text}`;
    return { draft };
  }
}

export class GeminiProvider implements ReplyProvider {
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
          responseSchema: { type: "OBJECT", properties: { draft: { type: "STRING" } }, required: ["draft"] }
        }
      })
    });
    const raw = await response.json().catch(() => null) as GeminiResponse | null;
    if (!response.ok) {
      // Surface the upstream reason (region blocks, model errors, quota…)
      // verbatim so operators and users see what actually happened.
      const upstream = (raw as { error?: { message?: string } } | null)?.error?.message;
      throw Object.assign(new Error(mapProviderMessage(response.status)), {
        status: response.status,
        detail: upstream ? `${response.status} ${upstream}` : `Upstream HTTP ${response.status}`
      });
    }
    const text = raw?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw Object.assign(new Error("The model returned no draft."), { detail: "Model returned no candidates or empty content." });
    let parsed: { draft?: unknown };
    try { parsed = JSON.parse(text) as { draft?: unknown }; } catch { throw Object.assign(new Error("The model returned an invalid draft."), { detail: "Model output was not valid JSON." }); }
    if (typeof parsed.draft !== "string" || !parsed.draft.trim()) throw Object.assign(new Error("The model returned an invalid draft."), { detail: "Response did not match the requested { draft } shape." });
    return { draft: parsed.draft.trim(), inputTokens: raw?.usageMetadata?.promptTokenCount, outputTokens: raw?.usageMetadata?.candidatesTokenCount };
  }
}

type GeminiResponse = { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } };
function mapProviderMessage(status: number) { if (status === 429) return "The model is busy or quota-limited. Try again shortly."; if (status === 401 || status === 403) return "The generation service credentials are invalid."; return "The model service is temporarily unavailable."; }
