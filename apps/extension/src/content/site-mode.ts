import type { SiteAdapter } from "@verbia/shared";

// How Verbia behaves on a page. Three modes, one pipeline: the collector, the
// identification endpoint, the prompt and the panel are the same everywhere — a
// mode only decides how the panel is summoned, where it is placed, what fills the
// context before the user acts, and what a request reports as its platform.
//
//   auto      — a site with an adapter of its own (Reddit, Gmail, Outlook, QQ
//               Mail): the adapter reads the page and the panel opens itself.
//   email     — every other webmail host: there is no site-specific read at all,
//               so the context comes from an explicit identification instead.
//               Manual summon, floating panel, mail wording.
//   universal — everywhere else: any editor, nothing assumed, selected text only.
export type SiteMode = "auto" | "email" | "universal";

// The webmail hosts that get email mode.
//
// A curated list on purpose. It is data, not DOM code: adding a provider is one
// line, needs no knowledge of that provider's markup, and cannot read a page
// wrong — email mode never interprets the page itself, it hands the region to a
// model. The cost of a missing host is only that the panel falls back to
// universal mode, which still works (manual summon, AI identification) with
// less mail-shaped wording; the cost of a wrong host is a floating panel that
// says "Email" on a page that is not one, which is why nothing is inferred from
// page contents.
//
// Nothing is added to the manifest for these hosts: email mode is summoned by the
// shortcut or the toolbar button, and the background injects the content script
// on demand (activeTab), so no host permission is granted up front.
const EMAIL_HOSTS = [
  "mail.aol.com",
  "app.fastmail.com",
  "www.fastmail.com",
  "www.gmx.com",
  "www.gmx.net",
  "mail.163.com",
  "mail.126.com",
  "mail.yeah.net",
  "webmail.189.cn",
  "mail.189.cn",
  "mail.sina.com.cn",
  "mail.sohu.com",
  "mail.aliyun.com",
  "mail.qq.com",
  "www.icloud.com",
  "mailbox.org",
  "posteo.de",
  "mail.naver.com",
  "mail.daum.net",
  "mail.proton.me",
  "mail.tuta.com",
  "mail.yandex.com",
  "mail.yandex.ru",
  "mail.yahoo.com",
  "mail.yahoo.co.jp",
  "mail.zoho.com",
  "mail.zoho.eu",
  "mail.zoho.in"
];

export function isEmailHost(hostname: string): boolean {
  return EMAIL_HOSTS.includes(hostname.toLowerCase());
}

// An adapter that claims the page always wins: email mode exists for the hosts
// Verbia has no read for, never to override one it does have.
export function resolveSiteMode(adapter: SiteAdapter, url: URL): SiteMode {
  if (adapter.id !== "universal") return "auto";
  return isEmailHost(url.hostname) ? "email" : "universal";
}

// Whether the page speaks mail. The panel's own words — "subject", "original
// message" rather than "post title", "target comment" — follow this and not the
// relation the model reported: a task it could not classify still leaves a subject
// and a message on screen, and the reader is checking exactly that read, so the
// vocabulary must not change under them when the classification comes back unknown.
export function isMailSite(mode: SiteMode, adapterId: string): boolean {
  return mode === "email" || adapterId === "gmail" || adapterId === "outlook" || adapterId === "qqmail";
}
