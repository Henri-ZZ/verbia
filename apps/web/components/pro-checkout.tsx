"use client";

import { useState } from "react";
import { API_BASE, getClient } from "../lib/verbia-auth";

export function ProCheckout({ locale = "en", compact = false }: { locale?: "en" | "zh"; compact?: boolean }) {
  const [loading, setLoading] = useState<"monthly" | "annual" | null>(null);
  const [error, setError] = useState("");
  const zh = locale === "zh";

  async function checkout(cycle: "monthly" | "annual") {
    setError("");
    setLoading(cycle);
    try {
      const client = await getClient();
      const { data } = await client.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        window.location.assign(`/account?locale=${locale}&intent=pro&cycle=${cycle}`);
        return;
      }
      const response = await fetch(`${API_BASE}/v1/billing/checkout`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ cycle, locale }),
      });
      const body = await response.json() as { checkoutUrl?: string; userMessage?: string };
      if (!response.ok || !body.checkoutUrl) throw new Error(body.userMessage || (zh ? "暂时无法打开结账页面。" : "Checkout is temporarily unavailable."));
      window.open(body.checkoutUrl, "_blank", "noopener,noreferrer");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (zh ? "暂时无法打开结账页面。" : "Checkout is temporarily unavailable."));
    } finally {
      setLoading(null);
    }
  }

  return <div className={`checkout-actions${compact ? " compact" : ""}`}>
    <button className="button primary full" type="button" disabled={loading !== null} onClick={() => void checkout("monthly")}>{loading === "monthly" ? (zh ? "正在打开…" : "Opening…") : (zh ? "$9.99 / 月" : "$9.99 monthly")}</button>
    <button className="button secondary full" type="button" disabled={loading !== null} onClick={() => void checkout("annual")}>{loading === "annual" ? (zh ? "正在打开…" : "Opening…") : (zh ? "$69.99 / 年" : "$69.99 annually")}</button>
    {error && <p className="checkout-error" role="alert">{error}</p>}
  </div>;
}
