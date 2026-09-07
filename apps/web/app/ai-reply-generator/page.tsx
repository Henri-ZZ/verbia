import type { Metadata } from "next";
import Link from "next/link";
import { Faq, type FaqItem } from "../../components/faq";
import { InstallLink } from "../../components/install-link";
import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";
import { RedditLogo } from "../../components/reddit-logo";

export const metadata: Metadata = {
  title: "AI Reply Generator for Natural, Context-Aware Replies | Verbia",
  description: "Generate natural replies that fit the conversation. Tell Verbia what you mean in any language, choose a tone, and review the reply before you send it.",
  alternates: { canonical: "/ai-reply-generator" },
  openGraph: {
    type: "website",
    url: "/ai-reply-generator",
    title: "AI Reply Generator That Understands the Conversation",
    description: "Turn a quick thought in any language into a natural, context-aware reply without leaving the page.",
  },
  twitter: {
    card: "summary",
    title: "AI Reply Generator | Verbia",
    description: "Write natural, context-aware replies from a quick thought in any language.",
  },
};

const faqItems: FaqItem[] = [
  { question: "What is an AI reply generator?", answer: "An AI reply generator turns a short description of what you want to say into a complete response. Verbia also uses the relevant conversation context, your chosen language, tone, and length to make the draft fit the exchange." },
  { question: "Can Verbia generate replies in different languages?", answer: "Yes. You can describe your intent in the language that feels natural to you and choose a different language for the final reply. Verbia focuses on preserving your meaning rather than translating word for word." },
  { question: "Does the AI reply generator send messages automatically?", answer: "No. Verbia only prepares a draft. You review, edit, insert, or discard it, and you decide whether to send it." },
  { question: "Where can I use Verbia?", answer: "Automatic Mode currently recognizes post and comment context on Reddit. On other websites, Universal Mode lets you select text and add it as context before generating a reply." },
  { question: "Is Verbia free?", answer: "The Free plan includes 10 generations per day. Verbia Premium raises the daily allowance to 100 generations while keeping the same core features." },
];

function Mark({ size = 24 }: { size?: number }) {
  return <img className="mark" src="/verbia-mark.svg" alt="" width={size} height={size}/>;
}

export default function AiReplyGeneratorPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };

  return <><SiteHeader localizedPage={false}/><main id="main" className="seo-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}/>

    <section className="seo-hero shell">
      <p className="eyebrow">AI REPLY GENERATOR</p>
      <h1>Write a natural reply without starting from a blank box.</h1>
      <p>Tell Verbia what you mean in any language. It combines your intent with the conversation and drafts a reply that sounds natural, fits the tone, and stays yours to approve.</p>
      <div className="hero-actions"><InstallLink/><Link className="button secondary" href="/getting-started">See how Verbia works <span aria-hidden="true">→</span></Link></div>
      <ul className="seo-trust" aria-label="Key benefits"><li>Context-aware</li><li>Any input language</li><li>You review every reply</li></ul>
    </section>

    <section className="seo-example shell" aria-labelledby="example-title">
      <div className="seo-example-copy"><p className="eyebrow">FROM THOUGHT TO REPLY</p><h2 id="example-title">You provide the point. Verbia finds the words.</h2><p>A useful reply should respond to what was actually said. Verbia works from the relevant context and your raw intent instead of making you rewrite the whole conversation as a prompt.</p></div>
      <div className="seo-example-card">
        <div><span>Your intent</span><p>“我同意大部分内容，但上线前应该再测一次。语气友好一点。”</p></div>
        <span className="seo-arrow" aria-hidden="true">↓</span>
        <div className="result"><span>Natural reply</span><p>“I agree with most of this. I’d just feel more comfortable doing one final test before we ship.”</p></div>
      </div>
    </section>

    <section className="seo-section shell" aria-labelledby="benefits-title"><div className="seo-heading"><p className="eyebrow">WHY VERBIA</p><h2 id="benefits-title">A reply generator built for real conversations.</h2><p>Get past the blank reply box while keeping your meaning, judgment, and final say.</p></div><div className="seo-card-grid">
      <article><span className="seo-icon" aria-hidden="true">◌</span><h3>Understands the context</h3><p>Draft a response to the specific post, comment, or selected text instead of producing a generic answer.</p></article>
      <article><span className="seo-icon" aria-hidden="true">文</span><h3>Starts in your language</h3><p>Describe what you want to say in any language and choose the language of the finished reply.</p></article>
      <article><span className="seo-icon" aria-hidden="true">◇</span><h3>Matches the situation</h3><p>Adjust the tone and length so the reply feels right for a casual thread or a professional exchange.</p></article>
      <article><span className="seo-icon" aria-hidden="true">✓</span><h3>Keeps you in control</h3><p>Review and edit every draft. Verbia never sends or posts a reply on your behalf.</p></article>
    </div></section>

    <section className="seo-flow shell" aria-labelledby="flow-title"><div className="seo-heading"><p className="eyebrow">HOW IT WORKS</p><h2 id="flow-title">A useful reply in three steps.</h2></div><ol>
      <li><span className="step-platform"><RedditLogo size={28}/></span><div><h3>Open Verbia in the conversation</h3><p>On Reddit, Automatic Mode identifies the post and comment thread. Elsewhere, select the text you want to respond to and add it through Universal Mode.</p></div></li>
      <li><span>02</span><div><h3>Say what you actually mean</h3><p>Type or dictate a rough thought, then choose the output language, tone, and length.</p></div></li>
      <li><span>03</span><div><h3>Review your reply</h3><p>Edit the generated draft if needed, insert or copy it, and send it only when you are ready.</p></div></li>
    </ol></section>

    <section className="seo-use-cases shell" aria-labelledby="uses-title"><div className="seo-heading"><p className="eyebrow">USE CASES</p><h2 id="uses-title">Use the right words for the conversation in front of you.</h2></div><div>
      <article><h3>Join an online discussion</h3><p>Turn a quick reaction into a clear comment that responds to the point being discussed.</p></article>
      <article><h3>Reply across languages</h3><p>Think in one language and produce a natural response in another without losing the intended nuance.</p></article>
      <article><h3>Handle tone carefully</h3><p>Express disagreement, ask a question, or set a boundary in language that fits the situation.</p></article>
    </div></section>

    <section className="seo-scope shell" aria-labelledby="scope-title"><RedditLogo size={42}/><div><p className="eyebrow">AVAILABLE NOW</p><h2 id="scope-title">Automatic context on Reddit. Selected-text context elsewhere.</h2><p>Verbia currently reads Reddit post and comment context in Automatic Mode. Universal Mode works on other supported editors by letting you add selected text yourself. Automatic support for more social platforms is planned.</p></div><div className="seo-scope-links"><Link href="/reddit-reply-generator">Explore Reddit replies <span aria-hidden="true">→</span></Link><Link href="/getting-started">Read the usage guide <span aria-hidden="true">→</span></Link></div></section>

    <section className="seo-faq shell" aria-labelledby="seo-faq-title"><div className="seo-heading"><p className="eyebrow">QUESTIONS & ANSWERS</p><h2 id="seo-faq-title">AI reply generator FAQ</h2></div><Faq items={faqItems}/></section>

    <section className="final-cta shell" id="install"><Mark size={64}/><h2>Turn what you mean into the right reply.</h2><p>In any language.</p><InstallLink/><small>Free to install · No credit card required</small></section>
  </main><SiteFooter/></>;
}
