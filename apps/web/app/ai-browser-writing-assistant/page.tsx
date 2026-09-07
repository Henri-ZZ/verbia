import type { Metadata } from "next";
import Link from "next/link";
import { Faq, type FaqItem } from "../../components/faq";
import { InstallLink } from "../../components/install-link";
import { RedditLogo } from "../../components/reddit-logo";
import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";

export const metadata: Metadata = {
  title: "AI Browser Writing Assistant for Replies | Verbia",
  description: "Write context-aware replies without leaving the browser tab. Use text or voice intent, choose any output language, and review every draft before inserting.",
  alternates: { canonical: "/ai-browser-writing-assistant" },
  openGraph: { type: "website", url: "/ai-browser-writing-assistant", title: "An AI Writing Assistant Inside Your Browser", description: "Turn what you mean into a natural reply without moving the conversation into another AI tab." },
  twitter: { card: "summary", title: "AI Browser Writing Assistant | Verbia", description: "Draft natural, context-aware replies where you are already writing." },
};

const faqItems: FaqItem[] = [
  { question: "What is an AI browser writing assistant?", answer: "It is a browser extension that helps you draft text where you are already writing. Verbia takes your intent, available context, output language, tone, and length, then prepares a reply you can review and insert." },
  { question: "Which browsers does Verbia support?", answer: "Verbia is currently distributed through the Chrome Web Store. Other Chromium-based browsers can install compatible Chrome extensions. Dedicated Edge and Firefox store releases are planned." },
  { question: "Does Verbia work on websites other than Reddit?", answer: "Yes. Reddit has Automatic Mode for post and comment context. On other supported web editors, Universal Mode lets you focus an input field and optionally add selected text as context." },
  { question: "How do I open Verbia on another website?", answer: "Focus the text field where you want to write and use Verbia’s keyboard shortcut. You can also select relevant page text and add it as context from the right-click menu." },
  { question: "Can I use voice input in the browser extension?", answer: "Yes. You can dictate your intent. Voice language controls speech recognition and remains separate from the language you choose for the final reply." },
  { question: "Will Verbia work in every rich-text editor?", answer: "Many standard text fields and editable areas are supported. Some complex or protected editors may not allow reliable insertion; in those cases, copy the draft and paste it manually." },
];

const browserItems = [
  ["/chrome.svg", "Chrome", "Available now"],
  ["/edge.svg", "Chromium browsers", "Chrome extension compatible"],
  ["/firefox.svg", "Firefox", "Dedicated release planned"],
];

