import type { Metadata } from "next";
import { ContactFeedbackForm } from "../../components/contact-feedback-form";
import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";

export const metadata: Metadata = { title: "Contact/Feedback — Verbia", description: "Contact Verbia or send product feedback, report a problem, and suggest a feature.", alternates: { canonical: "/contact", languages: { en: "/contact", "zh-CN": "/zh/contact" } } };

export default function ContactPage() { return <><SiteHeader/><main className="contact-page" id="main"><section className="contact-hero shell"><p className="eyebrow">CONTACT/FEEDBACK</p><h1>Help us make Verbia better.</h1><p>Report a problem, suggest an improvement, or tell us about your experience. You can also email us directly at <a href="mailto:henri@henriz.dev">henri@henriz.dev</a>.</p></section><section className="contact-layout shell"><ContactFeedbackForm locale="en"/><aside><h2>Prefer email?</h2><p>Send your question or feedback directly. We read every message.</p><a href="mailto:henri@henriz.dev">henri@henriz.dev <span aria-hidden="true">↗</span></a><small>Please do not email passwords, payment card details, or private conversation content.</small></aside></section></main><SiteFooter/></>; }
