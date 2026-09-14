import { z } from "zod";

export const toneSchema = z.enum(["auto", "casual", "friendly", "professional", "polite", "direct"]);
export const lengthSchema = z.enum(["short", "medium", "detailed"]);
export const relationSchema = z.enum(["reply_to_post", "reply_to_comment", "reply_to_email", "compose_new", "selected_text", "none", "unknown"]);
export const confidenceSchema = z.enum(["high", "medium", "low"]);

export const contextEnvelopeSchema = z.object({
  relation: relationSchema,
  post: z.object({ title: z.string().max(500).optional(), body: z.string().max(8_000).optional() }).optional(),
  // Who sent the message being answered, when whoever read the page knows it.
  // Only the AI identification reports it — an adapter reads the raw header text
  // along with the message instead — and it travels to the reply prompt with the
  // rest of the envelope, so the model knows who it is writing to.
  sender: z.object({ name: z.string().max(200).nullable(), email: z.string().max(200).nullable() }).optional(),
  ancestors: z.array(z.object({ depth: z.number().int().min(1).max(10), body: z.string().max(4_000) })).max(3).optional(),
  target: z.object({ body: z.string().max(6_000) }).optional(),
  selectedText: z.string().max(8_000).optional(),
  truncated: z.boolean(),
  extractorVersion: z.string().max(40),
  confidence: confidenceSchema,
  missingFields: z.array(z.string().max(60)).max(12).optional()
});

// How Verbia behaved on the page that produced a request. It travels beside
// `platform` and not inside it, and that is deliberate: a closed enum on the wire
// cannot grow. The extension updates on its own schedule, so the day a client
// sends a value an already-deployed Worker does not know is the day that request
// is not degraded but rejected — an extension sending `platform: "email"` to a
// server with five known values answered 400 INVALID_REQUEST. New values go in
// as new *optional* fields, which an older server simply strips.
export const siteModeSchema = z.enum(["auto", "email", "universal"]);

export const generateReplyRequestSchema = z.object({
  requestId: z.string().uuid(),
  schemaVersion: z.literal("1"),
  platform: z.enum(["reddit", "gmail", "outlook", "universal"]),
  siteMode: siteModeSchema.optional(),
  page: z.object({ urlOrigin: z.string().url().max(300), locale: z.string().max(30).optional() }),
  context: contextEnvelopeSchema,
  intent: z.object({
    text: z.string().trim().min(1).max(2_000),
    source: z.enum(["typed", "voice_transcript"])
  }),
  output: z.object({ language: z.string().min(2).max(30), tone: toneSchema, length: lengthSchema }),
  client: z.object({ extensionVersion: z.string().max(30), adapterVersion: z.string().max(30) })
});

// A text selection the user added via the right-click menu ("Add to Verbia
// context") while the reply panel was closed. Staged per tab in
// chrome.storage.session; merged into the context envelope the next time
// Verbia opens on that tab. Each new selection replaces the previous one.
export const stagedContextSchema = z.object({
  text: z.string().trim().min(1).max(8_000),
  truncated: z.boolean(),
  pageUrl: z.string().max(2_000),
  updatedAt: z.number().int().nonnegative()
});

export const generateReplyResponseSchema = z.object({
  requestId: z.string().uuid(),
  draft: z.string().trim().min(1).max(8_000),
  detectedIntentLanguage: z.string().optional(),
  warnings: z.array(z.enum(["low_context_confidence", "context_truncated", "possible_unsupported_request"])),
  modelRoute: z.enum(["baseline", "fallback"]),
  usage: z.object({ inputTokens: z.number().int().optional(), outputTokens: z.number().int().optional() }).optional(),
  latencyMs: z.number().nonnegative()
});

// --- AI context extraction: the repair path -----------------------------------
//
// The mail adapters read the region around a reply box themselves (@see
// apps/extension/src/content/context/collector.ts). When that read is wrong the
// user can ask for this instead: the collected region goes to a model that says
// which part of it is the message being answered, who sent it, and what the
// subject is.
//
// Two gates keep this from becoming an always-on call. The extension only sends
// it from the button's own click handler, and `trigger` must be
// "explicit_user_click" for the server to accept the request at all — a missing
// gate in the UI then costs a 400 instead of a silent bill.

export const extractionTaskSchema = z.enum(["compose", "reply", "reply_all", "forward", "unknown"]);
export const extractionWarningSchema = z.enum(["subject_not_found", "sender_not_found", "sender_name_not_found", "no_current_message"]);

