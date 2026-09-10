// Handing open tabs a fresh content script after the extension updates.
//
// Chrome cannot unload a content script that a page is already running: on an
// update (or a developer reload) it only cuts the script's extension bindings.
// Every open tab therefore keeps an orphan whose chrome.* calls throw
// "Extension context invalidated" — for the user that reads as "the panel does
// not open any more", with nothing on screen explaining why. Chrome's update
// lifecycle guidance is to migrate in the service worker's onInstalled handler,
// which is what this file does: the tab gets a working instance and nobody has
// to know that refreshing the page was ever an option.
//
// Two details make re-injection non-trivial:
//   - content.js bails at `if (!window.__verbiaLoaded)`, and the orphan already
//     set that flag (it lives on the page's window, not in the extension). The
//     injector is the one deciding the page needs a new instance, so it clears
//     the marker first — otherwise the injection is a silent no-op.
//   - the orphan may still have its panel mounted. The fresh instance drops the
//     leftover shell and marks itself current so the orphan stops advising a
//     refresh on a page where the panel now works (see content/index.ts).

type ContentScriptEntry = { matches?: string[]; js?: string[]; allFrames?: boolean };

// Chrome exposes no API to test a match pattern, and this list must not drift
// from manifest.json (sites keep getting added), so the patterns are read from
// the manifest itself and matched here. Only the subset this project uses is
// supported: an exact or leading-wildcard host, plus a "" / "/*" / trailing-"/*"
// path.
export function matchesPattern(pattern: string, url: URL): boolean {
  const separator = pattern.indexOf("://");
  if (separator === -1) return false;
  const scheme = pattern.slice(0, separator);
  const rest = pattern.slice(separator + 3);
  const slash = rest.indexOf("/");
  const host = (slash === -1 ? rest : rest.slice(0, slash)).toLowerCase();
  const path = slash === -1 ? "" : rest.slice(slash);
  if (scheme !== "*" && scheme !== url.protocol.slice(0, -1)) return false;
  const hostname = url.hostname.toLowerCase();
  if (host.startsWith("*.")) {
    // "*." in a match pattern covers the domain itself as well as subdomains.
    if (hostname !== host.slice(2) && !hostname.endsWith(host.slice(1))) return false;
  } else if (hostname !== host) return false;
  if (path === "" || path === "/*") return true;
  if (path.endsWith("/*")) return url.pathname.startsWith(path.slice(0, -1));
  return url.pathname === path;
}

// Replaces whatever content script instance the tab is running with a fresh one.
export async function reloadContentScript(tabId: number, files: string[], allFrames = false): Promise<void> {
  const target = { tabId, allFrames };
  // `func` runs in the page's isolated world — the same one the content script
  // uses — so it can drop the marker the orphan left behind.
  await chrome.scripting.executeScript({ target, func: () => { window.__verbiaLoaded = false; } });
  await chrome.scripting.executeScript({ target, files });
}

// Re-injects every content script this extension ships into every open tab it
// belongs in. Returns how many tab/file pairs were handed a new instance.
export async function migrateOpenTabs(): Promise<number> {
  const entries = (chrome.runtime.getManifest().content_scripts ?? []) as ContentScriptEntry[];
  if (!entries.length) return 0;
  let migrated = 0;
  for (const tab of await chrome.tabs.query({})) {
    if (tab.id === undefined || !tab.url) continue;
    let url: URL;
    try { url = new URL(tab.url); }
    catch { continue; } // chrome://, about:, view-source: — nothing to migrate.
    for (const entry of entries) {
      const files = entry.js ?? [];
      if (!files.length || !(entry.matches ?? []).some(pattern => matchesPattern(pattern, url))) continue;
      try {
        await reloadContentScript(tab.id, files, entry.allFrames === true);
        migrated += 1;
      } catch (error) {
        // Tabs that cannot be scripted (discarded, mid-navigation, frames that
        // disappeared between the two calls) are expected. One failure must not
        // stop the rest of the migration.
        console.debug("[verbia] could not refresh the content script on", tab.url, error);
      }
    }
  }
  return migrated;
}
