// Bridge content script that runs ONLY on the Verbia website
// (https://verbia.henriz.dev, see manifest content_scripts). After the
// extension background exchanges a sign-in code, it asks the API for a
// one-time handoff token. This bridge redeems it into a separate web session.
// In the other direction it forwards a newly authenticated website session
// to the background, which creates a separate extension session.
const WEB_SESSION_KEY = "verbia-web-auth";
// Left by the extension when it signs out, and read here on the next load: a
// website with no tab open at that moment would otherwise never hear about it.
// @see auth/supabase.ts for the writer. The website needs no marker of its own:
// whether it is signed in is something this script can simply read.
const WEB_SIGN_OUT_KEY = "verbia-web-sign-out";
// Pages in the middle of signing in, where "no session yet" is expected rather
// than a sign-out. @see SESSION_SYNC_PATHS in background/index.ts.
const SIGN_IN_PATHS = ["/account/callback", "/account/verify"];
const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";

document.documentElement.dataset.verbiaExtension = "connected";
void chrome.storage.local.get("settings").then(({ settings }) => {
  const preference = settings?.uiLanguage as string | undefined;
  const browserLanguage = chrome.i18n.getUILanguage().toLowerCase();
  document.documentElement.dataset.verbiaLocale = preference === "zh-CN" || (preference !== "en" && browserLanguage.startsWith("zh")) ? "zh" : "en";
  window.dispatchEvent(new CustomEvent("verbia:bridge-ready"));
}).catch(() => window.dispatchEvent(new CustomEvent("verbia:bridge-ready")));

window.addEventListener("verbia:open-dashboard", () => {
  void chrome.runtime.sendMessage({ type: "OPEN_DASHBOARD" });
});

window.addEventListener("verbia:sync-extension-session", () => {
  void syncExtensionFromWebsite();
});

// This script runs at document_idle, which can beat the app's first render, so a
// sign-out is announced twice: as a data attribute the page reads when it mounts
// and as an event for a page that is already up.
function requestWebSignOut() {
  document.documentElement.dataset.verbiaWebSignOut = "1";
  window.dispatchEvent(new CustomEvent("verbia:web-sign-out"));
}

// In incognito the extension shares its storage with the normal profile while
// this window's website storage starts empty, so both readings below would say
// "signed out" and sign the user out of the profile they are actually using.
// Nothing to synchronise here either way: this window is signed out by design.
if (!chrome.extension.inIncognitoContext) {
  // The extension signed out while no page of this website was open.
  void chrome.storage.local.get(WEB_SIGN_OUT_KEY).then(data => {
    if (!data[WEB_SIGN_OUT_KEY]) return;
    void chrome.storage.local.remove(WEB_SIGN_OUT_KEY);
    requestWebSignOut();
  }).catch(() => undefined);

  // The website is signed out while the extension is signed in. That is a
  // disagreement, and the website is the side every sign-in passes through, so
  // it decides: the extension gives up a session this website no longer has.
  // Reading the state rather than leaving a record for later is what makes this
  // safe to repeat — there is no marker to fire after the user signs in again.
  try {
    if (!localStorage.getItem(WEB_SESSION_KEY) && !SIGN_IN_PATHS.includes(location.pathname)) {
      void chrome.runtime.sendMessage({ type: "WEB_SIGNED_OUT" });
    }
  } catch {
    // Storage can be unavailable in a partitioned context, and then there is no
    // way to tell a signed-out website from one we cannot read: do nothing.
  }
}

window.addEventListener("verbia:web-signed-out", () => {
  void chrome.runtime.sendMessage({ type: "WEB_SIGNED_OUT" });
});

async function syncExtensionFromWebsite() {
  try {
    const raw = localStorage.getItem(WEB_SESSION_KEY);
    const session = raw ? JSON.parse(raw) as { access_token?: string } : null;
    if (!session?.access_token) throw new Error("Website session is missing");
    const response = await chrome.runtime.sendMessage({ type: "SYNC_WEB_SIGN_IN", accessToken: session.access_token });
    window.dispatchEvent(new CustomEvent(response?.ok ? "verbia:extension-session-ready" : "verbia:extension-session-failed"));
  } catch {
    window.dispatchEvent(new CustomEvent("verbia:extension-session-failed"));
  }
}

chrome.runtime.onMessage.addListener((message: { type?: string; tokenHash?: string }, _sender, sendResponse) => {
  // The extension just signed out: this page follows it out.
  if (message.type === "WEB_SIGN_OUT") {
    requestWebSignOut();
    sendResponse({ ok: true });
    return false;
  }
  if (message.type !== "VERBIA_CREATE_WEB_SESSION" || !message.tokenHash) return false;
  void redeemWebSession(message.tokenHash).then(() => {
    document.documentElement.dataset.verbiaSessionState = "ready";
    window.dispatchEvent(new CustomEvent("verbia:session"));
    sendResponse({ ok: true });
  }).catch(error => {
    document.documentElement.dataset.verbiaSessionState = "failed";
    window.dispatchEvent(new CustomEvent("verbia:session-failed"));
    sendResponse({ ok: false, error: String(error) });
  });
  return true;
});

async function redeemWebSession(tokenHash: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) throw new Error("Supabase is not configured");
  const response = await fetch(`${SUPABASE_URL.replace(/\/+$/, "")}/auth/v1/verify`, {
    method: "POST",
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, "content-type": "application/json" },
    body: JSON.stringify({ token_hash: tokenHash, type: "email", gotrue_meta_security: {} })
  });
  if (!response.ok) throw new Error(`Web session verification returned ${response.status}`);
  const session = await response.json() as { access_token?: string; refresh_token?: string; expires_at?: number; expires_in?: number; user?: { id?: string } };
  if (!session.access_token || !session.refresh_token || !session.user?.id) throw new Error("Web session response is invalid");
  if (!session.expires_at && session.expires_in) session.expires_at = Math.floor(Date.now() / 1000) + session.expires_in;
  localStorage.setItem(WEB_SESSION_KEY, JSON.stringify(session));
}
