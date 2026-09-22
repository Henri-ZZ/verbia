import { DEFAULT_SETTINGS, UI_STRINGS, isRtl, resolveUiLang, type AuthState } from "@verbia/shared";
import { accountPageUrl, webSignInUrl } from "../auth/supabase";
import { ACTION_NOTICE_KEY } from "../runtime";
import { renderShortcutKeys } from "../ui/shortcut";
// The site registry is shared with the background on purpose: the popup has to
// ask for exactly the sites the background knows how to inject into.
import { grantPatternFor, hasPatternAccess, siteForUrl, type SiteDefinition } from "../background/sites";

async function applyLanguage() {
  const { settings } = await chrome.storage.local.get("settings");
  const value = (settings ?? DEFAULT_SETTINGS) as typeof DEFAULT_SETTINGS;
  const lang = resolveUiLang(value.uiLanguage, chrome.i18n.getUILanguage());
  const strings = UI_STRINGS[lang];
  const contact = document.querySelector<HTMLAnchorElement>("#contact-feedback");
  if (contact) contact.href = `https://verbia.henriz.dev/${lang === "zh-CN" ? "zh/" : ""}contact?source=popup&version=${encodeURIComponent(chrome.runtime.getManifest().version)}`;
  document.documentElement.lang = lang;
  document.documentElement.dir = isRtl(lang) ? "rtl" : "ltr";
  for (const el of document.querySelectorAll<HTMLElement>("[data-i18n]")) {
    const text = strings[el.dataset.i18n ?? ""];
    if (text) el.textContent = text;
  }
  for (const el of document.querySelectorAll<HTMLElement>("[data-i18n-aria]")) {
    const text = strings[el.dataset.i18nAria ?? ""];
    if (text) el.setAttribute("aria-label", text);
  }
}

void applyLanguage();

async function applyShortcut() {
  const commands = await chrome.commands.getAll().catch(() => []);
  const shortcut = commands.find(command => command.name === "open-verbia")?.shortcut ?? "";
  const container = document.querySelector<HTMLElement>("#popup-shortcut-keys");
  if (!container) return;
  renderShortcutKeys(container, shortcut || "—");
}

void applyShortcut();

// The background opens this popup itself when the shortcut is pressed on a page
// the browser refuses to script (store pages, browser UI), where the reply panel
// can never open. It leaves the matching string key in session storage; show it
// once and clear it, so a later toolbar click never shows a stale notice.
async function renderPageNotice() {
  const notice = document.querySelector<HTMLElement>("#page-notice");
  if (!notice) return;
  const stored = (await chrome.storage.session.get(ACTION_NOTICE_KEY).catch(() => ({}))) as Record<string, string | undefined>;
  const key = stored[ACTION_NOTICE_KEY];
  if (!key) return;
  await chrome.storage.session.remove(ACTION_NOTICE_KEY).catch(() => undefined);
  const { settings } = await chrome.storage.local.get("settings");
  const value = (settings ?? DEFAULT_SETTINGS) as typeof DEFAULT_SETTINGS;
  const lang = resolveUiLang(value.uiLanguage, chrome.i18n.getUILanguage());
  const text = UI_STRINGS[lang][key];
  if (!text) return;
  notice.textContent = text;
  notice.hidden = false;
}

void renderPageNotice();

document.querySelector<HTMLButtonElement>("#open-settings")?.addEventListener("click", () => {
  void chrome.runtime.openOptionsPage();
});

// ---- Sign-in state row -----------------------------------------------------
// The popup never talks to Supabase directly: the background owns the session
// and answers GET_AUTH_STATE / SIGN_OUT.

