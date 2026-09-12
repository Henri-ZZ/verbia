import { describe, expect, it } from "vitest";
import { STORE_URLS, storeForListing } from "../apps/extension/src/ui/stores";

// "Leave Review" has to open the listing the user actually installed from: an
// Edge user who installed from the Chrome Web Store has no Edge listing to
// review, and the reverse holds too. The manifest's update_url is the record of
// where the copy came from, so it outranks the browser we happen to be running
// in. Getting this wrong sends reviewers to a store page they never used.
describe("store listing for the review link", () => {
  const chromeUa = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
  const edgeUa = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0";

  it("follows where the extension actually came from", () => {
    expect(storeForListing("https://clients2.google.com/service/update2/crx", edgeUa)).toBe("chrome");
    expect(storeForListing("https://edge.microsoft.com/extensionwebstorebase/v1/crx", chromeUa)).toBe("edge");
  });

  it("falls back to the browser for unpacked builds, which have no update_url", () => {
    expect(storeForListing(undefined, edgeUa)).toBe("edge");
    expect(storeForListing("", edgeUa)).toBe("edge");
    expect(storeForListing(undefined, chromeUa)).toBe("chrome");
  });

  it("ignores an update_url that names neither store", () => {
    expect(storeForListing("https://example.com/update", edgeUa)).toBe("edge");
    expect(storeForListing("https://example.com/update", chromeUa)).toBe("chrome");
  });

  it("keeps both listings reachable over https", () => {
    for (const url of Object.values(STORE_URLS)) expect(url).toMatch(/^https:\/\//);
  });
});
