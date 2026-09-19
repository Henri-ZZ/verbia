import Link from "next/link";
import { aroundTheWeb, groupedAroundTheWeb, type AroundTheWebEntry } from "../lib/around-the-web";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

// External links open in a new tab and never pass the referrer on. sponsored is
// added only for placements we paid for (@see the entry's field).
function relFor(entry: AroundTheWebEntry): string {
  return entry.sponsored ? "noopener noreferrer sponsored" : "noopener noreferrer";
}

function EntryCard({ entry }: { entry: AroundTheWebEntry }) {
  return <a className="around-web-card" href={entry.url} target="_blank" rel={relFor(entry)}>
    <span className="around-web-copy">
      <h2 className="around-web-name">{entry.name}</h2>
      {entry.description && <p className="around-web-description">{entry.description}</p>}
      {/* Only when the platform asks for its mark. alt is empty on purpose: the
          card already names the platform, so the badge adds nothing to the link's
          accessible name. lazy because this is the one third-party asset here. */}
      {entry.badge && <img className="around-web-badge" src={entry.badge} alt="" loading="lazy" decoding="async"/>}
    </span>
    <span className="around-web-go" aria-hidden="true">↗</span>
  </a>;
}

// A brand page, not a link page: it says where Verbia can be found, and the
// entries come from lib/around-the-web.ts so adding a placement is one record.
export function AroundTheWeb() {
  const groups = groupedAroundTheWeb(aroundTheWeb);
  return <>
    <SiteHeader localizedPage={false}/>
    <main id="main" className="seo-page around-web-page">
      <section className="seo-hero around-web-hero shell">
        <p className="eyebrow">AROUND THE WEB</p>
        <h1>Verbia Around the Web</h1>
        <p>Discover Verbia on software directories, product communities, and independent platforms around the web.</p>
      </section>
      <section className="around-web-list shell" aria-label="Places Verbia appears">
        {groups.map((bucket, index) => <div className="around-web-bucket" key={bucket.group ?? `ungrouped-${index}`}>
          {/* Headings appear only when the data has more than one populated
              group, so a short list never reads as a set of empty categories. */}
          {bucket.label && <h2 className="around-web-group-heading">{bucket.label}</h2>}
          {bucket.entries.map(entry => <EntryCard entry={entry} key={entry.url}/>)}
        </div>)}
      </section>
      <p className="around-web-note shell">Listings are added as platforms accept Verbia. Know a directory or community we should be in? <Link href="/contact">Contact us</Link>.</p>
    </main>
    <SiteFooter/>
  </>;
}
