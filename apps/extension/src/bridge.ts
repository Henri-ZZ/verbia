// Bridge content script that runs ONLY on the Verbia website
// (https://verbia.henriz.dev, see manifest content_scripts). After the
// extension background exchanges a sign-in code, it sends the finished
// session here; we write it into the website's localStorage under the exact
// key the web app's supabase-js client uses ("verbia-web-auth", see
// apps/web/lib/verbia-auth.ts) and notify the page. /auth-complete listens
// and redirects to the account area — so one extension sign-in also signs in
// the website.
const WEB_SESSION_KEY = "verbia-web-auth";

chrome.runtime.onMessage.addListener((message: { type?: string; session?: unknown }, _sender, sendResponse) => {
  if (message.type !== "VERBIA_STORE_WEB_SESSION" || !message.session) return false;
  try {
    localStorage.setItem(WEB_SESSION_KEY, JSON.stringify(message.session));
    window.dispatchEvent(new CustomEvent("verbia:session", { detail: true }));
    sendResponse({ ok: true });
  } catch (error) {
    sendResponse({ ok: false, error: String(error) });
  }
  return false;
});
