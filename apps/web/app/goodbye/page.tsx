import type { Metadata } from "next";
import { ContactFeedbackForm } from "../../components/contact-feedback-form";
import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";

export const metadata: Metadata = {
  title: "Before you go — Verbia",
  description: "Tell us why you uninstalled Verbia.",
  robots: { index: false }
};

export default function GoodbyePage() {
  return <><SiteHeader/><main className="contact-page goodbye-page" id="main"><section className="contact-hero shell"><p className="eyebrow">THANK YOU FOR TRYING VERBIA</p><h1>Sorry to see you go.</h1><p>A quick answer can help us improve Verbia. The form is optional and does not require you to sign in. You can also email <a href="mailto:henri@henriz.dev">henri@henriz.dev</a>.</p></section><section className="contact-layout shell"><ContactFeedbackForm locale="en" source="uninstall"/><aside><h2>Need help instead?</h2><p>If something did not work, email us and include your browser and Verbia version. Please leave out private conversation content.</p><a href="mailto:henri@henriz.dev">henri@henriz.dev <span aria-hidden="true">↗</span></a></aside></section></main><SiteFooter/></>;
}
