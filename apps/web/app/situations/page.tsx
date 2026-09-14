import type { Metadata } from "next";
import Link from "next/link";
import { EmailPlatformLogos } from "../../components/email-platform-logos";
import { InstallLink } from "../../components/install-link";
import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";

export const metadata: Metadata = {
  title: "Email Reply Guides for Real Situations | Verbia",
  description: "Find practical email reply guides for follow-ups, reminders, payments, confirmations, interviews, and job offers.",
  alternates: { canonical: "/situations" },
  openGraph: { type: "website", url: "/situations", title: "Email Reply Guides for Real Situations", description: "Choose the communication task you need to handle, then draft a reply from your real email context." }
};

type SituationGroup = { title: string; description: string; links: readonly (readonly [string, string, string])[] };

const groups: readonly SituationGroup[] = [
  { title: "Follow up and remind", description: "Move a conversation forward without sounding impatient or repeating the wrong request.", links: [["/how-to-follow-up-on-an-email-politely", "Follow up on an active email", "Send information, check progress, or reconnect at an agreed time."], ["/follow-up-email-after-no-response", "Follow up after no response", "Restart a conversation when silence is the main problem."], ["/how-to-remind-someone-politely-in-an-email", "Send a polite reminder", "Prompt a person about a known action or deadline."], ["/how-to-ask-for-payment-politely", "Ask for payment politely", "Reference an invoice, amount, and next step clearly."]] },
  { title: "Confirm and coordinate", description: "Acknowledge details and keep schedules or responsibilities unambiguous.", links: [["/reply-to-email-confirmation", "Reply to a confirmation email", "Acknowledge confirmed arrangements without adding confusion."], ["/how-to-respond-to-an-interview-invitation-email", "Respond to an interview invitation", "Accept, confirm, or arrange the interview time."]] },
  { title: "Career decisions", description: "Write clearly when an employment decision affects both sides.", links: [["/how-to-respond-to-a-job-offer-email", "Respond to a job offer", "Accept, request time, clarify terms, or start a negotiation."], ["/how-to-politely-decline-a-job-offer", "Politely decline a job offer", "Turn down an offer after your decision is final."]] }
];

export default function SituationsPage() {
  const items = groups.flatMap(group => group.links);
  const jsonLd = { "@context": "https://schema.org", "@type": "CollectionPage", name: "Email Reply Guides for Real Situations", mainEntity: { "@type": "ItemList", itemListElement: items.map(([url, name], index) => ({ "@type": "ListItem", position: index + 1, name, url: `https://verbia.henriz.dev${url}` })) } };
  return <><SiteHeader localizedPage={false}/><main id="main" className="seo-page hub-page"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}/>
    <section className="seo-hero hub-hero shell"><EmailPlatformLogos size={38}/><p className="eyebrow">EMAIL SITUATIONS</p><h1>Write the reply your situation calls for.</h1><p>Choose the real task in front of you—from a quiet inbox to a difficult career decision. Each guide explains what to say, what to leave out, and how the same context changes with your intent.</p><div className="hero-actions"><Link className="button primary" href="#guides">Browse email guides <span aria-hidden="true">↓</span></Link><Link className="button secondary" href="/ai-email-reply-generator">Open the email reply generator <span aria-hidden="true">→</span></Link></div></section>
    <section className="hub-groups shell" id="guides" aria-label="Email situation guide collections">{groups.map(group => <article className="hub-group" key={group.title}><header><h2>{group.title}</h2><p>{group.description}</p></header><div>{group.links.map(([href,title,body]) => <Link href={href} key={href}><h3>{title}</h3><p>{body}</p><span>Read the guide →</span></Link>)}</div></article>)}</section>
    <section className="hub-product shell"><div><p className="eyebrow">FROM GUIDE TO YOUR REAL REPLY</p><h2>Use the email already in front of you.</h2><p>Verbia uses relevant visible context in supported Gmail and Outlook web editors. Describe your intent in any language, choose the output language and tone, then review the draft yourself.</p></div><nav aria-label="Email product and platform pages"><Link href="/ai-email-reply-generator">AI Email Reply Generator <span>Draft from the current email →</span></Link><Link href="/gmail-ai-reply-assistant">Gmail AI Reply Assistant <span>Use Automatic Mode in Gmail →</span></Link><Link href="/outlook-ai-reply-assistant">Outlook AI Reply Assistant <span>Use Automatic Mode in Outlook →</span></Link><Link href="/career">Career Communication Guides <span>Browse the career collection →</span></Link></nav></section>
    <section className="final-cta shell"><EmailPlatformLogos size={46}/><h2>Turn your intent into a reply you can review.</h2><p>Choose the words for the real conversation.</p><InstallLink/><small>10 free generations per day · Chrome and Edge · You press Send</small></section>
  </main><SiteFooter/></>;
}
