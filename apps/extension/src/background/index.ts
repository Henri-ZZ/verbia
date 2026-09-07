import { DEFAULT_SETTINGS, UI_STRINGS, generateReplyRequestSchema, generateReplyResponseSchema, resolveUiLang, type AccountUsage, type AuthState, type ExtensionRequest, type ExtensionResponse, type StagedContext, type StagedSelection, type UiLang, type UserSettings } from "@verbia/shared";
import { SUPABASE_URL, authBearer, authEnabled, authSnapshot, clearSession, getSupabase, refreshStoredSession, signOut } from "../auth/supabase";

const ADD_CONTEXT_MENU_ID = "verbia-add-context";
const MAX_SELECTION_LENGTH = 8_000;
const stagedKeyFor = (tabId: number) => `stagedContext:${tabId}`;

// Release builds are compiled with a pinned gateway URL, so requests always go
// to production even if an older development build stored a localhost backend.
const VERBIA_BACKEND_URL = process.env.VERBIA_BACKEND_URL ?? "";
function apiBaseUrl(settings: UserSettings): string {
  return (VERBIA_BACKEND_URL || settings.backendBaseUrl || DEFAULT_SETTINGS.backendBaseUrl).replace(/\/$/, "");
}

chrome.runtime.onInstalled.addListener(async details => {
  if (details.reason === "install") {
    const { settings } = await chrome.storage.local.get("settings");
    if (!settings) {
      // Fresh install: snapshot the browser UI language into a concrete value
      // (en/zh-CN) instead of storing "auto". "auto" would otherwise be
      // re-resolved per surface with potentially different results. The user
      // can change it on the Settings page afterwards.
      const initial: UserSettings = { ...DEFAULT_SETTINGS, uiLanguage: resolveUiLang("auto", chrome.i18n.getUILanguage()) };
      await chrome.storage.local.set({ settings: initial });
    }
    // Welcome page after first install.
    await chrome.tabs.create({ url: "https://verbia.henriz.dev/getting-started?installed=1" });
  }
  // Uninstall “farewell” page, refreshed on every install/update.
  chrome.runtime.setUninstallURL("https://verbia.henriz.dev/goodbye").catch(() => undefined);
  await ensureContextMenu();
});

chrome.runtime.onStartup.addListener(() => { void ensureContextMenu(); });

// Captures PKCE code landings on the Supabase project root for both Google
// OAuth (tab opened by signInWithGoogle) and Magic Link emails (tab the user
// clicked from the email). The landing is a plain https navigation, so Chrome
// never blocks it the way it blocks 302s into chrome-extension:// pages. The
// PKCE verifier written when the flow was started lives in the shared
// storage, so exchangeCodeForSession can finish the login here even when no
// options page is open. Sign-in success closes the landing tab.
chrome.tabs.onUpdated.addListener((tabId, info) => {
  const url = info.url;
  if (!url || !url.startsWith(SUPABASE_URL)) return;
  let parsed: URL;
  try { parsed = new URL(url); } catch { return; }
  // Only the final landing on the project root carries the PKCE code. The
  // GoTrue /auth/v1/callback and /auth/v1/verify hops also sit on
  // SUPABASE_URL, but their parameters are not ours to exchange.
  if (parsed.pathname !== "/") return;
  const code = parsed.searchParams.get("code");
  if (!code) return;
  void captureSignInCode(tabId, code);
});

async function captureSignInCode(tabId: number, code: string): Promise<void> {
  if (!authEnabled) return;
  try {
    const { error } = await getSupabase().auth.exchangeCodeForSession(code);
    if (error) return; // stale link / verifier mismatch — leave the tab alone
    await chrome.tabs.remove(tabId).catch(() => undefined);
  } catch {
    // exchange threw (e.g. no verifier stored for this code) — ignore; the
    // user can re-request the magic link and start a fresh flow.
  }
}

// Menu titles cannot use the __MSG_ placeholder and are created at runtime,
// so keep them in the interface language chosen on the Settings page.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes.settings) return;
  const prev = changes.settings.oldValue as UserSettings | undefined;
  const next = changes.settings.newValue as UserSettings | undefined;
  if (!next || prev?.uiLanguage === next.uiLanguage) return;
  void refreshContextMenuTitle();
});

chrome.commands.onCommand.addListener(async command => {
  if (command !== "open-verbia") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) await activate(tab);
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== ADD_CONTEXT_MENU_ID || !tab?.id || !tab.url) return;
  const raw = (info.selectionText ?? "").trim();
  if (!raw) return;
  const selection: StagedSelection = {
    text: raw.slice(0, MAX_SELECTION_LENGTH),
    truncated: raw.length > MAX_SELECTION_LENGTH
  };
  void deliverSelectionToPage(tab.id, tab.url, selection);
});

