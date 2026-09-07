import type { ReactNode } from "react";
import Link from "next/link";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

export const LEGAL_EFFECTIVE_DATE = "September 7, 2026";
export const LEGAL_EFFECTIVE_DATE_ZH = "2026 年 9 月 7 日";

export function LegalPage({ locale, eyebrow, title, description, children }: { locale: "en" | "zh"; eyebrow: string; title: string; description: string; children: ReactNode }) {
  const zh = locale === "zh";
  const home = zh ? "/zh" : "/";
  const prefix = zh ? "/zh" : "";
  return <><SiteHeader locale={locale}/><main className="legal-page" id="main" lang={zh ? "zh-CN" : "en"}>
    <p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="legal-intro">{description}</p>
    <p className="legal-meta">{zh ? `生效日期：${LEGAL_EFFECTIVE_DATE_ZH}` : `Effective: ${LEGAL_EFFECTIVE_DATE}`}</p>
    <nav className="legal-nav" aria-label={zh ? "法律文件" : "Legal documents"}>
      <Link href={`${prefix}/terms`}>{zh ? "使用条款" : "Terms of Use"}</Link><Link href={`${prefix}/privacy`}>{zh ? "隐私政策" : "Privacy Policy"}</Link><Link href={`${prefix}/refund`}>{zh ? "退款政策" : "Refund Policy"}</Link>
    </nav>
    <article className="legal-content">{children}</article>
    <div className="legal-bottom"><Link href={home}>{zh ? "返回首页" : "Back to home"}</Link><a href="mailto:henri@henriz.dev">{zh ? "联系我们" : "Contact us"}</a></div>
  </main><SiteFooter locale={locale}/></>;
}
