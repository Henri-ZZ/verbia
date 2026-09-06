"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  AUTH_CONFIGURED, API_BASE, accountState, avatarUrlOf, getClient, providerOf, sendMagicLink, signInWithGoogle, signOut
} from "../../lib/verbia-auth";

type Locale = "en" | "zh";
type Usage = { plan: "free" | "premium"; used: number; limit: number | null; resetsAt?: string } | null;

const T = {
  en: {
    eyebrow: "VERBIA ACCOUNT",
    toggled: "中文",
    signedOutTitle: "Sign in to Verbia",
    signedOutIntro: "One account for the website and the browser extension — same profile, same daily allowance.",
    google: "Continue with Google",
    divider: "or use a magic link",
    emailPlaceholder: "you@example.com",
    send: "Email me a sign-in link",
    sending: "Sending…",
    sent: "Check your inbox — the sign-in link is on its way.",
    signInHint: "Verbia never needs a password. Google and email magic links only.",
    signedInTitle: "Signed in",
    emailLabel: "Email",
    planFree: "Free",
    planPremium: "Premium",
    providerGoogle: "Google",
    providerEmail: "Email link",
    usageLabel: "Today’s usage",
    unlimited: "Unlimited",
    usedOf: (used: number, limit: number) => `${used} of ${limit}`,
    resets: (at: string) => `Resets ${new Date(at).toLocaleString()}`,
    usageUnavailable: "Usage is temporarily unavailable.",
    signOut: "Sign out",
    accountNote: "This is the same Verbia account your browser extension uses. The website and the extension keep separate signed-in sessions — signing out here does not sign out the extension.",
    backHome: "← Back to verbia.henriz.dev"
  },
  zh: {
    eyebrow: "VERBIA 账号",
    toggled: "English",
    signedOutTitle: "登录 Verbia",
    signedOutIntro: "网站与浏览器扩展共用一个账号——同一份个人资料，同一份每日额度。",
    google: "使用 Google 登录",
    divider: "或使用邮箱免密链接",
    emailPlaceholder: "you@example.com",
    send: "给我发送登录链接",
    sending: "发送中…",
    sent: "请查收邮件，登录链接已发送。",
    signInHint: "Verbia 无需密码，只支持 Google 或邮箱免密登录。",
    signedInTitle: "已登录",
    emailLabel: "邮箱",
    planFree: "免费版",
    planPremium: "高级版",
    providerGoogle: "Google",
    providerEmail: "邮箱链接",
    usageLabel: "今日用量",
    unlimited: "不限",
    usedOf: (used: number, limit: number) => `${used} / ${limit}`,
    resets: (at: string) => `${new Date(at).toLocaleString()} 重置`,
    usageUnavailable: "用量暂时不可用。",
    signOut: "退出登录",
    accountNote: "这就是你的浏览器扩展使用的同一个 Verbia 账号。网站与扩展各自保持独立的登录会话——在此退出不会退出扩展。",
    backHome: "← 返回 verbia.henriz.dev"
  }
} as const;

