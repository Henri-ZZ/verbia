"use client";

import Link from "next/link";
import { useState } from "react";
import { InstallLink } from "./install-link";
import { LocaleLink } from "./language-redirect";
import { AccountButton } from "./account-button";

const nav = {
  en: [["How it works", "#how-it-works"], ["Features", "#features"], ["Privacy", "#privacy"], ["Pricing", "#pricing"], ["FAQ", "#faq"]],
  zh: [["使用方式", "#how-it-works"], ["功能", "#features"], ["隐私", "#privacy"], ["套餐", "#pricing"], ["常见问题", "#faq"]]
};
export function SiteHeader({ locale = "en" }: { locale?: "en" | "zh" }) {
  const [open, setOpen] = useState(false);
  const links = nav[locale];
  const chinese = locale === "zh";
  return <header className="site-header"><div className="header-inner"><Link className="brand" href={chinese ? "/zh" : "/"}><img src="/verbia-mark.svg" alt="" width="34" height="34"/>Verbia</Link><nav className="desktop-nav" aria-label={chinese ? "主导航" : "Primary"}>{links.map(([label, href]) => <a href={href} key={href}>{label}</a>)}</nav><div className="header-actions"><LocaleLink className="language-link" locale={chinese ? "en" : "zh"}>{chinese ? "EN" : "中文"}</LocaleLink><InstallLink className="button primary compact" label={chinese ? "立即安装" : "Install now"}/><AccountButton locale={locale}/><button className="menu-button" type="button" aria-expanded={open} aria-controls="mobile-nav" aria-label={chinese ? "切换导航菜单" : "Toggle navigation"} onClick={() => setOpen(!open)}><span aria-hidden="true">{open ? "×" : "☰"}</span></button></div></div><nav className="mobile-nav" id="mobile-nav" aria-label={chinese ? "移动端导航" : "Mobile"} hidden={!open}>{links.map(([label, href]) => <a href={href} key={href} onClick={() => setOpen(false)}>{label}</a>)}<LocaleLink className="mobile-language" locale={chinese ? "en" : "zh"}>{chinese ? "English" : "简体中文"}</LocaleLink></nav></header>;
}
