// The sites Verbia supports, and the access model they run under.
//
// A host in `host_permissions` — and equally a match pattern in
// `content_scripts` — makes Chrome show "Read and change your data on …" for
// that site in the install dialog, before the user has ever opened it. Listing
// ten sites produced exactly the wall of domains that made people stop and
// wonder what the extension is doing with them. So every supported site lives
// in `optional_host_permissions` instead: nothing is asked for until the user
// wants Verbia to work there, and each grant covers one site.
//
// None of this is free. An origin granted at runtime injects nothing by itself
// — with no declarative entry there is no script to run — so the content script
// has to be registered at runtime as well. Chrome persists a registration on
// its own, but a registration without a grant injects nothing and a grant
// without a registration does nothing, so both are kept in step from one place
// (syncSiteScripts) rather than from the two call sites that could drift.

/** One supported site: what to ask Chrome for, and how to inject once granted. */
export type SiteDefinition = {
  /** Id of the registered content script. Stable — it is what revocation removes. */
  id: string;
  /** The host patterns the grant covers. */
  origins: string[];
  /**
   * The site's own mark, shown next to its name in the popup (@see
   * popup/index.ts). Optional on purpose: a site without artwork is still a
   * supported site, it just renders without a logo.
   */
  logo?: string;
  /** Every frame: some sites render the editor beside the text, not inside it. */
  allFrames?: boolean;
  /**
   * Also inject into frames a site builds without a URL of their own
   * (about:blank / about:srcdoc) using the parent's origin — the MV3
   * replacement for content_scripts' match_about_blank, and the reason a
   * legacy frameset webmail editor can be reached at all.
   */
  matchOriginAsFallback?: boolean;
};

export const SUPPORTED_SITES: readonly SiteDefinition[] = [
  {
    id: "reddit",
    origins: ["https://www.reddit.com/*", "https://old.reddit.com/*"],
    logo: "assets/reddit.svg"
  },
  {
    id: "gmail",
    origins: ["https://mail.google.com/*"],
    allFrames: true,
    matchOriginAsFallback: true,
    logo: "assets/gmail.png"
  },
  { id: "exmail", origins: ["https://exmail.qq.com/*"], allFrames: true, matchOriginAsFallback: true },
  {
    id: "outlook",
    origins: [
      "https://outlook.live.com/*",
      "https://outlook.office.com/*",
      "https://outlook.com/*",
      "https://www.outlook.com/*"
    ],
    logo: "assets/outlook.svg"
  },
  { id: "qq-mail", origins: ["https://wx.mail.qq.com/*"], logo: "assets/qqmail.png" },
  { id: "whatsapp", origins: ["https://web.whatsapp.com/*"], logo: "assets/whatsapp-icon.svg" }
];

const CONTENT_SCRIPT_FILE = "content.js";

/**
 * The site a page belongs to, if Verbia supports it at all. Match patterns are
 * not exposed to scripts, so the check mirrors them (same subset the project
 * uses everywhere: an exact host, http(s) only).
 */
export function siteForUrl(url: string | undefined): SiteDefinition | undefined {
  if (!url) return undefined;
  let host: string;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return undefined;
    host = parsed.hostname.toLowerCase();
  } catch {
    return undefined;
  }
  return SUPPORTED_SITES.find(site => site.origins.some(origin => hostOf(origin) === host));
}

/** The single pattern Chrome can grant for a page, in the site's own spelling. */
export function grantPatternFor(site: SiteDefinition, url: string): string | undefined {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return undefined;
  }
  return site.origins.find(origin => hostOf(origin) === host);
}

function hostOf(pattern: string): string {
  const separator = pattern.indexOf("://");
  const rest = separator === -1 ? pattern : pattern.slice(separator + 3);
  const slash = rest.indexOf("/");
  return (slash === -1 ? rest : rest.slice(0, slash)).toLowerCase();
}

/**
 * Whether the user has granted this exact host pattern.
 *
 * A grant covers the pattern that was asked for, not the site: the popup asks
 * for the host in front of the user, so www.reddit.com can be enabled while
 * old.reddit.com is not. Asking `contains({ origins: site.origins })` for the
 * whole set answers "are all of them granted", which reads as "not enabled"
 * after a perfectly successful grant — and then nothing registers and the
 * panel never appears on its own.
 */
export async function hasPatternAccess(pattern: string): Promise<boolean> {
  return chrome.permissions.contains({ origins: [pattern] });
}

/** The site's patterns the user has actually granted, in registry order. */
export async function grantedOrigins(site: SiteDefinition): Promise<string[]> {
  const granted = await Promise.all(site.origins.map(pattern => hasPatternAccess(pattern)));
  return site.origins.filter((_, index) => granted[index] === true);
}

/**
 * Brings registered content scripts in line with the grants the profile
 * actually has: granted sites get their script registered, revoked sites lose
 * it. Chrome keeps registrations across restarts, but the grant is the thing
 * that decides whether they can inject, and the two can disagree after a user
 * revokes access from chrome://extensions — which is exactly what this fixes.
 */
export async function syncSiteScripts(): Promise<void> {
  let registered: Map<string, string[]>;
  try {
    registered = new Map((await chrome.scripting.getRegisteredContentScripts()).map(script => [script.id, script.matches ?? []]));
  } catch (error) {
    // Chrome 120+ has this API; a failure here means scripting is unavailable
    // (rare) and the summon path below still works without registered scripts.
    console.debug("[verbia] cannot read registered content scripts", error);
    return;
  }
  for (const site of SUPPORTED_SITES) {
    const granted = await grantedOrigins(site);
    const current = registered.get(site.id);
    try {
      if (granted.length && !current) {
        // Only the granted patterns: registering a pattern the user has not
        // granted is refused outright ("Invalid host permissions"), and the
        // rest of the site can be enabled later, host by host.
        await chrome.scripting.registerContentScripts([{
          id: site.id,
          matches: granted,
          js: [CONTENT_SCRIPT_FILE],
          runAt: "document_idle",
          allFrames: site.allFrames === true,
          matchOriginAsFallback: site.matchOriginAsFallback === true,
          persistAcrossSessions: true
        }]);
      } else if (!granted.length && current) {
        await chrome.scripting.unregisterContentScripts({ ids: [site.id] });
      } else if (granted.length && current && current.join("\n") !== granted.join("\n")) {
        // Another host of the same site was enabled afterwards.
        await chrome.scripting.updateContentScripts([{ id: site.id, matches: granted }]);
      }
    } catch (error) {
      // Registering an id that exists, or unregistering one that does not, is a
      // race with another sync — harmless, and the next sync settles it.
      console.debug("[verbia] site script sync skipped", site.id, error);
    }
  }
}

/** Keeps the registrations in step for the rest of the session. */
export function watchSiteAccess(): void {
  chrome.permissions.onAdded.addListener(() => { void syncSiteScripts(); });
  chrome.permissions.onRemoved.addListener(() => { void syncSiteScripts(); });
}