async function ensureContextMenu() {
  try { chrome.contextMenus.removeAll(); } catch { /* menu not present yet */ }
  chrome.contextMenus.create({
    id: ADD_CONTEXT_MENU_ID,
    title: menuTitle(await resolvedUiLang()),
    contexts: ["selection"],
    // Menu items cannot be excluded per site; http(s) keeps it off the
    // browser's own pages. Reddit clicks are harmless: its content script is
    // always injected, so the selection merges or stages like anywhere else.
    documentUrlPatterns: ["http://*/*", "https://*/*"]
  });
}

async function refreshContextMenuTitle() {
  const title = menuTitle(await resolvedUiLang());
  try {
    chrome.contextMenus.update(ADD_CONTEXT_MENU_ID, { title });
    if (chrome.runtime.lastError) await ensureContextMenu();
  } catch { await ensureContextMenu(); }
}

function menuTitle(lang: UiLang): string {
  return UI_STRINGS[lang]["menu.addToContext"] ?? UI_STRINGS.en["menu.addToContext"] ?? "Add to Verbia context";
}

async function resolvedUiLang(): Promise<UiLang> {
  const { settings } = await chrome.storage.local.get("settings");
  const value = (settings ?? DEFAULT_SETTINGS) as UserSettings;
  return resolveUiLang(value.uiLanguage, chrome.i18n.getUILanguage());
}

// Right-click on selected text. Best case the content script merges it into
// an already-open panel (merged:true) and we are done. Otherwise the page
// shows a "added" toast and we stage the selection per tab for the next time
// Verbia opens — this never steals focus or interrupts the user's reading.
async function deliverSelectionToPage(tabId: number, pageUrl: string, selection: StagedSelection) {
  try {
    const response = await askPageToMerge(tabId, selection);
    if (!response?.merged) await stageSelection(tabId, pageUrl, selection);
  } catch {
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
      const response = await askPageToMerge(tabId, selection);
      if (!response?.merged) await stageSelection(tabId, pageUrl, selection);
    } catch (error) {
      // Not injectable (browser UI, restricted store pages…). Rare: the menu
      // item only appears on http(s) pages. Drop quietly instead of
      // interrupting the user with an error badge.
      console.error("Verbia could not add the selection on this page", error);
    }
  }
}

async function askPageToMerge(tabId: number, selection: StagedSelection) {
  return chrome.tabs.sendMessage(tabId, { type: "ADD_VERBIA_CONTEXT", payload: selection }) as Promise<{ ok?: boolean; merged?: boolean } | undefined>;
}

async function stageSelection(tabId: number, pageUrl: string, selection: StagedSelection) {
  const staged: StagedContext = { ...selection, pageUrl, updatedAt: Date.now() };
  await chrome.storage.session.set({ [stagedKeyFor(tabId)]: staged });
}

async function peekStagedContext(tabId: number): Promise<StagedContext | undefined> {
  const data = await chrome.storage.session.get(stagedKeyFor(tabId));
  return (data as Record<string, StagedContext | undefined>)[stagedKeyFor(tabId)];
}

async function clearStagedContext(tabId: number) {
  await chrome.storage.session.remove(stagedKeyFor(tabId));
}

async function activate(tab: chrome.tabs.Tab) {
  if (!tab.id || !tab.url || !/^https?:/.test(tab.url)) {
    await showActionError("Open a normal web page, focus an editor, and try again.");
    return;
  }
  // A selection staged from the right-click menu rides along on the open
  // request. It is cleared only once the page reports the panel actually
  // opened with it merged, so re-invoking without an editor keeps it intact.
  const staged = await peekStagedContext(tab.id);
  const message: ExtensionRequest = staged
    ? { type: "OPEN_VERBIA", source: "action", stagedSelection: { text: staged.text, truncated: staged.truncated } }
    : { type: "OPEN_VERBIA", source: "action" };
  try {
    const response = await chrome.tabs.sendMessage(tab.id, message);
    if (response?.ok && response.opened) await clearStagedContext(tab.id);
    await clearActionError();
  } catch {
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
      const response = await chrome.tabs.sendMessage(tab.id, message);
      if (response?.ok && response.opened) await clearStagedContext(tab.id);
      await clearActionError();
    } catch (error) {
      console.error("Verbia could not open on this page", error);
      await showActionError("Verbia could not open on this page.");
    }
  }
}

async function showActionError(title: string) {
  await chrome.action.setBadgeBackgroundColor({ color: "#9C3C34" });
  await chrome.action.setBadgeText({ text: "!" });
  await chrome.action.setTitle({ title });
}

async function clearActionError() {
  await chrome.action.setBadgeText({ text: "" });
  const lang = await resolvedUiLang();
  await chrome.action.setTitle({ title: UI_STRINGS[lang]["popup.dashboard"] ?? "Dashboard" });
}

