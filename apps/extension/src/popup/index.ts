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

function renderShortcutKeys(container: HTMLElement, shortcut: string) {
  container.replaceChildren();
  for (const key of splitShortcutKeys(shortcut)) {
    const chip = document.createElement("kbd");
    chip.textContent = key === "Command" ? "⌘" : key === "Shift" ? "⇧" : key === "Option" || key === "Alt" ? "⌥" : key === "Control" ? "⌃" : key;
    container.append(chip);
  }
}

// Chrome's commands API usually returns keys joined by "+" (e.g. "Command+Shift+Y"),
// but on some platforms / custom bindings the modifier glyphs arrive already
// concatenated (e.g. "⌘⇧Y") with no separator. Treat both shapes uniformly so each
// key always lands in its own chip.
const SHORTCUT_GLYPHS = new Set(["⌘", "⇧", "⌥", "⌃", "⌫", "⌦", "⏎", "⇥"]);

function splitShortcutKeys(raw: string): string[] {
  if (!raw) return [];
  if (raw.includes("+")) return raw.split("+").map(s => s.trim()).filter(Boolean);
  const parts: string[] = [];
  let buf = "";
  for (const ch of raw) {
    if (SHORTCUT_GLYPHS.has(ch)) {
      if (buf) { parts.push(buf); buf = ""; }
      parts.push(ch);
    } else buf += ch;
  }
  if (buf) parts.push(buf);
  return parts;
}

void applyShortcut();

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
  row.classList.remove("signed-out");
  row.hidden = false;

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
    plan.textContent = state.plan === "premium" ? (strings["account.planPremium"] ?? "Premium") : (strings["account.planFree"] ?? "Free");
    copy.append(email, plan);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "auth-link";
    button.textContent = strings["account.signOut"] ?? "Sign out";
    button.addEventListener("click", async () => {
      await chrome.runtime.sendMessage({ type: "SIGN_OUT" });
      await renderAuth();
    });
    head.append(avatar, copy, button);
    row.append(head, makeUsage(state, strings));
  } else {
    row.classList.add("signed-out");
    const label = document.createElement("p");
    label.textContent = strings["account.signedOut"] ?? "Not signed in";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sign-in";
    button.textContent = strings["account.signIn"] ?? "Sign in";
    button.addEventListener("click", () => { void chrome.runtime.openOptionsPage(); });
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

function makeUsage(state: AuthState, strings: Record<string, string>): HTMLElement {
  const usage = document.createElement("div"); usage.className = "usage";
  const line = document.createElement("div"); line.className = "usage-line";
  const label = document.createElement("span"); label.textContent = strings["account.todayUsage"] ?? "Today’s usage";
  const count = document.createElement("strong"); count.className = "usage-count";
  if (!state.usage) {
    count.classList.add("is-unavailable");
    count.textContent = strings["account.usageUnavailable"] ?? "Temporarily unavailable";
    line.append(label, count); usage.append(line);
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
  return usage;
}

void renderAuth();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.settings || changes["verbia-auth-token"])) void renderAuth();
});
