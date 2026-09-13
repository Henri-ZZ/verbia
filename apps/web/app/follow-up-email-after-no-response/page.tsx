import type { Metadata } from "next";
import Link from "next/link";
import { EmailPlatformLogos, GmailLogo, OutlookLogo } from "../../components/email-platform-logos";
import { Faq, type FaqItem } from "../../components/faq";
import { InstallLink } from "../../components/install-link";
import { FollowUpScenarioDemo } from "../../components/seo/follow-up-scenario-demo";
import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";

export const metadata: Metadata = {
  title: "Follow-Up Email After No Response: Examples | Verbia",
  description: "Learn how to write a polite follow-up email after no response, see examples for different situations, and turn your intent into a natural draft.",
  alternates: { canonical: "/follow-up-email-after-no-response" },
  openGraph: { type: "website", url: "/follow-up-email-after-no-response", title: "Write a Polite Follow-Up Email After No Response", description: "Use clear examples and conversation context to follow up without sounding pushy." },
  twitter: { card: "summary", title: "Follow-Up Email After No Response | Verbia", description: "Use clear examples and context to follow up without sounding pushy." }
};

const faqItems: FaqItem[] = [
  { question: "How long should I wait before following up on an email?", answer: "Use the original request and its urgency as your guide. If an agreed deadline has passed, it is reasonable to follow up promptly. For a routine message with no stated date, allow enough business time for the recipient to read and act before sending a reminder." },
  { question: "How do I follow up without sounding pushy?", answer: "Assume the recipient may be busy, refer to the specific earlier message, explain what you need, and offer an easy next step. If timing matters, use a real date and let them give you an updated timeline." },
  { question: "What should I say in a second follow-up email?", answer: "Keep the second follow-up shorter and more direct. Mention the earlier contact, state the decision or information you still need, and ask for the correct contact if the recipient is not the right person." },
  { question: "Should I change the subject line for a follow-up?", answer: "For the same request, replying in the original thread usually keeps the context visible. Start a new subject only when the topic, recipient, or requested action has materially changed." },
  { question: "Can Verbia use the previous email as context?", answer: "Yes. In Gmail and Outlook on the web, Automatic Mode can use relevant visible email text when available. You can review the context before generating the draft." },
  { question: "Will Verbia send the follow-up automatically?", answer: "No. Verbia prepares an editable draft. You review it, make any changes, and click Send yourself." }
];

const structure = [
  ["01", "Reference the earlier email", "Name the message, document, or request so the recipient knows exactly what needs attention."],
  ["02", "Restate the action you need", "Ask one clear question instead of repeating the full original email."],
  ["03", "Give a useful next step", "Include a real date when your work depends on the answer, or ask when an update is likely."],
  ["04", "Leave room for an update", "Make it easy to say they need more time or that someone else owns the decision."]
];

