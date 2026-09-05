import { DEFAULT_SETTINGS, UI_STRINGS, resolveUiLang, type UiLang, type UserSettings } from "@verbia/shared";
import { authEnabled, getSupabase } from "./supabase";

// Landing page for both auth round-trips:
//  - Google PKCE:   auth.html?code=<authorization code>
//  - Magic link:    auth.html#access_token=...&refresh_token=...
// Both flows persist the session through the shared chrome.storage adapter,
// so the background/options/popup pick it up without any extra message.
async function main() {
  const status = document.querySelector<HTMLElement>("#auth-status");
  const close = document.querySelector<HTMLAnchorElement>("#auth-close");
  if (!status || !close) return;

  const { settings } = await chrome.storage.local.get("settings");
  const stored = (settings ?? DEFAULT_SETTINGS) as UserSettings;
  const lang: UiLang = resolveUiLang(stored.uiLanguage, chrome.i18n.getUILanguage());
  const strings = UI_STRINGS[lang];
  const t = (key: string) => strings[key] ?? key;

  document.documentElement.lang = lang;
  document.title = `Verbia — ${t("account.title")}`;
  close.textContent = t("auth.close");
  close.addEventListener("click", event => {
    event.preventDefault();
    void closeTab();
  });

  const fail = (message?: string) => {
    status.textContent = message ?? t("auth.error");
    close.hidden = false;
    void closeTabLater();
  };

  if (!authEnabled) {
    fail();
    return;
  }

  try {
    const url = new URL(location.href);
    // Supabase bounces failed flows back here with ?error=…&error_code=… (and
    // repeats the pair in the fragment). Recognise them so the page explains
    // what happened instead of falling into the generic missing-token branch.
    const supabaseError =
      url.searchParams.get("error_code") ?? new URLSearchParams(location.hash.replace(/^#/, "")).get("error_code");
    if (supabaseError) {
      const expired = supabaseError === "otp_expired" || supabaseError === "flow_state_expired";
      fail(expired ? t("auth.linkExpired") : t("auth.error"));
      return;
    }
    const code = url.searchParams.get("code");
    const client = getSupabase();
    if (code) {
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (error) throw error;
    } else {
      const params = new URLSearchParams(location.hash.replace(/^#/, ""));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      // Magic links carry both tokens in the URL fragment; without a refresh
      // token the session cannot outlive the access token, so bail out.
      if (!accessToken || !refreshToken) throw new Error("missing session tokens");
      const { error } = await client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
      if (error) throw error;
    }
    status.textContent = t("auth.success");
    close.hidden = false;
    void closeTabLater();
  } catch (error) {
    console.error("Verbia sign-in could not be completed", error);
    fail();
  }
}

function closeTabLater() {
  window.setTimeout(() => { void closeTab(); }, 2_500);
}

async function closeTab() {
  try {
    const tab = await chrome.tabs.getCurrent();
    if (tab?.id) await chrome.tabs.remove(tab.id);
  } catch {
    // The tab stays open with its success/error message and close button.
  }
}

void main();
