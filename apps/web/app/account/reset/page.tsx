"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AUTH_CONFIGURED, authErrorCopy, exchangeSignInCode, requestPasswordReset, updatePassword, verifyRecoveryCode
} from "../../../lib/verbia-auth";
import { CAPTCHA_ENABLED, Captcha, type CaptchaHandle } from "../../../components/captcha";

type Locale = "en" | "zh";
type Step = "request" | "reset" | "done";

const T = {
  en: {
    eyebrow: "VERBIA ACCOUNT",
    toggled: "中文",
    requestTitle: "Reset your password",
    requestBody: "Enter the email you signed in with and we will send you a code.",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    send: "Send the reset email",
    sending: "Sending…",
    sent: (email: string) => `We sent a code to ${email}. Enter it below with a new password.`,
    linked: "Choose a new password for your account.",
    codeLabel: "6-digit code",
    newLabel: "New password",
    confirmLabel: "Confirm password",
    submit: "Reset password",
    submitting: "Saving…",
    doneTitle: "Password reset",
    doneBody: "You can sign in with it now.",
    goToAccount: "Go to your account",
    needEmail: "Enter your email address first.",
    needCode: "Enter the code from the email.",
    tooShort: "Use at least 6 characters.",
    mismatch: "The two passwords do not match.",
    back: "← Back to account"
  },
  zh: {
    eyebrow: "VERBIA 账号",
    toggled: "English",
    requestTitle: "重置密码",
    requestBody: "输入登录用的邮箱，我们会发送一封带验证码的邮件。",
    emailLabel: "邮箱",
    emailPlaceholder: "you@example.com",
    send: "发送重置邮件",
    sending: "发送中…",
    sent: (email: string) => `验证码已发送至 ${email}。请在下方填入验证码并设置新密码。`,
    linked: "请为你的账号设置新密码。",
    codeLabel: "6 位验证码",
    newLabel: "新密码",
    confirmLabel: "确认密码",
    submit: "重置密码",
    submitting: "保存中…",
    doneTitle: "密码已重置",
    doneBody: "现在可以用新密码登录了。",
    goToAccount: "前往账号页",
    needEmail: "请先填写邮箱地址。",
    needCode: "请填写邮件里的验证码。",
    tooShort: "请至少使用 6 位。",
    mismatch: "两次输入的密码不一致。",
    back: "← 返回账号页"
  }
} as const;

