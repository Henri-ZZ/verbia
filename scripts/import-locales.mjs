// Imports a batch of translated locale strings into the shared string table.
//
// The translations are produced outside the repo — a machine-translation run over
// the EN key set, written as {locale: {key: value}} — and this script does only the
// mechanical part: the `UiLang` union, the `UI_LANGS` list, one const per locale,
// and the `UI_STRINGS` map. The strings never pass through an editor: 173 keys per
// locale is 1730 lines nobody should retype.
//
//   node scripts/import-locales.mjs /tmp/verbia-locales.json zh-TW pl nl th ar ru uk hi cs ms
//
// Re-runnable: a locale already in the table is skipped, so a partial batch can be
// topped up, and a locale missing keys is refused rather than half-imported (a
// locale with a key missing renders the raw key in the interface).
import fs from "node:fs";

const [source, ...codes] = process.argv.slice(2);
if (!source || !codes.length) {
  console.error("usage: node scripts/import-locales.mjs <translations.json> <locale> [locale…]");
  process.exit(1);
}

const file = "packages/shared/src/ui-strings.ts";
const translations = JSON.parse(fs.readFileSync(source, "utf8"));
let text = fs.readFileSync(file, "utf8");

const constName = (code) => code.replace(/[^a-z0-9]/gi, "_").toUpperCase();
const MAP_ANCHOR = "export const UI_STRINGS: Record<UiLang, Strings> = {";

// The key set comes from EN, the file's own source of truth for it: a locale is
// accepted only when it carries every one of these.
const enStart = text.indexOf("const EN: Strings = {");
const keys = [...text.slice(enStart, text.indexOf("\n};", enStart))
  .matchAll(/^\s*"([^"]+)":\s*"(?:[^"\\]|\\.)*",?$/gm)].map((match) => match[1]);

let imported = 0;
for (const code of codes) {
  const values = translations[code];
  if (!values) { console.error(`skip ${code}: not in ${source}`); continue; }
  if (text.includes(`"${code}": `)) { console.log(`skip ${code}: already in the table`); continue; }
  const missing = keys.filter((key) => typeof values[key] !== "string");
  if (missing.length) { console.error(`skip ${code}: ${missing.length} keys missing (first: ${missing[0]})`); continue; }

  // The map entry first, then the const it names: both insertions look up their
  // anchor again so neither depends on the other's index.
  const mapEnd = text.indexOf("\n};", text.indexOf(MAP_ANCHOR));
  text = `${text.slice(0, mapEnd)},\n  ${JSON.stringify(code)}: ${constName(code)}${text.slice(mapEnd)}`;

  const block = `const ${constName(code)}: Strings = {\n${keys.map((key) => `  ${JSON.stringify(key)}: ${JSON.stringify(values[key])},`).join("\n")}\n};\n\n`;
  text = text.replace(MAP_ANCHOR, block + MAP_ANCHOR);

  text = text.replace(/^(export type UiLang = [^;]+);$/m, (_, head) => `${head} | "${code}";`);
  text = text.replace(/^(const UI_LANGS: readonly UiLang\[\] = \[[^\]]*)\];$/m, (_, head) => `${head}, "${code}"];`);

  imported += 1;
  console.log(`added ${code} (${keys.length} keys)`);
}

fs.writeFileSync(file, text);
console.log(`${imported} locale(s) written to ${file}`);
