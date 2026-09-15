import { DEFAULT_SETTINGS, UI_STRINGS, isRtl, resolveUiLang, type AuthState } from "@verbia/shared";
import { webSignInUrl } from "../auth/supabase";
import { ACTION_NOTICE_KEY } from "../runtime";
import { renderShortcutKeys } from "../ui/shortcut";

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
    const emailText = document.createElement("span");
    emailText.textContent = state.email ?? "";
    email.append(emailText);
    if (state.provider === "google") email.append(createGoogleBadge());
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

function createGoogleBadge(): HTMLImageElement {
  const badge = document.createElement("img");
  badge.className = "provider-badge";
  badge.src = "assets/google.svg";
  badge.alt = "Google";
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
