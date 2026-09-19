import { DEFAULT_SETTINGS, UI_STRINGS, contextExtractionRequestSchema, contextExtractionResponseSchema, generateReplyRequestSchema, generateReplyResponseSchema, replyStreamEventSchema, resolveUiLang, type AccountUsage, type AuthState, type ExtensionRequest, type ExtensionResponse, type ReplyStreamEvent, type StagedContext, type StagedSelection, type UiLang, type UserSettings } from "@verbia/shared";
import { WEB_AUTH_ORIGIN, authBearer, authSnapshot, clearSession, establishSessionFromTokenHash, refreshStoredSession, signOut } from "../auth/supabase";
import { ACTION_NOTICE_KEY } from "../runtime";
import { migrateOpenTabs, reloadContentScript } from "./migrate";

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
      const uiLanguage = resolveUiLang("auto", chrome.i18n.getUILanguage());
      const favoriteReplyLanguages = [...new Set([DEFAULT_SETTINGS.outputLanguage, uiLanguage])];
      const initial: UserSettings = {
        ...DEFAULT_SETTINGS,
        uiLanguage,
        favoriteReplyLanguages
      };
      await chrome.storage.local.set({ settings: initial });
    }
    // Welcome page after first install.
    await chrome.tabs.create({ url: "https://verbia.henriz.dev/getting-started?installed=1" });
  }
  // An update orphans the content script already running in every open tab, so
  // hand those tabs a fresh instance instead of leaving them broken until the
  // user happens to reload the page (see background/migrate.ts).
  if (details.reason === "update") {
    const migrated = await migrateOpenTabs();
    console.log(`[verbia] migrated ${migrated} open tab(s) to the new content script`);
  }
  // Uninstall “farewell” page, refreshed on every install/update.
  await refreshUninstallUrl();
  await ensureContextMenu();
});

chrome.runtime.onStartup.addListener(() => { void ensureContextMenu(); });

// Sign-in is no longer initiated from the extension, so there is nothing to
// capture here any more: the website signs the user in and the bridge hands the
// finished session over (@see syncWebsiteSignIn below, which is the one entry
// point that remains, and webSignInUrl in auth/supabase.ts for the button that
// opens the website).

// Menu titles cannot use the __MSG_ placeholder and are created at runtime,
// so keep them in the interface language chosen on the Settings page.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes.settings) return;
  const prev = changes.settings.oldValue as UserSettings | undefined;
  const next = changes.settings.newValue as UserSettings | undefined;
  if (!next || prev?.uiLanguage === next.uiLanguage) return;
  void refreshContextMenuTitle();
  void refreshUninstallUrl();
});

async function refreshUninstallUrl() {
  const language = await resolvedUiLang();
  const path = language === "zh-CN" ? "/zh/goodbye" : "/goodbye";
  const version = encodeURIComponent(chrome.runtime.getManifest().version);
  await chrome.runtime.setUninstallURL(`https://verbia.henriz.dev${path}?source=uninstall&version=${version}`);
}

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
      if (isScriptingBlocked(error)) console.debug("[verbia] selection blocked on", pageUrl, error);
      else console.error("Verbia could not add the selection on this page", error);
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
    await openNoticePopup(tab, "popup.noticeUnsupportedPage", "Open a normal web page, focus an editor, and try again.");
    return;
  }
  // The store page is not scriptable at all, so skip the doomed injection and
  // explain it instead of reporting a failure the user cannot act on.
  if (isStorePage(tab.url)) {
    await openNoticePopup(tab, "popup.noticeStorePage", hintForUrl(tab.url));
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
      // The tab is not without a content script — it has a dead one. Chrome only
      // cut its bindings, so its load marker is still on the page and would make
      // a plain injection a no-op (see background/migrate.ts).
      await reloadContentScript(tab.id, ["content.js"]);
      const response = await chrome.tabs.sendMessage(tab.id, message);
      if (response?.ok && response.opened) await clearStagedContext(tab.id);
      if (response?.opened) await clearActionError();
      else await showActionError(hintForUrl(tab.url));
    } catch (error) {
      if (isScriptingBlocked(error)) console.debug("[verbia] panel cannot open on", tab.url, error);
      else console.error("Verbia could not open on this page", error);
      await showActionError(hintForUrl(tab.url));
    }
  }
}

