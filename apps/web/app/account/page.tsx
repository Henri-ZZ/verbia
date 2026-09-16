"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  AUTH_CONFIGURED, API_BASE, VERIFY_EMAIL_KEY, accountState, authErrorCopy, avatarUrlOf, getClient, onExtensionSignOutRequest, providerOf, sendEmailCode, signInWithAzure, signInWithGoogle, signInWithPasswordEmail, signOut, syncSignedInSessionToExtension, updatePassword
} from "../../lib/verbia-auth";
import { ProCheckout } from "../../components/pro-checkout";
import { Captcha, type CaptchaHandle } from "../../components/captcha";

type Locale = "en" | "zh";
type Usage = { plan: "free" | "premium"; used: number; limit: number | null; resetsAt?: string; premiumUntil?: string } | null;

// How long a confirmation stays up before dismissing itself.
const NOTICE_MS = 5_000;

const T = {
  en: {
    eyebrow: "VERBIA ACCOUNT",
    toggled: "中文",
    signedOutTitle: "Sign in to Verbia",
    signedOutIntro: "One account for the website and the browser extension — same profile, same daily allowance.",
    google: "Continue with Google",
    microsoft: "Continue with Microsoft",
    divider: "or continue with your email",
    emailPlaceholder: "you@example.com",
    send: "Email me a sign-in code",
    sending: "Sending…",
    sent: "Check your inbox — we sent a sign-in code.",
    passwordPlaceholder: "Your password",
    passwordSubmit: "Sign in",
    codeLoginHint: "First time here?",
    codeLoginAction: "Sign in with an email code",
    passwordLoginHint: "Already have a password?",
    passwordLoginAction: "Sign in with a password",
    signInHint: "Signing in the first time takes an email code. Once you are in, you can set a password — after that, either way works.",
    signedInTitle: "Signed in",
    planFree: "Free",
    planPremium: "Premium",
    premiumUntil: "until {date}",
    providerGoogle: "Google",
    providerMicrosoft: "Microsoft",
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
    passwordTitle: "Password",
    // Covers both setting one and changing it: the user object does not say
    // whether a password is already on the account (@see onSavePassword).
    passwordBody: "Set or change a password to sign in without waiting for an email.",
    passwordToggle: "Set or change password",
    // The Google-only account's version of this same block (@see googleOnly in
    // the page): there a password adds a second way in rather than replacing the
    // only one, so this copy says optional out loud.
    passwordBackupTitle: "Backup sign-in",
    passwordBackupBody: "Optional. Adds email + password sign-in; Google sign-in keeps working either way.",
    passwordBackupToggle: "Set a backup password",
    passwordNewLabel: "New password",
    passwordConfirmLabel: "Confirm password",
    passwordSave: "Save password",
    passwordSaving: "Saving…",
    passwordSaved: "Password saved.",
    passwordTooShort: "Use at least 6 characters.",
    passwordMismatch: "The two passwords do not match.",
    forgotPassword: "Forgot your password?",
    accountNote: "The website and the extension share one account and one sign-in state.",
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
    microsoft: "使用 Microsoft 登录",
    divider: "或使用邮箱登录",
    emailPlaceholder: "you@example.com",
    send: "给我发送登录验证码",
    sending: "发送中…",
    sent: "请查收邮件，登录验证码已发送。",
    passwordPlaceholder: "你的密码",
    passwordSubmit: "登录",
    codeLoginHint: "首次登录用户请使用",
    codeLoginAction: "邮箱验证码登录",
    passwordLoginHint: "已经设置过密码？",
    passwordLoginAction: "使用密码登录",
    signInHint: "首次登录请使用邮箱验证码；登录后可以设置密码，之后两种方式都能用。",
    signedInTitle: "已登录",
    planFree: "免费版",
    // "Premium" stays untranslated: it is the product tier name, same in every locale.
    planPremium: "Premium",
    premiumUntil: "有效期至 {date}",
    providerGoogle: "Google",
    providerMicrosoft: "Microsoft",
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
    passwordTitle: "密码",
    passwordBody: "设置或修改密码后，无需等待邮件即可登录。",
    passwordToggle: "设置或修改密码",
    // 纯 Google 账号用的同一块文案（见页面里的 googleOnly）：对那种账号，
    // 密码是"多一条路"而不是"替代唯一的路"，所以说清是可选项。
    passwordBackupTitle: "备用登录方式",
    passwordBackupBody: "可选。设置后也能用邮箱 + 密码登录；Google 登录始终可用。",
    passwordBackupToggle: "设置备用密码",
    passwordNewLabel: "新密码",
    passwordConfirmLabel: "确认密码",
    passwordSave: "保存密码",
    passwordSaving: "保存中…",
    passwordSaved: "密码已保存。",
    passwordTooShort: "请至少使用 6 位。",
    passwordMismatch: "两次输入的密码不一致。",
    forgotPassword: "忘记密码？",
    accountNote: "官网和扩展共享账号和登录状态。",
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
  // Password first. Codes cost an email every time and depend on mail arriving
  // at all, so the form opens on the path that does not; the code link below is
  // for people who have not set a password yet.
  const [usePassword, setUsePassword] = useState(true);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [fromExtension, setFromExtension] = useState(false);
  const started = useRef(false);
  const synced = useRef(false);
  // Did this page already find a signed-in website when it first looked? Set
  // once by refresh() below, and read by the handoff effect.
  const hadSessionOnLoad = useRef<boolean | null>(null);
  // The CAPTCHA widget, when a site key is configured. It stays null otherwise,
  // which is what makes the check in takeCaptcha() a no-op wherever CAPTCHA is
  // not set up.
  const captchaWidget = useRef<CaptchaHandle | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  // The password form is a setting, not what this page is for, so it stays
  // collapsed until asked for. @see the toggle in the signed-in block.
  const [showPassword, setShowPassword] = useState(false);
  // Pending auto-dismiss for the notice below (@see flashNotice).
  const noticeTimer = useRef<number | undefined>(undefined);
  const router = useRouter();

  const t = T[locale];

  // Notices confirm something the user just did, so they expire: a confirmation
  // that stays on screen stops being a confirmation and reads as a claim about
  // the page instead ("Password saved." — but does that still describe anything?).
  // Every write goes through this one function, so a new notice cancels the old
  // timer rather than being wiped by it seconds later.
  const flashNotice = useCallback((text: string) => {
    window.clearTimeout(noticeTimer.current);
    setNotice(text);
    if (text) noticeTimer.current = window.setTimeout(() => setNotice(""), NOTICE_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  useEffect(() => {
    const preferred = (navigator.language || "en").toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const explicit = params.get("locale");
    setLocale(explicit === "zh" || explicit === "en" ? explicit : preferred.startsWith("zh") ? "zh" : "en");
    setFromExtension(params.get("from") === "extension");
  }, []);

  // Handing the website's session to the extension happens when the user signs
  // in here, or when the extension asks for it (?from=extension, its Sign in
  // button). A session that was *already* on this page when it loaded is not
  // evidence of either: it may be exactly the session the extension just signed
  // out of, and handing it back would sign the extension in again seconds after
  // the user signed it out. The background also skips this when it already
  // holds a session, so no visit mints a second one.
  useEffect(() => {
    if (state !== "signed_in" || synced.current) return;
    if (!fromExtension && hadSessionOnLoad.current !== false) return;
    synced.current = true;
    void syncSignedInSessionToExtension().then(result => { if (result === "synced") flashNotice(t.extensionSynced); });
  }, [flashNotice, fromExtension, state, t.extensionSynced]);

  // …and the other half of that state: when the extension signs out, this page
  // follows it out rather than sitting here signed in.
  useEffect(() => onExtensionSignOutRequest(() => {
    void signOut();
    setUser(null); setUsage(null); setUsageStatus("idle"); setState("signed_out"); flashNotice(""); setError("");
  }), [flashNotice]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("checkout") === "success") flashNotice(t.checkoutSuccess);
  }, [flashNotice, t.checkoutSuccess]);

  useEffect(() => {
    if (started.current || !AUTH_CONFIGURED) return;
    started.current = true;
    let disposed = false;
    async function refresh() {
      const current = await accountState();
      if (disposed) return;
      if (hadSessionOnLoad.current === null) hadSessionOnLoad.current = current.status === "signed_in";
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
    setError(""); flashNotice("");
    const result = await signInWithGoogle();
    if (!result.ok) setError(result.message);
  }

  async function onMicrosoft() {
    setError(""); flashNotice("");
    const result = await signInWithAzure();
    if (!result.ok) setError(result.message);
  }

  function validEmail() {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return true;
    setError(locale === "zh" ? "请输入有效的邮箱地址" : "Enter a valid email address.");
    return false;
  }

  // Both requests below leave for Supabase, which refuses them without a CAPTCHA
  // token whenever that protection is on. Read one first, and reset the widget
  // afterwards: a token is spent by the attempt that used it, so the next one
  // needs a fresh challenge.
  function takeCaptcha(): { token?: string; blocked: boolean } {
    const token = captchaWidget.current?.token();
    if (captchaWidget.current?.required() && !token) {
      setError(authErrorCopy(locale, "captcha_required"));
      return { blocked: true };
    }
    return { token, blocked: false };
  }

  // Sending the code is a step, not a state: the code is entered on its own page,
  // which is also where the sign-in link lands, so the two entry points cannot
  // drift apart.
  async function onSendCode(event: React.FormEvent) {
    event.preventDefault();
    if (!validEmail()) return;
    const captcha = takeCaptcha();
    if (captcha.blocked) return;
    setSending(true); setError(""); flashNotice("");
    const result = await sendEmailCode(email, captcha.token);
    captchaWidget.current?.reset();
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
    const captcha = takeCaptcha();
    if (captcha.blocked) return;
    setSending(true); setError(""); flashNotice("");
    const result = await signInWithPasswordEmail(email, password, captcha.token);
    captchaWidget.current?.reset();
    setSending(false);
    if (!result.ok) setError(authErrorCopy(locale, result.code));
  }

  // Setting or changing the password. It runs on the live session this page
  // already has, so nobody has to prove anything else — unless the project asks
  // for a fresh sign-in, which arrives as reauthentication_needed (@see the
  // error copy). supabase-js replaces whatever password existed, which is why
  // the wording here covers both setting one and changing it: the user object
  // does not say whether a password is already on the account.
  async function onSavePassword(event: React.FormEvent) {
    event.preventDefault();
    // 6 is the floor the project enforces in Supabase; keeping this number the
    // same is what stops the two from disagreeing (@see auth-setup.md).
    if (newPassword.length < 6) { setError(t.passwordTooShort); return; }
    if (newPassword !== confirmPassword) { setError(t.passwordMismatch); return; }
    setSavingPassword(true); setError(""); flashNotice("");
    const result = await updatePassword(newPassword);
    setSavingPassword(false);
    if (!result.ok) { setError(authErrorCopy(locale, result.code)); return; }
    setNewPassword(""); setConfirmPassword("");
    // Collapse again: the form has done its job, and the notice carries the
    // outcome from here.
    setShowPassword(false);
    flashNotice(t.passwordSaved);
  }

  async function onSignOut() {
    const confirmed = window.confirm(locale === "zh" ? "确定要退出登录吗？扩展会一起退出。" : "Sign out of Verbia? The extension signs out too.");
    if (!confirmed) return;
    setError(""); flashNotice("");
    await signOut();
    setUser(null); setUsage(null); setUsageStatus("idle"); setState("signed_out");
  }

  const provider = user ? providerOf(user) : undefined;
  const avatar = user ? avatarUrlOf(user) : undefined;
  const name = user?.email?.split("@")[0] ?? (user?.email ?? "Verbia");

  // An account with no email identity is one that has only ever signed in with
  // Google — and setting a password is exactly what creates an email identity
  // (@see docs/auth-setup.md, §六.6). That makes this the one password fact we can
  // know for certain: no email identity means no password, and no way in without
  // Google. The block still shows — for that account it is the only backup route
  // there is — but it reads as the optional extra it is.
  //
  // The check is on identities, never on app_metadata.provider: the latter says
  // how the user signed in last, so the same account would flip between the two
  // wordings depending on which button they pressed today.
  const identities = user?.identities ?? [];
  const googleOnly = !identities.some(identity => identity.provider === "email")
    && identities.some(identity => identity.provider === "google");
  const passwordCopy = googleOnly
    ? { title: t.passwordBackupTitle, body: t.passwordBackupBody, toggle: t.passwordBackupToggle }
    : { title: t.passwordTitle, body: t.passwordBody, toggle: t.passwordToggle };

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
              <button className="button secondary account-oauth" type="button" onClick={() => void onGoogle()}>
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                {t.google}
              </button>
              <button className="button secondary account-oauth" type="button" onClick={() => void onMicrosoft()}>
                <svg width="18" height="18" viewBox="0 0 23 23" aria-hidden="true"><path fill="#f25022" d="M1 1h10v10H1z"/><path fill="#7fba00" d="M12 1h10v10H12z"/><path fill="#00a4ef" d="M1 12h10v10H1z"/><path fill="#ffb900" d="M12 12h10v10H12z"/></svg>
                {t.microsoft}
              </button>
              <div className="account-divider"><span>{t.divider}</span></div>
              <form className="account-magic" onSubmit={usePassword ? onPassword : onSendCode}>
                <input type="email" inputMode="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder={t.emailPlaceholder} aria-label={t.emailPlaceholder} />
                {usePassword && <input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} placeholder={t.passwordPlaceholder} aria-label={t.passwordPlaceholder} />}
                <Captcha handleRef={captchaWidget} locale={locale} />
                <button className="button primary" type="submit" disabled={sending}>{sending ? t.sending : usePassword ? t.passwordSubmit : t.send}</button>
              </form>
              <p className="account-hint muted">
                {usePassword ? t.codeLoginHint : t.passwordLoginHint}
                <button className="account-link" type="button" onClick={() => { setUsePassword(!usePassword); setPassword(""); setError(""); flashNotice(""); }}>
                  {usePassword ? t.codeLoginAction : t.passwordLoginAction}
                </button>
              </p>
              {usePassword && <Link className="account-link" href="/account/reset">{t.forgotPassword}</Link>}
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
                  {provider === "azure" && <img className="provider-mark" src="/microsoft.svg" alt={t.providerMicrosoft} width="14" height="14"/>}
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

            <div className="account-password">
              <h2>{passwordCopy.title}</h2>
              <p className="muted">{passwordCopy.body}</p>
              {/* Collapsed by default: a setting should not out-weigh the status
                  it sits next to. Only the toggle shows until it is asked for. */}
              {showPassword
                ? <form className="account-magic" onSubmit={onSavePassword}>
                    <input type="password" autoComplete="new-password" required value={newPassword} onChange={event => setNewPassword(event.target.value)} placeholder={t.passwordNewLabel} aria-label={t.passwordNewLabel} />
                    <input type="password" autoComplete="new-password" required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder={t.passwordConfirmLabel} aria-label={t.passwordConfirmLabel} />
                    <button className="button primary" type="submit" disabled={savingPassword}>{savingPassword ? t.passwordSaving : t.passwordSave}</button>
                  </form>
                : <button className="button secondary" type="button" onClick={() => { setError(""); setShowPassword(true); }}>{passwordCopy.toggle}</button>}
            </div>
            {/* Same container the signed-out block uses for its buttons: bare
                siblings here had no gap, so the sign-out button sat flush against
                the save button in the password form above it. */}
            <div className="account-buttons account-exit">
              {fromExtension && <button className="button primary" type="button" onClick={() => window.dispatchEvent(new CustomEvent("verbia:open-dashboard"))}>{t.openExtension}</button>}
              <button className="button danger" type="button" onClick={() => void onSignOut()}>{t.signOut}</button>
            </div>
          </>
        )}

        {notice && <p className="account-msg ok" role="status">{notice}</p>}
        {error && <p className="account-msg error" role="alert">{error}</p>}

        <Link className="account-back" href="/">{t.backHome}</Link>
      </section>
    </main>
  );
}
