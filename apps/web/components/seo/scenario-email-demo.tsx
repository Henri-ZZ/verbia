"use client";

import { useState } from "react";

export type ScenarioEmail = {
  id: string;
  label: string;
  meta: string;
  subject: string;
  sender: string;
  initials: string;
  message: string;
  intent: string;
  reply: string;
  note: string;
};

export function ScenarioEmailDemo({ eyebrow, title, description, ariaLabel, outputLabel, scenarios, defaultId, adjustments }: {
  eyebrow: string;
  title: string;
  description: string;
  ariaLabel: string;
  outputLabel: string;
  scenarios: readonly ScenarioEmail[];
  defaultId: string;
  adjustments: readonly string[];
}) {
  const [activeId, setActiveId] = useState(defaultId);
  const scenario = scenarios.find((item) => item.id === activeId) ?? scenarios[0];

  return <section className="followup-demo scenario-email-demo shell" aria-labelledby={`${defaultId}-demo-title`}>
    <div className="followup-demo-heading"><p className="eyebrow">{eyebrow}</p><h2 id={`${defaultId}-demo-title`}>{title}</h2><p>{description}</p></div>
    <div className="followup-scenario-tabs" aria-label={ariaLabel}>
      {scenarios.map((item) => <button key={item.id} type="button" aria-pressed={activeId === item.id} onClick={() => setActiveId(item.id)}>{item.label}</button>)}
    </div>
    <div className="followup-workspace" aria-live="polite">
      <article className="followup-email">
        <header><div className="email-avatar">{scenario.initials}</div><div><strong>{scenario.sender}</strong><span>{scenario.subject}</span></div></header>
        <p>{scenario.message}</p><small>{scenario.meta}</small>
      </article>
      <aside className="followup-verbia">
        <header><img src="/verbia-mark.svg" alt="" width="30" height="30"/><strong>Verbia</strong><span>Context ready</span></header>
        <div><small>WHAT I WANT TO SAY</small><p className="followup-intent" lang="zh-CN">“{scenario.intent}”</p><small>{outputLabel}</small><blockquote>“{scenario.reply}”</blockquote><p className="followup-explanation">{scenario.note}</p><div className="followup-adjustments" aria-label="Example adjustments">{adjustments.map((item) => <span key={item}>{item}</span>)}</div></div>
      </aside>
    </div>
  </section>;
}
