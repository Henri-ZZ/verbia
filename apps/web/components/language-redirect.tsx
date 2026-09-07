"use client";

import { useEffect } from "react";

export type SiteLocale = "en" | "zh";

export const siteLocales: ReadonlyArray<{ value: SiteLocale; label: string; hrefLang: string }> = [
  { value: "en", label: "English", hrefLang: "en" },
  { value: "zh", label: "简体中文", hrefLang: "zh-CN" },
];

function localePath(pathname: string, locale: SiteLocale): string {
  const pathWithoutLocale = pathname === "/zh" ? "/" : pathname.replace(/^\/zh(?=\/)/, "");
  return locale === "zh" ? `/zh${pathWithoutLocale === "/" ? "" : pathWithoutLocale}` : pathWithoutLocale;
}

export function LanguageRedirect() {
  useEffect(() => {
    const preferred = window.localStorage.getItem("verbia-locale");
    if (preferred === "en") return;
    if (preferred === "zh" || navigator.languages.some(language => language.toLowerCase().startsWith("zh"))) {
      const destination = localePath(window.location.pathname, "zh");
      window.location.replace(`${destination}${window.location.search}${window.location.hash}`);
    }
  }, []);
  return null;
}

export function RememberLocale({ locale }: { locale: SiteLocale }) {
  useEffect(() => { window.localStorage.setItem("verbia-locale", locale); }, [locale]);
  return null;
}

export function LanguageSelect({ locale, className }: { locale: SiteLocale; className?: string }) {
  function changeLocale(nextLocale: SiteLocale) {
    window.localStorage.setItem("verbia-locale", nextLocale);
    const destination = localePath(window.location.pathname, nextLocale);
    window.location.assign(`${destination}${window.location.search}${window.location.hash}`);
  }
  return <label className={`language-select${className ? ` ${className}` : ""}`}>
    <svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.3 2.5 3.5 5.5 3.5 9s-1.2 6.5-3.5 9c-2.3-2.5-3.5-5.5-3.5-9S9.7 5.5 12 3Z"/></svg><span className="sr-only">{locale === "zh" ? "选择网站语言" : "Choose site language"}</span>
    <select aria-label={locale === "zh" ? "网站语言" : "Site language"} value={locale} onChange={event => changeLocale(event.target.value as SiteLocale)}>
      {siteLocales.map(item => <option value={item.value} lang={item.hrefLang} key={item.value}>{item.label}</option>)}
    </select>
  </label>;
}
