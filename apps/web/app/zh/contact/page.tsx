import type { Metadata } from "next";
import { ContactFeedbackForm } from "../../../components/contact-feedback-form";
import { SiteFooter } from "../../../components/site-footer";
import { SiteHeader } from "../../../components/site-header";

export const metadata: Metadata = { title: "联系与反馈 — Verbia", description: "联系 Verbia、反馈产品问题或提出功能建议。", alternates: { canonical: "/zh/contact", languages: { en: "/contact", "zh-CN": "/zh/contact" } } };

export default function ContactPage() { return <><SiteHeader locale="zh"/><main className="contact-page" id="main"><section className="contact-hero shell"><p className="eyebrow">联系与反馈</p><h1>帮助我们把 Verbia 做得更好。</h1><p>报告问题、提出建议，或者告诉我们你的使用感受。你也可以直接发送邮件到 <a href="mailto:henri@henriz.dev">henri@henriz.dev</a>。</p></section><section className="contact-layout shell"><ContactFeedbackForm locale="zh"/><aside><h2>更喜欢用邮箱？</h2><p>欢迎直接发送问题或建议，我们会认真阅读每一封邮件。</p><a href="mailto:henri@henriz.dev">henri@henriz.dev <span aria-hidden="true">↗</span></a><small>请勿通过邮件发送密码、银行卡信息或私人对话内容。</small></aside></section></main><SiteFooter locale="zh"/></>; }
