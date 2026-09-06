"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AUTH_CONFIGURED, avatarUrlOf, getClient, providerOf } from "../lib/verbia-auth";
import type { User } from "@supabase/supabase-js";

export function AccountButton({ locale = "en" }: { locale?: "en" | "zh" }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!AUTH_CONFIGURED) return;
    let disposed = false;
    let unsub: (() => void) | undefined;
    async function refresh() {
      try {
        const client = await getClient();
        const { data } = await client.auth.getSession();
        if (disposed) return;
        setUser(data.session?.user ?? null);
      } catch { /* auth unavailable */ }
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

  if (!user) {
    return (
      <Link className="button secondary compact account-signin" href="/account">
        {locale === "zh" ? "登录" : "Sign in"}
      </Link>
    );
  }

  const email = user.email ?? "";
  const avatar = providerOf(user) === "google" ? avatarUrlOf(user) : undefined;
  const initial = (email[0] ?? "V").toUpperCase();

  return (
    <Link className="account-chip" href="/account" aria-label={email || (locale === "zh" ? "账号" : "Account")} title={email}>
      {avatar ? (
        // Same avatar logic as the extension: show the Google picture when it
        // exists, drop it silently on load failure, otherwise fall back below.
        <img className="account-chip-avatar" src={avatar} alt="" width="26" height="26" decoding="async" referrerPolicy="no-referrer"
          onError={event => { event.currentTarget.remove(); }} />
      ) : (
        <span className="account-chip-avatar account-chip-initial" aria-hidden="true">{initial}</span>
      )}
      <span className="account-chip-email">{email}</span>
    </Link>
  );
}
