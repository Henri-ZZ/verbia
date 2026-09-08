import type { Metadata } from "next";
import Link from "next/link";
import { Faq, type FaqItem } from "../../components/faq";
import { InstallLink } from "../../components/install-link";
import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";

export const metadata: Metadata = {
  title: "Multilingual AI Reply Generator for Natural Responses | Verbia",
  description: "Write your intent in any language and generate a natural reply in the language you choose. Preserve meaning, context, and tone without literal translation.",
  alternates: { canonical: "/multilingual-reply-generator" },
  openGraph: { type: "website", url: "/multilingual-reply-generator", title: "Think in Your Language. Reply Naturally in Theirs.", description: "Turn intent in any language into a natural, context-aware reply in the language you choose." },
  twitter: { card: "summary", title: "Multilingual Reply Generator | Verbia", description: "Express the thought in your language and generate a natural reply in theirs." },
};

const faqItems: FaqItem[] = [
  { question: "What is a multilingual reply generator?", answer: "A multilingual reply generator lets you describe what you mean in one language and create a reply in another. Verbia also uses conversation context, tone, and length so the result fits the exchange instead of reading like a literal translation." },
  { question: "Do my input and output languages need to match?", answer: "No. You can write or dictate your intent in the language that feels natural and independently choose the language for the final reply." },
  { question: "Is Verbia the same as a translation tool?", answer: "No. A translator primarily converts existing wording. Verbia starts with your intended meaning and the conversation, then drafts an appropriate reply in the chosen language." },
  { question: "Can I control how formal the reply sounds?", answer: "Yes. Choose a tone and length before generating, then review and edit the result to match the person, community, or situation." },
  { question: "Can Verbia understand mixed-language input?", answer: "You can express your intent naturally, including common names and terms from another language. Clear input and relevant context help produce the best result." },
  { question: "Does Verbia send the generated reply?", answer: "No. Every result is a draft. You decide whether to edit, insert, copy, or discard it, and you send the final message yourself." },
];

const examples = [
  ["中文 → English", "先别急着答应，问问他们的时间安排。", "Let’s hold off on committing just yet. Could we first check what timeline they have in mind?"],
  ["Español → Français", "Estoy de acuerdo, pero necesitamos confirmar el presupuesto.", "Je suis d’accord, mais nous devons d’abord confirmer le budget."],
  ["日本語 → 한국어", "日程を来週に変更できるか聞きたいです。", "일정을 다음 주로 변경할 수 있는지 여쭤보고 싶습니다."],
];

