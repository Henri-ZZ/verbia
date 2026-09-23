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
export type AroundTheWebGroup =
  | "stores"
  | "directories"
  | "communities"
  | "mentions"
  | "other";

export type AroundTheWebEntry = {
  name: string;
  url: string;
  // Optional, and not written for new entries: a platform that hands out a badge
  // is asking for the backlink, not for copy. Kept on the placements that already
  // have one — the page shows it as the link's hover tooltip, never as body copy.
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
const GROUP_ORDER: AroundTheWebGroup[] = [
  "stores",
  "directories",
  "communities",
  "mentions",
  "other",
];

export const aroundTheWeb: AroundTheWebEntry[] = [
  {
    // Snippet kept as published: the t= is their installer's own cache-buster, not
    // a value we maintain (@see the note on Fazier's badge below).
    name: "Product Hunt",
    url: "https://www.producthunt.com/products/verbia?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-verbia",
    icon: "https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1256157&theme=light&t=1789996293945",
    group: "directories",
    footerBadge: true,
  },
  {
    name: "Chrome Web Store",
    url: STORE_URLS.chrome,
    description: {
      en: "The Chrome listing for the Verbia extension — current version, permissions, and reviews.",
      zh: "Verbia 扩展在 Chrome 商店的页面：当前版本、权限与用户评价。",
    },
    icon: "/chrome.svg",
    group: "stores",
  },
  {
    name: "Microsoft Edge Add-ons",
    url: STORE_URLS.edge,
    description: {
      en: "The same extension, listed for Microsoft Edge.",
      zh: "同一个扩展在 Microsoft Edge 加载项商店的页面。",
    },
    icon: "/edge.svg",
    group: "stores",
  },
  {
    name: "DANG!",
    url: "https://dang.ai",
    description: {
      en: "An AI tools directory, running since 2022. Verbia's listing shows their verified badge.",
      zh: "2022 年起运营的 AI 工具目录，Verbia 的条目带有其认证标识。",
    },
    icon: "https://assets.dang.ai/badges/dang-verified-light.png",
    group: "directories",
    footerBadge: true,
  },
  {
    name: "Fazier",
    // Their badge snippet, kept as published — including the doubled slash in
    // /api/v1//public/, which is how their own installer writes it.
    url: "https://fazier.com/launches/verbia.henriz.dev",
    description: {
      en: "A daily product launch feed. Verbia's launch page carries their launched badge.",
      zh: "每日产品发布与发现平台，Verbia 的发布页带有其 launched 徽标。",
    },
    icon: "https://fazier.com/api/v1//public/badges/launch_badges.svg?badge_type=launched&theme=light",
    group: "directories",
    footerBadge: true,
  },
  {
    name: "Startup Fame",
    // Badge and up-to-date link exactly as their listing hands them out; the
    // utm_source is theirs and it is how they attribute the referral.
    url: "https://startupfa.me/s/verbia?utm_source=verbia.henriz.dev",
    description: {
      en: "A curated directory of startups and products, updated daily. Verbia is a reviewed listing.",
      zh: "每日更新的创业公司与产品精选目录，Verbia 是已审核的条目。",
    },
    icon: "https://startupfa.me/badges/featured-badge.webp",
    group: "directories",
    // Their free Verified tier asks for the badge on our homepage, verbatim:
    // "add a Startup Fame badge to your homepage and pass review".
    footerBadge: true,
  },
  {
    name: "Twelve Tools",
    url: "https://twelve.tools",
    description: {
      en: "Twelve new tools a day — hand-picked startups and web tools, curated daily.",
      zh: "每天精选十二个新产品与网页工具的工具目录。",
    },
    icon: "https://twelve.tools/badge0-white.svg",
    group: "directories",
    footerBadge: true,
  },
  {
    name: "Wired Business",
    // No tagline of their own to quote: the page shows categories and recent
    // listings, so the description says exactly that.
    url: "https://wired.business",
    description: {
      en: "A browsable category directory of websites and tools.",
      zh: "按分类浏览网站与工具的产品目录。",
    },
    icon: "https://wired.business/badge0-white.svg",
    group: "directories",
    footerBadge: true,
  },
  {
    name: "Findly.tools",
    url: "https://findly.tools/verbia-ai-reply-writing-assistant?utm_source=verbia-ai-reply-writing-assistant",
    description: {
      en: "A curated directory of SaaS and tools, with human submissions and written product reviews.",
      zh: "人工提交与产品长评结合的 SaaS 与工具精选目录。",
    },
    icon: "https://findly.tools/badges/findly-tools-badge-light.svg",
    group: "directories",
    footerBadge: true,
  },
  {
    name: "LaunchNest",
    // Describes the platform only: their FAQ makes a listing public as soon as
    // the badge is installed and verified, which is what this change does, so we
    // do not claim a status we cannot point at yet.
    url: "https://launchnest.io/p/verbia",
    description: {
      en: "A launch platform and ranked directory where makers launch and the crowd votes.",
      zh: "创作者发布产品、社区投票排名的发布平台与目录。",
    },
    icon: "https://launchnest.io/badge/verbia.svg?variant=featured&theme=light",
    group: "directories",
    footerBadge: true,
  },
  {
    name: "ShowMeBestAI",
    url: "https://showmebest.ai",
    description: {
      en: "An AI tools directory for productivity, business and creative work, with a featured tier.",
      zh: "面向生产力、商业与创作场景的 AI 工具目录，设有推荐位。",
    },
    icon: "https://showmebest.ai/badge/feature-badge-white.webp",
    group: "directories",
    footerBadge: true,
  },
  {
    // Text-only placement: MossAI hands out a plain link, no mark, so the footer
    // renders it as a rounded chip rather than an image (@see .footer-badge-text).
    name: "MossAI Tools",
    url: "https://mossai.org",
    description: {
      en: "An AI tool navigation directory covering writing, image, code and more, updated daily.",
      zh: "每日更新的 AI 工具导航目录，覆盖写作、绘画、编程等类别。",
    },
    group: "directories",
    footerBadge: true,
  },
  {
    name: "FoundrList",
    url: "https://www.foundrlist.com/product/verbia?utm_source=badge&utm_medium=embed",
    description: {
      en: "A weekly ranked board for startup launches, SaaS products and indie tools.",
      zh: "每周排行的创业产品、SaaS 与独立开发者作品发布榜。",
    },
    icon: "https://www.foundrlist.com/api/badge/verbia",
    group: "directories",
    footerBadge: true,
  },
  {
    // Badge reads "Launching Soon": their tool page goes public on launch day, so
    // no description yet either (@see the entry type).
    name: "Uneed",
    url: "https://www.uneed.best/tool/verbia",
    icon: "https://www.uneed.best/EMBED3.png",
    group: "directories",
    footerBadge: true,
  },
  {
    name: "neeed.directory",
    url: "https://neeed.directory",
    icon: "https://neeed.directory/badges/neeed-badge-light.svg",
    group: "directories",
    footerBadge: true,
  },
  {
    name: "Smol Launch",
    url: "https://smollaunch.com",
    icon: "https://smollaunch.com/badges/featured.svg",
    group: "directories",
    footerBadge: true,
  },
  {
    name: "DeepLaunch.io",
    url: "https://deeplaunch.io",
    icon: "https://deeplaunch.io/badge/badge_light.svg",
    group: "directories",
    footerBadge: true,
  },
  {
    name: "LaunchIgniter",
    url: "https://launchigniter.com/product/verbia?ref=badge-verbia",
    icon: "https://launchigniter.com/api/badge/verbia?theme=light",
    group: "directories",
    footerBadge: true,
  },
  {
    name: "Launch Llama Tools",
    url: "https://tools.launchllama.co?utm_source=badge&utm_medium=referral",
    icon: "https://tools.launchllama.co/featured-badge-white.jpg?v=5",
    group: "directories",
    footerBadge: true,
  },
  {
    name: "Turbo0",
    url: "https://turbo0.com/item/verbia",
    icon: "https://img.turbo0.com/badge-listed-light.svg",
    group: "directories",
    footerBadge: true,
  },
  {
    name: "OpenHunts Club",
    url: "https://openhunts.com",
    icon: "https://cdn.openhunts.com/badges/club.webp",
    group: "directories",
    footerBadge: true,
  },
  {
    name: "Startup Fast",
    url: "https://startupfa.st",
    icon: "https://startupfa.st/images/badges/powered-by-light.svg",
    group: "directories",
    footerBadge: true,
  },
  {
    name: "Aura++",
    url: "https://auraplusplus.com/projects/verbia-browser-writing-assistant",
    icon: "https://auraplusplus.com/images/badges/featured-on-light.svg",
    group: "directories",
    footerBadge: true,
  },
  {
    name: "StartupBase",
    url: "https://startupbase.io/products/verbia?utm_source=startupbase&utm_medium=badge&utm_campaign=launch-badge-light",
    icon: "https://statics.startupbase.io/site/badges/launched-on-sb.svg",
    group: "directories",
    footerBadge: true,
  },
  {
    name: "NxGn Tools",
    url: "https://www.nxgntools.com/tools/verbia?utm_source=verbia",
    icon: "https://www.nxgntools.com/api/embed/verbia?type=FEATURED_ON&hideUpvotes=true",
    group: "directories",
    footerBadge: true,
  },
  {
    name: "LaunchBuff",
    url: "https://launchbuff.com/products/verbia-ph1k1a",
    icon: "https://launchbuff.com/badge-featured-light.svg",
    group: "directories",
    footerBadge: true,
  },
  {
    // Badge and link exactly as their snippet hands them out — including the
    // utm_source, which is how they attribute the referral.
    name: "KittyLaunch",
    url: "https://kittylaunch.com/p/verbia?utm_source=badge",
    icon: "https://kittylaunch.com/api/public/badges/launch_badge.svg?style=pill&theme=light",
    group: "directories",
    footerBadge: true,
  },
  {
    name: "SellWithBoost",
    url: "https://sellwithboost.com",
    icon: "hhttps://sellwithboost.com/badge/listing.svg",
    group: "directories",
    footerBadge: true,
  },
];

// Entries in display order, grouped only as far as the data justifies it: with a
// single populated group the caller gets one unnamed bucket (@see the page). The
// caller supplies the headings, so this stays language-neutral.
export function groupedAroundTheWeb(
  entries: AroundTheWebEntry[],
): { group?: AroundTheWebGroup; entries: AroundTheWebEntry[] }[] {
  const populated = GROUP_ORDER.filter((group) =>
    entries.some((entry) => entry.group === group),
  );
  const ungrouped = entries.filter((entry) => !entry.group);
  if (populated.length <= 1) {
    return [{ entries }];
  }
  const buckets = populated.map((group) => ({
    group,
    entries: entries.filter((entry) => entry.group === group),
  }));
  return ungrouped.length > 0 ? [...buckets, { entries: ungrouped }] : buckets;
}
