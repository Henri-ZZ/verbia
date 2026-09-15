"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AUTH_CONFIGURED, VERIFY_EMAIL_KEY, authErrorCopy, sendEmailCode, syncSignedInSessionToExtension, updatePassword, verifyEmailCode, verifyEmailLink
} from "../../../lib/verbia-auth";
import { Captcha, type CaptchaHandle } from "../../../components/captcha";

type Locale = "en" | "zh";
type Step = "verify" | "password" | "done";

const T = {
  en: {
    eyebrow: "VERBIA ACCOUNT",
    toggled: "中文",
    verifyTitle: "Enter your sign-in code",
    verifyBody: (email: string) => `We sent a 6-digit code to ${email}.`,
    verifyBodyUnknown: "Enter the 6-digit code from the email, or open the sign-in link on this device.",
    codeLabel: "6-digit code",
    verify: "Verify and continue",
    verifying: "Verifying…",
    resend: "Send a new code",
    resendIn: (seconds: number) => `Send a new code in ${seconds}s`,
    resendSent: "A new code is on its way.",
    linkHint: "Opened the link on another device? Enter the code from that same email here instead.",
    passwordTitle: "Set a password",
    passwordBody: "Your account is ready. A password is optional — it lets you sign in without waiting for an email, in the extension too.",
    passwordLabel: "Password",
    passwordHint: "At least 6 characters — longer is better.",
    confirmLabel: "Confirm password",
    save: "Save password and continue",
    saving: "Saving…",
    skip: "Skip for now",
    mismatch: "The two passwords do not match.",
    tooShort: "Use at least 6 characters.",
    doneTitle: "You are signed in",
    doneBody: "Taking you to your account…",
    back: "← Back to account"
  },
  zh: {
    eyebrow: "VERBIA 账号",
    toggled: "English",
    verifyTitle: "输入登录验证码",
    verifyBody: (email: string) => `验证码已发送至 ${email}。`,
    verifyBodyUnknown: "请输入邮件中的 6 位验证码，或在本设备上打开登录链接。",
    codeLabel: "6 位验证码",
    verify: "验证并继续",
    verifying: "验证中…",
    resend: "重新发送验证码",
    resendIn: (seconds: number) => `${seconds} 秒后可重新发送`,
    resendSent: "新的验证码已发送。",
    linkHint: "在别的设备上打开了链接？请在本页输入同一封邮件里的验证码。",
    passwordTitle: "设置密码",
    passwordBody: "账号已就绪。密码是可选的——设置后无需等待邮件即可登录，在扩展里也一样。",
    passwordLabel: "密码",
    passwordHint: "至少 6 位，建议更长。",
    confirmLabel: "确认密码",
    save: "保存密码并继续",
    saving: "保存中…",
    skip: "暂时跳过",
    mismatch: "两次输入的密码不一致。",
    tooShort: "请至少使用 6 位。",
    doneTitle: "已登录",
    doneBody: "正在跳转到账号页…",
    back: "← 返回账号页"
  }
} as const;

// An account created seconds ago is one this page should offer a password to.
// Anything older is a returning user who just wants in.
const NEW_ACCOUNT_WINDOW_MS = 2 * 60_000;
const RESEND_COOLDOWN_S = 60;

