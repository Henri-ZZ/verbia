import { DEFAULT_SETTINGS, LENGTH_VALUES, REPLY_LANGUAGE_OPTIONS, TONE_VALUES, UI_LANGUAGE_OPTIONS, UI_STRINGS, VOICE_LANGUAGE_OPTIONS, resolveUiLang, type AuthState, type UiLang, type UserSettings } from "@verbia/shared";
import { AUTH_STORAGE_KEY, SUPABASE_SIGNIN_REDIRECT, authEnabled, getSupabase, signInWithGoogle } from "../auth/supabase";
import { setStatusMessage, type MsgKind } from "../ui/message";
import { renderShortcutKeys } from "../ui/shortcut";
import { reviewUrl } from "../ui/stores";

const form = document.querySelector<HTMLFormElement>("#settings")!;
const status = document.querySelector<HTMLElement>("#status")!;
let statusTimer: number | undefined;
let lang: UiLang = "en";

// Release builds (Chrome Web Store) are compiled with VERBIA_RELEASE=1 and a
// pinned gateway, so the Developer settings card is removed and the Backend
// URL always resolves to the production API. Development builds keep the
// editable Backend URL in its own card at the bottom.
const VERBIA_RELEASE = process.env.VERBIA_RELEASE === "1";
const RELEASE_BACKEND_URL = process.env.VERBIA_BACKEND_URL ?? "";
if (VERBIA_RELEASE) document.querySelector<HTMLElement>(".developer-section")?.remove();

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
  const sectionHeadings = document.querySelectorAll<HTMLElement>(".settings-section .section-heading h2");
  const sectionDescriptions = document.querySelectorAll<HTMLElement>(".settings-section .section-heading p");
  if (sectionHeadings[0]) sectionHeadings[0].textContent = strings["settings.replyDefaults"] ?? "Reply defaults";
  if (sectionDescriptions[0]) sectionDescriptions[0].textContent = strings["settings.replyDefaultsDesc"] ?? "";
  if (sectionHeadings[1]) sectionHeadings[1].textContent = strings["settings.interfacePrivacy"] ?? "Interface & privacy";
  if (sectionDescriptions[1]) sectionDescriptions[1].textContent = strings["settings.interfacePrivacyDesc"] ?? "";
  renderOptions(strings);
}

// Both the privacy card's link and the Support card's button open the same
// contact page; one builder keeps the two from drifting apart.
function feedbackUrl(): string {
  return `https://verbia.henriz.dev/${lang === "zh-CN" ? "zh/" : ""}contact?source=settings&version=${encodeURIComponent(chrome.runtime.getManifest().version)}`;
}

// Targets that depend on runtime state: which store this copy came from, and the
// interface language in the URL. The anchors carry working defaults in the HTML,
// so a failure here never leaves a dead button.
function applyLinks() {
  const review = document.querySelector<HTMLAnchorElement>("#leave-review");
  if (review) review.href = reviewUrl();
  for (const id of ["#contact-feedback", "#send-feedback"]) {
    const link = document.querySelector<HTMLAnchorElement>(id);
    if (link) link.href = feedbackUrl();
  }
}

