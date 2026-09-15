// Machine-translates the EN key set into new interface languages.
//
// The other half of scripts/import-locales.mjs: this writes the
// {locale: {key: value}} file that script imports. The key set is read from the
// EN block in packages/shared/src/ui-strings.ts — the file's own source of truth
// for it — so a new key needs no second list here.
//
//   GROQ_API_KEY=… GROQ_MODEL=… node scripts/translate-locales.mjs fil ro hu el he sv da no fi
//   node scripts/import-locales.mjs /tmp/verbia-locales.json fil ro hu el he sv da no fi
//
// Resumable by design: a locale already present in the output file is skipped, so
// a run stopped by a rate limit or a timeout continues by re-running the same
// command. Paced and batched because providers reject tight bursts, and a batch
// that comes back the wrong length or loses a {placeholder} is refused rather than
// written — a locale with a mangled string is worse than one that is a day late.
import fs from "node:fs";

// The prompt needs a language name spelled out, and this doubles as the allowlist:
// a code that is not here is not translated, so a typo fails loudly instead of
// shipping English words under a new tag.
const TARGETS = {
  fil: "Filipino (Tagalog)",
  ro: "Romanian",
  hu: "Hungarian",
  el: "Greek",
  he: "Hebrew",
  sv: "Swedish",
  da: "Danish",
  no: "Norwegian (Bokmål)",
  fi: "Finnish"
};

// ~90 short UI strings per request is what the provider reliably finishes inside
// its completion cap; the pause keeps a multi-locale run under its rate limit.
const BATCH = 90;
const PAUSE_MS = 70_000;
const RETRY_MS = 60_000;

const baseUrl = (process.env.TRANSLATE_BASE_URL ?? "https://api.groq.com/openai/v1").replace(/\/+$/, "");
const apiKey = process.env.TRANSLATE_API_KEY ?? process.env.GROQ_API_KEY ?? "";
const model = process.env.TRANSLATE_MODEL ?? process.env.GROQ_MODEL ?? "";
// Groq's reasoning models need to be told not to think here; set this to an empty
// string for an endpoint that rejects the field.
const reasoningEffort = process.env.TRANSLATE_REASONING_EFFORT ?? "none";
const out = process.env.TRANSLATE_OUT ?? "/tmp/verbia-locales.json";

const placeholders = (value) => (value.match(/\{[a-zA-Z]+\}/g) ?? []).sort().join(",");

function readEnglish() {
  const source = fs.readFileSync("packages/shared/src/ui-strings.ts", "utf8");
  const start = source.indexOf("const EN: Strings = {");
  const keys = [];
  const values = [];
  for (const [, key, raw] of source.slice(start, source.indexOf("\n};", start)).matchAll(/^\s*"([^"]+)":\s*"((?:[^"\\]|\\.)*)",?$/gm)) {
    keys.push(key);
    values.push(JSON.parse(`"${raw}"`));
  }
  if (!keys.length) throw new Error("could not read the EN key set from packages/shared/src/ui-strings.ts");
  return { keys, values };
}

async function ask(prompt, expected, label) {
  for (;;) {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      signal: AbortSignal.timeout(45_000),
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_completion_tokens: 2048,
        ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {})
      })
    });
    if (response.ok) {
      const body = await response.json();
      const raw = String(body.choices?.[0]?.message?.content ?? "").replace(/^```json\s*|\s*```$/g, "");
      const parsed = JSON.parse(raw.slice(raw.indexOf("["), raw.lastIndexOf("]") + 1));
      if (!Array.isArray(parsed) || parsed.length !== expected) {
        throw new Error(`${label}: provider returned ${parsed?.length} strings, expected ${expected}`);
      }
      return parsed;
    }
    console.error(`  ${label}: ${response.status}, retrying in ${Math.round(RETRY_MS / 1000)}s`);
    await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
  }
}

async function translate(code, name, keys, values) {
  const translated = [];
  for (let offset = 0; offset < values.length; offset += BATCH) {
    const part = values.slice(offset, offset + BATCH);
    const prompt = `Translate this JSON array of browser extension UI strings from English to ${name}. Return ONLY a valid JSON array with exactly ${part.length} strings in the same order. Translate every string naturally and concisely for software UI. Preserve Verbia, Gmail, Outlook, Reddit, Premium, URLs, placeholders such as {date}, and the sample email address. JSON:\n${JSON.stringify(part)}`;
    translated.push(...await ask(prompt, part.length, `${code} @${offset}`));
    process.stderr.write(`\r${code}: ${translated.length}/${values.length}`);
    if (offset + BATCH < values.length) await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
  }
  process.stderr.write("\n");

  const result = Object.fromEntries(keys.map((key, index) => [key, translated[index]]));
  const broken = keys.filter((key, index) => placeholders(values[index]) !== placeholders(String(result[key])));
  if (broken.length) throw new Error(`${code}: placeholders changed in ${broken.length} string(s), first: ${broken[0]}`);
  return result;
}

async function main() {
  const codes = process.argv.slice(2);
  if (!codes.length) {
    console.error(`usage: node scripts/translate-locales.mjs <locale> [locale…]\nknown targets: ${Object.keys(TARGETS).join(" ")}`);
    process.exit(1);
  }
  const unknown = codes.filter((code) => !TARGETS[code]);
  if (unknown.length) {
    console.error(`no target language for: ${unknown.join(" ")} — add it to TARGETS first`);
    process.exit(1);
  }
  if (!apiKey || !model) {
    console.error("set TRANSLATE_API_KEY (or GROQ_API_KEY) and TRANSLATE_MODEL (or GROQ_MODEL)");
    process.exit(1);
  }

  const { keys, values } = readEnglish();
  console.log(`${keys.length} keys per locale, ${codes.length} locale(s); API ${baseUrl}, model ${model}`);
  const file = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, "utf8")) : {};

  for (const code of codes) {
    if (file[code]) {
      console.log(`skip ${code}: already in ${out}`);
      continue;
    }
    file[code] = await translate(code, TARGETS[code], keys, values);
    fs.writeFileSync(out, JSON.stringify(file, null, 2));
    console.log(`wrote ${code} (${keys.length} strings) to ${out}`);
  }

  console.log(`\nnext: node scripts/import-locales.mjs ${out} ${codes.join(" ")}`);
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  console.error(`re-run the same command — locales already written to ${out} are skipped`);
  process.exit(1);
});
