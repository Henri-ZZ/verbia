import { readFileSync } from "node:fs";
import path from "node:path";

// Checks that the Supabase project really contains every table and function
// docs/supabase-schema.sql declares.
//
// Why this exists: the database is a *separate deployment* from the Worker.
// `wrangler deploy` ships JavaScript only — nothing in the repo reads the SQL
// file — so a schema revision that nobody pasted into the Supabase SQL editor
// leaves production running older database code. That drift is quiet by design:
// the gateway treats infrastructure trouble as non-fatal (a draft must never be
// blocked by a database hiccup), so replies keep working while usage silently
// stops being recorded and daily quotas silently stop being enforced.
//
// This script reads the schema file, probes the project, and prints what is
// missing. Run it after editing docs/supabase-schema.sql and before deploying
// the gateway.
//
// It is read-only by construction: every probe carries only the publishable
// (anon) key, and the schema revokes anon from every function it defines, so
// PostgREST refuses to execute any of them. A function that *does* run under
// that key is reported, because it means the grants are wider than intended.
const root = process.cwd();
// Defaults to the repo's schema; a path argument checks a candidate file first
// (useful before pasting a revision into the SQL editor).
const schemaPath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, "docs", "supabase-schema.sql");
const schemaFile = path.relative(root, schemaPath);

