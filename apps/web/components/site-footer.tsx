import Link from "next/link";
import { STORE_URLS } from "../lib/browser-stores";
import type { SiteLocale } from "./language-redirect";

function Mark() {
  return <img className="mark" src="/verbia-mark.svg" alt="" width="24" height="24"/>;
}

export function SiteFooter({ locale = "en" }: { locale?: SiteLocale }) {
  const zh = locale === "zh";
  const home = zh ? "/zh" : "/";
  const prefix = zh ? "/zh" : "";
  const guides = [
    ["/ai-reply-generator", zh ? "AI 回复生成器" : "AI Reply Generator"],
    ["/multilingual-reply-generator", zh ? "多语言回复生成器" : "Multilingual Reply Generator"],
    ["/context-aware-reply-generator", zh ? "上下文回复生成器" : "Context-Aware Reply Generator"],
    ["/ai-browser-writing-assistant", zh ? "AI 浏览器写作助手" : "AI Browser Writing Assistant"],
    ["/reddit-reply-generator", zh ? "Reddit 回复生成器" : "Reddit Reply Generator"],
    ["/ai-reddit-assistant", zh ? "AI Reddit 助手" : "AI Reddit Assistant"],
    ["/ai-email-reply-generator", zh ? "AI 邮件回复生成器" : "AI Email Reply Generator"],
    ["/follow-up-email-after-no-response", zh ? "未回复邮件跟进" : "Follow Up After No Response"],
    ["/how-to-follow-up-on-an-email-politely", zh ? "礼貌跟进邮件" : "Follow Up on an Email Politely"],
    ["/how-to-ask-for-payment-politely", zh ? "礼貌请求付款" : "Ask for Payment Politely"],
    ["/how-to-respond-to-a-job-offer-email", zh ? "回复工作录用邮件" : "Respond to a Job Offer Email"],
    ["/how-to-politely-decline-a-job-offer", zh ? "礼貌拒绝工作录用" : "Politely Decline a Job Offer"],
    ["/reply-to-email-confirmation", zh ? "回复确认邮件" : "Reply to Email Confirmation"],
    ["/how-to-remind-someone-politely-in-an-email", zh ? "礼貌邮件提醒" : "Send a Polite Email Reminder"],
    ["/how-to-respond-to-an-interview-invitation-email", zh ? "回复面试邀请" : "Respond to an Interview Invitation"],
    ["/gmail-ai-reply-assistant", zh ? "Gmail AI 回复助手" : "Gmail AI Reply Assistant"],
    ["/outlook-ai-reply-assistant", zh ? "Outlook AI 回复助手" : "Outlook AI Reply Assistant"],
  ] as const;

  return <footer className="site-footer">
    <div className="shell footer-inner">
      <div className="footer-brand">
        <Link className="brand" href={home}><Mark/>Verbia</Link>
        <p>{zh ? "AI 回复与写作助手。你提供意思，Verbia 负责自然表达。" : "AI Reply & Writing Assistant. You provide the meaning. Verbia handles the expression."}</p>
      </div>
      <div className="footer-columns">
        <nav aria-label={zh ? "产品" : "Product"}>
          <h2>{zh ? "产品" : "Product"}</h2>
          <Link href={`${home}#features`}>{zh ? "功能" : "Features"}</Link>
          <Link href={`${prefix}/supported-platforms`}>{zh ? "支持的平台" : "Supported platforms"}</Link>
          <Link href={`${prefix}/getting-started`}>{zh ? "使用教程" : "Getting started"}</Link>
          {!zh && <Link href="/situations">Email situations</Link>}
          {!zh && <Link href="/career">Career guides</Link>}
          <Link href={`${home}#pricing`}>{zh ? "价格" : "Pricing"}</Link>
          <Link href={`${home}#faq`}>{zh ? "常见问题" : "FAQ"}</Link>
        </nav>
        <nav aria-label={zh ? "支持" : "Support"}>
          <h2>{zh ? "支持" : "Support"}</h2>
          <Link href={`${prefix}/contact`}>{zh ? "联系与反馈" : "Contact/Feedback"}</Link>
          <Link href={`${prefix}/terms`}>{zh ? "条款" : "Terms"}</Link>
          <Link href={`${prefix}/privacy`}>{zh ? "隐私" : "Privacy"}</Link>
          <Link href={`${prefix}/refund`}>{zh ? "退款" : "Refunds"}</Link>
        </nav>
        <nav aria-label={zh ? "下载" : "Download"}>
          <h2>{zh ? "下载" : "Download"}</h2>
          <a className="footer-store-link" href={STORE_URLS.chrome} target="_blank" rel="noopener noreferrer"><img src="/chrome.svg" alt="" width="18" height="18"/>Google Chrome <span aria-hidden="true">↗</span></a>
          <a className="footer-store-link" href={STORE_URLS.edge} target="_blank" rel="noopener noreferrer"><img src="/edge.svg" alt="" width="18" height="18"/>Microsoft Edge <span aria-hidden="true">↗</span></a>
        </nav>
      </div>
    </div>
    <div className="shell footer-guides-row">
      <h2>{zh ? "使用场景" : "Guides"}</h2>
      <nav aria-label={zh ? "Verbia 使用场景" : "Verbia guides"}>
        {guides.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
      </nav>
    </div>
    <div className="shell copyright">© {new Date().getFullYear()} Verbia{zh ? "。保留所有权利。" : ". All rights reserved."}</div>
  </footer>;
}
