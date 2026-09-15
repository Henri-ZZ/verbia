"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  AUTH_CONFIGURED, API_BASE, VERIFY_EMAIL_KEY, accountState, authErrorCopy, avatarUrlOf, getClient, onExtensionSignOutRequest, providerOf, sendEmailCode, signInWithGoogle, signInWithPasswordEmail, signOut, syncSignedInSessionToExtension
} from "../../lib/verbia-auth";
import { ProCheckout } from "../../components/pro-checkout";

type Locale = "en" | "zh";
type Usage = { plan: "free" | "premium"; used: number; limit: number | null; resetsAt?: string; premiumUntil?: string } | null;

const T = {
  en: {
    eyebrow: "VERBIA ACCOUNT",
    toggled: "中文",
    signedOutTitle: "Sign in to Verbia",
    signedOutIntro: "One account for the website and the browser extension — same profile, same daily allowance.",
    google: "Continue with Google",
    divider: "or continue with your email",
    emailPlaceholder: "you@example.com",
    send: "Email me a sign-in code",
    sending: "Sending…",
    sent: "Check your inbox — we sent a sign-in code.",
    passwordPlaceholder: "Your password",
    passwordSubmit: "Sign in",
    passwordToggle: "Sign in with a password instead",
    codeToggle: "Email me a sign-in code instead",
    signInHint: "A sign-in code is all you need to start. Once you are in, you can set a password — or keep using codes.",
    signedInTitle: "Signed in",
    planFree: "Free",
    planPremium: "Premium",
    premiumUntil: "until {date}",
    providerGoogle: "Google",
    usageLabel: "Today’s usage",
    unlimited: "Unlimited",
    usedOf: (used: number, limit: number) => `${used} of ${limit}`,
    resets: (at: string) => `Resets ${new Date(at).toLocaleString()}`,
    usageUnavailable: "Usage is temporarily unavailable.",
    loading: "Loading…",
    signOut: "Sign out",
    upgradeTitle: "Upgrade to Verbia Premium",
    upgradeBody: "Get 100 context-aware replies per day.",
    checkoutSuccess: "Payment received. Your Premium status may take a moment to update.",
    accountNote: "This is the same Verbia account your browser extension uses. The website and the extension share one sign-in state — signing out here signs out the extension too.",
    extensionHint: "Opening this page from the extension? Sign in below and the extension picks it up on its own — then use “Back to the extension”.",
    extensionSynced: "Signed in — the extension has this session too.",
    openExtension: "Back to the extension",
    backHome: "← Back to verbia.henriz.dev"
  },
  zh: {
    eyebrow: "VERBIA 账号",
    toggled: "English",
    signedOutTitle: "登录 Verbia",
    signedOutIntro: "网站与浏览器扩展共用一个账号——同一份个人资料，同一份每日额度。",
    google: "使用 Google 登录",
    divider: "或使用邮箱登录",
    emailPlaceholder: "you@example.com",
    send: "给我发送登录验证码",
    sending: "发送中…",
    sent: "请查收邮件，登录验证码已发送。",
    passwordPlaceholder: "你的密码",
    passwordSubmit: "登录",
    passwordToggle: "改用密码登录",
    codeToggle: "改用邮箱验证码",
    signInHint: "先用验证码即可开始。登录后可以设置密码，也可以继续用验证码。",
    signedInTitle: "已登录",
    planFree: "免费版",
    // "Premium" stays untranslated: it is the product tier name, same in every locale.
    planPremium: "Premium",
    premiumUntil: "有效期至 {date}",
    providerGoogle: "Google",
    usageLabel: "今日用量",
    unlimited: "不限",
    usedOf: (used: number, limit: number) => `${used} / ${limit}`,
    resets: (at: string) => `${new Date(at).toLocaleString()} 重置`,
    usageUnavailable: "用量暂时不可用。",
    loading: "加载中…",
    signOut: "退出登录",
    upgradeTitle: "升级到 Premium",
    upgradeBody: "每天可使用 100 次上下文回复。",
    checkoutSuccess: "付款已完成，Premium 状态可能需要片刻更新。",
    accountNote: "这就是你的浏览器扩展使用的同一个 Verbia 账号。网站与扩展共用一个登录状态——在这里退出，扩展也会一起退出。",
    extensionHint: "从扩展打开本页？在下面登录后扩展会自动接上——然后点「回到扩展」。",
    extensionSynced: "已登录，扩展也已同步。",
    openExtension: "回到扩展",
    backHome: "← 返回 verbia.henriz.dev"
  }
} as const;

