import Link from "next/link";

export const metadata = { title: "隐私 — Verbia", description: "了解 Verbia 如何处理对话上下文、账户信息和回复草稿。", alternates: { canonical: "/zh/privacy", languages: { en: "/privacy", "zh-CN": "/zh/privacy" } } };
export default function PrivacyPage() { return <main className="legal-page" lang="zh-CN"><Link className="brand" href="/zh"><img src="/verbia-mark.svg" alt="" width="32" height="32"/>Verbia</Link><p className="eyebrow">隐私</p><h1>从设计开始保护隐私。</h1><p>只有在你明确选择生成回复后，Verbia 才会处理完成回复所需的最少对话上下文。它不会自动发送消息。</p><p>正式公开发布前，这里将更新为完整的隐私政策。</p><Link href="/zh">返回首页</Link></main>; }