export const contextExtractionRequestSchema = z.object({
  requestId: z.string().uuid(),
  schemaVersion: z.literal("1"),
  trigger: z.literal("explicit_user_click"),
  platform: z.enum(["reddit", "gmail", "outlook", "qqmail", "universal"]),
  siteMode: siteModeSchema.optional(),
  page: z.object({ urlOrigin: z.string().url().max(300), locale: z.string().max(30).optional() }),
  collected: z.object({
    // The region text, already cleaned in the browser. Never the page: the
    // extractor only ever sees what the collector handed over.
    text: z.string().trim().min(1).max(6_000),
    truncated: z.boolean(),
    nodeCount: z.number().int().nonnegative().max(10_000)
  }),
  client: z.object({ extensionVersion: z.string().max(30), collectorVersion: z.string().max(30) })
});

export const contextExtractionResponseSchema = z.object({
  requestId: z.string().uuid(),
  task: extractionTaskSchema,
  subject: z.string().max(500).nullable(),
  sender: z.object({ name: z.string().max(200).nullable(), email: z.string().max(200).nullable() }).nullable(),
  currentMessage: z.string().max(6_000).nullable(),
  // The rounds before it, most recent first. Two or three rounds are what tells a
  // reply what "as I said earlier" refers to; everything older is cost without
  // signal (@see §14 of the PRD). An extraction that cannot tell the rounds apart
  // returns an empty list, which is why this is required rather than optional.
  previousMessages: z.array(z.string().max(4_000)).max(3),
  // The model's confidence, lowered by how much of the result could be traced
  // back to the collected text. The client's accept threshold applies to this
  // number, never to the model's own claim (@see reliabilityOf in extraction.ts).
  confidence: z.number().min(0).max(1),
  validation: z.object({ grounded: z.boolean(), warnings: z.array(extractionWarningSchema) }),
  usage: z.object({ inputTokens: z.number().int().optional(), outputTokens: z.number().int().optional() }).optional(),
  latencyMs: z.number().nonnegative()
});

export const VOICE_LANGUAGE_OPTIONS = [
  { value: "auto", label: "Auto (follow browser)" },
  { value: "en-US", label: "English" },
  { value: "zh-CN", label: "简体中文" },
  { value: "zh-TW", label: "繁體中文" },
  { value: "ja-JP", label: "日本語" },
  { value: "ko-KR", label: "한국어" },
  { value: "es-ES", label: "Español" },
  { value: "pt-BR", label: "Português" },
  { value: "fr-FR", label: "Français" },
  { value: "de-DE", label: "Deutsch" },
  { value: "it-IT", label: "Italiano" },
  { value: "tr-TR", label: "Türkçe" },
  { value: "ru-RU", label: "Русский" },
  { value: "hi-IN", label: "हिन्दी" },
  { value: "vi-VN", label: "Tiếng Việt" },
  { value: "id-ID", label: "Bahasa Indonesia" },
  { value: "ar-SA", label: "العربية" }
] as const;

export const UI_LANGUAGE_OPTIONS = [
  { value: "auto", label: "Auto (follow browser)" },
  { value: "en", label: "English" },
  { value: "zh-CN", label: "简体中文" },
  { value: "es", label: "Español" },
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "ja", label: "日本語" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" },
  { value: "ko", label: "한국어" },
  { value: "it", label: "Italiano" },
  { value: "tr", label: "Türkçe" },
  { value: "vi", label: "Tiếng Việt" },
  { value: "id", label: "Bahasa Indonesia" }
] as const;