async function renderAuth() {
  const row = document.querySelector<HTMLElement>("#auth-row");
  if (!row) return;
  // Show a loading state right away while the account snapshot is fetched.
  row.textContent = "";
  row.classList.remove("signed-out");
  row.hidden = false;
  row.append(createLoading());
  const { settings } = await chrome.storage.local.get("settings");
  const value = (settings ?? DEFAULT_SETTINGS) as typeof DEFAULT_SETTINGS;
  const lang = resolveUiLang(value.uiLanguage, chrome.i18n.getUILanguage());
  const strings = UI_STRINGS[lang];
  const response = await chrome.runtime.sendMessage({ type: "GET_AUTH_STATE" });
  const state = (response?.ok ? response.data : { signedIn: false }) as AuthState;

  row.textContent = "";

  if (state.signedIn) {
    const head = document.createElement("div");
    head.className = "account-head";
    const avatar = createAccountAvatar(state);
    const copy = document.createElement("div");
    copy.className = "account-copy";
    const email = document.createElement("p");
    email.className = "account-email";
    // The address is the one thing in this row with more behind it than a 400px
    // popup can show, so it opens the website account page.
    const emailText = document.createElement("a");
    emailText.className = "account-email-link";
    emailText.href = accountPageUrl(lang);
    emailText.target = "_blank";
    emailText.rel = "noopener";
    emailText.textContent = state.email ?? "";
    email.append(emailText);
    for (const provider of state.providers ?? []) email.append(createProviderBadge(provider));
    const plan = document.createElement("span");
    plan.className = "account-plan";
    if (state.plan === "premium") {
      const mark = document.createElement("img");
      mark.className = "plan-mark";
      mark.src = "assets/premium.png";
      mark.alt = "";
      mark.width = 14;
      mark.height = 14;
      plan.append(mark);
    }
    plan.append(document.createTextNode(state.plan === "premium" ? (strings["account.planPremium"] ?? "Premium") : (strings["account.planFree"] ?? "Free")));
    // Premium that lapses on a known date: the qualifier sits *outside* the plan
    // pill (same as the website), so the pill only ever holds the tier name.
    // The server already formatted the date in UTC, so no client-timezone drift.
    const planLine = document.createElement("span");
    planLine.className = "account-plan-line";
    planLine.append(plan);
    if (state.plan === "premium" && state.usage?.premiumUntil) {
      const until = document.createElement("span");
      until.className = "plan-until";
      until.textContent = (strings["account.premiumUntil"] ?? "until {date}").replace("{date}", state.usage.premiumUntil);
      planLine.append(until);
    }
    copy.append(email, planLine);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "auth-link";
    const signOutLabel = strings["account.signOut"] ?? "Sign out";
    const confirmLabel = strings["account.confirmSignOut"] ?? "Click again to confirm";
    button.textContent = signOutLabel;
    let armed = false;
    let timer: number | undefined;
    button.addEventListener("click", async () => {
      if (!armed) {
        // Two-step confirmation guards against accidental taps: the button
        // turns into "click again" and reverts on its own after 4s.
        armed = true;
        button.classList.add("is-confirm");
        button.textContent = confirmLabel;
        timer = window.setTimeout(() => {
          armed = false;
          button.classList.remove("is-confirm");
          button.textContent = signOutLabel;
        }, 4_000);
        return;
      }
      window.clearTimeout(timer);
      await chrome.runtime.sendMessage({ type: "SIGN_OUT" });
      await renderAuth();
    });
    head.append(avatar, copy, button);
    row.append(head, makeUsage(state, strings, lang));
  } else {
    row.classList.add("signed-out");
    const label = document.createElement("p");
    label.textContent = strings["account.signedOut"] ?? "Not signed in";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sign-in";
    button.textContent = strings["account.signIn"] ?? "Sign in";
    // Sign-in happens on the website — the one surface that can hold a CAPTCHA and
    // every method at once. The bridge hands the finished session back here, and
    // the storage listener below re-renders this row as signed in.
    button.addEventListener("click", () => { void chrome.tabs.create({ url: webSignInUrl() }); });
    row.append(label, button);
  }
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

// Same badge as the settings card, sized for the popup row.
function createProviderBadge(provider: "google" | "azure"): HTMLImageElement {
  const badge = document.createElement("img");
  badge.className = "provider-badge";
  badge.src = provider === "azure" ? "assets/microsoft.svg" : "assets/google.svg";
  badge.alt = provider === "azure" ? "Microsoft" : "Google";
  badge.width = 13;
  badge.height = 13;
  return badge;
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

// Free users see a gentle upgrade nudge next to their daily usage. It stays a
// quiet link at first, turns amber when the day is ~70% used, and turns red
// once the daily limit is reached. Opens the website's account page (where the
// full Premium checkout lives) in a normal tab.
function appendUpgradeCta(usage: HTMLElement, state: AuthState, strings: Record<string, string>, lang: string): void {
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
  link.append(mark, document.createTextNode(strings[key] ?? ""));
  usage.append(link);
}

function makeUsage(state: AuthState, strings: Record<string, string>, lang: string): HTMLElement {
  const usage = document.createElement("div"); usage.className = "usage";
  const line = document.createElement("div"); line.className = "usage-line";
  const label = document.createElement("span"); label.textContent = strings["account.todayUsage"] ?? "Today’s usage";
  const count = document.createElement("strong"); count.className = "usage-count";
  if (!state.usage) {
    count.classList.add("is-unavailable");
    count.textContent = strings["account.usageUnavailable"] ?? "Temporarily unavailable";
    line.append(label, count); usage.append(line);
    appendUpgradeCta(usage, state, strings, lang);
    return usage;
  }
  const used = state.usage?.used ?? 0; const limit = state.usage?.limit ?? null;
  const reached = limit !== null && used >= limit;
  count.textContent = limit === null ? (strings["account.unlimited"] ?? "Unlimited") : `${used}/${limit}`;
  if (reached) count.classList.add("is-limit");
  line.append(label, count); usage.append(line);
  if (limit !== null) {
    const track = document.createElement("div"); track.className = "usage-track"; track.setAttribute("role", "progressbar"); track.setAttribute("aria-valuemin", "0"); track.setAttribute("aria-valuemax", String(limit)); track.setAttribute("aria-valuenow", String(Math.min(used, limit)));
    const fill = document.createElement("div"); fill.className = "usage-fill"; fill.style.width = `${Math.min(used / limit * 100, 100)}%`; if (reached) fill.classList.add("is-limit"); track.append(fill); usage.append(track);
  }
  appendUpgradeCta(usage, state, strings, lang);
  return usage;
}

void renderAuth();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.settings || changes["verbia-auth-token"])) void renderAuth();
});

