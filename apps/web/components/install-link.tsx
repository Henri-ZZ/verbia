"use client";

import { useEffect, useState } from "react";

type Store = "chrome" | "edge" | "firefox";

// Store listing URLs are maintained here as constants — no environment
// variables involved. Fill the Edge/Firefox entries once those listings are
// published; until then those browsers fall back to the Chrome Web Store.
const STORE_URLS: Record<Store, string | undefined> = {
  chrome: "https://chromewebstore.google.com/detail/mngnmhdbilfebcejgicplbgjnnejejbn",
  edge: undefined, // TODO: Microsoft Edge Add-ons listing URL
  firefox: undefined // TODO: Firefox AMO listing URL
};

function storeUrl(store: Store): string {
  return STORE_URLS[store] ?? STORE_URLS.chrome ?? "#install";
}

// Chrome-based browsers (Chrome, Edge, Brave, Opera, …) all use the Chrome Web
// Store; Firefox uses AMO. Edge's user agent contains "Edg/" so it must be
// checked before the generic Chromium fallback.
function detectStore(): Store {
  const agent = navigator.userAgent;
  if (/Firefox\//.test(agent)) return "firefox";
  if (/Edg\//.test(agent)) return "edge";
  return "chrome";
}

export function InstallLink({ className = "button primary", label = "Install now" }: { className?: string; label?: string }) {
  const [href, setHref] = useState("#install");
  useEffect(() => { setHref(storeUrl(detectStore())); }, []);
  return <a className={className} href={href} target="_blank" rel="noopener noreferrer">{label} <span aria-hidden="true">↗</span></a>;
}
