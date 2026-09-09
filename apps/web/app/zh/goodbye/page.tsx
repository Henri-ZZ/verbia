import type { Metadata } from "next";
import { ContactFeedbackForm } from "../../../components/contact-feedback-form";
import { SiteFooter } from "../../../components/site-footer";
import { SiteHeader } from "../../../components/site-header";

export const metadata: Metadata = { title: "离开之前 — Verbia", description: "告诉我们你为什么卸载 Verbia。", robots: { index: false } };

export default function GoodbyePage() { return <><SiteHeader locale="zh"/><main className="contact-page goodbye-page" id="main"><section className="contact-hero shell"><p className="eyebrow">感谢你体验 Verbia</p><h1>很遗憾看到你离开。</h1><p>一个简单的选择就能帮助我们改进 Verbia。表单完全自愿，也不要求登录。你也可以直接发送邮件到 <a href="mailto:henri@henriz.dev">henri@henriz.dev</a>。</p></section><section className="contact-layout shell"><ContactFeedbackForm locale="zh" source="uninstall"/><aside><h2>只是遇到了问题？</h2><p>你可以通过邮件联系我们，并附上浏览器和 Verbia 版本。请不要发送私人对话内容。</p><a href="mailto:henri@henriz.dev">henri@henriz.dev <span aria-hidden="true">↗</span></a></aside></section></main><SiteFooter locale="zh"/></>; }
