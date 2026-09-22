import { build, context } from "esbuild";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

// `--release` produces the Chrome Web Store build: it goes into dist/release,
// pins the production backend, drops the Developer settings card and removes
// the localhost host permission. Plain `pnpm build` / `pnpm dev` keep the
// editable Backend URL and localhost access for development.
const release = process.argv.includes("--release");
const out = path.join(root, "dist", release ? "release" : "extension");
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

// Minimal KEY=VALUE parser for .env.local. The api service loads it via tsx
// --env-file; the extension has no process.env at runtime, so the two values
// the auth flow needs are inlined here as compile-time constants.
function loadLocalEnv() {
  const values = {};
  try {
    for (const line of readFileSync(path.join(root, ".env.local"), "utf8").split("\n")) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) continue;
      values[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch { /* missing .env.local: build ships without Supabase sign-in */ }
  return values;
}

const localEnv = loadLocalEnv();
const supabaseUrl = localEnv.SUPABASE_URL ?? "";
const supabasePublishableKey = localEnv.SUPABASE_PUBLISHABLE_KEY ?? localEnv.SUPABASE_ANON_KEY ?? "";
if (supabaseUrl && supabasePublishableKey) console.log(`[build] Supabase auth configured: ${supabaseUrl}`);
else console.warn("[build] SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY missing — sign-in is disabled in this build");

// Release builds talk only to the production gateway. Development builds keep
// the user-configurable Backend URL (and therefore define an empty fallback).
const VERBIA_BACKEND_URL = release ? process.env.VERBIA_BACKEND_URL ?? "https://api.verbia.henriz.dev" : "";
console.log(`[build] mode=${release ? "release" : "development"} backend=${VERBIA_BACKEND_URL || "<settings>"}`);

const sharedOptions = {
  outdir: out,
  bundle: true,
  target: "chrome120",
  sourcemap: false,
  minify: false,
  logLevel: "info",
  define: {
    "process.env.SUPABASE_URL": JSON.stringify(supabaseUrl),
    "process.env.SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabasePublishableKey),
    "process.env.SUPABASE_ANON_KEY": JSON.stringify(supabasePublishableKey),
    // JSON.stringify, like every define above: a bare "1" is read as a JavaScript
    // expression, so the comparison in options/index.ts became `1 === "1"` — always
    // false. Release builds then took the development branch, read the #backend
    // select that packaging had already stripped, found an empty URL and refused to
    // save. Keep every define JSON-encoded.
    "process.env.VERBIA_RELEASE": JSON.stringify(release ? "1" : "0"),
    "process.env.VERBIA_BACKEND_URL": JSON.stringify(VERBIA_BACKEND_URL),
    "process.env.VERBIA_WEB_ORIGIN": JSON.stringify(localEnv.VERBIA_WEB_ORIGIN ?? "https://verbia.henriz.dev")
  },
  alias: { "@verbia/shared": path.join(root, "packages/shared/src/index.ts") }
};

// Release manifests must not ask for localhost access; dev builds keep it so
// a local thin gateway is reachable during development.
async function copyManifest() {
  if (!release) {
    await cp("apps/extension/manifest.json", path.join(out, "manifest.json"));
    return;
  }
  const manifest = JSON.parse(readFileSync(path.join(root, "apps/extension/manifest.json"), "utf8"));
  // `key` only pins the ID for unpacked development loads; the Web Store assigns
  // its own ID and rejects/ignores it in uploaded packages.
  delete manifest.key;
  manifest.host_permissions = (manifest.host_permissions ?? []).filter(entry => !entry.startsWith("http://localhost"));
  await writeFile(path.join(out, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`[build] release manifest: removed key + localhost host permissions (${manifest.host_permissions.length} remain)`);
}

// Release options pages drop the whole Developer settings card (Backend URL)
// instead of just hiding it, so it never ships in the zip.
async function copyOptionsHtml() {
  const source = readFileSync(path.join(root, "apps/extension/src/options/index.html"), "utf8");
  const html = release ? source.replace(/<section class="settings-section developer-section">[\s\S]*?<\/section>/, "") : source;
  await writeFile(path.join(out, "options.html"), html);
}

await Promise.all([
  copyManifest(),
  cp("apps/extension/_locales", path.join(out, "_locales"), { recursive: true }),
  copyOptionsHtml(),
  cp("apps/extension/src/options/options.css", path.join(out, "options.css")),
  cp("apps/extension/src/popup/index.html", path.join(out, "popup.html")),
  cp("apps/extension/src/popup/popup.css", path.join(out, "popup.css")),
  cp("apps/extension/src/account.css", path.join(out, "account.css")),
  // apps/extension/assets holds third-party brand icons used in UI (google.svg
  // today; github/twitter etc. later). Each new icon is just a file drop — no
  // build script change needed.
  cp("apps/extension/assets", path.join(out, "assets"), { recursive: true }),
  cp("apps/extension/icons", path.join(out, "icons"), { recursive: true })
]);

const builds = [
  { ...sharedOptions, entryPoints: { background: "apps/extension/src/background/index.ts" }, format: "esm" },
  { ...sharedOptions, entryPoints: { content: "apps/extension/src/content/index.ts", bridge: "apps/extension/src/bridge.ts", options: "apps/extension/src/options/index.ts", popup: "apps/extension/src/popup/index.ts" }, format: "iife" }
];

if (process.argv.includes("--watch")) {
  const buildContexts = await Promise.all(builds.map(options => context(options)));
  await Promise.all(buildContexts.map(buildContext => buildContext.watch()));
  console.log(`Watching ${out}`);
} else await Promise.all(builds.map(options => build(options)));