export default function AccountPage() {
  const [locale, setLocale] = useState<Locale>("en");
  const [state, setState] = useState<"checking" | "signed_out" | "signed_in">("checking");
  const [user, setUser] = useState<User | null>(null);
  const [usage, setUsage] = useState<Usage>(null);
  const [usageStatus, setUsageStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [fromExtension, setFromExtension] = useState(false);
  const started = useRef(false);
  const synced = useRef(false);
  const router = useRouter();

  const t = T[locale];

  useEffect(() => {
    const preferred = (navigator.language || "en").toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const explicit = params.get("locale");
    setLocale(explicit === "zh" || explicit === "en" ? explicit : preferred.startsWith("zh") ? "zh" : "en");
    setFromExtension(params.get("from") === "extension");
  }, []);

  // The two surfaces keep one signed-in state, so a website that finds itself
  // signed in while the extension is not hands its session over. The background
  // skips this when it already holds a session, so visiting this page does not
  // mint a fresh extension session every time.
  useEffect(() => {
    if (state !== "signed_in" || synced.current) return;
    synced.current = true;
    void syncSignedInSessionToExtension().then(result => { if (result === "synced") setNotice(t.extensionSynced); });
  }, [state, t.extensionSynced]);

  // …and the other half of that state: when the extension signs out, this page
  // follows it out rather than sitting here signed in.
  useEffect(() => onExtensionSignOutRequest(() => {
    void signOut();
    setUser(null); setUsage(null); setUsageStatus("idle"); setState("signed_out"); setNotice(""); setError("");
  }), []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("checkout") === "success") setNotice(t.checkoutSuccess);
  }, [t.checkoutSuccess]);

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

  useEffect(() => {
    if (state !== "signed_in" || !user || new URLSearchParams(window.location.search).get("checkout") !== "success") return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      void loadUsage(user);
      if (attempts >= 20) window.clearInterval(timer);
    }, 3_000);
    return () => window.clearInterval(timer);
  }, [state, user]);

  async function loadUsage(current: User) {
    // Background polls after a checkout refresh keep showing the last value;
    // only first load (or a retry from an error) surfaces the spinner.
    setUsageStatus(prev => (prev === "ready" ? "ready" : "loading"));
    try {
      const client = await getClient();
      const { data } = await client.auth.getSession();
      const token = data.session?.access_token;
      if (!token) { setUsage(null); setUsageStatus("error"); return; }
      const response = await fetch(`${API_BASE}/v1/account/usage`, { headers: { authorization: `Bearer ${token}` } });
      if (response.status === 401 || response.status === 403) {
        // The server rejected the token (e.g. revoked by a global sign-out on
        // another surface). Sign out locally so we never linger signed-in with
        // unusable usage.
        await signOut();
        setUser(null); setUsage(null); setUsageStatus("idle"); setState("signed_out");
        return;
      }
      if (!response.ok) { setUsage(null); setUsageStatus("error"); return; }
      const body = await response.json() as { plan?: string; used?: number; limit?: number | null; resetsAt?: string; premiumUntil?: string };
      const plan = body.plan === "premium" ? "premium" : "free";
      const used = typeof body.used === "number" ? body.used : 0;
      const limit = typeof body.limit === "number" ? body.limit : null;
      // premiumUntil is already a UTC calendar date (YYYY-MM-DD) from the API,
      // so it is rendered as-is and never shifts with the visitor's timezone.
      setUsage({ plan, used, limit, resetsAt: body.resetsAt, premiumUntil: typeof body.premiumUntil === "string" ? body.premiumUntil : undefined });
      setUsageStatus("ready");
    } catch {
      setUsage(null);
      setUsageStatus("error");
    }
  }

  async function onGoogle() {
    setError(""); setNotice("");
    const result = await signInWithGoogle();
    if (!result.ok) setError(result.message);
  }

  function validEmail() {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return true;
    setError(locale === "zh" ? "请输入有效的邮箱地址" : "Enter a valid email address.");
    return false;
  }

  // Sending the code is a step, not a state: the code is entered on its own page,
  // which is also where the sign-in link lands, so the two entry points cannot
  // drift apart.
  async function onSendCode(event: React.FormEvent) {
    event.preventDefault();
    if (!validEmail()) return;
    setSending(true); setError(""); setNotice("");
    const result = await sendEmailCode(email);
    setSending(false);
    if (!result.ok) { setError(authErrorCopy(locale, result.code)); return; }
    try { window.sessionStorage.setItem(VERIFY_EMAIL_KEY, email); } catch { /* private mode: the code still arrives by mail */ }
    router.push("/account/verify");
  }

  // For accounts that have set a password. Signing in flips the view through
  // onAuthStateChange, so there is nothing to do on success.
  async function onPassword(event: React.FormEvent) {
    event.preventDefault();
    if (!validEmail()) return;
    setSending(true); setError(""); setNotice("");
    const result = await signInWithPasswordEmail(email, password);
    setSending(false);
    if (!result.ok) setError(authErrorCopy(locale, result.code));
  }

  async function onSignOut() {
    const confirmed = window.confirm(locale === "zh" ? "确定要退出登录吗？扩展会一起退出。" : "Sign out of Verbia? The extension signs out too.");
    if (!confirmed) return;
    setError(""); setNotice("");
    await signOut();
    setUser(null); setUsage(null); setUsageStatus("idle"); setState("signed_out");
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

        {state === "checking" && (
          <div className="account-loading" role="status">
            <img className="spinner" src="/loading.png" alt="" />
            {t.loading}
          </div>
        )}

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
              <form className="account-magic" onSubmit={usePassword ? onPassword : onSendCode}>
                <input type="email" inputMode="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder={t.emailPlaceholder} aria-label={t.emailPlaceholder} />
                {usePassword && <input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} placeholder={t.passwordPlaceholder} aria-label={t.passwordPlaceholder} />}
                <button className="button primary" type="submit" disabled={sending}>{sending ? t.sending : usePassword ? t.passwordSubmit : t.send}</button>
              </form>
              <button className="account-link" type="button" onClick={() => { setUsePassword(!usePassword); setPassword(""); setError(""); }}>{usePassword ? t.codeToggle : t.passwordToggle}</button>
              <p className="account-hint muted">{t.signInHint}</p>
              {fromExtension && <p className="account-hint muted">{t.extensionHint}</p>}
            </div>
          </>
        )}

        {state === "signed_in" && user && (
          <>
            <h1>{t.signedInTitle}</h1>
            <div className="account-identity">
              {avatar ? <img className="account-avatar" src={avatar} alt="" width="48" height="48" referrerPolicy="no-referrer" /> : <span className="account-avatar fallback">{(user.email ?? "V").slice(0, 1).toUpperCase()}</span>}
              <div className="account-identity-copy">
                <span className="account-email-line">
                  <strong className="account-email">{user.email}</strong>
                  {provider === "google" && <img className="provider-mark" src="/google.svg" alt={t.providerGoogle} width="14" height="14"/>}
                </span>
                <span className="account-badges">{usage?.plan === "premium" ? <><span className="account-badge plan"><img className="premium-mark" src="/premium.png" alt="" width="14" height="14"/>{t.planPremium}</span>{usage.premiumUntil && <span className="badge-until">{t.premiumUntil.replace("{date}", usage.premiumUntil)}</span>}</> : <span className="account-badge plan">{t.planFree}</span>}</span>
              </div>
            </div>

            {usageStatus === "loading" ? (
              <div className="account-usage" role="status">
                <span className="account-loading"><img className="spinner" src="/loading.png" alt="" />{t.loading}</span>
              </div>
            ) : (
              <div className="account-usage">
                <span>{t.usageLabel}</span>
                {usage === null ? <em>{t.usageUnavailable}</em>
                  : <strong>{usage.limit === null ? t.unlimited : t.usedOf(usage.used, usage.limit)}</strong>}
                {usage?.resetsAt && <small>{t.resets(usage.resetsAt)}</small>}
              </div>
            )}

            {usageStatus === "ready" && usage?.plan !== "premium" && <div className="account-upgrade"><strong>{t.upgradeTitle}<img className="premium-mark" src="/premium.png" alt="" width="14" height="14"/></strong><p>{t.upgradeBody}</p><ProCheckout locale={locale} compact/></div>}

            <p className="account-note muted">{t.accountNote}</p>
            {fromExtension && <button className="button primary" type="button" onClick={() => window.dispatchEvent(new CustomEvent("verbia:open-dashboard"))}>{t.openExtension}</button>}
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
