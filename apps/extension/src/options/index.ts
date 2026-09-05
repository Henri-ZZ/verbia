import { DEFAULT_SETTINGS, LENGTH_VALUES, REPLY_LANGUAGE_OPTIONS, TONE_VALUES, UI_LANGUAGE_OPTIONS, UI_STRINGS, VOICE_LANGUAGE_OPTIONS, resolveUiLang, type AuthState, type UiLang, type UserSettings } from "@verbia/shared";
import { AUTH_STORAGE_KEY, SUPABASE_SIGNIN_REDIRECT, authEnabled, getSupabase, signInWithGoogle } from "../auth/supabase";

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
  await applyShortcuts();
  await renderAccount();
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

// Keyboard shortcut card: show the shortcut actually bound via Chrome's
// commands API. macOS reports "Alt" for the Option key, so spell that out the
// way Mac users know it when a custom binding uses Alt.
const isMac = /Mac|iP(hone|ad|od)/.test(navigator.platform ?? "");
function displayShortcut(raw: string): string {
  if (!isMac) return raw;
  return raw.replace(/\bAlt\+/g, "Option+");
}

async function applyShortcuts() {
  let commands: Array<{ name?: string; shortcut?: string }> = [];
  try {
    commands = await chrome.commands.getAll();
  } catch { return; } // commands API unavailable — keep the HTML defaults
  const byName = new Map(commands.map(c => [c.name, c.shortcut ?? ""]));
  const el = document.getElementById("kbd-open-verbia");
  if (!el) return;
  const value = byName.get("open-verbia") ?? "";
  el.textContent = value ? displayShortcut(value) : t("settings.shortcutUnset");
}

document.querySelector<HTMLAnchorElement>("#open-shortcuts-link")?.addEventListener("click", event => {
  event.preventDefault();
  void chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
});

applyLanguage();
void load();
// Re-fetch the bound shortcut when the user returns from the browser's
// shortcut-settings page (it opens in a new tab; coming back refocuses here).
window.addEventListener("focus", () => { void applyShortcuts(); });

// ---- Account (Supabase sign-in) -------------------------------------------
// Renders into #account-body. Google OAuth and Magic Link both redirect back
// to the Supabase project root, where the background capture listener
// exchanges the code (see signInWithGoogle / background/index.ts). Both
// persist the session through the shared chrome.storage adapter, so this page
// only needs to watch that key (storage.onChanged below) to re-render.

async function renderAccount() {
  const body = document.querySelector<HTMLElement>("#account-body");
  if (!body) return;
  const response = await chrome.runtime.sendMessage({ type: "GET_AUTH_STATE" });
  const state = (response?.ok ? response.data : { signedIn: false }) as AuthState;
  body.textContent = "";
  if (state.signedIn) {
    renderSignedIn(body, state);
  } else {
    renderSignedOut(body);
  }
}

function renderSignedIn(body: HTMLElement, state: AuthState) {
  // Identity row: the sign-in method's mark (Google icon for Google OAuth,
  // nothing for Magic Link) sits before the email.
  const identity = document.createElement("div");
  identity.className = "account-identity";
  if (state.provider === "google") {
    const providerMark = document.createElement("img");
    providerMark.src = "assets/google.svg";
    providerMark.alt = "Google";
    providerMark.width = 16;
    providerMark.height = 16;
    providerMark.decoding = "async";
    identity.append(providerMark);
  }
  const email = document.createElement("p");
  email.className = "account-email";
  email.textContent = state.email ?? "";
  identity.append(email);
  body.append(identity);

  // The plan row is created immediately (Free) and only upgraded in place
  // once the profiles table answers, so it always sits under the email and
  // above the sign-out button regardless of query latency.
  const meta = document.createElement("p");
  meta.className = "account-meta";
  const planText = () => `${t("account.plan")}: ${t("account.planFree")}`;
  meta.textContent = planText();
  body.append(meta);

  const signOutButton = document.createElement("button");
  signOutButton.type = "button";
  signOutButton.className = "secondary";
  signOutButton.textContent = t("account.signOut");
  signOutButton.addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ type: "SIGN_OUT" });
    await renderAccount();
  });
  body.append(signOutButton);

  // The plan column lives in Supabase (profiles), reserved for paid tiers.
  // Until the table exists (or a query fails) the Free label stays.
  if (authEnabled) {
    void (async () => {
      try {
        const supabase = getSupabase();
        const { data: current } = await supabase.auth.getUser();
        const user = current.user;
        if (!user) return;
        const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle();
        if (profile?.plan) meta.textContent = `${t("account.plan")}: ${profile.plan === "premium" ? "Premium" : t("account.planFree")}`;
      } catch {
        // profiles may not be created yet — keep the Free label.
      }
    })();
  }
}

