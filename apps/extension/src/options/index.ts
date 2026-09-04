import { DEFAULT_SETTINGS, LENGTH_VALUES, REPLY_LANGUAGE_OPTIONS, TONE_VALUES, UI_LANGUAGE_OPTIONS, UI_STRINGS, VOICE_LANGUAGE_OPTIONS, resolveUiLang, type UiLang, type UserSettings } from "@verbia/shared";

const form = document.querySelector<HTMLFormElement>("#settings")!;
const status = document.querySelector<HTMLElement>("#status")!;
let statusTimer: number | undefined;
let lang: UiLang = "en";

function renderOptions(strings: Record<string, string>) {
  const autoLabel = strings["common.autoOption"] ?? "";
  const withAuto = (items: ReadonlyArray<{ value: string; label: string }>) =>
    items.map(item => ({ value: item.value, label: item.value === "auto" ? autoLabel : item.label }));
  fill("voice-language", withAuto(VOICE_LANGUAGE_OPTIONS));
  fill("ui-language", withAuto(UI_LANGUAGE_OPTIONS));
  fill("output-language", REPLY_LANGUAGE_OPTIONS);
  fill("tone", TONE_VALUES.map(value => ({ value, label: strings[`opt.${value}`] ?? value })));
  fill("length", LENGTH_VALUES.map(value => ({ value, label: strings[`opt.${value}`] ?? value })));
}

function fill(id: string, items: ReadonlyArray<{ value: string; label: string }>) {
  const select = document.querySelector<HTMLSelectElement>(`#${id}`);
  if (!select) return;
  select.textContent = "";
  for (const item of items) {
    const option = document.createElement("option");
    option.value = item.value;
    option.textContent = item.label;
    select.append(option);
  }
}

function applyLanguage() {
  const strings = UI_STRINGS[lang];
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll<HTMLElement>("[data-i18n]")) {
    const key = el.dataset.i18n ?? "";
    const text = strings[key];
    if (!text) continue;
    const control = el instanceof HTMLLabelElement ? el.querySelector("input,select,textarea") : null;
    if (control) {
      // The label wraps a form control (checkboxes). Replace only its text
      // nodes so the control itself survives the translation.
      for (const node of Array.from(el.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE) node.remove();
      }
      el.append(text);
    } else {
      el.textContent = text;
    }
  }
  document.title = `Verbia — ${strings["settings.title"] ?? "Settings"}`;
  renderOptions(strings);
}

async function load() {
  const response = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
  const value = response?.ok ? response.data as UserSettings : DEFAULT_SETTINGS;
  lang = resolveUiLang(value.uiLanguage, chrome.i18n.getUILanguage());
  applyLanguage();
  set("backend", value.backendBaseUrl); set("voice-language", value.voiceLanguage); set("ui-language", value.uiLanguage); set("output-language", value.outputLanguage); set("tone", value.defaultTone); set("length", value.defaultLength);
  check("contextPreviewExpanded", value.contextPreviewExpanded); check("telemetryEnabled", value.telemetryEnabled);
  check("showLanguageInPanel", value.showLanguageInPanel); check("showToneInPanel", value.showToneInPanel); check("showLengthInPanel", value.showLengthInPanel);
}

function isValidBackendUrl(raw: string): boolean {
  if (!raw) return false;
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch { return false; }
}

function t(key: string) { return UI_STRINGS[lang][key] ?? key; }

// Autosave: every change persists immediately. Changing the interface
// language reloads the page so the new language takes over the whole form.
// Enter inside the Backend URL field submits the form, and leaving the field
// saves too.
form.addEventListener("submit", event => {
  event.preventDefault();
  void save().then(reloadIfLanguageChanged);
});
form.addEventListener("change", event => {
  const id = (event.target as HTMLElement | null)?.id;
  if (id === "backend" || id === "ui-language") return;
  void save();
});
document.querySelector<HTMLInputElement>("#backend")?.addEventListener("blur", () => { void save(); });
document.querySelector<HTMLSelectElement>("#ui-language")?.addEventListener("change", () => {
  void save().then(reloadIfLanguageChanged);
});

function reloadIfLanguageChanged(saved: boolean) {
  if (!saved) return;
  const selected = document.querySelector<HTMLSelectElement>("#ui-language")?.value ?? "auto";
  if (selected !== "auto" && !selected.startsWith(lang)) location.reload();
}

document.querySelector("#reset")?.addEventListener("click", () => {
  void resetSettings();
});

async function resetSettings() {
  await chrome.runtime.sendMessage({ type: "RESET_SETTINGS" });
  await load();
  show(t("settings.resetDone"));
}

async function save(): Promise<boolean> {
  const data = new FormData(form);
  const backendBaseUrl = String(data.get("backend") ?? "").trim();
  if (!isValidBackendUrl(backendBaseUrl)) {
    show(t("settings.urlInvalid"), true);
    return false;
  }
  const settings: UserSettings = {
    schemaVersion: 1,
    backendBaseUrl,
    uiLanguage: String(data.get("uiLanguage") ?? "auto"),
    voiceLanguage: String(data.get("voiceLanguage")),
    outputLanguage: String(data.get("outputLanguage")),
    defaultTone: String(data.get("defaultTone")) as UserSettings["defaultTone"],
    defaultLength: String(data.get("defaultLength")) as UserSettings["defaultLength"],
    showLanguageInPanel: data.has("showLanguageInPanel"),
    showToneInPanel: data.has("showToneInPanel"),
    showLengthInPanel: data.has("showLengthInPanel"),
    contextPreviewExpanded: data.has("contextPreviewExpanded"),
    telemetryEnabled: data.has("telemetryEnabled")
  };
  const response = await chrome.runtime.sendMessage({ type: "SAVE_SETTINGS", settings });
  const ok = Boolean(response?.ok);
  show(ok ? t("settings.saved") : t("settings.saveError"), !ok);
  return ok;
}

function set(id: string, value: string) { const element = document.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`); if (element) element.value = value; }
function check(name: string, value: boolean) { const element = document.querySelector<HTMLInputElement>(`[name='${name}']`); if (element) element.checked = value; }
function show(message: string, isError = false) {
  status.textContent = message;
  status.style.color = isError ? "#9C3C34" : "#1d6b45";
  window.clearTimeout(statusTimer);
  statusTimer = window.setTimeout(() => { status.textContent = ""; }, 2_500);
}

applyLanguage();
void load();
