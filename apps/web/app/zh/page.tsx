import type { Metadata } from "next";
import Link from "next/link";
import { Faq, type FaqItem } from "../../components/faq";
import { InstallLink } from "../../components/install-link";
import { RememberLocale } from "../../components/language-redirect";
import { SiteHeader } from "../../components/site-header";
import { ProCheckout } from "../../components/pro-checkout";
import { PromoVideo } from "../../components/promo-video";
import { SiteFooter } from "../../components/site-footer";
import { AutomaticPlatformLogos } from "../../components/platform-logos";
import { HomePlatforms } from "../../components/home-platforms";

export const metadata: Metadata = {
  title: "Verbia — AI 回复与写作助手",
  description: "在支持的网站使用自动模式，在网页邮箱使用 AI 识别，在其他网站加入所选文字；用任何语言表达意图，获得自然回复。",
  alternates: { canonical: "/zh", languages: { en: "/", "zh-CN": "/zh" } },
  openGraph: { url: "/zh", locale: "zh_CN", title: "Verbia — 用任何语言，说出你真正想说的话", description: "理解上下文与真实意图，帮你自然表达。" }
};

const steps = [
  ["01", "读懂", "自动模式会在支持的平台中找到相关可见上下文；在其他网站中，由你准确选择需要的文字。", "上下文始终可以检查"],
  ["02", "表达", "用你最自然的语言告诉 Verbia 你想说什么，可以简单打字，也可以直接说出来。", "自然输入或语音表达"],
  ["03", "回复", "Verbia 把你的意思整理成符合对话场景和目标语言的自然回复。", "每句话都由你确认"]
];
const toneCards = [
  ["Reddit", "轻松自然", "先别急着收尾，等最新数据出来再说——到了记得叫我！", "自动模式讨论"],
  ["邮件", "清晰专业", "今天晚些时候收到更新数据后，我会尽快完成报告。", "Outlook 与 Gmail"],
  ["WhatsApp", "亲切简洁", "周二可以，时间确定后告诉我就好。", "自动模式对话"],
  ["所选文字", "礼貌自信", "我们会在最终数据确认后发布报告，并期待尽快交付。", "其他网站的通用模式"]
];
const languages = [
  ["中文 → 自然英文", "别答应得太快，先探探他们的预算", "Let’s take a beat before committing. Have they indicated what ballpark they’re working with?"],
  ["日语 → 自然英文", "来週の火曜日に延期させていただけないでしょうか", "Would it be possible to push our sync to next Tuesday? Thanks so much for understanding."],
  ["西班牙语 → 自然英文", "No me convence el diseño, pero la funcionalidad está perfecta", "The feature set looks rock-solid, though the visual presentation could use another pass."],
  ["韩语 → 自然英文", "데이터 기준이 조금 모호한 것 같아요", "I reviewed the deck; a few of the underlying metrics could use more clarification."]
];
const faqs: FaqItem[] = [
  { question: "Verbia 是什么？", answer: "Verbia 是一款在写作页面中直接工作的浏览器扩展。它结合当前对话和你的真实意图，生成一段自然回复供你确认。" },
  { question: "Verbia 是翻译工具吗？", answer: "不是。普通翻译是在语言之间转换词句，Verbia 会先理解你想表达的意思，再根据对话场景自然地转达。" },
  { question: "Verbia 支持哪些语言？", answer: "你可以使用多种语言表达意图，也可以选择回复使用的语言。预设列表覆盖亚洲、欧洲、非洲和美洲的常用语言。" },
  { question: "可以不用打字，直接说话吗？", answer: "可以。你可以使用扩展中的语音输入，自然地说出你的想法。" },
  { question: "Verbia 能理解对话上下文吗？", answer: "可以。自动模式会在支持的平台中找到相关可见上下文；支持的网页邮箱可以使用 AI 识别；其他网站则可以通过通用模式加入所选文字。" },
  { question: "Verbia 会自动发送消息吗？", answer: "不会。Verbia 只准备草稿，你可以检查、编辑、插入，再自行发送。" },
  { question: "Verbia 目前在哪里可以使用？", answer: "自动模式支持 Reddit、WhatsApp 网页版、Gmail、Outlook 网页版和 QQ 邮箱。支持的网页邮箱还可以使用 AI 识别；其他网站可通过通用模式加入所选文字。详细信息请查看“支持的平台”页面。" }
];

function SectionHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return <div className="section-heading"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{body && <p>{body}</p>}</div>;
}
function Mark() { return <img className="mark" src="/verbia-mark.svg" alt="" width="24" height="24"/>; }

