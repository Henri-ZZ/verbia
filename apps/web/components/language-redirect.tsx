"use client";

import { useEffect, useId, useRef, useState } from "react";

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

export function LanguageSelect({ locale, className, fallbackToLocaleHome = false }: { locale: SiteLocale; className?: string; fallbackToLocaleHome?: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const current = siteLocales.find(item => item.value === locale) ?? siteLocales[0];

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (open) rootRef.current?.querySelector<HTMLButtonElement>(`[data-locale="${locale}"]`)?.focus();
  }, [open, locale]);

  function changeLocale(nextLocale: SiteLocale) {
    setOpen(false);
    if (nextLocale === locale) return;
    window.localStorage.setItem("verbia-locale", nextLocale);
    const destination = fallbackToLocaleHome ? (nextLocale === "zh" ? "/zh" : "/") : localePath(window.location.pathname, nextLocale);
    window.location.assign(`${destination}${window.location.search}${window.location.hash}`);
  }

  function moveFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const options = Array.from(rootRef.current?.querySelectorAll<HTMLButtonElement>("[role=option]") ?? []);
    if (!options.length) return;
    const active = options.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "Home") options[0].focus();
    else if (event.key === "End") options.at(-1)?.focus();
    else if (event.key === "ArrowDown") options[(active + 1 + options.length) % options.length].focus();
    else options[(active - 1 + options.length) % options.length].focus();
  }

  return <div ref={rootRef} className={`language-select${open ? " is-open" : ""}${className ? ` ${className}` : ""}`} onKeyDown={moveFocus}>
    <button ref={triggerRef} className="language-trigger" type="button" aria-label={locale === "zh" ? "选择网站语言" : "Choose site language"} aria-haspopup="listbox" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen(value => !value)}>
      <svg className="language-globe" aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.3 2.5 3.5 5.5 3.5 9s-1.2 6.5-3.5 9c-2.3-2.5-3.5-5.5-3.5-9S9.7 5.5 12 3Z"/></svg>
      <span>{current.label}</span>
      <svg className="language-chevron" aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m4 6 4 4 4-4"/></svg>
    </button>
    {open && <div className="language-menu" id={menuId} role="listbox" aria-label={locale === "zh" ? "网站语言" : "Site language"} aria-activedescendant={`language-option-${locale}`}>
      <p>{locale === "zh" ? "选择语言" : "Choose language"}</p>
      {siteLocales.map(item => <button id={`language-option-${item.value}`} data-locale={item.value} type="button" role="option" aria-selected={item.value === locale} lang={item.hrefLang} key={item.value} onClick={() => changeLocale(item.value)}>
        <span>{item.label}</span>
        {item.value === locale && <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 8 3 3 7-7"/></svg>}
      </button>)}
    </div>}
  </div>;
}
