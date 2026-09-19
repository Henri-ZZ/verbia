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
// `icon` is the small mark that sits next to the name. Use a local asset when we
// have one (the store logos in apps/web/public), and the platform's own URL when
// the platform publishes its mark — that is then one third-party request on this
// page, which is why nothing else here is remote. Marks are sized by height and
// keep their own aspect ratio, so a square logo and a wide wordmark both work.
// `sponsored` marks a paid placement, which is the only case where the link gets
// rel="sponsored" — a normal listing is a normal link.
export type AroundTheWebGroup = "stores" | "directories" | "communities" | "mentions" | "other";

export type AroundTheWebEntry = {
  name: string;
  url: string;
  // One factual line about the placement, per site language (zh falls back to en
  // while a translation is missing). The page shows it as the link's hover
  // tooltip, not as body copy, so the list stays a list of names.
  description?: { en: string; zh?: string };
  icon?: string;
  // Optional. Headings only appear once more than one group has entries, so a
  // short list stays a plain list instead of a row of one-item sections.
  group?: AroundTheWebGroup;
  sponsored?: boolean;
};

// Display order. Groups with no entries are skipped rather than rendered empty.
const GROUP_ORDER: AroundTheWebGroup[] = ["stores", "directories", "communities", "mentions", "other"];

export const aroundTheWeb: AroundTheWebEntry[] = [
  {
    name: "Chrome Web Store",
    url: STORE_URLS.chrome,
    description: {
      en: "The Chrome listing for the Verbia extension — current version, permissions, and reviews.",
      zh: "Verbia 扩展在 Chrome 商店的页面：当前版本、权限与用户评价。"
    },
    icon: "/chrome.svg",
    group: "stores"
  },
  {
    name: "Microsoft Edge Add-ons",
    url: STORE_URLS.edge,
    description: {
      en: "The same extension, listed for Microsoft Edge.",
      zh: "同一个扩展在 Microsoft Edge 加载项商店的页面。"
    },
    icon: "/edge.svg",
    group: "stores"
  },
  {
    name: "DANG!",
    url: "https://dang.ai",
    description: {
      en: "An AI tools directory, running since 2022. Verbia's listing shows their verified badge.",
      zh: "2022 年起运营的 AI 工具目录，Verbia 的条目带有其认证标识。"
    },
    icon: "https://assets.dang.ai/badges/dang-verified-light.png",
    group: "directories"
  },
  {
    name: "Fazier",
    // Their badge snippet, kept as published — including the doubled slash in
    // /api/v1//public/, which is how their own installer writes it.
    url: "https://fazier.com/launches/verbia.henriz.dev",
    description: {
      en: "A daily product launch feed. Verbia's launch page carries their launched badge.",
      zh: "每日产品发布与发现平台，Verbia 的发布页带有其 launched 徽标。"
    },
    icon: "https://fazier.com/api/v1//public/badges/launch_badges.svg?badge_type=launched&theme=light",
    group: "directories"
  }
];

// Entries in display order, grouped only as far as the data justifies it: with a
// single populated group the caller gets one unnamed bucket (@see the page). The
// caller supplies the headings, so this stays language-neutral.
export function groupedAroundTheWeb(entries: AroundTheWebEntry[]): { group?: AroundTheWebGroup; entries: AroundTheWebEntry[] }[] {
  const populated = GROUP_ORDER.filter(group => entries.some(entry => entry.group === group));
  const ungrouped = entries.filter(entry => !entry.group);
  if (populated.length <= 1) {
    return [{ entries }];
  }
  const buckets = populated.map(group => ({
    group,
    entries: entries.filter(entry => entry.group === group)
  }));
  return ungrouped.length > 0 ? [...buckets, { entries: ungrouped }] : buckets;
}
