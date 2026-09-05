import { build, context } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const out = path.join(root, "dist/extension");
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
    "process.env.SUPABASE_ANON_KEY": JSON.stringify(supabasePublishableKey)
  },
  alias: { "@verbia/shared": path.join(root, "packages/shared/src/index.ts") }
};

await Promise.all([
  cp("apps/extension/manifest.json", path.join(out, "manifest.json")),
  cp("apps/extension/_locales", path.join(out, "_locales"), { recursive: true }),
  cp("apps/extension/src/options/index.html", path.join(out, "options.html")),
  cp("apps/extension/src/options/options.css", path.join(out, "options.css")),
  cp("apps/extension/src/popup/index.html", path.join(out, "popup.html")),
  cp("apps/extension/src/popup/popup.css", path.join(out, "popup.css")),
  cp("apps/extension/src/auth/auth.html", path.join(out, "auth.html")),
  // apps/extension/assets holds third-party brand icons used in UI (google.svg
  // today; github/twitter etc. later). Each new icon is just a file drop — no
  // build script change needed.
  cp("apps/extension/assets", path.join(out, "assets"), { recursive: true }),
  cp("apps/extension/icons", path.join(out, "icons"), { recursive: true })
]);

const builds = [
  { ...sharedOptions, entryPoints: { background: "apps/extension/src/background/index.ts" }, format: "esm" },
  { ...sharedOptions, entryPoints: { content: "apps/extension/src/content/index.ts", options: "apps/extension/src/options/index.ts", popup: "apps/extension/src/popup/index.ts", auth: "apps/extension/src/auth/auth-page.ts" }, format: "iife" }
];

if (process.argv.includes("--watch")) {
  const buildContexts = await Promise.all(builds.map(options => context(options)));
  await Promise.all(buildContexts.map(buildContext => buildContext.watch()));
  console.log(`Watching ${out}`);
} else await Promise.all(builds.map(options => build(options)));
