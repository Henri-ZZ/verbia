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
  // Set when the platform's mark should appear in the site footer, which is the
  // one element present on every page (so it also satisfies terms that ask for
  // the badge on our homepage). Rendered as a bare row of marks, no text
  // (@see the footer's footerBadges).
  footerBadge?: boolean;
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
    group: "directories",
    footerBadge: true
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
    group: "directories",
    footerBadge: true
  },
  {
    name: "Startup Fame",
    // Badge and up-to-date link exactly as their listing hands them out; the
    // utm_source is theirs and it is how they attribute the referral.
    url: "https://startupfa.me/s/verbia?utm_source=verbia.henriz.dev",
    description: {
      en: "A curated directory of startups and products, updated daily. Verbia is a reviewed listing.",
      zh: "每日更新的创业公司与产品精选目录，Verbia 是已审核的条目。"
    },
    icon: "https://startupfa.me/badges/featured-badge.webp",
    group: "directories",
    // Their free Verified tier asks for the badge on our homepage, verbatim:
    // "add a Startup Fame badge to your homepage and pass review".
    footerBadge: true
  },
  {
    name: "Twelve Tools",
    url: "https://twelve.tools",
    description: {
      en: "Twelve new tools a day — hand-picked startups and web tools, curated daily.",
      zh: "每天精选十二个新产品与网页工具的工具目录。"
    },
    icon: "https://twelve.tools/badge0-white.svg",
    group: "directories",
    footerBadge: true
  },
  {
    name: "Wired Business",
    // No tagline of their own to quote: the page shows categories and recent
    // listings, so the description says exactly that.
    url: "https://wired.business",
    description: {
      en: "A browsable category directory of websites and tools.",
      zh: "按分类浏览网站与工具的产品目录。"
    },
    icon: "https://wired.business/badge0-white.svg",
    group: "directories",
    footerBadge: true
  },
  {
    name: "Findly.tools",
    url: "https://findly.tools/verbia-ai-reply-writing-assistant?utm_source=verbia-ai-reply-writing-assistant",
    description: {
      en: "A curated directory of SaaS and tools, with human submissions and written product reviews.",
      zh: "人工提交与产品长评结合的 SaaS 与工具精选目录。"
    },
    icon: "https://findly.tools/badges/findly-tools-badge-light.svg",
    group: "directories",
    footerBadge: true
  },
  {
    name: "LaunchNest",
    // Describes the platform only: their FAQ makes a listing public as soon as
    // the badge is installed and verified, which is what this change does, so we
    // do not claim a status we cannot point at yet.
    url: "https://launchnest.io/p/verbia",
    description: {
      en: "A launch platform and ranked directory where makers launch and the crowd votes.",
      zh: "创作者发布产品、社区投票排名的发布平台与目录。"
    },
    icon: "https://launchnest.io/badge/verbia.svg?variant=featured&theme=light",
    group: "directories",
    footerBadge: true
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
