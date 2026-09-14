import type { Metadata } from "next";
import Link from "next/link";
import { EmailPlatformLogos, GmailLogo, OutlookLogo } from "../../components/email-platform-logos";
import { Faq, type FaqItem } from "../../components/faq";
import { InstallLink } from "../../components/install-link";
import { PaymentRequestScenarioDemo } from "../../components/seo/payment-request-scenario-demo";
import { TopicHubLinks } from "../../components/seo/topic-hub-links";
import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";

export const metadata: Metadata = {
  title: "How to Ask for Payment Politely: Examples | Verbia",
  description: "Learn how to ask for payment politely, with clear examples for a new invoice, a due-date reminder, and an overdue payment.",
  alternates: { canonical: "/how-to-ask-for-payment-politely" },
  openGraph: { type: "website", url: "/how-to-ask-for-payment-politely", title: "Ask for Payment Clearly Without Sounding Rude", description: "Use the amount, due date, relationship, and real context to write a professional payment request." },
  twitter: { card: "summary", title: "How to Ask for Payment Politely | Verbia", description: "Clear examples for a new invoice, a due-date reminder, and an overdue payment." }
};

const faqItems: FaqItem[] = [
  { question: "How do you politely ask someone to pay you?", answer: "State what the payment is for, include the amount and due date, and ask for one clear next step. Keep the wording factual and helpful instead of apologizing repeatedly or assuming the recipient is refusing to pay." },
  { question: "How do I ask a client for an overdue payment?", answer: "Reference the invoice number, amount, and original due date. Ask whether payment has been scheduled and invite the client to tell you if an invoice issue or missing detail is holding it up." },
  { question: "Should I include the amount and invoice number?", answer: "Yes. A clear amount and reference number help the recipient identify the correct payment and reduce unnecessary back-and-forth." },
  { question: "Can I include a payment link or bank details?", answer: "Yes, when you can provide an official and secure payment method. You can also offer to resend the invoice. Avoid sharing sensitive financial information in public or untrusted messages." },
  { question: "What if the first payment reminder gets no response?", answer: "Send a shorter, more direct follow-up in the same email thread. Restate the invoice and requested action, then follow your contract and business process if you need to contact another responsible person." },
  { question: "Will Verbia request or collect the payment for me?", answer: "No. Verbia helps you draft an editable message. It does not contact your client, collect money, or send the email automatically." }
];

const essentials = [
  ["01", "Identify the payment", "Name the work, order, or invoice so the recipient can find the correct payment."],
  ["02", "Include the amount and date", "Use the agreed amount and a real due date instead of making the recipient search for them."],
  ["03", "Ask for one next step", "Request confirmation, a payment date, or a status update in language that is easy to answer."],
  ["04", "Help remove blockers", "Offer to resend the invoice or correct a detail that may be delaying payment."]
];