function readKeyValues(text) {
  const values = {};
  for (const line of text.split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (match) values[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
  return values;
}

// Same lookup order the rest of the tooling uses: an explicit environment wins,
// then the deployment config (`wrangler.jsonc` is what production actually
// runs), then the local development file.
function resolveConfig() {
  const fromEnv = { SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY };
  if (fromEnv.SUPABASE_URL && fromEnv.SUPABASE_PUBLISHABLE_KEY) return { ...fromEnv, source: "environment" };

  let text = "";
  try { text = readFileSync(path.join(root, "wrangler.jsonc"), "utf8"); } catch { text = ""; }
  const fromWrangler = { SUPABASE_URL: /"SUPABASE_URL"\s*:\s*"([^"]+)"/.exec(text)?.[1], SUPABASE_PUBLISHABLE_KEY: /"SUPABASE_PUBLISHABLE_KEY"\s*:\s*"([^"]+)"/.exec(text)?.[1] };
  if (fromWrangler.SUPABASE_URL && fromWrangler.SUPABASE_PUBLISHABLE_KEY) return { ...fromWrangler, source: "wrangler.jsonc" };

  let local = {};
  try { local = readKeyValues(readFileSync(path.join(root, ".env.local"), "utf8")); } catch { local = {}; }
  return { SUPABASE_URL: local.SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY: local.SUPABASE_PUBLISHABLE_KEY ?? local.SUPABASE_ANON_KEY, source: ".env.local" };
}

// Argument names are read straight out of the SQL so the probe list never has
// to be maintained by hand. Only plain `name type [default …]` parameters are
// understood, which is all this schema uses.
function argNames(args) {
  return args.split(",").map(part => /^(\w+)\s+\w/.exec(part.trim())?.[1]).filter(Boolean);
}

function declaredObjects(sql) {
  return {
    tables: [...sql.matchAll(/create table if not exists\s+public\.(\w+)/gi)].map(match => match[1]),
    functions: [...sql.matchAll(/create or replace function\s+public\.(\w+)\s*\(([\s\S]*?)\)\s*returns/gi)]
      .map(match => ({ name: match[1], params: argNames(match[2]) }))
      .filter((fn, index, all) => all.findIndex(other => other.name === fn.name) === index)
  };
}

// 403/42501 means PostgREST found the object and the anon role is not allowed
// to touch it — which is the expected, healthy answer here. Only an explicit
// "could not find" is a real failure; anything else is inconclusive and must
// not fail the check (a blocked network is not schema drift).
async function probeTable(url, key, table) {
  const response = await fetch(`${url}/rest/v1/${table}?select=*&limit=0`, { headers: { apikey: key } });
  if (response.ok || response.status === 401 || response.status === 403) return { state: "ok" };
  const body = await response.json().catch(() => null);
  // PGRST205 is PostgREST's "no such table"; a bare 404 from somewhere else (a
  // mistyped project URL answering with an error page) is not evidence of
  // drift, so it stays inconclusive.
  if (body?.code === "PGRST205") return { state: "missing" };
  return { state: "unknown", detail: `HTTP ${response.status}` };
}

async function probeFunction(url, key, fn) {
  const response = await fetch(`${url}/rest/v1/rpc/${fn.name}`, {
    method: "POST",
    headers: { apikey: key, "content-type": "application/json" },
    body: JSON.stringify(Object.fromEntries(fn.params.map(name => [name, null])))
  });
  const body = await response.json().catch(() => null);
  // PGRST202 is "no such function". Everything else — including the expected
  // permission error — means PostgREST resolved it.
  if (body?.code === "PGRST202") return { state: "missing" };
  if (response.ok) return { state: "ok", detail: "executable by anon — check its grants" };
  if (response.status >= 500) return { state: "unknown", detail: `HTTP ${response.status}` };
  return { state: "ok" };
}

const config = resolveConfig();
if (!config.SUPABASE_URL || !config.SUPABASE_PUBLISHABLE_KEY) {
  console.error("[db-check] No Supabase URL / publishable key found in the environment, wrangler.jsonc or .env.local.");
  process.exit(1);
}
const url = config.SUPABASE_URL.replace(/\/+$/, "");
const { tables, functions } = declaredObjects(readFileSync(schemaPath, "utf8"));

console.log(`[db-check] project ${url} (from ${config.source})`);
console.log(`[db-check] schema  ${schemaFile} — ${tables.length} tables, ${functions.length} functions\n`);

const missing = [];
const skipped = [];
const notes = [];

for (const table of tables) {
  let result;
  try { result = await probeTable(url, config.SUPABASE_PUBLISHABLE_KEY, table); }
  catch (error) { result = { state: "unknown", detail: error.message }; }
  if (result.state === "missing") missing.push(`table ${table}`);
  else if (result.state === "unknown") notes.push(`table ${table}: ${result.detail}`);
  console.log(`  ${result.state === "missing" ? "MISSING" : result.state === "unknown" ? "unknown" : "ok     "}  table      ${table}`);
}

for (const fn of functions) {
  // A function without parameters cannot be probed safely: PostgREST would run
  // it (and `create function` grants EXECUTE to PUBLIC by default). Trigger
  // functions like handle_new_user() are exercised on signup anyway.
  if (fn.params.length === 0) {
    skipped.push(fn.name);
    console.log(`  skip     function   ${fn.name}  (no parameters — probing it would execute it)`);
    continue;
  }
  let result;
  try { result = await probeFunction(url, config.SUPABASE_PUBLISHABLE_KEY, fn); }
  catch (error) { result = { state: "unknown", detail: error.message }; }
  if (result.state === "missing") missing.push(`function ${fn.name}`);
  if (result.detail) notes.push(`function ${fn.name}: ${result.detail}`);
  console.log(`  ${result.state === "missing" ? "MISSING" : result.state === "unknown" ? "unknown" : "ok     "}  function   ${fn.name}`);
}

console.log("");
for (const note of notes) console.warn(`[db-check] note: ${note}`);
if (skipped.length) console.log(`[db-check] ${skipped.length} skipped: ${skipped.join(", ")}`);

if (missing.length) {
  console.error(`[db-check] the database is missing ${missing.length} object(s): ${missing.join(", ")}`);
  console.error(`[db-check] paste ${schemaFile} into the Supabase SQL editor (every statement is idempotent), then run this again.`);
  process.exit(1);
}
console.log("[db-check] database matches the schema.");