export default function ResetPage() {
  const [locale, setLocale] = useState<Locale>("en");
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  // False when the visitor arrived through the recovery link, which already
  // carries the proof: only a new password is left to choose.
  const [codeNeeded, setCodeNeeded] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [captchaRequested, setCaptchaRequested] = useState(false);
  const [sendPending, setSendPending] = useState(false);
  const captchaWidget = useRef<CaptchaHandle | null>(null);
  const exchanged = useRef(false);

  const t = T[locale];

  useEffect(() => {
    const preferred = (navigator.language || "en").toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const explicit = params.get("locale");
    setLocale(explicit === "zh" || explicit === "en" ? explicit : preferred.startsWith("zh") ? "zh" : "en");
  }, []);

  // A recovery link lands here with ?code=. Exchanging it signs the account in
  // and leaves only the new password to set — which is why the code field is
  // hidden in that case. Guarded like the callback page: development mounts this
  // effect twice, and a code is spent by the first exchange.
  useEffect(() => {
    if (!AUTH_CONFIGURED || exchanged.current) return;
    if (!new URLSearchParams(window.location.search).get("code")) return;
    exchanged.current = true;
    setBusy(true);
    void exchangeSignInCode().then(async result => {
      setBusy(false);
      if (!result.ok) { setError(result.message ?? authErrorCopy(locale, "invalid_code")); return; }
      setCodeNeeded(false);
      setStep("reset");
    });
    // Runs once: the recovery code in the URL is single-use.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sending the email is a protected request, so it needs a CAPTCHA token — but
  // the widget only shows up once someone asks to send, and solving it sends the
  // mail, so there is no second click (@see the verify page for the same shape).
  function requestSend() {
    if (busy) return;
    setCaptchaRequested(true);
    if (CAPTCHA_ENABLED && !captchaWidget.current?.token()) {
      setError("");
      setNotice(authErrorCopy(locale, "captcha_required"));
      setSendPending(true);
      return;
    }
    void onSend();
  }

  function onCaptchaSolved() {
    if (!sendPending) return;
    setSendPending(false);
    setNotice("");
    void onSend();
  }

  async function onSend() {
    const address = email.trim();
    if (!address) { setError(t.needEmail); return; }
    const token = captchaWidget.current?.token();
    if (CAPTCHA_ENABLED && !token) { setError(authErrorCopy(locale, "captcha_required")); return; }
    setBusy(true); setError(""); setNotice("");
    const result = await requestPasswordReset(address, token);
    captchaWidget.current?.reset();
    setBusy(false);
    if (!result.ok) { setError(authErrorCopy(locale, result.code)); return; }
    setEmail(address);
    setCodeNeeded(true);
    setStep("reset");
  }

  async function onReset(event: React.FormEvent) {
    event.preventDefault();
    const address = email.trim();
    if (codeNeeded && !address) { setError(t.needEmail); return; }
    if (codeNeeded && !code.trim()) { setError(t.needCode); return; }
    // 6 is the floor the project enforces in Supabase (@see auth-setup.md).
    if (password.length < 6) { setError(t.tooShort); return; }
    if (password !== confirm) { setError(t.mismatch); return; }
    setBusy(true); setError(""); setNotice("");
    if (codeNeeded) {
      const verified = await verifyRecoveryCode(address, code.trim());
      if (!verified.ok) { setBusy(false); setError(authErrorCopy(locale, verified.code)); return; }
    }
    // The verified code leaves a live session, which is what updatePassword needs.
    const result = await updatePassword(password);
    setBusy(false);
    if (!result.ok) { setError(authErrorCopy(locale, result.code)); return; }
    setPassword(""); setConfirm("");
    setStep("done");
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

        {step === "request" && (
          <>
            <h1>{t.requestTitle}</h1>
            <p className="muted">{t.requestBody}</p>
            <form className="account-magic" onSubmit={event => { event.preventDefault(); requestSend(); }}>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder={t.emailPlaceholder}
                aria-label={t.emailLabel}
              />
              {captchaRequested && <Captcha handleRef={captchaWidget} locale={locale} onSolved={onCaptchaSolved} />}
              <button className="button primary" type="submit" disabled={busy}>{busy ? t.sending : t.send}</button>
            </form>
          </>
        )}

        {step === "reset" && (
          <>
            <h1>{t.requestTitle}</h1>
            <p className="muted">{codeNeeded ? t.sent(email) : t.linked}</p>
            <form className="account-magic" onSubmit={onReset}>
              {codeNeeded && (
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
              )}
              <input
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={event => setPassword(event.target.value)}
                placeholder={t.newLabel}
                aria-label={t.newLabel}
              />
              <input
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={event => setConfirm(event.target.value)}
                placeholder={t.confirmLabel}
                aria-label={t.confirmLabel}
              />
              <button className="button primary" type="submit" disabled={busy}>{busy ? t.submitting : t.submit}</button>
            </form>
          </>
        )}

        {step === "done" && (
          <>
            <h1>{t.doneTitle}</h1>
            <p className="muted">{t.doneBody}</p>
            <Link className="button primary" href="/account">{t.goToAccount}</Link>
          </>
        )}

        {notice && <p className="account-msg ok" role="status">{notice}</p>}
        {error && <p className="account-msg error" role="alert">{error}</p>}

        <Link className="account-back" href="/account">{t.back}</Link>
      </section>
    </main>
  );
}