// Chrome refuses to inject any script into its own gallery, and Edge blocks its
// add-ons store the same way. Nothing can make the panel open there, so recognize
// the page up front instead of letting a guaranteed failure look like a bug.
const STORE_PAGE = /^https:\/\/chromewebstore\.google\.com(\/|$)|^https:\/\/chrome\.google\.com\/(webstore|extensions)(\/|$)|^https:\/\/microsoftedge\.microsoft\.com\/addons(\/|$)/i;

function isStorePage(url: string | undefined): boolean {
  return !!url && STORE_PAGE.test(url);
}

// Chrome's only signal is the message text ("The extensions gallery cannot be
// scripted."), so match it loosely: a page the browser refuses to script is
// expected, not a crash, and must not land in the extension's error list.
function isScriptingBlocked(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /cannot be scripted|extensions gallery/i.test(message);
}

function hintForUrl(url: string | undefined): string {
  if (!url) return "Verbia could not open on this page.";
  if (isStorePage(url)) return "Chrome and Edge block extensions on their store pages, so the panel cannot open here.";
  if (/^https:\/\/mail\.google\.com\//.test(url) || /^https:\/\/(www\.)?outlook\.(com|live\.com|office\.com)\//.test(url)) {
    return "Open a reply or new email window, then try again.";
  }
  if (/^https:\/\/(www\.)?reddit\.com\//.test(url)) {
    return "Focus a Reddit reply box, then try again.";
  }
  if (/^https:\/\/x\.com\//.test(url) || /^https:\/\/twitter\.com\//.test(url)) {
    return "Focus a reply composer, then try again.";
  }
  return "Focus a text editor on the page, then try again.";
}

