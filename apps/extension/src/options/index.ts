import { DEFAULT_SETTINGS, LENGTH_VALUES, REPLY_LANGUAGE_OPTIONS, TONE_VALUES, UI_LANGUAGE_OPTIONS, UI_STRINGS, VOICE_LANGUAGE_OPTIONS, isRtl, resolveUiLang, type AuthState, type UiLang, type UserSettings } from "@verbia/shared";
import { AUTH_STORAGE_KEY, accountPageUrl, webSignInUrl } from "../auth/supabase";
import { setStatusMessage, type MsgKind } from "../ui/message";
import { renderShortcutKeys } from "../ui/shortcut";
import { reviewUrl } from "../ui/stores";
// The site registry is shared with the background on purpose: these toggles have
// to ask for exactly the sites the background knows how to inject into.
import { grantedOrigins, SUPPORTED_SITES } from "../background/sites";

const form = document.querySelector<HTMLFormElement>("#settings")!;
const status = document.querySelector<HTMLElement>("#status")!;
let statusTimer: number | undefined;
let lang: UiLang = "en";
let favoriteReplyLanguages = [...DEFAULT_SETTINGS.favoriteReplyLanguages];
// Keyed by plain string on purpose: stored favourites are strings and may hold a
// code the preset list no longer offers, which the caller handles by skipping the
// row (@see renderFavoriteLanguages). The option list infers a literal union, so
// the key type is widened here instead of at every lookup.
const replyLanguageByValue = new Map<string, (typeof REPLY_LANGUAGE_OPTIONS)[number]>(REPLY_LANGUAGE_OPTIONS.map(option => [option.value, option]));

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
  fill("tone", TONE_VALUES.map(value => ({ value, label: strings[`opt.${value}`] ?? value })));
  fill("length", LENGTH_VALUES.map(value => ({ value, label: strings[`opt.${value}`] ?? value })));
  renderFavoriteLanguages();
  // The toggles carry text of their own, so they follow the interface language
  // like everything else on this page.
  void renderSiteAccess();
}

