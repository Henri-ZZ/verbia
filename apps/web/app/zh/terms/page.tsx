import Link from "next/link";

export const metadata = { title: "服务条款 — Verbia", description: "使用 Verbia 的服务条款。", alternates: { canonical: "/zh/terms", languages: { en: "/terms", "zh-CN": "/zh/terms" } } };
export default function TermsPage() { return <main className="legal-page" lang="zh-CN"><Link className="brand" href="/zh"><img src="/verbia-mark.svg" alt="" width="32" height="32"/>Verbia</Link><p className="eyebrow">服务条款</p><h1>Verbia 服务条款。</h1><p>正式公开发布前，这里将更新为完整的服务条款。</p><Link href="/zh">返回首页</Link></main>; }
