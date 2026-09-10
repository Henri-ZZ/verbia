import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { matchesPattern } from "../apps/extension/src/background/migrate";

// The matcher decides which open tabs get a fresh content script after an
// extension update (the extension cannot unload the orphaned one). Chrome gives
// no API to test a match pattern, so this is our own implementation and it is
// read straight from the manifest to avoid a second list that drifts.
const manifest = JSON.parse(readFileSync(path.join(process.cwd(), "apps/extension/manifest.json"), "utf8")) as {
  content_scripts?: Array<{ matches?: string[] }>;
};
const patterns = (manifest.content_scripts ?? []).flatMap(entry => entry.matches ?? []);

// A URL that a pattern should match, built with the same subset rules the
// matcher supports.
function sampleUrl(pattern: string): URL {
  return new URL(pattern.replace("*://", "https://").replace("://*.", "://").replace(/\/\*$/, "/some/path"));
}

describe("match patterns", () => {
  it("covers every pattern the manifest declares", () => {
    expect(patterns.length).toBeGreaterThan(0);
    for (const pattern of patterns) {
      expect(matchesPattern(pattern, sampleUrl(pattern)), `${pattern} should match its own sample URL`).toBe(true);
    }
  });

  it("requires the host to be the site the pattern names", () => {
    expect(matchesPattern("https://www.reddit.com/*", new URL("https://www.reddit.com/r/x/comments/y/"))).toBe(true);
    expect(matchesPattern("https://www.reddit.com/*", new URL("https://old.reddit.com/r/x"))).toBe(false);
    expect(matchesPattern("https://www.reddit.com/*", new URL("https://notreddit.com/"))).toBe(false);
  });

  it("is not fooled by a URL that merely contains a matching site", () => {
    // Both of these would pass a `url.includes(...)` check, and neither is the
    // site we are allowed to inject into.
    expect(matchesPattern("https://www.reddit.com/*", new URL("https://evil.com/?next=https://www.reddit.com/"))).toBe(false);
    expect(matchesPattern("https://www.reddit.com/*", new URL("https://www.reddit.com@evil.com/"))).toBe(false);
  });

  it("respects the scheme", () => {
    expect(matchesPattern("https://www.reddit.com/*", new URL("http://www.reddit.com/r/x"))).toBe(false);
    expect(matchesPattern("*://example.com/*", new URL("http://example.com/x"))).toBe(true);
    expect(matchesPattern("*://example.com/*", new URL("https://example.com/x"))).toBe(true);
  });

  it("matches subdomains only when the pattern asks for them", () => {
    expect(matchesPattern("https://*.example.com/*", new URL("https://sub.example.com/x"))).toBe(true);
    // Chrome's "*." covers the bare domain as well.
    expect(matchesPattern("https://*.example.com/*", new URL("https://example.com/x"))).toBe(true);
    expect(matchesPattern("https://*.example.com/*", new URL("https://notexample.com/x"))).toBe(false);
  });

  it("matches paths only as far as the pattern specifies", () => {
    expect(matchesPattern("https://example.com/foo/*", new URL("https://example.com/foo/bar"))).toBe(true);
    expect(matchesPattern("https://example.com/foo/*", new URL("https://example.com/other"))).toBe(false);
    expect(matchesPattern("https://example.com/foo", new URL("https://example.com/foo"))).toBe(true);
    expect(matchesPattern("https://example.com/foo", new URL("https://example.com/foo/bar"))).toBe(false);
  });

  it("rejects anything that is not a match pattern", () => {
    expect(matchesPattern("www.reddit.com", new URL("https://www.reddit.com/"))).toBe(false);
    expect(matchesPattern("", new URL("https://www.reddit.com/"))).toBe(false);
  });
});