export default function AiBrowserWritingAssistantPage() {
  const faqJsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqItems.map(({ question, answer }) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) };
  return <><SiteHeader localizedPage={false}/><main id="main" className="seo-page browser-assistant-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}/>
    <section className="seo-hero browser-hero shell"><div className="browser-marks" aria-hidden="true">{browserItems.map(([src, name]) => <img src={src} alt="" width="38" height="38" key={name}/>)}</div><p className="eyebrow">AI BROWSER WRITING ASSISTANT</p><h1>Write the reply without leaving the page.</h1><p>Verbia lives in your browser workflow. Add context when it helps, type or speak what you mean in any language, and review a natural draft where you are already writing.</p><div className="hero-actions"><InstallLink/><Link className="button secondary" href="/getting-started">Read the usage guide <span aria-hidden="true">→</span></Link></div><ul className="seo-trust" aria-label="Key benefits"><li>Works in the browser</li><li>Text or voice intent</li><li>Insert or copy the draft</li></ul></section>

    <section className="browser-workflow shell" aria-labelledby="browser-workflow-title"><div className="browser-window"><header><span/><span/><span/><div>the page where you are writing</div></header><div className="browser-editor"><p>Continue the conversation…</p><div className="browser-selection">The rollout is still planned for Friday, but the review has not been assigned.</div><div className="browser-shortcut"><img src="/verbia-mark.svg" alt="" width="30" height="30"/><span>Open Verbia</span><kbd>⌘⇧Y</kbd></div></div></div><div className="browser-panel"><p className="eyebrow">UNIVERSAL MODE</p><h2 id="browser-workflow-title">Bring just enough context into the draft.</h2><p>Select relevant text when you need it, then explain the response you want. Verbia stays close to the editor without requiring another AI tab.</p><div><span>Selected text</span><b>+</b><span>Your intent</span><b>→</b><strong>Reply draft</strong></div></div></section>

    <section className="seo-section shell" aria-labelledby="browser-benefits-title"><div className="seo-heading"><p className="eyebrow">BUILT FOR THE WRITING MOMENT</p><h2 id="browser-benefits-title">Keep the conversation and the draft together.</h2><p>Use Verbia when a blank reply box interrupts the thought you already have.</p></div><div className="seo-card-grid"><article><span className="seo-icon" aria-hidden="true">⌘</span><h3>Open from the keyboard</h3><p>Focus an editor and use the shortcut instead of moving the conversation to another tab.</p></article><article><span className="seo-icon" aria-hidden="true">“</span><h3>Add selected context</h3><p>On general websites, choose the exact visible text the reply should address.</p></article><article><span className="seo-icon" aria-hidden="true">●</span><h3>Type or speak naturally</h3><p>Give the assistant a rough intent in the language that lets you think clearly.</p></article><article><span className="seo-icon" aria-hidden="true">✓</span><h3>Insert only after review</h3><p>Edit, copy, or insert the result. Verbia never sends it automatically.</p></article></div></section>

    <section className="browser-modes shell" aria-labelledby="browser-modes-title"><div className="seo-heading"><p className="eyebrow">CONTEXT THAT FITS THE WEBSITE</p><h2 id="browser-modes-title">Automatic on Reddit. Selected by you elsewhere.</h2></div><div><article className="reddit-mode"><RedditLogo size={46}/><span>REDDIT AUTOMATIC MODE</span><h3>The reply box identifies the conversation.</h3><p>Verbia can recognize the relevant post and parent comment chain for the Reddit reply you opened.</p><Link href="/ai-reddit-assistant">Explore the Reddit assistant <span aria-hidden="true">→</span></Link></article><article><span className="selection-icon" aria-hidden="true">T</span><span>UNIVERSAL MODE</span><h3>You choose the text that matters.</h3><p>On another supported website, highlight relevant text, add it as context, and open Verbia from the editor.</p><Link href="/context-aware-reply-generator">Explore context-aware replies <span aria-hidden="true">→</span></Link></article></div></section>

    <section className="seo-flow shell" aria-labelledby="browser-flow-title"><div className="seo-heading"><p className="eyebrow">A SHORTER WRITING FLOW</p><h2 id="browser-flow-title">From focused editor to finished draft.</h2></div><ol><li><span>01</span><div><h3>Focus the place where you want to write</h3><p>Click a standard text field or supported editable area.</p></div></li><li><span>02</span><div><h3>Add context when useful</h3><p>Select page text manually, or let Reddit Automatic Mode identify the thread.</p></div></li><li><span>03</span><div><h3>Open Verbia and give direction</h3><p>Use the shortcut, enter typed or spoken intent, and choose the output settings.</p></div></li><li><span>04</span><div><h3>Insert or copy</h3><p>Review the draft first. If an editor blocks insertion, copy and paste it yourself.</p></div></li></ol></section>

    <section className="browser-support shell" aria-labelledby="browser-support-title"><div><p className="eyebrow">BROWSER AVAILABILITY</p><h2 id="browser-support-title">Start with the Chrome extension.</h2><p>Verbia is currently published through the Chrome Web Store. Dedicated Edge and Firefox listings are planned as browser support expands.</p></div><ul>{browserItems.map(([src, name, status]) => <li key={name}><img src={src} alt="" width="34" height="34"/><div><strong>{name}</strong><span>{status}</span></div></li>)}</ul></section>

    <section className="browser-limit shell" aria-labelledby="browser-limit-title"><img src="/verbia-mark.svg" alt="" width="48" height="48"/><div><p className="eyebrow">PRACTICAL BY DESIGN</p><h2 id="browser-limit-title">Built for drafts, with a fallback when editors are complex.</h2><p>Standard text fields and many editable areas support direct insertion. Protected browser pages and some complex rich-text editors may restrict extensions; Copy keeps the generated draft usable in those cases.</p></div></section>
    <section className="related-pages shell" aria-labelledby="browser-related-title"><div><p className="eyebrow">RELATED GUIDES</p><h2 id="browser-related-title">Explore how Verbia handles the reply.</h2></div><nav aria-label="Related Verbia guides"><Link href="/multilingual-reply-generator">Multilingual Replies <span>Choose any output language →</span></Link><Link href="/ai-reply-generator">AI Reply Generator <span>Turn intent into a draft →</span></Link></nav></section>
    <section className="seo-faq shell" aria-labelledby="browser-faq-title"><div className="seo-heading"><p className="eyebrow">QUESTIONS & ANSWERS</p><h2 id="browser-faq-title">AI browser writing assistant FAQ</h2></div><Faq items={faqItems}/></section>
    <section className="final-cta shell" id="install"><img className="mark" src="/verbia-mark.svg" alt="" width="64" height="64"/><h2>Bring the writing assistant to your browser.</h2><p>Keep the conversation in view.</p><InstallLink/><small>Free to install · No credit card required</small></section>
  </main><SiteFooter/></>;
}
