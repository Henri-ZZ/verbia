"use client";

import { useState } from "react";

const scenarios = [
  {
    id: "gentle",
    label: "Gentle first follow-up",
    timing: "Sent Monday · No reply after 3 business days",
    subject: "Draft partnership outline",
    recipient: "Maya Chen",
    message: "Hi Maya, I’ve attached the partnership outline we discussed. Would you have time to share your initial thoughts this week?",
    intent: "想礼貌问一下她有没有看到，不急着要决定，也别让人觉得我在责怪她。",
    reply: "Hi Maya, I wanted to follow up on the partnership outline I sent on Monday. Have you had a chance to take a look? No rush on a final decision — I’d be glad to answer any questions when you have time.",
    note: "This version assumes the recipient may simply be busy and removes pressure for an immediate decision."
  },
  {
    id: "deadline",
    label: "A real deadline",
    timing: "Sent Thursday · No reply after 4 business days",
    subject: "Revised launch plan",
    recipient: "Jordan Lee",
    message: "Hi Jordan, I’ve attached the revised launch plan with the changes from Monday’s review. Could you approve the final timeline by Tuesday so the design team can begin on Wednesday?",
    intent: "礼貌提醒一下我上周发的方案。我周五前需要知道时间线能不能批准；如果他还没决定，请告诉我大概什么时候能回复。不要显得催得太紧。",
    reply: "Hi Jordan, I’m following up on the revised launch plan I sent last Thursday. Could you let me know by Friday whether the timeline is approved? If you need more time, an estimated decision date would help me plan the design kickoff. Thanks.",
    note: "This version explains the real dependency, gives a new date, and leaves room for an honest timing update."
  },
  {
    id: "second",
    label: "Second follow-up",
    timing: "Original email 9 days ago · First follow-up 4 days ago",
    subject: "Security review owner",
    recipient: "Sam Rivera",
    message: "Hi Sam, could you confirm who will own the security review for this release? We need an owner before the staging checklist can be completed.",
    intent: "这是第二次跟进。简短直接地问谁负责，如果不是他，请告诉我应该找谁。不要抱怨他没回。",
    reply: "Hi Sam, following up once more on the security review for this release. Could you confirm who will own it, or point me to the right person? We need an owner before we can complete the staging checklist. Thank you.",
    note: "This version is shorter, states the blocker, and offers an easy alternative if the recipient is not the owner."
  }
] as const;

export function FollowUpScenarioDemo() {
  const [activeId, setActiveId] = useState<(typeof scenarios)[number]["id"]>("deadline");
  const scenario = scenarios.find((item) => item.id === activeId) ?? scenarios[1];

  return <section className="followup-demo shell" aria-labelledby="followup-demo-title">
    <div className="followup-demo-heading">
      <p className="eyebrow">CONTEXT CHANGES THE FOLLOW-UP</p>
      <h2 id="followup-demo-title">The same silence can call for a different reply.</h2>
      <p>Choose a situation to see how the earlier email, timing, and desired outcome shape the draft.</p>
    </div>
    <div className="followup-scenario-tabs" aria-label="Follow-up examples">
      {scenarios.map((item) => <button key={item.id} type="button" aria-pressed={activeId === item.id} onClick={() => setActiveId(item.id)}>{item.label}</button>)}
    </div>
    <div className="followup-workspace" aria-live="polite">
      <article className="followup-email">
        <header><div className="email-avatar">{scenario.recipient.split(" ").map((part) => part[0]).join("")}</div><div><strong>{scenario.recipient}</strong><span>{scenario.subject}</span></div></header>
        <p>{scenario.message}</p>
        <small>{scenario.timing}</small>
      </article>
      <aside className="followup-verbia">
        <header><img src="/verbia-mark.svg" alt="" width="30" height="30"/><strong>Verbia</strong><span>Context ready</span></header>
        <div><small>WHAT I WANT TO SAY</small><p className="followup-intent" lang="zh-CN">“{scenario.intent}”</p><small>NATURAL FOLLOW-UP</small><blockquote>“{scenario.reply}”</blockquote><p className="followup-explanation">{scenario.note}</p><div className="followup-adjustments" aria-label="Example adjustments"><span>Make it warmer</span><span>Make it shorter</span><span>Be more direct</span></div></div>
      </aside>
    </div>
  </section>;
}
