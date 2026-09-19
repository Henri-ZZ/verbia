import Link from "next/link";
import { aroundTheWeb, groupedAroundTheWeb, type AroundTheWebEntry, type AroundTheWebGroup } from "../lib/around-the-web";
import { LanguageRedirect, RememberLocale, type SiteLocale } from "./language-redirect";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

const copy = {
  en: {
    eyebrow: "AROUND THE WEB",
    title: "Verbia Around the Web",
    intro: "Discover Verbia on software directories, product communities, and independent platforms around the web.",
    note: "Listings are added as platforms accept Verbia. Know a directory or community we should be in?",
    noteLink: "Contact us."
  },
  zh: {
    eyebrow: "第三方收录",
    title: "在这些地方找到 Verbia",
    intro: "查看 Verbia 在软件目录、产品社区与独立平台上的收录页面。",
    note: "收录会随平台通过而陆续增加。有你希望我们出现的目录或社区？",
    noteLink: "联系我们。"
  }
};

const groupLabels: Record<SiteLocale, Record<AroundTheWebGroup, string>> = {
  en: {
    stores: "Browser stores",
    directories: "Product directories",
    communities: "Communities",
    mentions: "Reviews & mentions",
    other: "Other platforms"
  },
  zh: {
    stores: "浏览器扩展商店",
    directories: "产品目录",
    communities: "社区",
    mentions: "评测与提及",
    other: "其它平台"
  }
};

// External links open in a new tab and never pass the referrer on. sponsored is
// added only for placements we paid for (@see the entry's field).
function relFor(entry: AroundTheWebEntry): string {
  return entry.sponsored ? "noopener noreferrer sponsored" : "noopener noreferrer";
}

// One placement: a mark and a name, in a row that wraps. The description is the
// link's tooltip rather than body copy — it says what the placement is without
// turning each entry into a card.
function EntryItem({ entry, locale }: { entry: AroundTheWebEntry; locale: SiteLocale }) {
  const description = entry.description?.[locale] ?? entry.description?.en;
  return <a className="around-web-item" href={entry.url} target="_blank" rel={relFor(entry)} title={description}>
    {/* alt is empty on purpose: the name next to it already labels the link.
        lazy because a platform-hosted mark is a third-party request. */}
    {entry.icon && <img className="around-web-icon" src={entry.icon} alt="" loading="lazy" decoding="async"/>}
    <span className="around-web-label">{entry.name}</span>
  </a>;
}

// A brand page, not a link page: it says where Verbia can be found, and the
// entries come from lib/around-the-web.ts so adding a placement is one record.
export function AroundTheWeb({ locale }: { locale: SiteLocale }) {
  const t = copy[locale];
  const zh = locale === "zh";
  const prefix = zh ? "/zh" : "";
  const groups = groupedAroundTheWeb(aroundTheWeb);
  return <div lang={zh ? "zh-CN" : "en"}>
    {zh ? <RememberLocale locale="zh"/> : <LanguageRedirect/>}
    <SiteHeader locale={locale}/>
    <main id="main" className="seo-page around-web-page">
      <section className="seo-hero around-web-hero shell">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p>{t.intro}</p>
      </section>
      <section className="around-web-list shell" aria-label={t.title}>
        {groups.map((bucket, index) => <div className="around-web-bucket" key={bucket.group ?? `ungrouped-${index}`}>
          {/* Headings appear only when the data has more than one populated
              group, so a short list never reads as a set of empty categories. */}
          {bucket.group && <h2 className="around-web-group-heading">{groupLabels[locale][bucket.group]}</h2>}
          <div className="around-web-row">
            {bucket.entries.map(entry => <EntryItem entry={entry} locale={locale} key={entry.url}/>)}
          </div>
        </div>)}
      </section>
      <p className="around-web-note shell">{t.note} <Link href={`${prefix}/contact`}>{t.noteLink}</Link></p>
    </main>
    <SiteFooter locale={locale}/>
  </div>;
}