// ---- Site access -----------------------------------------------------------
// The platforms listed further down are the one place that both explains what
// enabling a site does and undoes it. It is an extension page, which is what
// makes that possible at all: the permission prompt has to run inside a user
// gesture (a click here is one; a message from a content script is not), and
// removing a grant needs no gesture whatsoever.
//
// None of it is required to use Verbia — the shortcut works on any page and
// `activeTab` covers the summon. These toggles only decide whether the reply
// panel is already there when a supported site loads. Denying the prompt
// changes nothing: the button simply stays as it was.
async function renderSiteAccess() {
  const strings = UI_STRINGS[lang];
  for (const row of document.querySelectorAll<HTMLElement>("[data-site]")) {
    const site = SUPPORTED_SITES.find(item => item.id === row.dataset.site);
    if (!site) continue;
    // One toggle per site, not per host: Reddit's two hosts are one site to the
    // user, so a partial grant reads as on, and turning it off clears whichever
    // hosts were granted.
    const granted = await grantedOrigins(site);
    const missing = site.origins.filter(origin => !granted.includes(origin));
    row.querySelector(".site-switch")?.remove();
    const button = document.createElement("button");
    button.type = "button";
    button.className = "site-switch";
    // A switch rather than a labelled button: the control carries the state, and
    // the words that explain what authorizing buys live in the note under the
    // list. The label still exists for screen readers and for the tooltip.
    button.setAttribute("role", "switch");
    button.setAttribute("aria-checked", granted.length ? "true" : "false");
    button.setAttribute("aria-label",
      granted.length ? strings["settings.siteDisable"] ?? "Disable" : strings["settings.siteEnable"] ?? "Enable");
    button.addEventListener("click", () => {
      // First statement of this turn of the handler: Chrome only shows the
      // prompt while the click's gesture is still good, and an await before it
      // spends that gesture (@see popup/index.ts for the same constraint).
      const change = granted.length
        ? chrome.permissions.remove({ origins: site.origins })
        : chrome.permissions.request({ origins: missing });
      button.disabled = true;
      void change
        .then(() => renderSiteAccess())
        .catch(error => {
          // A refusal is a normal answer, not a fault: put the button back and
          // leave the row saying what it said before.
          console.debug("[verbia] site toggle declined", site.id, error);
          button.disabled = false;
        });
    });
    row.append(button);
  }
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
  // Right-to-left languages read right to left, and the form has to say so:
  // without this the label sits on the wrong side of every field it belongs to.
  document.documentElement.dir = isRtl(lang) ? "rtl" : "ltr";
  for (const el of document.querySelectorAll<HTMLElement>("[data-i18n]")) {
    const key = el.dataset.i18n ?? "";
    const text = strings[key] ?? UI_STRINGS.en[key];
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
  for (const el of document.querySelectorAll<HTMLInputElement>("[data-i18n-placeholder]")) {
    const key = el.dataset.i18nPlaceholder ?? "";
    el.placeholder = strings[key] ?? UI_STRINGS.en[key] ?? "";
  }
  const sectionHeadings = document.querySelectorAll<HTMLElement>(".settings-section .section-heading h2");
  const sectionDescriptions = document.querySelectorAll<HTMLElement>(".settings-section .section-heading p");
  if (sectionHeadings[0]) sectionHeadings[0].textContent = strings["settings.replyDefaults"] ?? "Reply defaults";
  if (sectionDescriptions[0]) sectionDescriptions[0].textContent = strings["settings.replyDefaultsDesc"] ?? "";
  if (sectionHeadings[1]) sectionHeadings[1].textContent = strings["settings.interfacePrivacy"] ?? "Interface & privacy";
  if (sectionDescriptions[1]) sectionDescriptions[1].textContent = strings["settings.interfacePrivacyDesc"] ?? "";
  renderOptions(strings);
}

// The privacy card's link, the Support card's button and the platforms section's
// request button all open the same contact page; one builder keeps them from
// drifting apart.
function feedbackUrl(): string {
  return `https://verbia.henriz.dev/${lang === "zh-CN" ? "zh/" : ""}contact?source=settings&version=${encodeURIComponent(chrome.runtime.getManifest().version)}`;
}

// Targets that depend on runtime state: which store this copy came from, and the
// interface language in the URL. The anchors carry working defaults in the HTML,
// so a failure here never leaves a dead button.
function applyLinks() {
  const review = document.querySelector<HTMLAnchorElement>("#leave-review");
  if (review) review.href = reviewUrl();
  for (const id of ["#contact-feedback", "#send-feedback", "#platform-feedback"]) {
    const link = document.querySelector<HTMLAnchorElement>(id);
    if (link) link.href = feedbackUrl();
  }
}

async function load() {
  const response = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
  const value = response?.ok ? response.data as UserSettings : DEFAULT_SETTINGS;
  favoriteReplyLanguages = [...(value.favoriteReplyLanguages ?? DEFAULT_SETTINGS.favoriteReplyLanguages)];
  lang = resolveUiLang(value.uiLanguage, chrome.i18n.getUILanguage());
  applyLanguage();
  applyLinks();
  set("backend", value.backendBaseUrl); set("voice-language", value.voiceLanguage); set("ui-language", value.uiLanguage); set("tone", value.defaultTone); set("length", value.defaultLength);
  renderFavoriteLanguages();
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

function t(key: string) { return UI_STRINGS[lang][key] ?? UI_STRINGS.en[key] ?? key; }

function renderFavoriteLanguages() {
  const container = document.querySelector<HTMLElement>("#favorite-languages");
  if (!container) return;
  container.textContent = "";
  favoriteReplyLanguages.forEach((value, index) => {
    const option = replyLanguageByValue.get(value);
    if (!option) return;
    const item = document.createElement("div");
    item.className = "favorite-language";
    item.setAttribute("role", "listitem");

    const name = document.createElement("span");
    name.className = "favorite-language-name";
    name.textContent = option.label;
    item.append(name);

    if (index === 0) {
      const badge = document.createElement("span");
      badge.className = "default-language-badge";
      badge.textContent = t("settings.defaultReplyLanguage");
      item.append(badge);
    }

    const actions = document.createElement("span");
    actions.className = "favorite-language-actions";
    // Up/down, not left/right: the list is vertical, so the arrows follow the
    // order it is read in rather than an axis the row does not have.
    const controls = [
      { action: "language-up", text: "↑", disabled: index === 0, label: t("settings.moveLanguageEarlier") },
      { action: "language-down", text: "↓", disabled: index === favoriteReplyLanguages.length - 1, label: t("settings.moveLanguageLater") },
      { action: "language-remove", text: "×", disabled: favoriteReplyLanguages.length === 1, label: t("settings.removeReplyLanguage") }
    ];
    for (const control of controls) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.action = control.action;
      button.dataset.language = value;
      button.textContent = control.text;
      button.disabled = control.disabled;
      button.setAttribute("aria-label", `${control.label}: ${option.label}`);
      actions.append(button);
    }
    item.append(actions);
    container.append(item);
  });
  const add = document.querySelector<HTMLButtonElement>("#add-reply-language");
  if (add) add.disabled = favoriteReplyLanguages.length >= 5;
}

function renderLanguageResults(query = "") {
  const results = document.querySelector<HTMLElement>("#reply-language-results");
  if (!results) return;
  const needle = query.trim().toLocaleLowerCase();
  results.textContent = "";
  for (const option of REPLY_LANGUAGE_OPTIONS) {
    if (needle && !option.label.toLocaleLowerCase().includes(needle) && !option.value.toLocaleLowerCase().includes(needle)) continue;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "language-result";
    button.dataset.language = option.value;
    const selected = favoriteReplyLanguages.includes(option.value);
    button.disabled = selected || favoriteReplyLanguages.length >= 5;
    button.innerHTML = `<span>${option.label}</span><small>${selected ? t("settings.languageAdded") : option.value}</small>`;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(selected));
    results.append(button);
  }
}

