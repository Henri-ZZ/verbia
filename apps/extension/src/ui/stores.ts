// Extension-store listings, used by the Support card's "Leave Review".
//
// The website keeps the same two URLs in apps/web/lib/browser-stores.ts (footer
// links + the install button). They are not imported from there because
// apps/web does not depend on @verbia/shared, and a cross-app import would be
// worse than two constants — but if a listing URL ever changes, change both.
export const STORE_URLS = {
  chrome: "https://chromewebstore.google.com/detail/mngnmhdbilfebcejgicplbgjnnejejbn",
  edge: "https://microsoftedge.microsoft.com/addons/detail/gfomnnahmcpfnibkcfdfamcfbcacojlf"
} as const;

export type BrowserStore = keyof typeof STORE_URLS;

// Which listing to send someone to for a review. The manifest's update_url
// records where this copy actually came from, which is the honest answer: Edge
// can install from the Chrome Web Store and the reverse, so sniffing the
// browser alone would sometimes open the store the user never used. Unpacked
// builds have no update_url, so fall back to the browser we are running in.
export function storeForListing(updateUrl: string | undefined, userAgent: string): BrowserStore {
  if (updateUrl) {
    if (/microsoft/i.test(updateUrl)) return "edge";
    if (/google/i.test(updateUrl)) return "chrome";
  }
  return /Edg\//.test(userAgent) ? "edge" : "chrome";
}

export function reviewUrl(): string {
  const manifest = chrome.runtime.getManifest();
  return STORE_URLS[storeForListing(manifest.update_url, navigator.userAgent)];
}
