import Link from "next/link";
import { InstallLink } from "./install-link";
import type { SiteLocale } from "./language-redirect";

function Mark() {
  return <img className="mark" src="/verbia-mark.svg" alt="" width="24" height="24"/>;
}

export function SiteFooter({ locale = "en" }: { locale?: SiteLocale }) {
  const zh = locale === "zh";
  const home = zh ? "/zh" : "/";
  const prefix = zh ? "/zh" : "";

  return <footer className="site-footer">
    <div className="shell footer-inner">
      <div>
        <Link className="brand" href={home}><Mark/>Verbia</Link>
        <p>{zh ? "AI 回复与写作助手。你提供意思，Verbia 负责自然表达。" : "AI Reply & Writing Assistant. You provide the meaning. Verbia handles the expression."}</p>
      </div>
      <nav aria-label={zh ? "页脚导航" : "Footer"}>
        <Link href={`${home}#features`}>{zh ? "产品" : "Product"}</Link>
        <Link href={`${prefix}/getting-started`}>{zh ? "使用教程" : "Getting started"}</Link>
        <Link href={`${prefix}/privacy`}>{zh ? "隐私" : "Privacy"}</Link>
        <Link href={`${prefix}/terms`}>{zh ? "条款" : "Terms"}</Link>
        <Link href={`${prefix}/refund`}>{zh ? "退款" : "Refunds"}</Link>
        <a href="mailto:henri@henriz.dev">{zh ? "联系" : "Contact"}</a>
        <InstallLink className="footer-install" label={zh ? "立即安装" : "Install now"}/>
      </nav>
    </div>
    <div className="shell copyright">© {new Date().getFullYear()} Verbia{zh ? "。保留所有权利。" : ". All rights reserved."}</div>
  </footer>;
}
