// Chrome unbinds a content script from its extension the moment the extension
// is reloaded, updated or disabled while the page stays open — routine during
// development, and it also happens on a background auto-update. From then on
// every chrome.* call throws "Extension context invalidated", and because the
// content script's listeners keep running the throw lands in whatever async
// call was in flight: an uncaught promise rejection plus a half-built UI that
// can never finish.
//
// The content script cannot be repaired from here — only a page reload installs
// a fresh copy. What it *can* do is notice, stop pretending, and tell the user.
// Everything that touches chrome.* goes through these guards so a dead context
// degrades to "no answer" instead of an exception.

export function extensionAlive(): boolean {
  try {
    // `chrome.runtime.id` is undefined once the owning extension is gone. The
    // property access itself is wrapped too: some detach orders leave
    // chrome.runtime in a state where even reading it throws.
    return typeof chrome !== "undefined" && Boolean(chrome.runtime?.id);
  } catch {
    return false;
  }
}

// sendMessage that never throws. Callers treat `undefined` as "no answer" and
// fall back to the bundled defaults, so a dead context costs a feature, not the
// whole panel.
export async function sendToBackground<T = unknown>(message: unknown): Promise<T | undefined> {
  if (!extensionAlive()) return undefined;
  try {
    return (await chrome.runtime.sendMessage(message)) as T;
  } catch {
    return undefined;
  }
}

// chrome.runtime.getURL that never throws; "" means "cannot resolve".
export function runtimeUrl(path: string): string {
  if (!extensionAlive()) return "";
  try {
    return chrome.runtime.getURL(path);
  } catch {
    return "";
  }
}

export function extensionVersion(): string {
  try {
    return chrome.runtime.getManifest().version;
  } catch {
    return "0";
  }
}

// Same source the options page and popup use to resolve the "auto" interface
// language, but safe to call after the extension has gone.
export function uiLanguage(): string {
  try {
    return chrome.i18n.getUILanguage();
  } catch {
    return navigator.language || "en";
  }
}

// Why the background force-opened the popup: the user pressed the shortcut on a
// page the browser refuses to script (store pages, browser UI), where the reply
// panel can never open. The background writes one of the popup.notice* string
// keys here and the popup shows it once, then clears it — a normal toolbar click
// must never show a stale notice.
export const ACTION_NOTICE_KEY = "actionNotice";
