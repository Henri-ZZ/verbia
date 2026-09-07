"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { InstallLink } from "./install-link";
import { LanguageRedirect, RememberLocale, type SiteLocale } from "./language-redirect";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

const copy = {
  en: {
    welcome: "Installation complete. Welcome to Verbia.",
    welcomeBody: "You’re ready to turn what you mean—in any language—into a natural reply that fits the conversation.",
    eyebrow: "GETTING STARTED",
    title: "Your first Verbia reply",
    intro: "Learn the basic flow in a few minutes. Verbia reads context only when you invoke it, prepares a draft, and leaves the final decision to you.",
    time: "About 3 minutes",
    installed: "Extension installed",
    start: "Before you begin",
    startBody: "Pin Verbia to your browser toolbar so it is always easy to reach. Then open Verbia and sign in with Google or an email magic link. The website and extension use the same account and daily allowance.",
    account: "Sign in to Verbia",
    pinTitle: "Pin it to the toolbar",
    pinBody: "Open your browser’s Extensions menu, find Verbia, and choose Pin. The Verbia icon will stay beside the address bar.",
    redditEyebrow: "REDDIT · AUTOMATIC MODE",
    redditTitle: "Reply with context automatically",
    redditIntro: "Reddit is currently Verbia’s dedicated integration. It can identify the post and comment chain you are replying to.",
    redditSteps: [
      ["Open a reply box", "Visit a Reddit post and click the reply field under the post or comment you want to answer. Verbia appears beside the editor."],
      ["Review the context", "Expand the context preview if you want to see what Verbia found. You can remove context before generating."],
      ["Say what you mean", "Type your thought in the language that feels most natural. You can also use voice input and choose the reply language, tone, and length."],
      ["Generate and review", "Choose Generate. Read and edit the draft before you use it. If needed, generate again with clearer intent or different settings."],
      ["Insert, then send yourself", "Insert the draft into Reddit’s reply box, make any final edits, and send it yourself. Verbia never clicks Send."],
    ],
    universalEyebrow: "OTHER WEBSITES · UNIVERSAL MODE",
    universalTitle: "Use Verbia wherever you write",
    universalIntro: "On other websites, focus a standard text field and open Verbia with the shortcut. You can write without context or add selected text manually.",
    shortcut: "Open Verbia",
    shortcutHint: "You can change this shortcut from your browser’s extension shortcut settings.",
    universalSteps: [
      ["Focus the editor", "Click the text field where you want to write. Standard text boxes and many editable areas are supported."],
      ["Add context if useful", "Select relevant text on the page, right-click, and choose “Add to Verbia context.” Skip this when no context is needed."],
      ["Open Verbia and draft", "Use the keyboard shortcut, enter your intent, and generate. Review the context and result before inserting."],
      ["Insert or copy", "Verbia can insert into compatible editors. For complex rich-text editors, use Copy and paste the draft yourself."],
    ],
    controlsTitle: "Shape the draft",
    controls: [["Output language", "The language your reply should use. Your intent can be written in any language."], ["Tone", "Choose a style that fits the room, such as casual, professional, or concise."], ["Length", "Ask for a short, medium, or longer reply."], ["Voice language", "Used only to recognize speech; it does not decide the output language."]],
    privacyTitle: "You stay in control",
    privacy: ["Verbia reads relevant visible text only after you invoke it.", "Context and intent are sent only when you choose Generate.", "Every result is an editable draft; nothing is posted automatically.", "Page text, intent, transcripts, and drafts are not stored as conversation history by Verbia."],
    helpTitle: "If something doesn’t work",
    help: [["The panel did not appear", "On Reddit, click a reply box first. On another site, focus an editable field and use the shortcut. Some protected browser pages do not allow extensions."], ["The wrong context was detected", "Open the context preview and remove it, or select the exact text you need and add it from the right-click menu."], ["Insert is unavailable", "Some complex editors do not expose a reliable insertion point. Choose Copy, then paste the draft manually."], ["You are asked to sign in", "Online generation requires a Verbia account. Sign in from the extension’s Account area using Google or an email magic link."], ["The daily allowance is used", "Free accounts receive 10 generations per day. Premium includes 100 per day. Allowances reset at 00:00 UTC and do not roll over."]],
    ready: "Ready to try your first reply?",
    readyBody: "Open Reddit or any page with a text field, focus the place where you want to reply, and open Verbia.",
    openReddit: "Try it on Reddit",
    settings: "View account",
  },
  zh: {
    welcome: "安装完成，欢迎使用 Verbia。",
    welcomeBody: "现在，你可以用任何语言说出自己的意思，再把它变成符合当前对话的自然回复。",
    eyebrow: "快速开始",
    title: "用 Verbia 写出第一条回复",
    intro: "几分钟了解完整流程。Verbia 只在你主动唤起后读取上下文，生成草稿，最终发送决定始终由你做出。",
    time: "约 3 分钟",
    installed: "扩展已安装",
    start: "开始前的准备",
    startBody: "把 Verbia 固定到浏览器工具栏，之后可以随时找到它。然后打开 Verbia，使用 Google 或邮箱免密链接登录。官网和扩展使用同一个账号及每日额度。",
    account: "登录 Verbia",
    pinTitle: "固定到工具栏",
    pinBody: "打开浏览器的“扩展程序”菜单，找到 Verbia 并选择固定。之后地址栏旁会一直显示 Verbia 图标。",
    redditEyebrow: "REDDIT · 自动模式",
    redditTitle: "自动带上正在回复的上下文",
    redditIntro: "Reddit 是 Verbia 目前直接适配的平台。它能够识别你正在回复的帖子、评论以及相关评论链。",
    redditSteps: [
      ["打开回复框", "进入一个 Reddit 帖子，点击想回复的帖子或评论下方的输入框，Verbia 面板会出现在编辑器旁边。"],
      ["检查上下文", "你可以展开上下文预览，查看 Verbia 找到了什么。生成前可以移除不需要的上下文。"],
      ["说出你的意思", "使用自己最自然的语言输入想法，也可以使用语音输入，并选择回复语言、语气和长度。"],
      ["生成并审核", "点击“生成”，阅读并修改草稿。需要时，可以补充更清楚的意图或调整设置后重新生成。"],
      ["插入后自行发送", "把草稿插入 Reddit 回复框，完成最后修改，再由你自己发送。Verbia 永远不会替你点击发送。"],
    ],
    universalEyebrow: "其他网站 · 通用模式",
    universalTitle: "在你写作的页面使用 Verbia",
    universalIntro: "在其他网站中，先聚焦普通文本输入框，再用快捷键打开 Verbia。你可以不带上下文直接写，也可以手动加入所选文字。",
    shortcut: "打开 Verbia",
    shortcutHint: "可以在浏览器的扩展快捷键设置中修改这个组合键。",
    universalSteps: [
      ["聚焦编辑器", "点击你准备写作的文本框。普通文本框以及许多可编辑区域都受支持。"],
      ["按需加入上下文", "选中页面上的相关文字，点击右键，选择“加入 Verbia 上下文”。不需要上下文时可以跳过。"],
      ["打开 Verbia 并生成", "使用快捷键打开面板，输入你的意图并生成。插入前先检查上下文和结果。"],
      ["插入或复制", "兼容的编辑器可以直接插入。遇到复杂富文本编辑器时，选择复制，再自行粘贴草稿。"],
    ],
    controlsTitle: "调整草稿表达",
    controls: [["输出语言", "回复最终使用的语言；你的原始意图可以用任意语言表达。"], ["语气", "选择适合当前场合的风格，例如轻松、专业或简洁。"], ["长度", "让回复保持简短、适中或更详细。"], ["语音语言", "只用于识别语音，不会决定最终回复的语言。"]],
    privacyTitle: "所有决定都在你手中",
    privacy: ["只有你主动唤起后，Verbia 才会读取相关可见文字。", "只有点击“生成”时，上下文和意图才会发送。", "每次结果都是可编辑草稿，不会被自动发布。", "Verbia 不会把页面正文、意图、语音转写或草稿保存为对话历史。"],
    helpTitle: "遇到问题时",
    help: [["面板没有出现", "在 Reddit 上先点击回复框；在其他网站先聚焦可编辑输入框，再使用快捷键。部分受保护的浏览器页面不允许扩展运行。"], ["识别了错误的上下文", "打开上下文预览并移除，或者准确选中需要的文字，通过右键菜单加入。"], ["无法直接插入", "部分复杂编辑器无法提供可靠的插入位置。请选择“复制”，再手动粘贴草稿。"], ["页面要求登录", "在线生成需要 Verbia 账号。请在扩展的账号区域使用 Google 或邮箱免密链接登录。"], ["今日额度已经用完", "免费账号每天 10 次，Premium 每天 100 次。额度在 UTC 0 点重置，不能结转。"]],
    ready: "准备好尝试第一条回复了吗？",
    readyBody: "打开 Reddit 或任意带文本框的页面，聚焦想回复的位置，然后唤起 Verbia。",
    openReddit: "前往 Reddit 试用",
    settings: "查看账号",
  },
} as const;

