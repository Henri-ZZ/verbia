import { build, context } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const out = path.join(root, "dist/extension");
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

const sharedOptions = {
  outdir: out,
  bundle: true,
  target: "chrome120",
  sourcemap: false,
  minify: false,
  logLevel: "info",
  alias: { "@verbia/shared": path.join(root, "packages/shared/src/index.ts") }
};

await Promise.all([
  cp("apps/extension/manifest.json", path.join(out, "manifest.json")),
  cp("apps/extension/_locales", path.join(out, "_locales"), { recursive: true }),
  cp("apps/extension/src/options/index.html", path.join(out, "options.html")),
  cp("apps/extension/src/options/options.css", path.join(out, "options.css")),
  cp("apps/extension/src/popup/index.html", path.join(out, "popup.html")),
  cp("apps/extension/src/popup/popup.css", path.join(out, "popup.css")),
  cp("apps/extension/icons", path.join(out, "icons"), { recursive: true })
]);

const builds = [
  { ...sharedOptions, entryPoints: { background: "apps/extension/src/background/index.ts" }, format: "esm" },
  { ...sharedOptions, entryPoints: { content: "apps/extension/src/content/index.ts", options: "apps/extension/src/options/index.ts", popup: "apps/extension/src/popup/index.ts" }, format: "iife" }
];

if (process.argv.includes("--watch")) {
  const buildContexts = await Promise.all(builds.map(options => context(options)));
  await Promise.all(buildContexts.map(buildContext => buildContext.watch()));
  console.log(`Watching ${out}`);
} else await Promise.all(builds.map(options => build(options)));