export default function HowToAskForPaymentPolitelyPage() {
  const faqJsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqItems.map(({ question, answer }) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) };

  return <><SiteHeader localizedPage={false}/><main id="main" className="seo-page payment-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}/>

    <section className="seo-hero followup-hero shell">
      <div className="followup-eyebrow"><EmailPlatformLogos size={25}/>PAYMENT REQUEST GUIDE</div>
      <h1>How to ask for payment politely</h1>
      <p>To ask for payment politely, state what the payment is for, include the amount and due date, and make the requested next step clear. Keep the tone factual rather than apologetic or accusing. If the payment is late, ask whether it has been scheduled and offer to resend the invoice or correct any issue that may be holding it up.</p>
      <div className="followup-quick-example"><span>QUICK EXAMPLE</span><blockquote>“Hi Morgan, I’m following up on invoice #1048 for $1,850, which was due on September 5. Could you let me know whether payment has been scheduled? If you need another copy of the invoice or anything needs correcting, I’m happy to help. Thank you, Alex”</blockquote></div>
      <div className="hero-actions"><InstallLink label="Create a payment request with Verbia"/><a className="button secondary" href="#examples">See payment examples <span aria-hidden="true">↓</span></a></div>
      <ul className="seo-trust" aria-label="Product and plan details"><li>10 free generations per day</li><li>Works in Gmail and Outlook web</li><li>You review and send</li></ul>
    </section>

    <section className="seo-flow followup-structure shell" aria-labelledby="payment-essentials-title"><div className="seo-heading"><p className="eyebrow">WHAT TO INCLUDE</p><h2 id="payment-essentials-title">Make the payment request easy to verify and answer.</h2><p>A clear request helps the recipient act without searching through earlier messages or guessing what you need.</p></div><ol>{essentials.map(([number, title, body]) => <li key={number}><span>{number}</span><div><h3>{title}</h3><p>{body}</p></div></li>)}</ol></section>

    <div id="examples"><PaymentRequestScenarioDemo/></div>

    <section className="followup-guidance shell" aria-labelledby="payment-tone-title">
      <article><p className="eyebrow">PROTECT THE RELATIONSHIP</p><h2 id="payment-tone-title">Be calm, specific, and easy to help.</h2><p>You do not need to weaken a valid request with repeated apologies. State the agreed facts, then give the recipient a practical way to pay or explain a problem.</p><ul><li>Use the exact invoice number, amount, and due date.</li><li>Ask whether payment is scheduled when it is overdue.</li><li>Offer to resend or correct the invoice.</li></ul></article>
      <article className="followup-avoid"><p className="eyebrow">WHAT TO AVOID</p><h2>Do not turn a reminder into an accusation.</h2><ul><li>Guilt, threats, or assumptions about why payment is late.</li><li>An incorrect amount, invoice number, or due date.</li><li>A vague request with no action to take.</li><li>Sensitive bank details in an untrusted message.</li><li>Invented urgency that was never agreed.</li></ul></article>
    </section>

    <section className="email-platforms followup-platforms shell" aria-labelledby="payment-platforms-title"><div className="seo-heading"><p className="eyebrow">USE THE EMAIL ALREADY IN FRONT OF YOU</p><h2 id="payment-platforms-title">Draft the request with the invoice conversation in view.</h2><p>In supported Gmail and Outlook web reply flows, Verbia can use relevant visible email text as context. Describe the outcome you want in any language, review the result, and send it yourself.</p></div><div><article><GmailLogo size={50}/><span>GMAIL ON THE WEB</span><h3>Keep the invoice details in the thread.</h3><p>Turn the visible conversation and your intent into a clear payment request inside Gmail.</p><Link href="/gmail-ai-reply-assistant">Use Verbia in Gmail <span aria-hidden="true">→</span></Link></article><article><OutlookLogo size={50}/><span>OUTLOOK ON THE WEB</span><h3>Ask for the next payment step.</h3><p>Draft from relevant visible message context in supported Outlook web editors.</p><Link href="/outlook-ai-reply-assistant">Use Verbia in Outlook on the web <span aria-hidden="true">→</span></Link></article></div></section>

    <TopicHubLinks/>
    <section className="related-pages shell" aria-labelledby="payment-related-title"><div><p className="eyebrow">RELATED VERBIA GUIDES</p><h2 id="payment-related-title">Keep the message connected to its context.</h2></div><nav aria-label="Related Verbia guides"><Link href="/follow-up-email-after-no-response">Follow Up After No Response <span>Send a clear next message →</span></Link><Link href="/ai-email-reply-generator">AI Email Reply Generator <span>Generate from the email context →</span></Link><Link href="/multilingual-reply-generator">Multilingual Reply Generator <span>Describe your intent in any language →</span></Link></nav></section>

    <section className="seo-faq shell" aria-labelledby="payment-faq-title"><div className="seo-heading"><p className="eyebrow">QUESTIONS & ANSWERS</p><h2 id="payment-faq-title">Asking for payment politely FAQ</h2></div><Faq items={faqItems}/></section>

    <section className="final-cta shell" id="install"><EmailPlatformLogos size={48}/><h2>Write a clear payment request from the conversation.</h2><p>Use the real details. Keep the final decision yours.</p><InstallLink label="Create a payment request with Verbia"/><small>10 free generations per day · Chrome and Edge · You press Send</small></section>
  </main><SiteFooter/></>;
}
