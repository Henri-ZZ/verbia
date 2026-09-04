import { DEFAULT_SETTINGS, generateReplyRequestSchema, generateReplyResponseSchema, resolveUiLang, type ExtensionRequest, type ExtensionResponse, type UserSettings } from "@verbia/shared";

chrome.runtime.onInstalled.addListener(async details => {
  if (details.reason !== "install") return;
  const { settings } = await chrome.storage.local.get("settings");
  if (settings) return;
  // Fresh install: snapshot the browser UI language into a concrete value
  // (en/zh-CN) instead of storing "auto". "auto" would otherwise be re-resolved
  // per surface with potentially different results. The user can change it on
  // the Settings page afterwards.
  const initial: UserSettings = { ...DEFAULT_SETTINGS, uiLanguage: resolveUiLang("auto", chrome.i18n.getUILanguage()) };
  await chrome.storage.local.set({ settings: initial });
});

chrome.commands.onCommand.addListener(async command => {
  if (command !== "open-verbia") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) await activate(tab);
});

async function activate(tab: chrome.tabs.Tab) {
  if (!tab.id || !tab.url || !/^https?:/.test(tab.url)) {
    await showActionError("Open a normal web page, focus an editor, and try again.");
    return;
  }
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "OPEN_VERBIA", source: "action" });
    await clearActionError();
  } catch {
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
      await chrome.tabs.sendMessage(tab.id, { type: "OPEN_VERBIA", source: "action" });
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
  await chrome.action.setTitle({ title: "Open Verbia" });
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
});

async function getSettings(): Promise<UserSettings> {
  const { settings } = await chrome.storage.local.get("settings");
  return { ...DEFAULT_SETTINGS, ...(settings ?? {}) };
}

async function generate(payload: unknown) {
  const request = generateReplyRequestSchema.parse(payload);
  await chrome.storage.session.set({ activeRequestId: request.requestId, phase: "generating", updatedAt: Date.now() });
  const settings = await getSettings();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`${settings.backendBaseUrl.replace(/\/$/, "")}/v1/replies:generate`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request), signal: controller.signal
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
