import Link from "next/link";
import type { SiteLocale } from "./language-redirect";
import { AutomaticPlatformLogos } from "./platform-logos";

const copy = {
  en: {
    eyebrow: "CONTEXT THAT MATCHES THE SITE",
    title: "Three ways to bring the conversation into your draft.",
    body: "Verbia uses the clearest available context method for the page you are writing on.",
    automatic: "Automatic Mode",
    automaticBody: "Relevant visible text is detected on Reddit, WhatsApp Web, Gmail, Outlook on the web, and QQ Mail.",
    identify: "AI Identify for email",
    identifyBody: "On supported webmail services, ask Verbia to identify the current message when automatic detection is unavailable or needs correction.",
    universal: "Universal Mode",
    universalBody: "On other websites, select the exact text you are responding to and add it as context.",
    all: "See all supported platforms",
    request: "Request another platform",
    aria: "Verbia context modes"
  },
  zh: {
    eyebrow: "适应不同网站的上下文方式",
    title: "三种方式，把当前交流带进回复草稿。",
    body: "Verbia 会根据你正在使用的网站，采用最清楚、可核对的上下文方式。",
    automatic: "自动模式",
    automaticBody: "在 Reddit、WhatsApp 网页版、Gmail、Outlook 网页版和 QQ 邮箱中自动识别相关可见文字。",
    identify: "邮件 AI 识别",
    identifyBody: "在支持的网页邮箱中，当自动识别不可用或需要修正时，可以主动让 AI 识别当前邮件。",
    universal: "通用模式",
    universalBody: "在其他网站中，选择你正在回应的准确文字，再把它加入上下文。",
    all: "查看所有支持的平台",
    request: "申请支持其他平台",
    aria: "Verbia 上下文模式"
  }
} as const;

export function HomePlatforms({ locale = "en" }: { locale?: SiteLocale }) {
  const t = copy[locale];
  const prefix = locale === "zh" ? "/zh" : "";
  return <section className="home-platforms shell" id="platforms" aria-labelledby="home-platforms-title">
    <div className="home-platforms-heading"><p className="eyebrow">{t.eyebrow}</p><h2 id="home-platforms-title">{t.title}</h2><p>{t.body}</p></div>
    <div className="home-platform-mode-grid" aria-label={t.aria}>
      <article><AutomaticPlatformLogos size={25}/><h3>{t.automatic}</h3><p>{t.automaticBody}</p></article>
      <article><span className="platform-mode-icon" aria-hidden="true">✦</span><h3>{t.identify}</h3><p>{t.identifyBody}</p></article>
      <article><span className="platform-mode-icon" aria-hidden="true">Aa</span><h3>{t.universal}</h3><p>{t.universalBody}</p></article>
    </div>
    <div className="home-platform-actions"><Link className="button primary" href={`${prefix}/supported-platforms`}>{t.all} <span aria-hidden="true">→</span></Link><Link href={`${prefix}/contact?source=platforms`}>{t.request} <span aria-hidden="true">→</span></Link></div>
  </section>;
}

