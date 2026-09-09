"use client";

import { FormEvent, useEffect, useState } from "react";
import { API_BASE, getClient } from "../lib/verbia-auth";

type Locale = "en" | "zh";
type Source = "website" | "popup" | "settings" | "uninstall";

const copy = {
  en: {
    type: "What would you like to share?", categories: [["bug", "Report a problem"], ["suggestion", "Suggest a feature"], ["experience", "Share your experience"], ["other", "Something else"]],
    uninstallType: "What made you uninstall Verbia?", reasons: [["not_useful", "The replies were not useful enough"], ["too_complex", "It was too difficult to use"], ["not_working", "Something did not work"], ["privacy", "I had a privacy concern"], ["price", "Price or free allowance"], ["missing_platform", "It does not support the platform I use"], ["not_needed", "I do not need it right now"], ["other", "Another reason"]],
    message: "Tell us more", optional: "Optional", placeholder: "What happened, or what would make Verbia more useful?", email: "Contact email", emailHint: "Optional. Add it only if you would like a reply.", consent: "You may contact me about this feedback.", privacy: "Please do not include passwords, payment card details, private messages, or other sensitive information.", submit: "Send feedback", sending: "Sending…", success: "Thank you. Your feedback has been received.", error: "We couldn’t send your feedback. Please try again or email us directly.", required: "Choose an option or add a message before sending."
  },
  zh: {
    type: "你想反馈什么？", categories: [["bug", "报告问题"], ["suggestion", "功能建议"], ["experience", "分享使用感受"], ["other", "其他"]],
    uninstallType: "是什么让你卸载了 Verbia？", reasons: [["not_useful", "回复效果不符合预期"], ["too_complex", "使用方式太复杂"], ["not_working", "遇到错误或无法使用"], ["privacy", "对隐私有顾虑"], ["price", "价格或免费额度"], ["missing_platform", "不支持我使用的平台"], ["not_needed", "暂时不需要"], ["other", "其他原因"]],
    message: "补充说明", optional: "选填", placeholder: "发生了什么，或者怎样能让 Verbia 更好用？", email: "联系邮箱", emailHint: "选填。只有希望我们回复时才需要填写。", consent: "允许我们就这条反馈联系我。", privacy: "请勿填写密码、银行卡信息、私人消息或其他敏感内容。", submit: "提交反馈", sending: "正在提交…", success: "谢谢，你的反馈已经收到。", error: "反馈未能提交，请重试或直接发送邮件联系我们。", required: "请先选择一项，或填写补充说明。"
  }
} as const;

export function ContactFeedbackForm({ locale, source = "website" }: { locale: Locale; source?: Source }) {
  const t = copy[locale];
  const uninstall = source === "uninstall";
  const choices = uninstall ? t.reasons : t.categories;
  const [choice, setChoice] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [allowContact, setAllowContact] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [notice, setNotice] = useState("");
  const [actualSource, setActualSource] = useState<Source>(source);
  const [extensionVersion, setExtensionVersion] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const querySource = params.get("source");
    if (["popup", "settings", "uninstall"].includes(querySource ?? "")) setActualSource(querySource as Source);
    setExtensionVersion((params.get("version") ?? "").slice(0, 40));
    void getClient().then(client => client.auth.getSession()).then(({ data }) => {
      if (data.session?.user.email) setEmail(data.session.user.email);
    }).catch(() => undefined);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!choice && !message.trim()) { setNotice(t.required); return; }
    setState("sending"); setNotice("");
    try {
      const client = await getClient().catch(() => null);
      const session = client ? (await client.auth.getSession()).data.session : null;
      const nav = navigator as Navigator & { userAgentData?: { brands?: Array<{ brand: string }> } };
      const response = await fetch(`${API_BASE}/v1/feedback`, {
        method: "POST",
        headers: { "content-type": "application/json", ...(session?.access_token ? { authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({ source: actualSource, category: uninstall ? "uninstall" : (choice || "other"), reason: uninstall ? choice : undefined, message: message.trim(), contactEmail: allowContact ? email.trim() : undefined, allowContact, locale, extensionVersion: extensionVersion || undefined, browser: nav.userAgentData?.brands?.map(item => item.brand).join(", ") ?? navigator.userAgent.slice(0, 160), company: "" })
      });
      if (!response.ok) throw new Error("feedback request failed");
      setState("success"); setNotice(t.success); setChoice(""); setMessage("");
    } catch {
      setState("error"); setNotice(t.error);
    }
  }

  return <form className="feedback-form" onSubmit={submit}>
    <fieldset><legend>{uninstall ? t.uninstallType : t.type}</legend><div className="feedback-choices">{choices.map(([value, label]) => <label key={value} className={choice === value ? "selected" : ""}><input type="radio" name="feedback-choice" value={value} checked={choice === value} onChange={() => setChoice(value)}/><span>{label}</span><i aria-hidden="true"/></label>)}</div></fieldset>
    <label className="feedback-field"><span>{t.message} <small>{t.optional}</small></span><textarea value={message} onChange={event => setMessage(event.target.value)} maxLength={2000} rows={6} placeholder={t.placeholder}/><em>{message.length}/2000</em></label>
    <label className="feedback-field"><span>{t.email} <small>{t.optional}</small></span><input type="email" value={email} onChange={event => setEmail(event.target.value)} maxLength={320} autoComplete="email" placeholder="you@example.com" required={allowContact}/><small>{t.emailHint}</small></label>
    <label className="feedback-consent"><input type="checkbox" checked={allowContact} onChange={event => setAllowContact(event.target.checked)}/><span>{t.consent}</span></label>
    <p className="feedback-privacy">{t.privacy}</p>
    <button className="button primary" type="submit" disabled={state === "sending"}>{state === "sending" ? t.sending : t.submit}</button>
    <p className={`feedback-status ${state}`} role="status" aria-live="polite">{notice}</p>
  </form>;
}
