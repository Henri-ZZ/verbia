"use client";

import { useEffect } from "react";
import Link from "next/link";

export function LanguageRedirect() {
  useEffect(() => {
    const preferred = window.localStorage.getItem("verbia-locale");
    if (preferred === "en") return;
    if (preferred === "zh" || navigator.languages.some(language => language.toLowerCase().startsWith("zh"))) window.location.replace("/zh");
  }, []);
  return null;
}

export function RememberLocale({ locale }: { locale: "en" | "zh" }) {
  useEffect(() => { window.localStorage.setItem("verbia-locale", locale); }, [locale]);
  return null;
}

export function LocaleLink({ locale, className, children }: { locale: "en" | "zh"; className?: string; children: React.ReactNode }) {
  return <Link className={className} href={locale === "zh" ? "/zh" : "/"} hrefLang={locale === "zh" ? "zh-CN" : "en"} onClick={() => window.localStorage.setItem("verbia-locale", locale)}>{children}</Link>;
}
