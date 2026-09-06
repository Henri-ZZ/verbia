"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AUTH_CONFIGURED, getClient } from "../lib/verbia-auth";

export function AccountButton({ locale = "en" }: { locale?: "en" | "zh" }) {
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    if (!AUTH_CONFIGURED) return;
    let disposed = false;
    let unsub: (() => void) | undefined;
    async function refresh() {
      try {
        const client = await getClient();
        const { data } = await client.auth.getSession();
        if (disposed) return;
        setSignedIn(Boolean(data.session?.user));
        setEmail(data.session?.user?.email ?? "");
      } catch { /* not configured or auth unavailable */ }
    }
    void refresh();
    void getClient().then(client => {
      if (disposed) return;
      const { data } = client.auth.onAuthStateChange(() => { void refresh(); });
      unsub = () => data.subscription.unsubscribe();
    }).catch(() => undefined);
    return () => { disposed = true; unsub?.(); };
  }, []);

  if (!AUTH_CONFIGURED) return null;
  const label = signedIn
    ? locale === "zh" ? "账号" : "Account"
    : locale === "zh" ? "登录" : "Sign in";
  return (
    <Link className="button secondary compact" href="/account" aria-label={label}>
      {signedIn ? <span className="account-dot" aria-hidden="true" /> : null}
      <span className="account-btn-label">{signedIn ? (email.split("@")[0] || label) : label}</span>
    </Link>
  );
}
