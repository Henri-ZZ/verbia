import { STORE_URLS } from "./browser-stores";

// Where Verbia appears on platforms we do not own.
//
// Adding a placement is adding one record here — nothing else in the page needs
// to change. Two rules for what may go in:
//
//   1. It has to exist. No planned, requested, or "submitted" listings, and no
//      counts, ratings, or "featured by" claims we cannot point at.
//   2. Name it the way the platform names itself.
//
// `badge` is only for platforms that require their own mark on a placement; a
// plain name and link is the default. Badges are rendered at a fixed 40px height
// with their own aspect ratio, so both a square icon and a wide "verified"
// wordmark work — point the field at the URL the platform hands out, which is
// normally their own CDN (that is one third-party request on this page, and only
// because the placement requires it). `sponsored` marks a paid placement, which
// is the only case where the link gets rel="sponsored" — a normal listing is a
// normal link.
export type AroundTheWebGroup = "directories" | "communities" | "mentions";

export type AroundTheWebEntry = {
  name: string;
  url: string;
  description?: string;
  badge?: string;
  // Optional. Headings only appear once more than one group has entries, so a
  // short list stays a plain list instead of a row of one-item sections.
  group?: AroundTheWebGroup;
  sponsored?: boolean;
};

export const GROUP_LABELS: Record<AroundTheWebGroup, string> = {
  directories: "Product directories",
  communities: "Communities",
  mentions: "Reviews & mentions"
};

const GROUP_ORDER: AroundTheWebGroup[] = ["directories", "communities", "mentions"];

export const aroundTheWeb: AroundTheWebEntry[] = [
  {
    name: "DANG!",
    url: "https://dang.ai",
    description: "An AI tools directory, running since 2022. Verbia's listing shows their verified badge.",
    badge: "https://assets.dang.ai/badges/dang-verified-light.png",
    group: "directories"
  },
  {
    name: "Chrome Web Store",
    url: STORE_URLS.chrome,
    description: "The Chrome listing for the Verbia extension — current version, permissions, and reviews."
  },
  {
    name: "Microsoft Edge Add-ons",
    url: STORE_URLS.edge,
    description: "The same extension, listed for Microsoft Edge."
  }
];

// Entries in display order, grouped only as far as the data justifies it: with a
// single populated group the caller gets one unnamed bucket (@see the page).
export function groupedAroundTheWeb(entries: AroundTheWebEntry[]): { group?: AroundTheWebGroup; label?: string; entries: AroundTheWebEntry[] }[] {
  const populated = GROUP_ORDER.filter(group => entries.some(entry => entry.group === group));
  const ungrouped = entries.filter(entry => !entry.group);
  if (populated.length <= 1) {
    return [{ entries }];
  }
  const buckets = populated.map(group => ({
    group,
    label: GROUP_LABELS[group],
    entries: entries.filter(entry => entry.group === group)
  }));
  return ungrouped.length > 0 ? [...buckets, { entries: ungrouped }] : buckets;
}
