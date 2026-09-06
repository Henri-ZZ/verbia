"use client";

import { useEffect, useState } from "react";

type Store = "chrome" | "edge" | "firefox";
const urls: Record<Store, string | undefined> = {
  chrome: process.env.NEXT_PUBLIC_CHROME_STORE_URL,
  edge: process.env.NEXT_PUBLIC_EDGE_STORE_URL,
  firefox: process.env.NEXT_PUBLIC_FIREFOX_STORE_URL
};

function detectStore(): Store {
  const agent = navigator.userAgent;
  if (/Firefox\//.test(agent)) return "firefox";
  if (/Edg\//.test(agent)) return "edge";
  return "chrome";
}

export function InstallLink({ className = "button primary" }: { className?: string }) {
  const [href, setHref] = useState("#install");
  useEffect(() => { setHref(urls[detectStore()] || urls.chrome || "#install"); }, []);
  return <a className={className} href={href}>Install now <span aria-hidden="true">↗</span></a>;
}
