"use client";

import { useEffect } from "react";

// Landing page for sign-ins initiated from the Chrome extension. The
// extension exchanges the PKCE code (its verifier lives in extension
// storage), then a bridge content script (apps/extension/src/bridge.ts)
// writes the finished session into this site's localStorage under the same
// key supabase-js uses. This page waits for that write and redirects to the
// home/account area — making the website signed in as part of the extension
// sign-in. If the extension is unavailable (old email link clicked on a
// browser without the extension), it falls back to the homepage after a few
// seconds.
const WEB_SESSION_KEY = "verbia-web-auth";

export default function AuthCompletePage() {
  useEffect(() => {
    const finish = () => { location.replace("/"); };
    const hasSession = () => {
      try { return Boolean(localStorage.getItem(WEB_SESSION_KEY)); } catch { return false; }
    };
    if (hasSession()) { finish(); return; }
    const onSession = () => finish();
    window.addEventListener("verbia:session", onSession);
    const started = Date.now();
    const interval = window.setInterval(() => {
      if (hasSession() || Date.now() - started > 12_000) {
        window.clearInterval(interval);
        finish();
      }
    }, 350);
    const timeout = window.setTimeout(() => {
      window.clearInterval(interval);
      finish();
    }, 15_000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
      window.removeEventListener("verbia:session", onSession);
    };
  }, []);

  return (
    <main style={{ minHeight: "70vh", display: "grid", placeItems: "center", textAlign: "center", padding: "40px 20px" }}>
      <div>
        <p style={{ fontSize: 18, fontWeight: 700 }}>正在将你登录 Verbia…</p>
        <p style={{ opacity: 0.7 }}>Signing you into Verbia…</p>
      </div>
    </main>
  );
}