// A page the browser refuses to script (store pages, browser UI, PDFs…) is the
// one case the badge explains badly: a tooltip holds one sentence, and there is
// no fix the user can apply. The popup is the only surface that can say so
// without a new permission, so stash the reason and open it. Chrome before 127
// has no openPopup — fall back to the badge there.
async function openNoticePopup(tab: chrome.tabs.Tab, noticeKey: string, fallbackHint: string) {
  try {
    await chrome.storage.session.set({ [ACTION_NOTICE_KEY]: noticeKey });
    await chrome.action.openPopup({ windowId: tab.windowId });
    await clearActionError();
  } catch (error) {
    console.debug("[verbia] could not open the notice popup", error);
    await chrome.storage.session.remove(ACTION_NOTICE_KEY);
    await showActionError(fallbackHint);
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

chrome.runtime.onMessage.addListener((message: ExtensionRequest, sender, sendResponse: (response: ExtensionResponse) => void) => {
  if (message.type === "OPEN_DASHBOARD") {
    void chrome.runtime.openOptionsPage().then(async () => {
      if (sender.tab?.id) await chrome.tabs.remove(sender.tab.id).catch(() => undefined);
      sendResponse({ ok: true });
    }).catch(error => sendResponse(failure(error)));
    return true;
  }
  if (message.type === "SYNC_WEB_SIGN_IN") {
    void syncWebsiteSignIn(message.accessToken, sender).then(() => sendResponse({ ok: true })).catch(error => sendResponse(failure(error)));
    return true;
  }
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
  if (message.type === "EXTRACT_CONTEXT") {
    void extractContext(message.payload).then(data => sendResponse({ ok: true, data })).catch(error => sendResponse(failure(error)));
    return true;
  }
  if (message.type === "GET_AUTH_STATE") {
    void accountSnapshot().then(data => sendResponse({ ok: true, data })).catch(error => sendResponse(failure(error)));
    return true;
  }
  if (message.type === "SIGN_OUT") {
    void signOut().then(broadcastWebSignOut).then(() => sendResponse({ ok: true, data: { signedIn: false } })).catch(error => sendResponse(failure(error)));
    return true;
  }
  if (message.type === "WEB_SIGNED_OUT") {
    if (!fromWebsite(sender)) {
      sendResponse(failure(new Error("Website sign-out source is not allowed")));
      return false;
    }
    // clearSession, not signOut: the website is the surface that just signed out,
    // and answering with a sign-out broadcast would only echo back to it.
    void clearSession().then(() => sendResponse({ ok: true })).catch(error => sendResponse(failure(error)));
    return true;
  }
});

chrome.runtime.onConnect.addListener(port => {
  if (port.name !== "verbia-reply-stream") return;
  let controller: AbortController | undefined;
  let requestId = "unknown";
  port.onMessage.addListener((message: { type?: string; payload?: unknown }) => {
    if (message.type === "cancel") {
      controller?.abort(new DOMException("Generation cancelled.", "AbortError"));
      return;
    }
    if (message.type !== "start" || controller) return;
    controller = new AbortController();
    void (async () => {
      try {
        const request = generateReplyRequestSchema.parse(message.payload);
        requestId = request.requestId;
        await generateStream(request, controller!.signal, event => port.postMessage(event));
      } catch (error) {
        if (controller?.signal.aborted) return;
        if ((error as { streamError?: boolean }).streamError) return;
        const failed = failure(error) as { ok: false; error: { code: string; userMessage: string; retryable: boolean; detail?: string } };
        try { port.postMessage({ type: "error", requestId, ...failed.error } satisfies ReplyStreamEvent); } catch { /* The panel closed. */ }
      }
    })();
  });
  port.onDisconnect.addListener(() => controller?.abort(new DOMException("Panel disconnected.", "AbortError")));
});

async function requestSessionHandoff(accessToken: string): Promise<string> {
  const settings = await getSettings();
  const response = await fetch(`${apiBaseUrl(settings)}/v1/auth/session-handoff`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error(`Session handoff returned ${response.status}`);
  const body = await response.json() as { tokenHash?: string };
  if (!body.tokenHash) throw new Error("Session handoff returned no token");
  return body.tokenHash;
}

// Pages allowed to hand a website session to the extension, and the only pages
// whose word on sign-out is taken. The origin is still checked strictly — the
// path list only says which of OUR pages may speak about credentials, and it
// stays an allowlist rather than "anything on the site" so a page that merely
// renders user content can never mint or end an extension session.
const SESSION_SYNC_PATHS = ["/account", "/account/callback", "/account/verify"];

function fromWebsiteAuthPage(sender: chrome.runtime.MessageSender): boolean {
  if (!sender.tab?.url) return false;
  try {
    const url = new URL(sender.tab.url);
    return url.origin === WEB_AUTH_ORIGIN && SESSION_SYNC_PATHS.includes(url.pathname);
  } catch {
    return false;
  }
}

// Any page of ours may report a sign-out, not just the auth pages: the website
// reports it whenever it happens to load while signed out, and this is the one
// message that cannot do more than sign a surface out. Signing *in* stays on the
// narrower list above, because that one mints a session.
function fromWebsite(sender: chrome.runtime.MessageSender): boolean {
  if (!sender.tab?.url) return false;
  try {
    return new URL(sender.tab.url).origin === WEB_AUTH_ORIGIN;
  } catch {
    return false;
  }
}

// Signing out is one state shared by both surfaces, so the extension's sign-out
// has to reach the website too. Open pages hear about it immediately; the marker
// signOut() left in storage is what covers a website with no tab open (@see
// bridge.ts, which reads it on its next load).
async function broadcastWebSignOut(): Promise<void> {
  const tabs = await chrome.tabs.query({ url: `${WEB_AUTH_ORIGIN}/*` });
  await Promise.all(tabs.map(tab => tab.id === undefined
    ? Promise.resolve()
    : chrome.tabs.sendMessage(tab.id, { type: "WEB_SIGN_OUT" }).catch(() => undefined)));
}

async function syncWebsiteSignIn(accessToken: string, sender: chrome.runtime.MessageSender): Promise<void> {
  if (!fromWebsiteAuthPage(sender)) throw new Error("Website sign-in sync source is not allowed");
  // The surfaces share one sign-in state, so a website that finds the extension
  // already signed in has nothing to hand over — and visiting the account page
  // must not quietly replace a good session with a fresh one every time.
  if ((await authSnapshot()).signedIn) return;
  const tokenHash = await requestSessionHandoff(accessToken);
  if (!await establishSessionFromTokenHash(tokenHash)) throw new Error("Could not establish the extension session");
}

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
    return { ...identity, plan: usage.plan, usage: { used: usage.used, limit: usage.limit, resetsAt: usage.resetsAt, premiumUntil: usage.premiumUntil } };
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

async function generateStream(request: ReturnType<typeof generateReplyRequestSchema.parse>, signal: AbortSignal, emit: (event: ReplyStreamEvent) => void) {
  await chrome.storage.session.set({ activeRequestId: request.requestId, phase: "generating", updatedAt: Date.now() });
  const settings = await getSettings();
  const bearer = await authBearer();
  const response = await fetch(`${apiBaseUrl(settings)}/v1/replies:generate`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/x-ndjson", ...(bearer ? { authorization: bearer } : {}) },
    body: JSON.stringify(request),
    signal
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { userMessage?: string; code?: string; retryable?: boolean; detail?: string } | null;
    throw Object.assign(new Error(body?.userMessage ?? `Generation service returned ${response.status}.`), { code: body?.code, retryable: body?.retryable, detail: body?.detail });
  }
  if ((response.headers.get("content-type") ?? "").includes("application/json")) {
    const result = generateReplyResponseSchema.parse(await response.json());
    emit({ type: "start", requestId: request.requestId });
    emit({ type: "delta", requestId: request.requestId, text: result.draft });
    emit({ type: "done", requestId: request.requestId, result });
    await chrome.storage.session.set({ activeRequestId: undefined, phase: "draft_ready", updatedAt: Date.now() });
    return;
  }
  if (!response.body) throw new Error("Generation service returned no response stream.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completed = false;
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (!line) continue;
        const event = replyStreamEventSchema.parse(JSON.parse(line));
        if (event.requestId !== request.requestId) continue;
        emit(event);
        if (event.type === "done") completed = true;
        if (event.type === "error") throw Object.assign(new Error(event.userMessage), event, { streamError: true });
      }
      if (done) break;
    }
    if (!completed) throw new Error("Generation stream ended before completion.");
    await chrome.storage.session.set({ activeRequestId: undefined, phase: "draft_ready", updatedAt: Date.now() });
  } finally { reader.releaseLock(); }
}

// The panel's "identify this email" button. Mirrors generate() — same gateway,
// same bearer, same error shape, and the daily counter is spent server-side the
// same way. There is no session state here: nothing is being generated, the
// answer only replaces the context this one panel is working from.
async function extractContext(payload: unknown) {
  const request = contextExtractionRequestSchema.parse(payload);
  const settings = await getSettings();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const bearer = await authBearer();
    const response = await fetch(`${apiBaseUrl(settings)}/v1/context:extract`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(bearer ? { authorization: bearer } : {}) },
      body: JSON.stringify(request),
      signal: controller.signal
    });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const serverError = body as { userMessage?: string; code?: string; retryable?: boolean; detail?: string } | null;
      throw Object.assign(new Error(serverError?.userMessage ?? `Context identification returned ${response.status}.`), { code: serverError?.code, retryable: serverError?.retryable, detail: serverError?.detail });
    }
    return contextExtractionResponseSchema.parse(body);
  } finally { clearTimeout(timeout); }
}

function failure(error: unknown): ExtensionResponse {
  const value = error as { message?: string; code?: string; retryable?: boolean; detail?: string; name?: string };
  return { ok: false, error: { code: value.code ?? (value.name === "AbortError" ? "TIMEOUT" : "PROVIDER_ERROR"), userMessage: value.name === "AbortError" ? "Generation timed out. Try again." : value.message ?? "Something went wrong.", retryable: value.retryable ?? true, detail: value.detail } };
}