async function load() {
  const response = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
  const value = response?.ok ? response.data as UserSettings : DEFAULT_SETTINGS;
  lang = resolveUiLang(value.uiLanguage, chrome.i18n.getUILanguage());
  applyLanguage();
  applyLinks();
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
// The Backend select lives in its own Developer settings card below the
// form (outside <form>), so it gets its own change listener that saves
// right away instead of relying on form-level delegation.
form.addEventListener("submit", event => {
  event.preventDefault();
  void save().then(reloadIfLanguageChanged);
});
form.addEventListener("change", event => {
  const id = (event.target as HTMLElement | null)?.id;
  if (id === "ui-language") return;
  void save();
});
document.querySelector<HTMLSelectElement>("#backend")?.addEventListener("change", () => { void save(); });
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
  const backendBaseUrl = VERBIA_RELEASE
    ? RELEASE_BACKEND_URL || DEFAULT_SETTINGS.backendBaseUrl
    : String(document.querySelector<HTMLSelectElement>("#backend")?.value ?? "").trim();
  if (!VERBIA_RELEASE && !isValidBackendUrl(backendBaseUrl)) {
    show(t("settings.urlInvalid"), "error");
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
  show(ok ? t("settings.saved") : t("settings.saveError"), ok ? "success" : "error");
  return ok;
}

function set(id: string, value: string) { const element = document.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`); if (element) element.value = value; }
function check(name: string, value: boolean) { const element = document.querySelector<HTMLInputElement>(`[name='${name}']`); if (element) element.checked = value; }
function show(message: string, kind: MsgKind = "success") {
  setStatusMessage(status, message, kind);
  window.clearTimeout(statusTimer);
  statusTimer = window.setTimeout(() => { setStatusMessage(status, ""); }, 2_500);
}

// Keyboard shortcut card: show the shortcut actually bound via Chrome's
// commands API. Labels are platform-aware (see ui/shortcut.ts).
async function applyShortcuts() {
  let commands: Array<{ name?: string; shortcut?: string }> = [];
  try {
    commands = await chrome.commands.getAll();
  } catch { return; } // commands API unavailable — keep the HTML defaults
  const byName = new Map(commands.map(c => [c.name, c.shortcut ?? ""]));
  let el = document.getElementById("kbd-open-verbia");
  if (!el) return;
  if (el.tagName === "KBD") {
    const container = document.createElement("span");
    container.id = el.id;
    container.className = "shortcut-keys";
    container.setAttribute("aria-label", t("settings.shortcutTitle"));
    el.replaceWith(container);
    el = container;
  }
  el.setAttribute("aria-label", t("settings.shortcutTitle"));
  const value = byName.get("open-verbia") ?? "";
  renderShortcutKeys(el, value || t("settings.shortcutUnset"));
  const link = document.querySelector<HTMLElement>("#open-shortcuts-link");
  if (link && !document.querySelector(".shortcut-customize-hint")) {
    const hint = document.createElement("p");
    hint.className = "shortcut-customize-hint";
    hint.textContent = t("settings.shortcutHelp");
    link.before(hint);
  }
}

document.querySelector<HTMLAnchorElement>("#open-shortcuts-link")?.addEventListener("click", event => {
  event.preventDefault();
  void chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
});

applyLanguage();
void load();
// Re-fetch the bound shortcut when the user returns from the browser's
// shortcut-settings page (it opens in a new tab; coming back refocuses here).
window.addEventListener("focus", () => { void applyShortcuts(); void renderAccount(); });

// ---- Account (Supabase sign-in) -------------------------------------------
// Renders into #account-body. Google OAuth and Magic Link both redirect back
// to the Supabase project root, where the background capture listener
// exchanges the code (see signInWithGoogle / background/index.ts). Both
// persist the session through the shared chrome.storage adapter, so this page
// only needs to watch that key (storage.onChanged below) to re-render.

async function renderAccount() {
  const body = document.querySelector<HTMLElement>("#account-body");
  if (!body) return;
  // Show a loading state right away while the account snapshot is fetched.
  body.textContent = "";
  body.className = "account-body";
  body.append(createLoading());
  const response = await chrome.runtime.sendMessage({ type: "GET_AUTH_STATE" });
  const state = (response?.ok ? response.data : { signedIn: false }) as AuthState;
  body.textContent = "";
  body.className = `account-body ${state.signedIn ? "" : "signed-out-layout"}`;
  if (state.signedIn) {
    renderSignedIn(body, state);
  } else {
    renderSignedOut(body);
  }
}

function createLoading(): HTMLElement {
  const quickLang = resolveUiLang("auto", chrome.i18n.getUILanguage());
  const wrap = document.createElement("div");
  wrap.className = "account-loading";
  const img = document.createElement("img");
  img.className = "spinner";
  img.src = "assets/loading.png";
  img.alt = "";
  img.width = 16;
  img.height = 16;
  const label = document.createElement("span");
  label.textContent = UI_STRINGS[quickLang]["account.loading"] ?? "Loading…";
  wrap.append(img, label);
  return wrap;
}

// Free users see a tiered upgrade nudge beside their usage: quiet link by
// default, amber at ~70% of the daily allowance, red when the limit is hit.
// It opens the website account page (the Premium checkout) in a new tab.
function appendUpgradeCta(usage: HTMLElement, state: AuthState): void {
  if (state.plan !== "free") return;
  const used = typeof state.usage?.used === "number" ? state.usage.used : null;
  const limit = typeof state.usage?.limit === "number" && state.usage.limit !== null ? state.usage.limit : null;
  let key = "account.upgradeLine";
  let urgency = "";
  if (used !== null && limit !== null && limit > 0) {
    if (used >= limit) { key = "account.upgradeLimit"; urgency = " is-limit"; }
    else if (used / limit >= 0.7) { key = "account.upgradeNear"; urgency = " is-near"; }
  }
  const link = document.createElement("a");
  link.className = `upgrade-cta${urgency}`;
  link.href = `https://verbia.henriz.dev/${lang.toLowerCase().startsWith("zh") ? "zh" : ""}#pricing`;
  link.target = "_blank";
  link.rel = "noopener";
  const mark = document.createElement("img");
  mark.className = "cta-mark";
  mark.src = "assets/premium.png";
  mark.alt = "";
  mark.width = 14;
  mark.height = 14;
  link.append(mark, document.createTextNode(t(key)));
  usage.append(link);
}

function renderSignedIn(body: HTMLElement, state: AuthState) {
  const layout = document.createElement("div");
  layout.className = "account-signed-in";
  const identity = document.createElement("div");
  identity.className = "account-identity";
  const avatar = createAccountAvatar(state);
  const copy = document.createElement("div"); copy.className = "account-copy";
  const email = document.createElement("p");
  email.className = "account-email";
  const emailText = document.createElement("span");
  emailText.textContent = state.email ?? "";
  email.append(emailText);
  if (state.provider === "google") email.append(createGoogleBadge());
  const plan = document.createElement("span"); plan.className = "account-plan";
  if (state.plan === "premium") {
    const mark = document.createElement("img");
    mark.className = "plan-mark";
    mark.src = "assets/premium.png";
    mark.alt = "";
    mark.width = 14;
    mark.height = 14;
    plan.append(mark);
  }
  plan.append(document.createTextNode(state.plan === "premium" ? t("account.planPremium") : t("account.planFree")));
  // Premium that lapses on a known date: the qualifier sits *outside* the plan
  // pill (same as the website), so the pill only ever holds the tier name.
  // The server already formatted the date in UTC, so no client-timezone drift.
  const planLine = document.createElement("span");
  planLine.className = "account-plan-line";
  planLine.append(plan);
  if (state.plan === "premium" && state.usage?.premiumUntil) {
    const until = document.createElement("span");
    until.className = "plan-until";
    until.textContent = t("account.premiumUntil").replace("{date}", state.usage.premiumUntil);
    planLine.append(until);
  }
  copy.append(email, planLine); identity.append(avatar, copy);

  const usage = document.createElement("div");
  const usageLine = document.createElement("div"); usageLine.className = "usage-line";
  const usageLabel = document.createElement("span"); usageLabel.textContent = t("account.todayUsage");
  const usageCount = document.createElement("strong"); usageCount.className = "usage-count";
  const used = state.usage?.used ?? 0; const limit = state.usage?.limit ?? null;
  const reached = Boolean(state.usage && limit !== null && used >= limit);
  usageCount.textContent = state.usage ? (limit === null ? t("account.unlimited") : `${used}/${limit}`) : t("account.usageUnavailable");
  if (!state.usage) usageCount.classList.add("is-unavailable");
  else if (reached) usageCount.classList.add("is-limit");
  usageLine.append(usageLabel, usageCount); usage.append(usageLine);
  if (state.usage && limit !== null) {
    const track = document.createElement("div"); track.className = "usage-track"; track.setAttribute("role", "progressbar"); track.setAttribute("aria-valuemin", "0"); track.setAttribute("aria-valuemax", String(limit)); track.setAttribute("aria-valuenow", String(Math.min(used, limit)));
    const fill = document.createElement("div"); fill.className = "usage-fill"; fill.style.width = `${Math.min(used / limit * 100, 100)}%`; if (reached) fill.classList.add("is-limit"); track.append(fill); usage.append(track);
    const note = document.createElement("p"); note.className = "usage-note"; note.textContent = reached ? t("account.limitReached") : t("account.dailyAllowance"); usage.append(note);
  }
  appendUpgradeCta(usage, state);

  const signOutButton = document.createElement("button");
  signOutButton.type = "button";
  signOutButton.className = "secondary";
  const signOutLabel = t("account.signOut");
  signOutButton.textContent = signOutLabel;
  let armed = false;
  let timer: number | undefined;
  signOutButton.addEventListener("click", async () => {
    if (!armed) {
      // Two-step confirmation guards against accidental taps; the button turns
      // into "click again" and reverts on its own after 4s.
      armed = true;
      signOutButton.classList.add("is-confirm");
      signOutButton.textContent = t("account.confirmSignOut");
      timer = window.setTimeout(() => {
        armed = false;
        signOutButton.classList.remove("is-confirm");
        signOutButton.textContent = signOutLabel;
      }, 4_000);
      return;
    }
    window.clearTimeout(timer);
    await chrome.runtime.sendMessage({ type: "SIGN_OUT" });
    await renderAccount();
  });
  layout.append(identity, usage, signOutButton);
  body.append(layout);
}

function createAccountAvatar(state: AuthState): HTMLElement {
  const avatar = document.createElement("span");
  avatar.className = "account-avatar";
  avatar.textContent = (state.email?.[0] ?? "V").toUpperCase();
  if (!state.avatarUrl) return avatar;
  const image = document.createElement("img");
  image.src = state.avatarUrl;
  image.alt = "";
  image.decoding = "async";
  image.referrerPolicy = "no-referrer";
  image.addEventListener("error", () => image.remove(), { once: true });
  avatar.append(image);
  return avatar;
}

function createGoogleBadge(): HTMLImageElement {
  const badge = document.createElement("img");
  badge.className = "provider-badge";
  badge.src = "assets/google.svg";
  badge.alt = "Google";
  badge.width = 14;
  badge.height = 14;
  return badge;
}

function renderSignedOut(body: HTMLElement) {
  const intro = document.createElement("div");
  const desc = document.createElement("p");
  desc.className = "account-desc";
  desc.textContent = t("account.desc");
  intro.append(desc);

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
  intro.append(googleButton);

  // ---- OR divider -------------------------------------------------------
  const divider = document.createElement("div");
  divider.className = "account-divider";
  divider.textContent = t("common.or");

  // ---- Email magic-link form (matches the reference: label, row with mail
  // icon + input, full-width primary submit) -------------------------------
  const form = document.createElement("form");
  form.className = "account-form";
  form.append(divider);

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
  body.append(intro, form);

  form.addEventListener("submit", event => {
    event.preventDefault();
    const address = emailInput.value.trim();
    if (!address) {
      setAccountMessage(msg, t("account.fillForm"), "error");
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
      setAccountMessage(msg, t("account.errorAuth"), "error");
    }
  } catch (error) {
    console.error("Verbia Google sign-in failed", error);
    setAccountMessage(msg, t("account.errorAuth"), "error");
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
    setAccountMessage(msg, t("account.errorAuth"), "error");
  }
}

function setAccountMessage(msg: HTMLElement, text: string, kind: MsgKind = "success") {
  setStatusMessage(msg, text, kind);
}

// Re-render when a session appears or disappears (popup sign-out, silent
// refresh clearing an expired token, background completing an OAuth/Magic
// Link exchange, …).
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[AUTH_STORAGE_KEY]) void renderAccount();
});