export default function VerifyPage() {
  const [locale, setLocale] = useState<Locale>("en");
  const [step, setStep] = useState<Step>("verify");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const started = useRef(false);
  // Only the resend path needs this; it stays null wherever no site key is set,
  // which keeps the check around it a no-op.
  const captchaWidget = useRef<CaptchaHandle | null>(null);

  const t = T[locale];

  useEffect(() => {
    const preferred = (navigator.language || "en").toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const explicit = params.get("locale");
    setLocale(explicit === "zh" || explicit === "en" ? explicit : preferred.startsWith("zh") ? "zh" : "en");
    try {
      setEmail(window.sessionStorage.getItem(VERIFY_EMAIL_KEY) ?? "");
    } catch {
      // Storage can be unavailable (private mode); the screen still works as long
      // as the user has the code from the email.
    }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown(seconds => Math.max(0, seconds - 1)), 1_000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  // Both entry points — the code and the link — end in the same place: a live
  // session, then either the password step (new account) or the account page.
  const afterVerified = useCallback(async (createdAt: string | undefined) => {
    const created = createdAt ? Date.parse(createdAt) : Number.NaN;
    const isNew = Number.isFinite(created) && Date.now() - created < NEW_ACCOUNT_WINDOW_MS;
    await syncSignedInSessionToExtension();
    if (isNew) {
      setStep("password");
      setNotice("");
      return;
    }
    setStep("done");
    window.location.replace("/account");
  }, []);

  // A link landing carries ?token_hash=; it is exchanged exactly once, even if
  // the effect re-runs (React strict mode).
  useEffect(() => {
    if (started.current || !AUTH_CONFIGURED) return;
    const tokenHash = new URLSearchParams(window.location.search).get("token_hash");
    if (!tokenHash) return;
    started.current = true;
    setBusy(true);
    void verifyEmailLink(tokenHash).then(async result => {
      setBusy(false);
      if (!result.ok) {
        setError(authErrorCopy(locale, result.code));
        return;
      }
      await afterVerified(result.createdAt);
    });
  }, [afterVerified, locale]);

  async function onVerify(event: React.FormEvent) {
    event.preventDefault();
    if (code.trim().length < 6) { setError(authErrorCopy(locale, "invalid_code")); return; }
    setBusy(true); setError(""); setNotice("");
    const result = await verifyEmailCode(email, code.trim());
    setBusy(false);
    if (!result.ok) { setError(authErrorCopy(locale, result.code)); return; }
    await afterVerified(result.createdAt);
  }

  // Resending is a second sign-in request, so it needs its own CAPTCHA token:
  // the one solved on the account page was spent there. Entering the code does
  // not — that verifies an existing challenge rather than starting a new one.
  async function onResend() {
    if (cooldown > 0) return;
    if (!email) { setError(authErrorCopy(locale, "invalid_code")); return; }
    const token = captchaWidget.current?.token();
    if (captchaWidget.current?.required() && !token) { setError(authErrorCopy(locale, "captcha_required")); return; }
    setBusy(true); setError(""); setNotice("");
    const result = await sendEmailCode(email, token);
    captchaWidget.current?.reset();
    setBusy(false);
    if (!result.ok) { setError(authErrorCopy(locale, result.code)); return; }
    setCooldown(RESEND_COOLDOWN_S);
    setNotice(t.resendSent);
  }

  async function onSavePassword(event: React.FormEvent) {
    event.preventDefault();
    // 6 is the floor the project enforces in Supabase; keeping the check here the
    // same number is what stops the two from disagreeing (@see auth-setup.md).
    if (password.length < 6) { setError(t.tooShort); return; }
    if (password !== confirm) { setError(t.mismatch); return; }
    setBusy(true); setError("");
    const result = await updatePassword(password);
    setBusy(false);
    if (!result.ok) { setError(authErrorCopy(locale, result.code)); return; }
    setStep("done");
    window.location.replace("/account");
  }

  function onSkip() {
    setStep("done");
    window.location.replace("/account");
  }

  if (!AUTH_CONFIGURED) {
    return (
      <main className="account-main shell">
        <section className="account-panel">
          <p className="account-eyebrow">{t.eyebrow}</p>
          <h1>{locale === "zh" ? "账号登录尚未配置" : "Account sign-in is not configured"}</h1>
          <Link className="button secondary" href="/account">{t.back}</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="account-main shell">
      <section className="account-panel">
        <p className="account-eyebrow">{t.eyebrow}</p>

        {step === "verify" && (
          <>
            <h1>{t.verifyTitle}</h1>
            <p className="muted">{email ? t.verifyBody(email) : t.verifyBodyUnknown}</p>
            <form className="account-magic account-code" onSubmit={onVerify}>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                required
                value={code}
                onChange={event => setCode(event.target.value.replace(/\D/g, ""))}
                placeholder="••••••"
                aria-label={t.codeLabel}
              />
              <button className="button primary" type="submit" disabled={busy}>{busy ? t.verifying : t.verify}</button>
            </form>
            <p className="account-resend">
              {cooldown > 0
                ? t.resendIn(cooldown)
                : <button className="account-link" type="button" disabled={busy} onClick={() => void onResend()}>{t.resend}</button>}
            </p>
            <Captcha handleRef={captchaWidget} locale={locale} />
            <p className="account-hint muted">{t.linkHint}</p>
          </>
        )}

        {step === "password" && (
          <>
            <h1>{t.passwordTitle}</h1>
            <p className="muted">{t.passwordBody}</p>
            <form className="account-magic" onSubmit={onSavePassword}>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                placeholder={t.passwordLabel}
                aria-label={t.passwordLabel}
              />
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={event => setConfirm(event.target.value)}
                placeholder={t.confirmLabel}
                aria-label={t.confirmLabel}
              />
              <button className="button primary" type="submit" disabled={busy}>{busy ? t.saving : t.save}</button>
            </form>
            <p className="account-hint muted">{t.passwordHint}</p>
            <div className="account-actions">
              <button className="button secondary" type="button" disabled={busy} onClick={onSkip}>{t.skip}</button>
            </div>
          </>
        )}

        {step === "done" && (
          <>
            <h1>{t.doneTitle}</h1>
            <p className="muted">{t.doneBody}</p>
          </>
        )}

        {notice && <p className="account-msg ok" role="status">{notice}</p>}
        {error && <p className="account-msg error" role="alert">{error}</p>}

        <Link className="account-back" href="/account">{t.back}</Link>
      </section>
    </main>
  );
}
