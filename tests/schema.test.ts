import { describe, expect, it } from "vitest";
import { UI_STRINGS, VOICE_LANGUAGE_OPTIONS, generateReplyRequestSchema, isRtl, resolveUiLang, voiceTagFor } from "@verbia/shared";

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
    expect(resolveUiLang("auto", "fil-PH")).toBe("fil");
    expect(resolveUiLang("auto", "ro-RO")).toBe("ro");
    expect(resolveUiLang("auto", "hu-HU")).toBe("hu");
    expect(resolveUiLang("auto", "el-GR")).toBe("el");
    expect(resolveUiLang("auto", "he-IL")).toBe("he");
    expect(resolveUiLang("auto", "sv-SE")).toBe("sv");
    expect(resolveUiLang("auto", "da-DK")).toBe("da");
    expect(resolveUiLang("auto", "no-NO")).toBe("no");
    expect(resolveUiLang("auto", "fi-FI")).toBe("fi");
  });

  // Chrome reports Norwegian Bokmål as "nb" (and Nynorsk as "nn") while both the
  // package and the store use "no"; a gap here drops Norwegian readers to English.
  it("serves the Norwegian variants from the same strings", () => {
    expect(resolveUiLang("auto", "nb-NO")).toBe("no");
    expect(resolveUiLang("auto", "nn-NO")).toBe("no");
  });

  // "tl" is the code older Chrome builds report for the same language, and the
  // "fi" it is also a prefix of belongs to Finnish — one branch serves both, in
  // this order, so Filipino never lands on the Finnish strings.
  it("reads the legacy Tagalog code as Filipino", () => expect(resolveUiLang("auto", "tl-PH")).toBe("fil"));

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

// Options, popup and the in-page panel each carry the direction on their own root,
// because each bypasses or resets what the page sets. All three read this list, so
// a right-to-left language is named in exactly one place.
describe("isRtl", () => {
  it("knows the right-to-left languages we ship", () => {
    expect(isRtl("ar")).toBe(true);
    expect(isRtl("he")).toBe(true);
  });

  it("leaves left-to-right languages alone", () => {
    for (const lang of ["en", "zh-CN", "zh-TW", "ja", "ko", "ru", "hi", "th", "vi"]) expect(isRtl(lang), lang).toBe(false);
  });
});

// Dictation has no language detection: the browser loads one recognition model per
// language and has to be told which. "Auto" therefore resolves to the interface
// language, and these two checks are what keep that table from falling behind the
// string table the way the voice picker itself once did.
describe("voiceTagFor", () => {
  const languages = Object.keys(UI_STRINGS) as Array<keyof typeof UI_STRINGS>;

  it("gives every interface language a region-tagged recognition language", () => {
    for (const lang of languages) expect(voiceTagFor(lang), lang).toMatch(/^[a-z]{2,3}-[A-Z]{2}$/);
  });

  it("offers every recognition tag in the settings picker", () => {
    const offered = new Set<string>(VOICE_LANGUAGE_OPTIONS.map(option => option.value));
    for (const lang of languages) expect(offered.has(voiceTagFor(lang)), `${lang} → ${voiceTagFor(lang)}`).toBe(true);
  });

  // Where interface tag and recognition tag differ: Chrome's Norwegian model is
  // Bokmål, and Filipino and Hebrew recognition tags carry their own regions.
  it("maps the languages whose recognition tag differs", () => {
    expect(voiceTagFor("no")).toBe("nb-NO");
    expect(voiceTagFor("fil")).toBe("fil-PH");
    expect(voiceTagFor("he")).toBe("he-IL");
    expect(voiceTagFor("sv")).toBe("sv-SE");
  });
});