export default function MultilingualReplyGeneratorPage() {
  const faqJsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqItems.map(({ question, answer }) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) };
  return <><SiteHeader localizedPage={false}/><main id="main" className="seo-page multilingual-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}/>
    <section className="seo-hero multilingual-hero shell"><div className="language-orbit" aria-hidden="true"><span>文</span><span>A</span><span>あ</span><span>한</span></div><p className="eyebrow">MULTILINGUAL REPLY GENERATOR</p><h1>Think in your language. Reply naturally in theirs.</h1><p>Tell Verbia what you mean in the language that comes naturally. Choose the output language, and get a reply shaped for the conversation rather than translated word for word.</p><div className="hero-actions"><InstallLink/><Link className="button secondary" href="/getting-started">See how it works <span aria-hidden="true">→</span></Link></div><ul className="seo-trust" aria-label="Key benefits"><li>Independent input and output languages</li><li>Context-aware wording</li><li>Editable drafts</li></ul></section>

    <section className="language-examples shell" aria-labelledby="language-examples-title"><div className="seo-heading"><p className="eyebrow">MEANING ACROSS LANGUAGES</p><h2 id="language-examples-title">One thought, expressed for the person reading it.</h2><p>Your source language does not determine your reply language. Verbia focuses on the point, nuance, and intended effect.</p></div><div>{examples.map(([label, input, output]) => <article key={label}><span>{label}</span><p>{input}</p><strong>{output}</strong></article>)}</div></section>

    <section className="translation-difference shell" aria-labelledby="difference-title"><div><p className="eyebrow">BEYOND LITERAL TRANSLATION</p><h2 id="difference-title">Translate the intention, not just the sentence.</h2><p>A sentence can be grammatically correct and still feel wrong in a conversation. Verbia works from what you want to accomplish: agree carefully, disagree politely, ask a direct question, or sound more relaxed.</p><Link href="/ai-reply-generator">Explore the AI reply generator <span aria-hidden="true">→</span></Link></div><div className="difference-cards"><article><span>Literal wording</span><blockquote>“Do not promise too quickly. First probe their budget.”</blockquote><small>Correct words, awkward intent</small></article><article className="preferred"><span>Natural reply</span><blockquote>“Let’s take a beat before committing. Have they shared the budget range they’re working with?”</blockquote><small>Meaning and tone preserved</small></article></div></section>

    <section className="seo-flow shell" aria-labelledby="multilingual-flow-title"><div className="seo-heading"><p className="eyebrow">HOW IT WORKS</p><h2 id="multilingual-flow-title">Keep the thought. Choose the language.</h2></div><ol><li><span>01</span><div><h3>Open Verbia where you are replying</h3><p>Use automatic context on Reddit, Gmail, or Outlook web, or add selected text through Universal Mode on another supported site.</p></div></li><li><span>02</span><div><h3>Express the raw intent naturally</h3><p>Type or dictate the point in whichever language lets you think most clearly.</p></div></li><li><span>03</span><div><h3>Choose the reply language and style</h3><p>Select the output language, tone, and length, then generate a draft.</p></div></li><li><span>04</span><div><h3>Review the finished wording</h3><p>Check names, nuance, and details before inserting or copying the reply.</p></div></li></ol></section>

    <section className="seo-section shell" aria-labelledby="multilingual-benefits-title"><div className="seo-heading"><p className="eyebrow">COMMUNICATE WITHOUT THE LANGUAGE DETOUR</p><h2 id="multilingual-benefits-title">Stay focused on the conversation.</h2></div><div className="seo-card-grid"><article><span className="seo-icon" aria-hidden="true">文</span><h3>Use the language you think in</h3><p>Start with your real thought instead of simplifying it into a language you know less well.</p></article><article><span className="seo-icon" aria-hidden="true">↔</span><h3>Choose any reply direction</h3><p>Your input and output languages are separate choices, so communication can move either way.</p></article><article><span className="seo-icon" aria-hidden="true">◇</span><h3>Keep the social nuance</h3><p>Use tone and context to make the reply fit the relationship and setting.</p></article><article><span className="seo-icon" aria-hidden="true">✓</span><h3>Approve every word</h3><p>Review the draft yourself. Verbia does not send messages automatically.</p></article></div></section>

    <section className="seo-use-cases shell" aria-labelledby="multilingual-uses-title"><div className="seo-heading"><p className="eyebrow">WHEN IT HELPS</p><h2 id="multilingual-uses-title">For conversations where meaning matters more than perfect fluency.</h2></div><div><article><h3>International communities</h3><p>Join discussions and answer questions without reducing the complexity of your idea.</p></article><article><h3>Professional conversations</h3><p>Phrase updates, requests, and respectful disagreement with the right level of formality.</p></article><article><h3>Everyday online replies</h3><p>Sound natural and like yourself when the conversation uses another language.</p></article></div></section>

    <section className="related-pages shell" aria-labelledby="multilingual-related-title"><div><p className="eyebrow">EXPLORE MORE</p><h2 id="multilingual-related-title">Choose the workflow that fits your reply.</h2></div><nav aria-label="Related Verbia guides"><Link href="/reddit-reply-generator">Reddit Reply Generator <span>Automatic Reddit context →</span></Link><Link href="/context-aware-reply-generator">Context-Aware Reply Generator <span>Reply to the right point →</span></Link></nav></section>
    <section className="seo-faq shell" aria-labelledby="multilingual-faq-title"><div className="seo-heading"><p className="eyebrow">QUESTIONS & ANSWERS</p><h2 id="multilingual-faq-title">Multilingual reply generator FAQ</h2></div><Faq items={faqItems}/></section>
    <section className="final-cta shell" id="install"><div className="cta-language-mark" aria-hidden="true">文 · A</div><h2>Say what you mean, in the language you choose.</h2><p>Keep your intent intact.</p><InstallLink/><small>Free to install · No credit card required</small></section>
  </main><SiteFooter/></>;
}
