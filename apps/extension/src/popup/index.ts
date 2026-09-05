import { DEFAULT_SETTINGS, UI_STRINGS, resolveUiLang, type AuthState } from "@verbia/shared";

async function applyLanguage() {
  const { settings } = await chrome.storage.local.get("settings");
  const value = (settings ?? DEFAULT_SETTINGS) as typeof DEFAULT_SETTINGS;
  const lang = resolveUiLang(value.uiLanguage, chrome.i18n.getUILanguage());
  const strings = UI_STRINGS[lang];
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll<HTMLElement>("[data-i18n]")) {
    const text = strings[el.dataset.i18n ?? ""];
    if (text) el.textContent = text;
  }
}

void applyLanguage();

document.querySelector<HTMLButtonElement>("#open-settings")?.addEventListener("click", () => {
  void chrome.runtime.openOptionsPage();
});

// ---- Sign-in state row -----------------------------------------------------
// The popup never talks to Supabase directly: the background owns the session
// and answers GET_AUTH_STATE / SIGN_OUT.

async function renderAuth() {
  const row = document.querySelector<HTMLElement>("#auth-row");
  if (!row) return;
  const { settings } = await chrome.storage.local.get("settings");
  const value = (settings ?? DEFAULT_SETTINGS) as typeof DEFAULT_SETTINGS;
  const lang = resolveUiLang(value.uiLanguage, chrome.i18n.getUILanguage());
  const strings = UI_STRINGS[lang];
  const response = await chrome.runtime.sendMessage({ type: "GET_AUTH_STATE" });
  const state = (response?.ok ? response.data : { signedIn: false }) as AuthState;

  row.textContent = "";
  row.hidden = false;

  const label = document.createElement("span");
  label.className = "auth-status";
  label.textContent = state.signedIn ? (state.email ?? "") : (strings["account.signedOut"] ?? "Not signed in");

  const button = document.createElement("button");
  button.type = "button";
  button.className = "auth-link";
  if (state.signedIn) {
    button.textContent = strings["account.signOut"] ?? "Sign out";
    button.addEventListener("click", async () => {
      await chrome.runtime.sendMessage({ type: "SIGN_OUT" });
      await renderAuth();
    });
  } else {
    button.textContent = strings["account.signIn"] ?? "Sign in";
    button.addEventListener("click", () => { void chrome.runtime.openOptionsPage(); });
  }
  row.append(label, button);
}

void renderAuth();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.settings) void renderAuth();
});
