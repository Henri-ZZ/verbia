import { z } from "zod";

export const toneSchema = z.enum(["auto", "casual", "friendly", "professional", "polite", "direct"]);
export const lengthSchema = z.enum(["short", "medium", "detailed"]);
export const relationSchema = z.enum(["reply_to_post", "reply_to_comment", "reply_to_email", "compose_new", "selected_text", "none", "unknown"]);
export const confidenceSchema = z.enum(["high", "medium", "low"]);

export const contextEnvelopeSchema = z.object({
  relation: relationSchema,
  post: z.object({ title: z.string().max(500).optional(), body: z.string().max(8_000).optional() }).optional(),
  ancestors: z.array(z.object({ depth: z.number().int().min(1).max(10), body: z.string().max(4_000) })).max(3).optional(),
  target: z.object({ body: z.string().max(6_000) }).optional(),
  selectedText: z.string().max(8_000).optional(),
  truncated: z.boolean(),
  extractorVersion: z.string().max(40),
  confidence: confidenceSchema,
  missingFields: z.array(z.string().max(60)).max(12).optional()
});

export const generateReplyRequestSchema = z.object({
  requestId: z.string().uuid(),
  schemaVersion: z.literal("1"),
  platform: z.enum(["reddit", "gmail", "universal"]),
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
  { value: "ru-RU", label: "Русский" },
  { value: "hi-IN", label: "हिन्दी" },
  { value: "ar-SA", label: "العربية" }
] as const;

export const UI_LANGUAGE_OPTIONS = [
  { value: "auto", label: "Auto (follow browser)" },
  { value: "en", label: "English" },
  { value: "zh-CN", label: "简体中文" }
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
