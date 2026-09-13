"use client";

import { useState } from "react";

const scenarios = [
  {
    id: "first",
    label: "First payment request",
    status: "Invoice #1048 · $1,850 · Due September 5",
    subject: "Invoice #1048 — September design work",
    recipient: "Morgan Lee",
    message: "Hi Morgan, attached is invoice #1048 for $1,850 for the September design work. Payment is due on September 5. You can use the bank details listed on the invoice.",
    intent: "把发票发给客户，礼貌说明金额和到期日，请他确认收到。语气友好、专业。",
    reply: "Hi Morgan, I’ve attached invoice #1048 for $1,850 for the September design work, due on September 5. Could you confirm that you received it? Please let me know if you need any other details to process the payment. Thank you.",
    note: "This version gives the recipient every detail needed to identify and process a new invoice."
  },
  {
    id: "due",
    label: "Due-date reminder",
    status: "Invoice #1048 · $1,850 · Due today",
    subject: "Reminder: Invoice #1048 due today",
    recipient: "Morgan Lee",
    message: "Hi Morgan, a quick reminder that invoice #1048 for the September design work is due today. The total is $1,850.",
    intent: "今天到期，温和提醒一下。如果还需要发票或付款信息，我可以重发。不要显得不信任客户。",
    reply: "Hi Morgan, just a quick reminder that invoice #1048 for $1,850 is due today. If you need another copy of the invoice or the payment details, I’m happy to resend them. Thank you.",
    note: "This version treats the due date as a helpful reminder and offers the information that may unblock payment."
  },
  {
    id: "overdue",
    label: "Overdue payment",
    status: "Invoice #1048 · $1,850 · 6 days overdue",
    subject: "Invoice #1048 — payment status",
    recipient: "Morgan Lee",
    message: "Hi Morgan, attached is invoice #1048 for $1,850 for the September design work. Payment was due on September 5.",
    intent: "这张发票已经过期六天了，礼貌问一下能不能本周五付款。如果已经安排了，请告诉我状态；如果发票哪里不对，我可以马上改。语气专业，不要太软，也不要像催债。",
    reply: "Hi Morgan, I’m following up on invoice #1048 for $1,850, which was due on September 5. Could you let me know whether payment is scheduled for this Friday? If it has already been arranged, a quick status update would be helpful. I’m also happy to resend the invoice or correct anything that may be holding it up. Thank you.",
    note: "This version names the overdue invoice, asks for a concrete status, and leaves room to resolve a genuine problem."
  }
] as const;

export function PaymentRequestScenarioDemo() {
  const [activeId, setActiveId] = useState<(typeof scenarios)[number]["id"]>("overdue");
  const scenario = scenarios.find((item) => item.id === activeId) ?? scenarios[2];

  return <section className="followup-demo payment-demo shell" aria-labelledby="payment-demo-title">
    <div className="followup-demo-heading">
      <p className="eyebrow">CONTEXT CHANGES THE REQUEST</p>
      <h2 id="payment-demo-title">The right wording depends on where the payment stands.</h2>
      <p>Choose a payment stage to see how the invoice status and your intended outcome shape the message.</p>
    </div>
    <div className="followup-scenario-tabs" aria-label="Payment request examples">
      {scenarios.map((item) => <button key={item.id} type="button" aria-pressed={activeId === item.id} onClick={() => setActiveId(item.id)}>{item.label}</button>)}
    </div>
    <div className="followup-workspace" aria-live="polite">
      <article className="followup-email">
        <header><div className="email-avatar">ML</div><div><strong>{scenario.recipient}</strong><span>{scenario.subject}</span></div></header>
        <p>{scenario.message}</p>
        <small className="payment-status">{scenario.status}</small>
      </article>
      <aside className="followup-verbia">
        <header><img src="/verbia-mark.svg" alt="" width="30" height="30"/><strong>Verbia</strong><span>Context ready</span></header>
        <div><small>WHAT I WANT TO SAY</small><p className="followup-intent" lang="zh-CN">“{scenario.intent}”</p><small>NATURAL PAYMENT REQUEST</small><blockquote>“{scenario.reply}”</blockquote><p className="followup-explanation">{scenario.note}</p><div className="followup-adjustments" aria-label="Example adjustments"><span>Make it warmer</span><span>Make the deadline firmer</span><span>Shorten it</span></div></div>
      </aside>
    </div>
  </section>;
}
