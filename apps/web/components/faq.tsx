"use client";

import { useState } from "react";

export type FaqItem = { question: string; answer: string };
export function Faq({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState(0);
  return <div className="faq-list">{items.map((item, index) => {
    const expanded = open === index;
    return <div className="faq-item" key={item.question}><h3><button aria-expanded={expanded} aria-controls={`faq-panel-${index}`} id={`faq-button-${index}`} onClick={() => setOpen(expanded ? -1 : index)}>{item.question}<span aria-hidden="true">⌄</span></button></h3><div id={`faq-panel-${index}`} role="region" aria-labelledby={`faq-button-${index}`} hidden={!expanded}><p>{item.answer}</p></div></div>;
  })}</div>;
}
