import { describe, expect, it } from "vitest";
import { UI_STRINGS, generateReplyRequestSchema, resolveUiLang } from "@verbia/shared";

const valid = { requestId: "ad37fb67-54ed-4b84-b9c3-658f65252c0d", schemaVersion: "1", platform: "reddit", page: { urlOrigin: "https://www.reddit.com" }, context: { relation: "reply_to_comment", target: { body: "Price is still low." }, truncated: false, extractorVersion: "1.0.0", confidence: "high" }, intent: { text: "礼貌地不同意", source: "typed" }, output: { language: "en", tone: "polite", length: "short" }, client: { extensionVersion: "0.1.0", adapterVersion: "1.0.0" } };

describe("generation schema", () => {
  it("accepts a bounded, normalized request", () => expect(generateReplyRequestSchema.safeParse(valid).success).toBe(true));
  it("rejects an empty intent", () => expect(generateReplyRequestSchema.safeParse({ ...valid, intent: { ...valid.intent, text: " " } }).success).toBe(false));
  it("rejects a query-bearing full URL as origin", () => expect(generateReplyRequestSchema.safeParse({ ...valid, page: { urlOrigin: "not a url" } }).success).toBe(false));
});

// A language is only supported when it carries every key EN has: a missing one
// renders as the raw key in the interface, which is how a half-added language ships
// looking broken. Adding a key means adding it 22 times, and this is the check that
// notices when it was added 21.
describe("UI strings", () => {
  const languages = Object.keys(UI_STRINGS) as Array<keyof typeof UI_STRINGS>;
  const en = Object.keys(UI_STRINGS.en).sort();

  it("keeps every language symmetric with EN", () => {
    for (const lang of languages) expect(Object.keys(UI_STRINGS[lang]).sort(), lang).toEqual(en);
  });

  it("has no empty string", () => {
    for (const lang of languages) {
      const empty = Object.entries(UI_STRINGS[lang]).filter(([, value]) => !value.trim()).map(([key]) => key);
      expect(empty, lang).toEqual([]);
    }
  });
});

describe("resolveUiLang", () => {
  it("uses the stored preference when it is a language we have", () => expect(resolveUiLang("ru", "en-US")).toBe("ru"));

  // A language in the table but missing from the selectable list is one the settings
  // page offers and resolveUiLang then refuses — silently falling back to English.
  // That is exactly what happened when 10 locales were imported in one pass.
  it("accepts every language we ship as a stored preference", () => {
    for (const lang of Object.keys(UI_STRINGS)) expect(resolveUiLang(lang, "en-US"), lang).toBe(lang);
  });

  it("reads the browser locale for every supported language", () => {
    expect(resolveUiLang("auto", "ru-RU")).toBe("ru");
    expect(resolveUiLang("auto", "uk-UA")).toBe("uk");
    expect(resolveUiLang("auto", "ar-EG")).toBe("ar");
    expect(resolveUiLang("auto", "hi-IN")).toBe("hi");
    expect(resolveUiLang("auto", "cs-CZ")).toBe("cs");
    expect(resolveUiLang("auto", "pl-PL")).toBe("pl");
    expect(resolveUiLang("auto", "nl-NL")).toBe("nl");
    expect(resolveUiLang("auto", "th-TH")).toBe("th");
    expect(resolveUiLang("auto", "ms-MY")).toBe("ms");
  });

  // The two Chinese scripts must not be confused: every "zh" used to mean simplified,
  // which handed Traditional readers a script they do not read.
  it("tells Traditional Chinese from Simplified", () => {
    expect(resolveUiLang("auto", "zh-TW")).toBe("zh-TW");
    expect(resolveUiLang("auto", "zh-HK")).toBe("zh-TW");
    expect(resolveUiLang("auto", "zh-Hant")).toBe("zh-TW");
    expect(resolveUiLang("auto", "zh-CN")).toBe("zh-CN");
    expect(resolveUiLang("auto", "zh")).toBe("zh-CN");
  });

  it("falls back to English for a language we do not have", () => expect(resolveUiLang("auto", "xx-YY")).toBe("en"));
});
