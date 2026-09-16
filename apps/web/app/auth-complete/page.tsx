"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Landing page for sign-ins initiated from the Chrome extension. The
// extension exchanges the PKCE code (its verifier lives in extension
// storage), then the API issues a one-time handoff token. The bridge redeems
// it into a separate website session. This page waits for that result and
// stays visible so the user can choose where to go next.
type Status = "waiting" | "success" | "error";

export default function AuthCompletePage() {
  const [status, setStatus] = useState<Status>("waiting");
  const [extensionConnected, setExtensionConnected] = useState(false);
  const [chinese, setChinese] = useState(false);

  useEffect(() => {
    setChinese(navigator.language.toLowerCase().startsWith("zh"));
    const detectExtension = () => {
      setExtensionConnected(document.documentElement.dataset.verbiaExtension === "connected");
      const extensionLocale = document.documentElement.dataset.verbiaLocale;
      if (extensionLocale) setChinese(extensionLocale === "zh");
    };
    detectExtension();
    const sessionState = document.documentElement.dataset.verbiaSessionState;
    if (sessionState === "ready") setStatus("success");
    if (sessionState === "failed") setStatus("error");
    const onSession = () => setStatus("success");
    const onSessionFailed = () => setStatus("error");
    window.addEventListener("verbia:session", onSession);
    window.addEventListener("verbia:session-failed", onSessionFailed);
    window.addEventListener("verbia:bridge-ready", detectExtension);
    const started = Date.now();
    const interval = window.setInterval(() => {
      if (document.documentElement.dataset.verbiaSessionState === "ready") {
        window.clearInterval(interval);
        setStatus("success");
      } else if (document.documentElement.dataset.verbiaSessionState === "failed") {
        window.clearInterval(interval);
        setStatus("error");
      } else if (Date.now() - started > 15_000) {
        window.clearInterval(interval);
        setStatus("error");
      }
    }, 350);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("verbia:session", onSession);
      window.removeEventListener("verbia:session-failed", onSessionFailed);
      window.removeEventListener("verbia:bridge-ready", detectExtension);
    };
  }, []);

  const copy = chinese ? {
    eyebrow: "账号登录", waiting: "正在完成登录…", waitingBody: "请稍候，我们正在安全地连接你的 Verbia 账号。",
    success: "登录成功", successBody: "你的 Verbia 账号已经连接，可以回到插件继续使用。",
    error: "暂时无法确认登录", errorBody: "登录链接可能已过期，或者扩展没有完成连接。你可以回到控制面板后重新尝试。",
    dashboard: "回到控制面板", home: "回到首页"
  } : {
    eyebrow: "ACCOUNT SIGN-IN", waiting: "Completing sign-in…", waitingBody: "Please wait while we securely connect your Verbia account.",
    success: "You’re signed in", successBody: "Your Verbia account is connected. You can return to the extension and continue.",
    error: "We couldn’t confirm the sign-in", errorBody: "The sign-in link may have expired, or the extension did not finish connecting. Return to the Dashboard and try again.",
    dashboard: "Back to Dashboard", home: "Back to homepage"
  };

  const openDashboard = () => window.dispatchEvent(new CustomEvent("verbia:open-dashboard"));

  return (
    <main className="auth-complete-page" id="main" lang={chinese ? "zh-CN" : "en"}>
      <section className="auth-complete-card" aria-live="polite">
        <Link className="auth-complete-brand" href={chinese ? "/zh" : "/"} aria-label="Verbia home"><img src="/verbia-horizontal-logo.svg" alt="Verbia"/></Link>
        <div className={`auth-complete-mark ${status}`} aria-hidden="true">{status === "waiting" ? <span/> : status === "success" ? "✓" : "!"}</div>
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1>{status === "waiting" ? copy.waiting : status === "success" ? copy.success : copy.error}</h1>
        <p>{status === "waiting" ? copy.waitingBody : status === "success" ? copy.successBody : copy.errorBody}</p>
        {status !== "waiting" && <div className="auth-complete-actions">
          {extensionConnected && <button className="button primary" type="button" onClick={openDashboard}>{copy.dashboard} <span aria-hidden="true">→</span></button>}
          <Link className="button secondary" href={chinese ? "/zh" : "/"}>{copy.home}</Link>
        </div>}
      </section>
    </main>
  );
}
