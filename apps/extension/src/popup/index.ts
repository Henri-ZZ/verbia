import { DEFAULT_SETTINGS, UI_STRINGS, resolveUiLang } from "@verbia/shared";

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
