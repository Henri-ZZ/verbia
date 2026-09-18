import Link from "next/link";
import type { ReactNode } from "react";
import { InstallLink } from "./install-link";
import { LanguageRedirect, RememberLocale, type SiteLocale } from "./language-redirect";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { GmailLogo, OutlookLogo } from "./email-platform-logos";
import { RedditLogo } from "./reddit-logo";
import { QqMailLogo, WhatsAppLogo } from "./platform-logos";

const mailServices = ["AOL Mail", "Fastmail", "GMX", "iCloud Mail", "Proton Mail", "Tuta Mail", "Yahoo Mail", "Yandex Mail", "Zoho Mail", "163 / 126 Mail", "Naver Mail", "Daum Mail"];

const copy = {
  en: {
    eyebrow: "SUPPORTED PLATFORMS",
    title: "Use the right context method for the site you are on.",
    intro: "Automatic Mode handles supported conversations directly. AI Identify helps on supported webmail services, while Universal Mode lets you choose the exact text to use elsewhere.",
    automatic: "Automatic Mode",
    automaticIntro: "The reply panel recognizes supported editors and collects relevant visible text automatically. Always check the context preview before generating.",
    social: "Social",
    messaging: "Messaging",
    email: "Email",
    reddit: "Post and relevant comment chain",
    whatsapp: "Recent conversation around the current reply",
    gmail: "Visible message and supported reply context",
    outlook: "Visible message and supported reply context",
    qq: "Visible message, with AI Identify available for correction",
    identify: "AI Identify for webmail",
    identifyIntro: "When a supported mail site has no dedicated automatic reader—or the detected message needs correction—you can explicitly ask Verbia to identify the current email. This action uses one generation from your daily allowance.",
    mailList: "Recognized webmail services include",
    universal: "Universal Mode",
    universalIntro: "On other websites, focus a compatible editor and open Verbia. Select the text you are answering, right-click, and add it to Verbia context. You can also draft without context.",
    boundaries: "Current boundaries",
    boundaryItems: ["Text context only; images, video, attachments, and audio are not understood yet.", "Website changes can temporarily affect automatic detection or direct insertion.", "Verbia prepares an editable draft and never sends, posts, votes, or submits for you.", "Available for Google Chrome and Microsoft Edge."],
    requestTitle: "Want another platform next?",
    requestBody: "Tell us where you write most often. Platform requests help decide which dedicated integration comes next.",
    request: "Contact/Feedback",
    install: "Install Verbia",
    disclaimer: "Platform names and logos are trademarks of their respective owners. Verbia is independent and is not affiliated with or endorsed by these platforms."
  },
  zh: {
    eyebrow: "支持的平台",
    title: "根据当前网站，使用合适的上下文方式。",
    intro: "自动模式直接处理已经适配的对话；支持的网页邮箱还可以主动使用 AI 识别；其他网站则通过通用模式准确选择需要的文字。",
    automatic: "自动模式",
    automaticIntro: "回复面板会识别已经适配的编辑器，并自动获取相关的可见文字。生成前请始终检查上下文预览。",
    social: "社交",
    messaging: "通讯",
    email: "邮件",
    reddit: "帖子与相关评论链",
    whatsapp: "当前回复附近的近期对话",
    gmail: "当前可见邮件与支持的回复上下文",
    outlook: "当前可见邮件与支持的回复上下文",
    qq: "当前可见邮件，也可以用 AI 识别进行修正",
    identify: "网页邮箱 AI 识别",
    identifyIntro: "当支持的邮箱网站没有专门的自动读取能力，或者自动识别结果需要修正时，你可以主动让 Verbia 识别当前邮件。每次识别会使用一次当日生成额度。",
    mailList: "目前识别的网页邮箱包括",
    universal: "通用模式",
    universalIntro: "在其他网站中，先聚焦兼容的编辑器并打开 Verbia。选择你正在回应的文字，点击右键，再加入 Verbia 上下文；不需要上下文时也可以直接起草。",
    boundaries: "当前能力边界",
    boundaryItems: ["目前只支持文字上下文，暂不理解图片、视频、附件和音频。", "网站改版可能暂时影响自动识别或直接插入。", "Verbia 只准备可编辑草稿，永远不会替你发送、发布、投票或提交。", "支持 Google Chrome 和 Microsoft Edge。"],
    requestTitle: "希望下一个支持什么平台？",
    requestBody: "告诉我们你最常在哪里写作。平台反馈会帮助我们决定下一项深度适配。",
    request: "联系与反馈",
    install: "安装 Verbia",
    disclaimer: "页面中的平台名称和标志归各自所有者所有。Verbia 是独立产品，与这些平台不存在从属或官方认可关系。"
  }
} as const;