function saveFavorites() {
  renderFavoriteLanguages();
  void save();
}

document.querySelector("#favorite-languages")?.addEventListener("click", event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-action]");
  const value = button?.dataset.language;
  if (!button || !value) return;
  const index = favoriteReplyLanguages.indexOf(value);
  if (index < 0) return;
  if (button.dataset.action === "language-up" && index > 0) [favoriteReplyLanguages[index - 1], favoriteReplyLanguages[index]] = [favoriteReplyLanguages[index]!, favoriteReplyLanguages[index - 1]!];
  if (button.dataset.action === "language-down" && index < favoriteReplyLanguages.length - 1) [favoriteReplyLanguages[index + 1], favoriteReplyLanguages[index]] = [favoriteReplyLanguages[index]!, favoriteReplyLanguages[index + 1]!];
  if (button.dataset.action === "language-remove" && favoriteReplyLanguages.length > 1) favoriteReplyLanguages.splice(index, 1);
  saveFavorites();
});

const languageDialog = document.querySelector<HTMLDialogElement>("#reply-language-dialog");
document.querySelector("#add-reply-language")?.addEventListener("click", () => {
  if (!languageDialog || favoriteReplyLanguages.length >= 5) return;
  const search = document.querySelector<HTMLInputElement>("#reply-language-search");
  if (search) search.value = "";
  renderLanguageResults();
  languageDialog.showModal();
  search?.focus();
});
document.querySelector("[data-action='close-language-dialog']")?.addEventListener("click", () => languageDialog?.close());
languageDialog?.addEventListener("click", event => { if (event.target === languageDialog) languageDialog.close(); });
document.querySelector<HTMLInputElement>("#reply-language-search")?.addEventListener("input", event => renderLanguageResults((event.target as HTMLInputElement).value));
document.querySelector("#reply-language-results")?.addEventListener("click", event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-language]");
  const value = button?.dataset.language;
  if (!value || button?.disabled || favoriteReplyLanguages.length >= 5 || favoriteReplyLanguages.includes(value)) return;
  favoriteReplyLanguages.push(value);
  languageDialog?.close();
  saveFavorites();
});

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
    outputLanguage: favoriteReplyLanguages[0] ?? DEFAULT_SETTINGS.outputLanguage,
    favoriteReplyLanguages: [...favoriteReplyLanguages],
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

// ---- Account ---------------------------------------------------------------
// Renders into #account-body. The extension signs nobody in: the button opens the
// website, which handles codes, passwords and Google, and the finished session
// arrives through the bridge (see syncWebsiteSignIn in background/index.ts). That
// write lands in the shared chrome.storage key, so this page only has to watch it
// (storage.onChanged below) to re-render as signed in.

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
  // The address is the one thing in this card that has more behind it than the
  // settings page can show (plan, usage, password, sign-out), so it links to the
  // website account page.
  const emailText = document.createElement("a");
  emailText.className = "account-email-link";
  emailText.href = accountPageUrl(lang);
  emailText.target = "_blank";
  emailText.rel = "noopener";
  emailText.textContent = state.email ?? "";
  email.append(emailText);
  for (const provider of state.providers ?? []) email.append(createProviderBadge(provider));
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

// The mark the user saw on the sign-in button, so the badge says where this
// account comes from without a word of copy. Both live in assets/.
function createProviderBadge(provider: "google" | "azure"): HTMLImageElement {
  const badge = document.createElement("img");
  badge.className = "provider-badge";
  badge.src = provider === "azure" ? "assets/microsoft.svg" : "assets/google.svg";
  badge.alt = provider === "azure" ? "Microsoft" : "Google";
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

  // One button, one destination. Sign-in lives on the website because that is the
  // only surface that can render a CAPTCHA and hold every method (email code,
  // password, Google) in one place — and the session comes back here on its own
  // (@see webSignInUrl, and syncWebsiteSignIn in background/index.ts).
  const signIn = document.createElement("button");
  signIn.type = "button";
  // account-magic is the legacy name of the full-width primary button this used
  // to be; kept so the card keeps its existing look without a CSS change.
  signIn.className = "account-magic";
  signIn.textContent = t("account.signIn");
  signIn.addEventListener("click", () => { void chrome.tabs.create({ url: webSignInUrl() }); });

  body.append(intro, signIn);
}

// Re-render when a session appears or disappears (popup sign-out, silent
// refresh clearing an expired token, background completing an OAuth/Magic
// Link exchange, …).
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[AUTH_STORAGE_KEY]) void renderAccount();
});
