"use client";

import Link from "next/link";
import { useState } from "react";
import { InstallLink } from "./install-link";

const links = [["How it works", "#how-it-works"], ["Features", "#features"], ["Privacy", "#privacy"], ["Pricing", "#pricing"], ["FAQ", "#faq"]];
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return <header className="site-header"><div className="header-inner"><Link className="brand" href="/"><img src="/verbia-mark.svg" alt="" width="34" height="34"/>Verbia</Link><nav className="desktop-nav" aria-label="Primary">{links.map(([label, href]) => <a href={href} key={href}>{label}</a>)}</nav><div className="header-actions"><InstallLink className="button primary compact"/><button className="menu-button" type="button" aria-expanded={open} aria-controls="mobile-nav" aria-label="Toggle navigation" onClick={() => setOpen(!open)}><span aria-hidden="true">{open ? "×" : "☰"}</span></button></div></div><nav className="mobile-nav" id="mobile-nav" aria-label="Mobile" hidden={!open}>{links.map(([label, href]) => <a href={href} key={href} onClick={() => setOpen(false)}>{label}</a>)}</nav></header>;
}
