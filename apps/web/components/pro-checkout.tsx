"use client";

import { useEffect, useId, useRef, useState } from "react";
import { API_BASE, getClient } from "../lib/verbia-auth";

type Cycle = "monthly" | "annual";
type PendingCheckout = { cycle: Cycle; token: string; accountEmail: string };

export function ProCheckout({ locale = "en", compact = false }: { locale?: "en" | "zh"; compact?: boolean }) {
  const [loading, setLoading] = useState<"monthly" | "annual" | null>(null);
  const [pending, setPending] = useState<PendingCheckout | null>(null);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogTitleId = useId();
  const zh = locale === "zh";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (pending && !dialog.open) dialog.showModal();
    if (!pending && dialog.open) dialog.close();
  }, [pending]);

  async function prepareCheckout(cycle: Cycle) {
    setError("");
    setLoading(cycle);
    try {
      const client = await getClient();
      const { data } = await client.auth.getSession();
      const session = data.session;
      if (!session) {
        window.location.assign(`/account?locale=${locale}&intent=pro&cycle=${cycle}`);
        return;
      }
      setPending({
        cycle,
        token: session.access_token,
        accountEmail: session.user.email || (zh ? "当前登录账号" : "Current signed-in account"),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (zh ? "暂时无法确认登录账号。" : "Could not verify your account."));
    } finally {
      setLoading(null);
    }
  }

  async function checkout() {
    if (!pending) return;
    const { cycle, token } = pending;
    setError("");
    setLoading(cycle);
    try {
      const response = await fetch(`${API_BASE}/v1/billing/checkout`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ cycle, locale }),
      });
      const body = await response.json() as { checkoutUrl?: string; userMessage?: string };
      if (!response.ok || !body.checkoutUrl) throw new Error(body.userMessage || (zh ? "暂时无法打开结账页面。" : "Checkout is temporarily unavailable."));
      setPending(null);
      window.open(body.checkoutUrl, "_blank", "noopener,noreferrer");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (zh ? "暂时无法打开结账页面。" : "Checkout is temporarily unavailable."));
    } finally {
      setLoading(null);
    }
  }

  return <div className={`checkout-actions${compact ? " compact" : ""}`}>
    <button className="button primary full" type="button" disabled={loading !== null} onClick={() => void prepareCheckout("monthly")}>{loading === "monthly" ? (zh ? "正在处理…" : "Working…") : (zh ? "$9.99 / 月" : "$9.99 monthly")}</button>
    <button className="button secondary full" type="button" disabled={loading !== null} onClick={() => void prepareCheckout("annual")}>{loading === "annual" ? (zh ? "正在处理…" : "Working…") : (zh ? "$69.99 / 年" : "$69.99 annually")}</button>
    <p className="checkout-account-note">{zh ? "Premium 绑定当前 Verbia 账号；支付邮箱仅用于付款和收据。" : "Premium is linked to your Verbia account; the payment email is only for payment and receipts."}</p>
    {error && <p className="checkout-error" role="alert">{error}</p>}
    <dialog
      className="checkout-dialog"
      ref={dialogRef}
      aria-labelledby={dialogTitleId}
      onCancel={() => setPending(null)}
      onClose={() => setPending(null)}
    >
      <div className="checkout-dialog-content">
        <p className="eyebrow">VERBIA PREMIUM</p>
        <h2 id={dialogTitleId}>{zh ? "确认权益归属账号" : "Confirm your Premium account"}</h2>
        <p>{zh ? "完成付款后，Premium 将开通到这个 Verbia 账号：" : "After payment, Premium will be activated for this Verbia account:"}</p>
        <strong className="checkout-account-email">{pending?.accountEmail}</strong>
        <p className="checkout-email-explanation">
          {zh
            ? "支付页中的邮箱用于付款和接收收据，可以修改。即使修改，它也不会改变 Premium 的归属账号。"
            : "The email on the payment page is for payment and receipts, and you may change it. Changing it will not move Premium to another Verbia account."}
        </p>
        <p className="checkout-legal-note">
          {zh ? <>继续即表示你同意 Verbia <a href="/zh/terms" target="_blank">使用条款</a>，并已阅读<a href="/zh/refund" target="_blank">退款政策</a>与 <a href="https://www.waffo.ai/en/buyer-terms" target="_blank" rel="noreferrer">Waffo 买家条款</a>。</> : <>By continuing, you agree to the Verbia <a href="/terms" target="_blank">Terms of Use</a> and acknowledge the <a href="/refund" target="_blank">Refund Policy</a> and <a href="https://www.waffo.ai/en/buyer-terms" target="_blank" rel="noreferrer">Waffo Buyer Terms</a>.</>}
        </p>
        <div className="checkout-dialog-actions">
          <button className="button secondary" type="button" disabled={loading !== null} onClick={() => setPending(null)}>{zh ? "取消" : "Cancel"}</button>
          <button className="button primary" type="button" disabled={loading !== null} onClick={() => void checkout()}>{loading ? (zh ? "正在打开…" : "Opening…") : (zh ? "继续付款" : "Continue to payment")}</button>
        </div>
        {error && <p className="checkout-error" role="alert">{error}</p>}
      </div>
    </dialog>
  </div>;
}
