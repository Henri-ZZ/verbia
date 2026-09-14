import type { Metadata } from "next";
import Link from "next/link";
import { EmailPlatformLogos } from "../../components/email-platform-logos";
import { InstallLink } from "../../components/install-link";
import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";

export const metadata: Metadata = {
  title: "Career Email Guides for Interviews and Job Offers | Verbia",
  description: "Write professional interview and job offer emails with practical guidance for invitations, offer decisions, and respectful declines.",
  alternates: { canonical: "/career" },
  openGraph: { type: "website", url: "/career", title: "Career Email Guides for Interviews and Job Offers", description: "Handle interview invitations and job offer decisions with clear, professional email replies." }
};

const guides = [["/how-to-respond-to-an-interview-invitation-email", "Interview invitation", "Accept the invitation, confirm the details, or suggest another time without losing enthusiasm.", "INTERVIEW STAGE"], ["/how-to-respond-to-a-job-offer-email", "Job offer response", "Accept an offer, ask for time, clarify a term, or begin a focused negotiation.", "OFFER STAGE"], ["/how-to-politely-decline-a-job-offer", "Decline a job offer", "Give a final, appreciative answer without overexplaining or damaging the relationship.", "DECISION STAGE"]] as const;

export default function CareerPage() {
  const jsonLd = { "@context": "https://schema.org", "@type": "CollectionPage", name: "Career Email Guides", mainEntity: { "@type": "ItemList", itemListElement: guides.map(([url,name], index) => ({ "@type": "ListItem", position: index + 1, name, url: `https://verbia.henriz.dev${url}` })) } };
  return <><SiteHeader localizedPage={false}/><main id="main" className="seo-page hub-page career-hub"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}/>
    <section className="seo-hero hub-hero shell"><EmailPlatformLogos size={38}/><p className="eyebrow">CAREER COMMUNICATION</p><h1>Write clearly at every hiring decision.</h1><p>Career emails carry dates, terms, expectations, and relationships. Use the guide for your current stage so your response says exactly where you stand without sounding cold or uncertain.</p><div className="hero-actions"><Link className="button primary" href="#career-guides">Browse career guides <span aria-hidden="true">↓</span></Link><Link className="button secondary" href="/situations">See all email situations <span aria-hidden="true">→</span></Link></div></section>
    <section className="career-guide-grid shell" id="career-guides" aria-label="Career email guides">{guides.map(([href,title,body,stage], index) => <Link href={href} key={href}><span>{String(index + 1).padStart(2,"0")} · {stage}</span><h2>{title}</h2><p>{body}</p><b>Read the guide →</b></Link>)}</section>
    <section className="followup-guidance shell"><article><p className="eyebrow">VERIFY THE DETAILS</p><h2>Read the original message before you answer.</h2><p>Check the employer, role, dates, time zone, salary, deadline, and any attached terms. A polished reply is still wrong if it repeats an inaccurate detail.</p></article><article className="followup-avoid"><p className="eyebrow">KEEP YOUR DECISION CLEAR</p><h2>Choose the page for where you stand now.</h2><p>Use the offer response guide while accepting, clarifying, or considering. Use the decline guide once your decision is final.</p></article></section>
    <section className="hub-product shell"><div><p className="eyebrow">DRAFT IN YOUR INBOX</p><h2>Turn your decision into a natural email.</h2><p>In Gmail and Outlook on the web, Verbia can use relevant visible email text as context. Explain what you mean in any language, then check every detail before sending.</p></div><nav aria-label="Career email product links"><Link href="/ai-email-reply-generator">AI Email Reply Generator <span>Draft from the current thread →</span></Link><Link href="/gmail-ai-reply-assistant">Use Verbia in Gmail <span>See the Gmail workflow →</span></Link><Link href="/outlook-ai-reply-assistant">Use Verbia in Outlook <span>See the Outlook workflow →</span></Link><Link href="/situations">All Email Situations <span>Browse every live guide →</span></Link></nav></section>
    <section className="final-cta shell"><EmailPlatformLogos size={46}/><h2>Write the next career email with the decision in view.</h2><p>You review every word and press Send.</p><InstallLink/><small>10 free generations per day · Chrome and Edge</small></section>
  </main><SiteFooter/></>;
}