function StepList({ steps }: { steps: ReadonlyArray<readonly [string, string]> }) {
  return <ol className="guide-steps">{steps.map(([title, body], index) => <li key={title}><span aria-hidden="true">{index + 1}</span><div><h3>{title}</h3><p>{body}</p></div></li>)}</ol>;
}

export function GettingStarted({ locale }: { locale: SiteLocale }) {
  const [installed, setInstalled] = useState(false);
  const [shortcut, setShortcut] = useState("Ctrl+Shift+Y");
  const t = copy[locale];
  useEffect(() => {
    setInstalled(new URLSearchParams(window.location.search).get("installed") === "1");
    if (/Mac|iPhone|iPad/.test(navigator.platform)) setShortcut("⌘⇧Y");
  }, []);

  return <div lang={locale === "zh" ? "zh-CN" : "en"}>
    {locale === "en" ? <LanguageRedirect/> : <RememberLocale locale="zh"/>}<SiteHeader locale={locale}/>
    <main id="main" className="guide-page">
      {installed && <section className="guide-welcome" aria-labelledby="welcome-title"><div className="guide-welcome-mark"><img src="/verbia-mark.svg" alt="" width="54" height="54"/></div><div><span>{t.installed}</span><h1 id="welcome-title">{t.welcome}</h1><p>{t.welcomeBody}</p></div></section>}
      <header className="guide-hero"><p className="eyebrow">{t.eyebrow}</p>{!installed && <h1>{t.title}</h1>}{installed && <h2>{t.title}</h2>}<p>{t.intro}</p><span className="guide-time">◷ {t.time}</span></header>

      <section className="guide-setup" aria-labelledby="setup-title"><div><p className="eyebrow">01</p><h2 id="setup-title">{t.start}</h2><p>{t.startBody}</p><Link className="button primary" href={`/account?locale=${locale}`}>{t.account} <span aria-hidden="true">→</span></Link></div><aside><span aria-hidden="true">⌖</span><div><h3>{t.pinTitle}</h3><p>{t.pinBody}</p></div></aside></section>

      <section className="guide-section" aria-labelledby="reddit-title"><header><p className="eyebrow">{t.redditEyebrow}</p><h2 id="reddit-title">{t.redditTitle}</h2><p>{t.redditIntro}</p></header><StepList steps={t.redditSteps}/></section>

      <section className="guide-section guide-universal" aria-labelledby="universal-title"><header><p className="eyebrow">{t.universalEyebrow}</p><h2 id="universal-title">{t.universalTitle}</h2><p>{t.universalIntro}</p></header><div className="guide-shortcut"><span>{t.shortcut}</span><kbd>{shortcut}</kbd><small>{t.shortcutHint}</small></div><StepList steps={t.universalSteps}/></section>

      <section className="guide-section" aria-labelledby="controls-title"><header><p className="eyebrow">03</p><h2 id="controls-title">{t.controlsTitle}</h2></header><dl className="guide-controls">{t.controls.map(([term, detail]) => <div key={term}><dt>{term}</dt><dd>{detail}</dd></div>)}</dl></section>

      <section className="guide-privacy" aria-labelledby="privacy-title"><div className="guide-shield" aria-hidden="true">✓</div><div><h2 id="privacy-title">{t.privacyTitle}</h2><ul>{t.privacy.map(item => <li key={item}>{item}</li>)}</ul></div></section>

      <section className="guide-section guide-help" aria-labelledby="help-title"><header><p className="eyebrow">04</p><h2 id="help-title">{t.helpTitle}</h2></header><div>{t.help.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>

      <section className="guide-ready" id="install"><img src="/verbia-mark.svg" alt="" width="48" height="48"/><h2>{t.ready}</h2><p>{t.readyBody}</p><div>{!installed && <InstallLink label={locale === "zh" ? "立即安装" : "Install now"}/>}<a className="button primary" href="https://www.reddit.com/" target="_blank" rel="noreferrer">{t.openReddit} <span aria-hidden="true">↗</span></a><Link className="button secondary" href={`/account?locale=${locale}`}>{t.settings}</Link></div></section>
    </main><SiteFooter locale={locale}/>
  </div>;
}
