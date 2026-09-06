import { mkdir, rm } from "node:fs/promises";
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
await rm(zipPath, { force: true });
console.log(`[package] zipping ${releaseDir} → ${zipPath}`);
execFileSync("zip", ["-q", "-r", zipPath, "."], { cwd: releaseDir, stdio: "inherit" });
console.log(`Created ${zipPath}`);
