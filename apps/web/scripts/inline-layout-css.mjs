// Post-build step: inline the layout/root-level stylesheet that Next.js emits
// as a render-blocking <link rel="stylesheet">. PageSpeed Insights flags it as
// blocking the initial render on slow mobile networks (300ms round-trip on the
// lab profile). Inlining removes the round-trip and brings the file size back
// into the initial HTML response — CSS is highly compressible so the on-the-
// wire cost of the extra bytes is small (~7–10 KB gzipped per page).
//
// Runs after `next build` / the static export step. Operates only on files
// under apps/web/out, so source files are untouched.

import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";

const out = path.resolve(process.cwd(), "out");
const cssLinkRe = /<link rel="stylesheet" href="(\/_next\/static\/css\/[^"]+)" data-precedence="next"\s*\/>/g;

async function listHtml(dir) {
  const found = [];
  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile() && entry.name.endsWith(".html")) found.push(full);
    }
  }
  await walk(dir);
  return found;
}

const files = await listHtml(out);
let touched = 0;
let totalDelta = 0;

for (const file of files) {
  const original = await readFile(file, "utf8");
  const matches = [...original.matchAll(cssLinkRe)];
  if (matches.length === 0) continue;

  let next = original;
  for (const match of matches) {
    const cssPath = path.join(out, match[1]);
    const css = await readFile(cssPath, "utf8");
    next = next.replace(
      match[0],
      `<style data-precedence="next" data-inlined-from="${match[1]}">${css}</style>`
    );
  }
  await writeFile(file, next);
  const delta = next.length - original.length;
  totalDelta += delta;
  touched += 1;
  console.log(`  ${path.relative(out, file)}: inlined ${matches.length} CSS block(s), +${(delta / 1024).toFixed(1)} KiB`);
}

console.log(`\nInlined ${touched} HTML file(s); net size delta ${(totalDelta / 1024).toFixed(1)} KiB.`);