chrome.runtime.onMessage.addListener((message: ExtensionRequest, _sender, sendResponse: (response: ExtensionResponse) => void) => {
  if (message.type === "GET_SETTINGS") {
    void getSettings().then(data => sendResponse({ ok: true, data })).catch(error => sendResponse(failure(error)));
    return true;
  }
  if (message.type === "SAVE_SETTINGS") {
    void chrome.storage.local.set({ settings: message.settings }).then(() => sendResponse({ ok: true, data: message.settings })).catch(error => sendResponse(failure(error)));
    return true;
  }
  if (message.type === "RESET_SETTINGS") {
    void chrome.storage.local.set({ settings: DEFAULT_SETTINGS }).then(() => sendResponse({ ok: true, data: { reset: true } })).catch(error => sendResponse(failure(error)));
    return true;
  }
  if (message.type === "CANCEL_GENERATION") {
    void chrome.storage.session.set({ cancelledRequestId: message.requestId }).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message.type === "GENERATE_REPLY") {
    void generate(message.payload).then(data => sendResponse({ ok: true, data })).catch(error => sendResponse(failure(error)));
    return true;
  }
  if (message.type === "GET_AUTH_STATE") {
    void accountSnapshot().then(data => sendResponse({ ok: true, data })).catch(error => sendResponse(failure(error)));
    return true;
  }
  if (message.type === "SIGN_OUT") {
    void signOut().then(() => sendResponse({ ok: true, data: { signedIn: false } })).catch(error => sendResponse(failure(error)));
    return true;
  }
});

async function getSettings(): Promise<UserSettings> {
  const { settings } = await chrome.storage.local.get("settings");
  return { ...DEFAULT_SETTINGS, ...(settings ?? {}) };
}

async function accountSnapshot(): Promise<AuthState> {
  const identity = await authSnapshot();
  if (!identity.signedIn) return identity;
  const [settings, bearer] = await Promise.all([getSettings(), authBearer()]);
  if (!bearer) return identity;
  try {
    let response = await fetch(`${apiBaseUrl(settings)}/v1/account/usage`, {
      headers: { authorization: bearer }
    });
    // A 401/403 usually means the access token was rejected server-side (for
    // example after a global sign-out on another surface). Refresh once; if the
    // server still refuses the session, treat the account as signed out so UI
    // never lingers on "signed in but usage unavailable".
    if (response.status === 401 || response.status === 403) {
      if (await refreshStoredSession()) {
        const freshBearer = await authBearer();
        if (freshBearer) {
          response = await fetch(`${apiBaseUrl(settings)}/v1/account/usage`, { headers: { authorization: freshBearer } });
        }
      }
    }
    if (response.status === 401 || response.status === 403) {
      await clearSession();
      return { signedIn: false };
    }
    if (!response.ok) return identity;
    const usage = await response.json() as AccountUsage;
    if ((usage.plan !== "free" && usage.plan !== "premium") || !Number.isFinite(usage.used) || (usage.limit !== null && !Number.isFinite(usage.limit))) return identity;
    return { ...identity, plan: usage.plan, usage: { used: usage.used, limit: usage.limit, resetsAt: usage.resetsAt } };
  } catch {
    return identity;
  }
}

async function generate(payload: unknown) {
  const request = generateReplyRequestSchema.parse(payload);
  await chrome.storage.session.set({ activeRequestId: request.requestId, phase: "generating", updatedAt: Date.now() });
  const settings = await getSettings();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    // Signed-in sessions ride along as a Bearer token so the gateway can
    // attribute usage to the account. Anonymous requests stay anonymous.
    const bearer = await authBearer();
    const response = await fetch(`${apiBaseUrl(settings)}/v1/replies:generate`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(bearer ? { authorization: bearer } : {}) },
      body: JSON.stringify(request),
      signal: controller.signal
    });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const serverError = body as { userMessage?: string; code?: string; retryable?: boolean; detail?: string } | null;
      throw Object.assign(new Error(serverError?.userMessage ?? `Generation service returned ${response.status}.`), { code: serverError?.code, retryable: serverError?.retryable, detail: serverError?.detail });
    }
    const result = generateReplyResponseSchema.parse(body);
    const session = await chrome.storage.session.get("cancelledRequestId");
    if (session.cancelledRequestId === request.requestId) throw Object.assign(new Error("Generation cancelled."), { code: "CANCELLED" });
    await chrome.storage.session.set({ activeRequestId: undefined, phase: "draft_ready", updatedAt: Date.now() });
    return result;
  } finally { clearTimeout(timeout); }
}

function failure(error: unknown): ExtensionResponse {
  const value = error as { message?: string; code?: string; retryable?: boolean; detail?: string; name?: string };
  return { ok: false, error: { code: value.code ?? (value.name === "AbortError" ? "TIMEOUT" : "PROVIDER_ERROR"), userMessage: value.name === "AbortError" ? "Generation timed out. Try again." : value.message ?? "Something went wrong.", retryable: value.retryable ?? true, detail: value.detail } };
}
