"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { InstallLink } from "./install-link";
import { LanguageSelect } from "./language-redirect";
import { AccountButton } from "./account-button";

const nav = {
  en: [["How it works", "#how-it-works"], ["Features", "#features"], ["Guide", "/getting-started"], ["Pricing", "#pricing"], ["FAQ", "#faq"]],
  zh: [["使用方式", "#how-it-works"], ["功能", "#features"], ["使用教程", "/zh/getting-started"], ["套餐", "#pricing"], ["常见问题", "#faq"]]
};
export function SiteHeader({ locale = "en", localizedPage = true }: { locale?: "en" | "zh"; localizedPage?: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const links = nav[locale];
  const chinese = locale === "zh";
  const home = chinese ? "/zh" : "/";
  const onHome = pathname === home;
  const hrefFor = (href: string) => href.startsWith("#") ? (onHome ? href : `${home}${href}`) : href;
  return <header className="site-header"><div className="header-inner"><Link className="brand" href={home}><img className="brand-logo" src="/verbia-horizontal-logo.svg" alt="Verbia"/></Link><nav className="desktop-nav" aria-label={chinese ? "主导航" : "Primary"}>{links.map(([label, href]) => <a href={hrefFor(href)} key={href}>{label}</a>)}</nav><div className="header-actions"><InstallLink className="button primary compact" label={chinese ? "立即安装" : "Install now"}/><LanguageSelect locale={locale} fallbackToLocaleHome={!localizedPage}/><AccountButton locale={locale}/><button className="menu-button" type="button" aria-expanded={open} aria-controls="mobile-nav" aria-label={chinese ? "切换导航菜单" : "Toggle navigation"} onClick={() => setOpen(!open)}><span aria-hidden="true">{open ? "×" : "☰"}</span></button></div></div><nav className="mobile-nav" id="mobile-nav" aria-label={chinese ? "移动端导航" : "Mobile"} hidden={!open}>{links.map(([label, href]) => <a href={hrefFor(href)} key={href} onClick={() => setOpen(false)}>{label}</a>)}</nav></header>;
}
