import { mkdir, readdir, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

// Publishes the extension to a zip ready for the Chrome Web Store.
//
// The release bundle differs from the development one:
//   - the Developer settings card (Backend URL) is removed and requests are
//     pinned to the production gateway (VERBIA_BACKEND_URL),
//   - the manifest drops the http://localhost host permission.
// The version number is intentionally NOT bumped here.
const root = process.cwd();
const { version } = JSON.parse(readFileSync(path.join(root, "apps/extension/manifest.json"), "utf8"));

await mkdir(path.join(root, "artifacts"), { recursive: true });
console.log("[package] building release bundle…");
execFileSync("node", ["scripts/build.mjs", "--release"], { cwd: root, stdio: "inherit" });

const releaseDir = path.join(root, "dist", "release");
const zipPath = path.join(root, "artifacts", `verbia-v${version}.zip`);

// Every entry below stands for a mistake that has actually reached a store build
// once. They are cheap to catch here — where nothing has been zipped yet — and
// expensive to catch from the store listing.
const problems = [];
const bundleText = name => readFileSync(path.join(releaseDir, name), "utf8");

const optionsJs = bundleText("options.js");
// The release flag is compiled in, and a malformed define produces the
// development build instead: defining `process.env.VERBIA_RELEASE` as the bare
// string "1" compiles `=== "1"` into `1 === "1"`, which is always false. That
// shipped once — the store build read the Backend select that packaging had
// already stripped and then refused to save any setting.
if (!optionsJs.includes("VERBIA_RELEASE = true")) {
  problems.push("options.js is not a release build (expected `VERBIA_RELEASE = true`) — check the defines in scripts/build.mjs");
}

// The Developer settings card holds the only development address in the UI, and
// its Backend select is what a broken release flag ends up reading.
for (const [name, text] of [["options.html", bundleText("options.html")], ["options.js", optionsJs]]) {
  if (text.includes("localhost")) problems.push(`${name} mentions localhost — the Developer settings card did not get stripped`);
}

const manifest = JSON.parse(bundleText("manifest.json"));
const forbiddenHosts = ["localhost", "api.verbia.henriz.dev", "supabase.co", "<all_urls>"];
for (const host of [...(manifest.host_permissions ?? []), ...(manifest.optional_host_permissions ?? [])]) {
  const forbidden = forbiddenHosts.find(entry => host.includes(entry));
  if (forbidden) problems.push(`host permission ${host} must not ship (${forbidden})`);
}
if ("key" in manifest) problems.push("manifest carries a `key` field; store builds take their ID from the store");

const strays = (await readdir(releaseDir)).filter(name => name.startsWith("__") || name.endsWith(".map"));
if (strays.length) problems.push(`files that do not belong in a bundle: ${strays.join(", ")}`);

if (problems.length) {
  console.error("[package] refusing to package — release checks failed:");
  for (const problem of problems) console.error(`  • ${problem}`);
  console.error("[package] nothing was zipped. Fix the above and run again.");
  process.exit(1);
}
console.log("[package] release checks passed");
await rm(zipPath, { force: true });
console.log(`[package] zipping ${releaseDir} → ${zipPath}`);
execFileSync("zip", ["-q", "-r", zipPath, "."], { cwd: releaseDir, stdio: "inherit" });
console.log(`Created ${zipPath}`);