// Target languages offered in the Reply Language selector. Generation itself
// is not limited to this list — these are just the presets shown in the UI.
// Labels use each language's endonym (own name); values are BCP-47-ish tags
// sent to the model. Keep en first: it is the stored default.
export const REPLY_LANGUAGE_OPTIONS = [
  // East Asia
  { value: "en", label: "English" },
  { value: "zh-CN", label: "简体中文" },
  { value: "zh-TW", label: "繁體中文" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "th", label: "ไทย" },
  { value: "vi", label: "Tiếng Việt" },
  { value: "lo", label: "ລາວ" },
  { value: "km", label: "ខ្មែរ" },
  { value: "my", label: "မြန်မာ" },
  // South Asia & Middle East
  { value: "hi", label: "हिन्दी" },
  { value: "bn", label: "বাংলা" },
  { value: "ur", label: "اردو" },
  { value: "ne", label: "नेपाली" },
  { value: "si", label: "සිංහල" },
  { value: "ta", label: "தமிழ்" },
  { value: "te", label: "తెలుగు" },
  { value: "ml", label: "മലയാളം" },
  { value: "kn", label: "ಕನ್ನಡ" },
  { value: "ar", label: "العربية" },
  { value: "fa", label: "فارسی" },
  { value: "he", label: "עברית" },
  { value: "tr", label: "Türkçe" },
  { value: "az", label: "Azərbaycan dili" },
  { value: "kk", label: "Қазақ тілі" },
  // Southeast Asia
  { value: "id", label: "Bahasa Indonesia" },
  { value: "ms", label: "Bahasa Melayu" },
  { value: "fil", label: "Filipino" },
  // Europe
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "pt", label: "Português" },
  { value: "it", label: "Italiano" },
  { value: "nl", label: "Nederlands" },
  { value: "ru", label: "Русский" },
  { value: "uk", label: "Українська" },
  { value: "pl", label: "Polski" },
  { value: "cs", label: "Čeština" },
  { value: "sk", label: "Slovenčina" },
  { value: "sl", label: "Slovenščina" },
  { value: "hr", label: "Hrvatski" },
  { value: "sr", label: "Српски" },
  { value: "bg", label: "Български" },
  { value: "ro", label: "Română" },
  { value: "hu", label: "Magyar" },
  { value: "el", label: "Ελληνικά" },
  { value: "sv", label: "Svenska" },
  { value: "da", label: "Dansk" },
  { value: "no", label: "Norsk" },
  { value: "fi", label: "Suomi" },
  { value: "et", label: "Eesti" },
  { value: "lv", label: "Latviešu" },
  { value: "lt", label: "Lietuvių" },
  { value: "ca", label: "Català" },
  // Africa
  { value: "sw", label: "Kiswahili" },
  { value: "af", label: "Afrikaans" },
  { value: "am", label: "አማርኛ" }
] as const;

export const apiErrorSchema = z.object({
  requestId: z.string(),
  code: z.enum(["INVALID_REQUEST", "TOO_LARGE", "RATE_LIMITED", "PROVIDER_ERROR", "TIMEOUT", "UNSAFE_CONTENT", "NOT_CONFIGURED", "UNAUTHENTICATED", "QUOTA_EXCEEDED"]),
  retryable: z.boolean(),
  userMessage: z.string(),
  detail: z.string().optional()
});

export type ContextEnvelope = z.infer<typeof contextEnvelopeSchema>;
export type GenerateReplyRequest = z.infer<typeof generateReplyRequestSchema>;
export type GenerateReplyResponse = z.infer<typeof generateReplyResponseSchema>;
export type ExtractionTask = z.infer<typeof extractionTaskSchema>;
export type ExtractionWarning = z.infer<typeof extractionWarningSchema>;
export type ContextExtractionRequest = z.infer<typeof contextExtractionRequestSchema>;
export type ContextExtractionResponse = z.infer<typeof contextExtractionResponseSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
export type StagedContext = z.infer<typeof stagedContextSchema>;
export type Tone = z.infer<typeof toneSchema>;
export type ReplyLength = z.infer<typeof lengthSchema>;

export const TONE_VALUES: readonly Tone[] = toneSchema.options;
export const LENGTH_VALUES: readonly ReplyLength[] = lengthSchema.options;

export type UserSettings = {
  schemaVersion: 1;
  uiLanguage: string;
  voiceLanguage: string;
  outputLanguage: string;
  defaultTone: Tone;
  defaultLength: ReplyLength;
  showLanguageInPanel: boolean;
  showToneInPanel: boolean;
  showLengthInPanel: boolean;
  telemetryEnabled: boolean;
  contextPreviewExpanded: boolean;
  backendBaseUrl: string;
};

export const DEFAULT_SETTINGS: UserSettings = {
  schemaVersion: 1,
  uiLanguage: "auto",
  voiceLanguage: "auto",
  outputLanguage: "en",
  defaultTone: "auto",
  defaultLength: "short",
  showLanguageInPanel: true,
  showToneInPanel: true,
  showLengthInPanel: true,
  telemetryEnabled: false,
  contextPreviewExpanded: false,
  backendBaseUrl: "https://api.verbia.henriz.dev"
};