// ---- Site access row -------------------------------------------------------
// Supported sites are optional grants, one site at a time (@see
// background/sites.ts), and this popup is the only surface that can ask for
// one: the request has to happen inside a user gesture, and the popup opens
// from a click on the toolbar icon. The shortcut cannot do it — the background
// only learns which site a tab is on after an await, and the gesture is spent
// by then.
//
// None of it is required to use Verbia: the shortcut works on any page without
// a grant. What a grant buys is a panel that is already there when the page
// loads, instead of one summoned every time.
/** The site's own mark, or null for a site that ships without artwork. */
function siteMark(site: SiteDefinition): HTMLImageElement | null {
  if (!site.logo) return null;
  const mark = document.createElement("img");
  mark.className = "site-mark";
  mark.src = site.logo;
  mark.alt = "";
  mark.width = 15;
  mark.height = 15;
  // A broken or missing file must not leave a torn-image icon in the card.
  mark.addEventListener("error", () => mark.remove(), { once: true });
  return mark;
}

async function renderSiteAccess() {
  const row = document.querySelector<HTMLElement>("#site-row");
  if (!row) return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }).catch(() => []);
  const site = siteForUrl(tab?.url);
  const tabId = tab?.id;
  const pageUrl = tab?.url;
  // Nothing to offer on a page Verbia does not know — and nothing to read it
  // with either: without a grant, a tab's URL is only visible to the gesture
  // that opened this popup.
  if (!site || tabId === undefined || !pageUrl) {
    row.hidden = true;
    return;
  }
  const strings = await currentStrings();
  row.textContent = "";
  // Per host, not per site: www.reddit.com and old.reddit.com are separate
  // grants, so the card has to reflect the page the user is actually on
  // (@see hasPatternAccess).
  const pattern = grantPatternFor(site, pageUrl);
  if (pattern && await hasPatternAccess(pattern)) {
    const state = document.createElement("p");
    state.className = "site-state";
    const mark = siteMark(site);
    if (mark) state.append(mark);
    state.append(document.createTextNode(`✓ ${new URL(pageUrl).hostname}`));
    // What is now true, spelled out under the host: "✓" alone says the site is
    // on without saying what being on means.
    const note = document.createElement("div");
    note.className = "site-copy";
    const noteText = document.createElement("p");
    noteText.textContent = strings["popup.siteEnabled"]
      ?? "Enabled — the panel opens by itself when you click into a reply box here.";
    note.append(noteText);
    row.append(state, note);
  } else {
    // What it does comes first, the button second: on its own, the button said
    // "enable" without saying what for, and the popup is the only place that
    // can explain it before the click.
    const copy = document.createElement("div");
    copy.className = "site-copy";
    const title = document.createElement("h2");
    title.textContent = strings["popup.siteTitle"] ?? "Automatic reply panel";
    const why = document.createElement("p");
    why.textContent = strings["popup.siteWhy"]
      ?? "Once enabled, the reply panel opens by itself when you click into a reply box on this site. The keyboard shortcut works either way.";
    copy.append(title, why);
    // Primary style, full width: this card has exactly one action, and the
    // site's own mark leads its label so the button names the site it applies to.
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sign-in site-enable";
    const mark = siteMark(site);
    if (mark) button.append(mark);
    button.append(document.createTextNode(strings["popup.enableSite"] ?? "Enable on this site"));
    button.addEventListener("click", () => { void enableSite(button, site, tabId, pageUrl); });
    row.append(copy, button);
  }
  row.hidden = false;
}

async function enableSite(button: HTMLButtonElement, site: SiteDefinition, tabId: number, pageUrl: string) {
  const pattern = grantPatternFor(site, pageUrl);
  if (!pattern) return;
  // First statement of this turn of the handler: Chrome only shows the prompt
  // while the click's gesture is still good, and an await before this spends it.
  const granted = await chrome.permissions.request({ origins: [pattern] });
  // A refusal needs no error UI and is no dead end: the button stays, the
  // shortcut keeps working, and clicking again asks Chrome again.
  if (!granted) {
    button.disabled = false;
    return;
  }
  button.disabled = true;
  // The background registers the script for the page loads that come next
  // (permissions.onAdded → background/sites.ts). Injecting it here makes the
  // tab in front of the user work without a reload as well.
  await chrome.scripting.executeScript({
    target: { tabId, allFrames: site.allFrames === true },
    files: ["content.js"]
  }).catch(() => undefined);
  await renderSiteAccess();
}

async function currentStrings(): Promise<Record<string, string>> {
  const { settings } = await chrome.storage.local.get("settings");
  const value = (settings ?? DEFAULT_SETTINGS) as typeof DEFAULT_SETTINGS;
  return UI_STRINGS[resolveUiLang(value.uiLanguage, chrome.i18n.getUILanguage())];
}

void renderSiteAccess();