function renderSignedOut(body: HTMLElement) {
  const desc = document.createElement("p");
  desc.className = "account-desc";
  desc.textContent = t("account.desc");
  body.append(desc);

  // ---- Google button (deep brand-dark block, white label, full-color G) -----
  const googleButton = document.createElement("button");
  googleButton.type = "button";
  googleButton.className = "account-google";
  const googleImg = document.createElement("img");
  googleImg.src = "assets/google.svg";
  googleImg.alt = "Google";
  googleImg.width = 18;
  googleImg.height = 18;
  googleImg.decoding = "async";
  googleButton.append(googleImg, document.createTextNode(t("account.signInGoogle")));
  googleButton.addEventListener("click", () => {
    googleButton.disabled = true;
    void startGoogleSignIn(googleButton, msg);
  });
  body.append(googleButton);

  // ---- OR divider -------------------------------------------------------
  const divider = document.createElement("div");
  divider.className = "account-divider";
  divider.textContent = "OR";
  body.append(divider);

  // ---- Email magic-link form (matches the reference: label, row with mail
  // icon + input, full-width primary submit) -------------------------------
  const form = document.createElement("form");
  form.className = "account-form";

  const emailLabel = document.createElement("label");
  emailLabel.htmlFor = "account-email-input";
  emailLabel.textContent = t("account.emailLabel");

  const emailRow = document.createElement("div");
  emailRow.className = "account-email-row";
  const mailIcon = document.createElement("span");
  mailIcon.className = "mail-icon";
  mailIcon.setAttribute("aria-hidden", "true");
  mailIcon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M3 6h18v12H3z"/><path d="M3 6l9 7 9-7"/></svg>';
  const emailInput = document.createElement("input");
  emailInput.type = "email";
  emailInput.id = "account-email-input";
  emailInput.autocomplete = "email";
  emailInput.required = true;
  emailInput.placeholder = t("account.emailPlaceholder");
  emailRow.append(mailIcon, emailInput);

  const magic = document.createElement("button");
  magic.type = "submit";
  magic.className = "account-magic";
  magic.textContent = t("account.sendMagicLink");

  const msg = document.createElement("p");
  msg.className = "account-msg";

  form.append(emailLabel, emailRow, magic, msg);
  body.append(form);

  form.addEventListener("submit", event => {
    event.preventDefault();
    const address = emailInput.value.trim();
    if (!address) {
      setAccountMessage(msg, t("account.fillForm"), true);
      return;
    }
    void sendMagicLink(msg, address);
  });
}

async function startGoogleSignIn(button: HTMLButtonElement, msg: HTMLElement) {
  if (!authEnabled) return;
  setAccountMessage(msg, "");
  try {
    const result = await signInWithGoogle();
    if (!result.ok) {
      // Failures here are usually the sign-in tab being closed mid-flow or a
      // network/Google-side issue; the generic message keeps it approachable.
      console.error("Verbia Google sign-in failed", result.error);
      setAccountMessage(msg, t("account.errorAuth"), true);
    }
  } catch (error) {
    console.error("Verbia Google sign-in failed", error);
    setAccountMessage(msg, t("account.errorAuth"), true);
  } finally {
    // Success re-renders into the signed-in card via storage.onChanged; on
    // failure the button must become clickable again.
    button.disabled = false;
  }
}

async function sendMagicLink(msg: HTMLElement, email: string) {
  try {
    const { error } = await getSupabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: SUPABASE_SIGNIN_REDIRECT }
    });
    if (error) throw error;
    setAccountMessage(msg, t("account.sentEmail"));
  } catch (error) {
    console.error("Verbia magic link failed", error);
    setAccountMessage(msg, t("account.errorAuth"), true);
  }
}

function setAccountMessage(msg: HTMLElement, text: string, isError = false) {
  msg.textContent = text;
  msg.classList.toggle("error", isError);
}

// Re-render when a session appears or disappears (auth.html callback page,
// popup sign-out, silent refresh clearing an expired token, …).
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[AUTH_STORAGE_KEY]) void renderAccount();
});