export default function FollowUpEmailAfterNoResponsePage() {
  const faqJsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqItems.map(({ question, answer }) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) };

  return <><SiteHeader localizedPage={false}/><main id="main" className="seo-page followup-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}/>

    <section className="seo-hero followup-hero shell">
      <div className="followup-eyebrow"><EmailPlatformLogos size={25}/>EMAIL FOLLOW-UP GUIDE</div>
      <h1>How to write a follow-up email after no response</h1>
      <p>A good follow-up briefly references your earlier message, restates the answer or action you need, and makes the next step easy. Keep the tone neutral: the recipient may be busy, away, or waiting on someone else. If timing matters, include a clear date and allow them to update you if they need more time.</p>
      <div className="followup-quick-example"><span>QUICK EXAMPLE</span><blockquote>“Hi Maya, I wanted to follow up on the proposal I sent on Tuesday. Could you let me know whether we can move forward by Thursday? If you need more time, a quick update on the expected timing would help me plan the next steps. Thanks, Alex”</blockquote></div>
      <div className="hero-actions"><InstallLink label="Create a follow-up with Verbia"/><a className="button secondary" href="#examples">See examples <span aria-hidden="true">↓</span></a></div>
      <ul className="seo-trust" aria-label="Product and plan details"><li>10 free generations per day</li><li>Works in Gmail and Outlook web</li><li>You review and send</li></ul>
    </section>

    <section className="seo-flow followup-structure shell" aria-labelledby="followup-structure-title"><div className="seo-heading"><p className="eyebrow">A SIMPLE STRUCTURE</p><h2 id="followup-structure-title">Make the email easy to understand and answer.</h2><p>You do not need to apologize for following up or repeat every detail. Give the recipient enough context to act.</p></div><ol>{structure.map(([number, title, body]) => <li key={number}><span>{number}</span><div><h3>{title}</h3><p>{body}</p></div></li>)}</ol></section>

    <div id="examples"><FollowUpScenarioDemo/></div>

    <section className="followup-guidance shell" aria-labelledby="followup-timing-title">
      <article><p className="eyebrow">WHEN TO FOLLOW UP</p><h2 id="followup-timing-title">Let the original request set the timing.</h2><p>If an agreed deadline has passed, follow up promptly. If there was no date, allow reasonable business time based on the complexity and urgency of the request. A decision that requires several people naturally needs more time than a yes-or-no confirmation.</p><ul><li>Refer to the date or deliverable when one exists.</li><li>Explain a real dependency instead of inventing urgency.</li><li>Offer a new timing option when the original date no longer works.</li></ul></article>
      <article className="followup-avoid"><p className="eyebrow">WHAT TO AVOID</p><h2>Do not turn silence into blame.</h2><ul><li>Guilt such as “I have emailed several times.”</li><li>False urgency or an unexplained ASAP.</li><li>Repeating the entire original message.</li><li>A vague “just checking in” with no question.</li><li>Multiple requests that make the reply harder.</li></ul></article>
    </section>

    <section className="email-platforms followup-platforms shell" aria-labelledby="followup-platforms-title"><div className="seo-heading"><p className="eyebrow">USE THE EMAIL ALREADY IN FRONT OF YOU</p><h2 id="followup-platforms-title">Draft the follow-up with the original context.</h2><p>Verbia uses relevant visible email text in supported Gmail and Outlook web reply flows. Tell it what outcome you need in any language, then review the draft before you send it.</p></div><div><article><GmailLogo size={50}/><span>GMAIL ON THE WEB</span><h3>Keep the earlier message in the thread.</h3><p>Use the visible email and your intent to prepare a follow-up inside Gmail.</p><Link href="/gmail-ai-reply-assistant">Use Verbia in Gmail <span aria-hidden="true">→</span></Link></article><article><OutlookLogo size={50}/><span>OUTLOOK ON THE WEB</span><h3>Connect the pending request to your next step.</h3><p>Draft from relevant visible message context in supported Outlook web editors.</p><Link href="/outlook-ai-reply-assistant">Use Verbia in Outlook on the web <span aria-hidden="true">→</span></Link></article></div></section>

    <section className="related-pages shell" aria-labelledby="followup-related-title"><div><p className="eyebrow">RELATED VERBIA GUIDES</p><h2 id="followup-related-title">Build the reply from context and intent.</h2></div><nav aria-label="Related Verbia guides"><Link href="/how-to-remind-someone-politely-in-an-email">Send a Polite Email Reminder <span>Remind someone about an expected action →</span></Link><Link href="/how-to-ask-for-payment-politely">Ask for Payment Politely <span>Write a clear payment request →</span></Link><Link href="/ai-email-reply-generator">AI Email Reply Generator <span>Generate from the email context →</span></Link><Link href="/multilingual-reply-generator">Multilingual Reply Generator <span>Write the intent in any language →</span></Link></nav></section>

    <section className="seo-faq shell" aria-labelledby="followup-faq-title"><div className="seo-heading"><p className="eyebrow">QUESTIONS & ANSWERS</p><h2 id="followup-faq-title">Follow-up email after no response FAQ</h2></div><Faq items={faqItems}/></section>

    <section className="final-cta shell" id="install"><EmailPlatformLogos size={48}/><h2>Write the follow-up from the conversation.</h2><p>Use your context. Keep the final decision yours.</p><InstallLink label="Create a follow-up with Verbia"/><small>10 free generations per day · Chrome and Edge · You press Send</small></section>
  </main><SiteFooter/></>;
}