function PlatformRow({ icon, name, detail, category, status }: { icon: ReactNode; name: string; detail: string; category?: string; status: string }) {
  return <li><span className="supported-platform-category">{category}</span><span className="supported-platform-name">{icon}<strong>{name}</strong></span><span>{detail}</span><b>{status}</b></li>;
}

export function SupportedPlatforms({ locale }: { locale: SiteLocale }) {
  const t = copy[locale];
  const zh = locale === "zh";
  const prefix = zh ? "/zh" : "";
  const automaticStatus = zh ? "自动识别" : "Automatic";
  return <div lang={zh ? "zh-CN" : "en"}>{zh ? <RememberLocale locale="zh"/> : <LanguageRedirect/>}<SiteHeader locale={locale}/><main id="main" className="supported-platforms-page">
    <section className="supported-platforms-hero shell"><p className="eyebrow">{t.eyebrow}</p><h1>{t.title}</h1><p>{t.intro}</p><div className="hero-actions"><InstallLink label={t.install}/><a className="button secondary" href="#automatic">{t.automatic} <span aria-hidden="true">↓</span></a></div></section>

    <section className="supported-platforms-section shell" id="automatic" aria-labelledby="automatic-title"><div className="supported-platforms-heading"><span className="platform-mode-icon" aria-hidden="true">✓</span><div><p className="eyebrow">01</p><h2 id="automatic-title">{t.automatic}</h2><p>{t.automaticIntro}</p></div></div><ul className="supported-platform-list">
      <PlatformRow category={t.social} icon={<RedditLogo size={30}/>} name="Reddit" detail={t.reddit} status={automaticStatus}/>
      <PlatformRow category={t.messaging} icon={<WhatsAppLogo size={31}/>} name="WhatsApp Web" detail={t.whatsapp} status={automaticStatus}/>
      <PlatformRow category={t.email} icon={<GmailLogo size={29}/>} name="Gmail" detail={t.gmail} status={automaticStatus}/>
      <PlatformRow icon={<OutlookLogo size={29}/>} name="Outlook Web" detail={t.outlook} status={automaticStatus}/>
      <PlatformRow icon={<QqMailLogo size={29}/>} name="QQ Mail" detail={t.qq} status={automaticStatus}/>
    </ul></section>

    <section className="supported-platforms-section identify shell" aria-labelledby="identify-title"><div className="supported-platforms-heading"><span className="platform-mode-icon" aria-hidden="true">✦</span><div><p className="eyebrow">02</p><h2 id="identify-title">{t.identify}</h2><p>{t.identifyIntro}</p></div></div><div className="mail-service-cloud"><strong>{t.mailList}</strong><div>{mailServices.map(service => <span key={service}>{service}</span>)}</div></div></section>

    <section className="supported-platforms-section universal shell" aria-labelledby="universal-title"><div className="supported-platforms-heading"><span className="platform-mode-icon" aria-hidden="true">Aa</span><div><p className="eyebrow">03</p><h2 id="universal-title">{t.universal}</h2><p>{t.universalIntro}</p></div></div><div className="universal-context-flow" aria-label={t.universal}><span>{zh ? "选择相关文字" : "Select relevant text"}</span><b aria-hidden="true">→</b><span>{zh ? "右键加入上下文" : "Add from the context menu"}</span><b aria-hidden="true">→</b><span>{zh ? "检查并生成" : "Review and generate"}</span></div></section>

    <section className="platform-boundaries shell" aria-labelledby="boundaries-title"><div><p className="eyebrow">{zh ? "清楚说明" : "CLEAR EXPECTATIONS"}</p><h2 id="boundaries-title">{t.boundaries}</h2></div><ul>{t.boundaryItems.map(item => <li key={item}>{item}</li>)}</ul></section>
    <section className="platform-request shell"><div><h2>{t.requestTitle}</h2><p>{t.requestBody}</p></div><Link className="button primary" href={`${prefix}/contact?source=platforms`}>{t.request} <span aria-hidden="true">→</span></Link></section>
    <p className="platform-disclaimer shell">{t.disclaimer}</p>
  </main><SiteFooter locale={locale}/></div>;
}