export default function AccountPage() {
  const [locale, setLocale] = useState<Locale>("en");
  const [state, setState] = useState<"checking" | "signed_out" | "signed_in">("checking");
  const [user, setUser] = useState<User | null>(null);
  const [usage, setUsage] = useState<Usage>(null);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string>("");
  const [error, setError] = useState<string>("");
  const started = useRef(false);

  const t = T[locale];

  useEffect(() => {
    const preferred = (navigator.language || "en").toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const explicit = params.get("locale");
    setLocale(explicit === "zh" || explicit === "en" ? explicit : preferred.startsWith("zh") ? "zh" : "en");
  }, []);

  useEffect(() => {
    if (started.current || !AUTH_CONFIGURED) return;
    started.current = true;
    let disposed = false;
    async function refresh() {
      const current = await accountState();
      if (disposed) return;
      if (current.status === "signed_in") {
        setUser(current.user);
        setState("signed_in");
        void loadUsage(current.user);
      } else {
        setUser(null);
        setState("signed_out");
      }
    }
    void refresh();
    void import("@supabase/supabase-js").then(async () => {
      const client = await getClient();
      const { data } = client.auth.onAuthStateChange(() => { void refresh(); });
      if (!disposed) return () => data.subscription.unsubscribe();
    });
    return () => { disposed = true; };
  }, []);

  async function loadUsage(current: User) {
    try {
      const client = await getClient();
      const { data } = await client.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      const response = await fetch(`${API_BASE}/v1/account/usage`, { headers: { authorization: `Bearer ${token}` } });
      if (!response.ok) return;
      const body = await response.json() as { plan?: string; used?: number; limit?: number | null; resetsAt?: string };
      const plan = body.plan === "premium" ? "premium" : "free";
      const used = typeof body.used === "number" ? body.used : 0;
      const limit = typeof body.limit === "number" ? body.limit : null;
      setUsage({ plan, used, limit, resetsAt: body.resetsAt });
    } catch {
      setUsage(null);
    }
  }

  async function onGoogle() {
    setError(""); setNotice("");
    const result = await signInWithGoogle();
    if (!result.ok) setError(result.message);
  }

  async function onMagic(event: React.FormEvent) {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError(locale === "zh" ? "请输入有效的邮箱地址" : "Enter a valid email address."); return; }
    setSending(true); setError(""); setNotice("");
    const result = await sendMagicLink(email);
    setSending(false);
    if (result.ok) setNotice(t.sent);
    else setError(result.message);
  }

  async function onSignOut() {
    setError(""); setNotice("");
    await signOut();
    setUser(null); setUsage(null); setState("signed_out");
  }

  const provider = user ? providerOf(user) : undefined;
  const avatar = user ? avatarUrlOf(user) : undefined;
  const name = user?.email?.split("@")[0] ?? (user?.email ?? "Verbia");

  if (!AUTH_CONFIGURED) {
    return (
      <main className="account-main shell">
        <section className="account-panel">
          <p className="account-eyebrow">{t.eyebrow}</p>
          <h1>{locale === "zh" ? "账号登录尚未配置" : "Account sign-in is not configured"}</h1>
          <p className="muted">{locale === "zh" ? "请先在 apps/web/.env.local 中配置 NEXT_PUBLIC_SUPABASE_URL 与 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY。" : "Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in apps/web/.env.local first."}</p>
          <Link className="button secondary" href="/">{locale === "zh" ? "返回首页" : "Back to home"}</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="account-main shell">
      <section className="account-panel">
        <div className="account-locale">
          <button type="button" onClick={() => setLocale(locale === "en" ? "zh" : "en")}>{t.toggled}</button>
        </div>
        <p className="account-eyebrow">{t.eyebrow}</p>

        {state === "checking" && <h1 className="account-h1">…</h1>}

        {state === "signed_out" && (
          <>
            <h1>{t.signedOutTitle}</h1>
            <p className="muted">{t.signedOutIntro}</p>
            <div className="account-buttons">
              <button className="button secondary account-google" type="button" onClick={() => void onGoogle()}>
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                {t.google}
              </button>
              <div className="account-divider"><span>{t.divider}</span></div>
              <form className="account-magic" onSubmit={onMagic}>
                <input type="email" inputMode="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder={t.emailPlaceholder} aria-label={t.emailPlaceholder} />
                <button className="button primary" type="submit" disabled={sending}>{sending ? t.sending : t.send}</button>
              </form>
              <p className="account-hint muted">{t.signInHint}</p>
            </div>
          </>
        )}

        {state === "signed_in" && user && (
          <>
            <h1>{t.signedInTitle}</h1>
            <div className="account-identity">
              {avatar ? <img className="account-avatar" src={avatar} alt="" width="48" height="48" referrerPolicy="no-referrer" /> : <span className="account-avatar fallback">{(user.email ?? "V").slice(0, 1).toUpperCase()}</span>}
              <div className="account-identity-copy">
                <span className="account-email-label">{t.emailLabel}</span>
                <strong className="account-email">{user.email}</strong>
                <span className="account-badges"><span className="account-badge plan">{usage?.plan === "premium" ? t.planPremium : t.planFree}</span>{provider && <span className="account-badge provider">{provider === "google" ? t.providerGoogle : t.providerEmail}</span>}</span>
              </div>
            </div>

            <div className="account-usage">
              <span>{t.usageLabel}</span>
              {usage === null ? <em>{t.usageUnavailable}</em>
                : <strong>{usage.limit === null ? t.unlimited : t.usedOf(usage.used, usage.limit)}</strong>}
              {usage?.resetsAt && <small>{t.resets(usage.resetsAt)}</small>}
            </div>

            <p className="account-note muted">{t.accountNote}</p>
            <button className="button secondary" type="button" onClick={() => void onSignOut()}>{t.signOut}</button>
          </>
        )}

        {notice && <p className="account-msg ok" role="status">{notice}</p>}
        {error && <p className="account-msg error" role="alert">{error}</p>}

        <Link className="account-back" href="/">{t.backHome}</Link>
      </section>
    </main>
  );
}
