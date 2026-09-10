"use client";

import { useEffect, useState } from "react";
import { STORE_URLS, type BrowserStore } from "../lib/browser-stores";

function storeUrl(store: BrowserStore): string {
  return STORE_URLS[store];
}

// Edge uses its own listing. Chrome and other browsers default to the Chrome
// listing, which is also the useful destination before client detection runs.
function detectStore(): BrowserStore {
  const agent = navigator.userAgent;
  if (/Edg(?:A|iOS)?\//.test(agent)) return "edge";
  return "chrome";
}

export function InstallLink({ className = "button primary", label = "Install now" }: { className?: string; label?: string }) {
  const [href, setHref] = useState<string>(STORE_URLS.chrome);
  useEffect(() => { setHref(storeUrl(detectStore())); }, []);
  return <a className={className} href={href} target="_blank" rel="noopener noreferrer">{label} <span aria-hidden="true">↗</span></a>;
}