export default function ChineseHomePage() {
  const jsonLd = { "@context": "https://schema.org", "@type": "SoftwareApplication", name: "Verbia", applicationCategory: "BrowserApplication", operatingSystem: "Google Chrome, Microsoft Edge", inLanguage: "zh-CN", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, description: "理解上下文，把任何语言中的真实意图转化为自然回复的浏览器写作助手。" };
  return <div lang="zh-CN"><RememberLocale locale="zh"/><SiteHeader locale="zh"/><main id="main"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}/>
    <section className="hero shell"><div className="pill"><span className="live-dot"/>Verbia 浏览器扩展 · 页面内写作助手</div><h1>告诉我你想说什么，<em>用任何语言都可以。</em></h1><p className="hero-copy">Verbia 理解当前对话，把你的真实意思转化为自然、贴合上下文的回复。</p><div className="hero-actions"><InstallLink label="立即安装"/><a className="button secondary" href="#how-it-works">看看如何使用 <span aria-hidden="true">→</span></a></div><p className="browser-availability"><img src="/chrome.svg" alt="" width="22" height="22"/><img src="/edge.svg" alt="" width="22" height="22"/>支持 Google Chrome 和 Microsoft Edge</p><div className="support-note"><AutomaticPlatformLogos size={27}/><span>自动模式支持 Reddit、WhatsApp 网页版、Gmail、Outlook 和 QQ 邮箱。</span><Link href="/zh/supported-platforms">查看所有支持的平台 <span aria-hidden="true">→</span></Link></div></section>

    <section className="product-demo shell" aria-labelledby="demo-title"><div className="browser"><div className="browser-bar"><span className="traffic"><i/><i/><i/></span><span className="address">threads.designcommunity.internal/discussions/p891</span><span aria-hidden="true">•••</span></div><div className="browser-page"><div className="discussion"><span className="tag">技术与产品讨论</span><h2 id="demo-title">关于新套餐定价的讨论</h2><div className="message"><b>MR</b><p><strong>Marcus Reid <small>产品负责人</small></strong>“I get your point, but I still think the subscription is pretty affordable compared to the alternatives.”</p></div></div><div className="assistant"><div className="assistant-head"><span><Mark/><strong>Verbia 助手</strong></span><span className="status">● 自动模式 · 已识别上下文</span></div><div className="assistant-body"><p className="step-label">第 1 步 — 我想表达的意思</p><div className="intent"><strong>“我基本同意他的观点，但是我觉得现在的价格已经不算便宜了。语气随意一点，别太冲。”</strong><span>语言：简体中文 · 语气：轻松、客观</span></div><div className="transform"><span>对话上下文</span><b>+</b><span>用户意图</span><b>→</b><strong>Verbia</strong></div><div className="draft"><p className="step-label">自然回复 · 可以插入</p><blockquote>“I mostly agree with your point, but I’m not sure I’d call it cheap anymore. The price has gone up quite a bit.”</blockquote><div><button type="button">插入回复</button><button type="button" className="quiet">调整语气</button></div></div></div></div></div></div><p className="formula"><b>对话上下文</b> + 我想表达的意思 → <b>自然回复</b></p></section>

    <section className="principle shell"><p className="eyebrow">核心理念</p><h2>你已经知道自己想表达什么。</h2><h3>Verbia 帮你找到合适的说法。</h3><p>语言障碍、语气顾虑和生硬翻译不该限制沟通。你提供观点、判断和分寸，Verbia 帮它们自然地传达出去。</p></section>

    <HomePlatforms locale="zh"/>

    <section className="walkthrough shell" id="demo-video"><SectionHeading eyebrow="产品演示" title="一分钟了解完整流程。" body="看看 Verbia 如何识别上下文、接收语音或文字输入，并整理出自然回复。"/><PromoVideo label="播放 Verbia 产品演示视频"/><div className="chapters"><span>识别上下文</span><span>语音或文字意图</span><span>调整语气</span><span>插入回复</span></div></section>

    <section className="section shell" id="how-it-works"><SectionHeading eyebrow="简单流畅" title="只需告诉 Verbia 你真正想表达什么。"/><div className="card-grid three">{steps.map(([number,title,body,note]) => <article className="card step-card" key={number}><div><span className="number">{number}</span><h3>{title}</h3><p>{body}</p></div><small>● {note}</small></article>)}</div></section>

    <section className="section shell"><SectionHeading eyebrow="流程对比" title="沟通不应该需要十个步骤。" body="不用再来回切换标签页、复制对话、反复组织提示词。"/><div className="comparison"><article className="old"><h3>原来的方式</h3><ol>{["阅读讨论", "在脑中翻译", "复制对话内容", "打开另一个 AI 页面", "编写一长段提示词", "复制生成结果", "返回原来的页面", "粘贴到回复框"].map(x=><li key={x}>{x}</li>)}</ol><small>打断注意力，也拖慢思路</small></article><article className="with"><h3><Mark/> 使用 Verbia</h3>{[["带上上下文","自动模式会在支持的网站中识别；其他网站由你选择真正需要的文字。"],["说出你的意思","用自己的语言输入或直接说出来。"],["检查并回复","无需离开页面，直接插入整理好的草稿。"]].map(([a,b],i)=><div className="mini-step" key={a}><b>{i+1}</b><p><strong>{a}</strong>{b}</p></div>)}<small>✓ 留在当前工作流程中</small></article></div></section>

    <section className="section shell feature-stack" id="features"><div className="feature"><div><p className="eyebrow">上下文理解</p><h2>它知道你正在回复什么。</h2><p>在支持的平台中，自动模式会找到相关可见上下文；在其他网站中，只需加入真正需要的所选文字。</p><ul className="checks"><li>定位当前需要回应的观点</li><li>保留姓名与专业术语</li><li>适应对话中的语气</li></ul></div><div className="context-card"><small>对话摘录 #492 · Pull Request #1204</small><blockquote>“Should we decouple the authentication state before Friday’s staging deployment?”</blockquote><div><b>Verbia 上下文提取</b><span>主题：身份验证状态重构计划</span><span>关键限制：预发布环境时间安排</span></div></div></div><div className="feature reverse"><div className="language-list">{languages.map(([label,input,output])=><article key={label}><small>{label}</small><p>{input}</p><strong>{output}</strong></article>)}</div><div><p className="eyebrow">自由思考</p><h2>用你的语言思考，用对方的语言沟通。</h2><p>思考时使用的语言不应该限制你的表达。Verbia 理解想法背后的意图，再用目标语言自然地表达出来。</p><aside><b>不是逐字翻译。</b> 意思、分寸和目的永远优先。</aside></div></div><div><SectionHeading eyebrow="语气与分寸" title="不只是正确的语言，更是合适的表达方式。" body="同一个核心想法，也能适应完全不同的沟通场景。"/><div className="card-grid four">{toneCards.map(([title,label,copy,best])=><article className="card tone" key={title}><small>{title}</small><span>{label}</span><p>“{copy}”</p><footer>适合：{best}</footer></article>)}</div></div></section>

    <section className="section shell" id="privacy"><SectionHeading eyebrow="隐私与尊重" title="Verbia 起草，由你决定。" body="每一句要发布的话，都始终由你完全掌控。"/><div className="card-grid three">{[["仅在需要时读取上下文","回复面板打开时，Verbia 只在本地获取相关的可见上下文；只有点击“生成”时，上下文和意图才会发送到 API。"],["由用户完整审核","每条回复都是草稿，你可以检查、编辑、插入或放弃。"],["绝不自动发送","Verbia 不会代表你发送或提交任何消息。"]].map(([a,b],i)=><article className="card privacy" key={a}><span aria-hidden="true">{["◌","✓","◈"][i]}</span><h3>{a}</h3><p>{b}</p></article>)}</div></section>

    <section className="section shell pricing" id="pricing"><SectionHeading eyebrow="清晰定价" title="简单、透明地使用。"/><div className="card-grid two"><article className="price-card"><h3>免费版</h3><p className="price">$0 <small>永久免费</small></p><p>与 Premium 功能完全一致，每天回复上限为 10 次。</p><ul className="checks"><li>每天 10 次上下文回复</li><li>多语言文字意图输入</li><li>语音输入</li><li>浏览器扩展</li></ul><InstallLink className="button secondary full" label="立即安装"/></article><article className="price-card premium"><span className="tag">年付节省 42%</span><h3>Verbia Premium <img className="premium-mark" src="/premium.png" alt="" width="22" height="22"/></h3><p className="price">$9.99 <small>/ 月</small></p><p>与免费版功能完全一致，仅将每日次数放开到 100 次。</p><ul className="checks"><li>每天 100 次上下文回复</li><li>多语言文字意图输入</li><li>语音输入</li><li>浏览器扩展</li></ul><ProCheckout locale="zh"/></article></div></section>

    <section className="section shell faq" id="faq"><SectionHeading eyebrow="问题与解答" title="常见问题"/><Faq items={faqs}/></section>
    <section className="final-cta shell" id="install"><Mark/><h2>告诉我你想说什么。</h2><p>用任何语言都可以。</p><InstallLink label="立即安装"/><small>免费安装 · 无需信用卡</small></section>
  </main><SiteFooter locale="zh"/></div>;
}
