import { RedditAdapter } from "./adapters/reddit";
import { UniversalAdapter } from "./adapters/universal";
import { isSafeEditable, toTarget } from "./editor/editable";
import { VerbiaPanel } from "./ui/panel";
import { DEFAULT_SETTINGS, UI_STRINGS, resolveUiLang } from "@verbia/shared";

declare global { interface Window { __verbiaLoaded?: boolean; } }

if (!window.__verbiaLoaded) {
  window.__verbiaLoaded = true;
  const reddit = new RedditAdapter();
  const universal = new UniversalAdapter();
  const isReddit = reddit.matches(new URL(location.href));
  let lastEditable: HTMLElement | null = isSafeEditable(document.activeElement) ? document.activeElement : null;
  let panel: VerbiaPanel | undefined;
  let currentRef = "";
  let scanFrame = 0;

  document.addEventListener("focusin", event => {
    if (!isSafeEditable(event.target)) return;
    lastEditable = event.target;
    if (isReddit && reddit.findComposers().some(target => target.element === event.target)) {
      void showFor(event.target, reddit, false);
    }
  }, true);

  async function showFor(element: HTMLElement, adapter: RedditAdapter | UniversalAdapter, focusIntent: boolean) {
    const target = toTarget(element);
    if (target.ref === currentRef && document.querySelector("[data-verbia-root='true']")) {
      // Explicit re-invocation (shortcut/action) unfolds a folded panel in
      // place so typed content survives. Passive focus-in does not, so the
      // panel stays folded when the user simply clicks back into the editor.
      if (focusIntent) void panel?.unfoldIfCollapsed();
      return;
    }
    const context = await adapter.extractContext(target);
    if (panel) panel.update(target, context); else panel = new VerbiaPanel(adapter, target, context);
    currentRef = target.ref;
    panel.mountAfter(findReplyAnchor(element));
    await panel.open(focusIntent);
  }

  async function activate() {
    const element = isSafeEditable(document.activeElement) ? document.activeElement : lastEditable;
    const adapter = isReddit ? reddit : universal;
    const fallback = adapter.findComposers().at(-1)?.element ?? null;
    const chosen = element && isSafeEditable(element) ? element : fallback;
    if (!chosen) {
      await showFocusToast();
      return;
    }
    await showFor(chosen, adapter, true);
  }

  async function showFocusToast() {
    const { settings } = await chrome.storage.local.get("settings");
    const stored = (settings ?? DEFAULT_SETTINGS) as typeof DEFAULT_SETTINGS;
    const lang = resolveUiLang(stored.uiLanguage, chrome.i18n.getUILanguage());
    showToast(UI_STRINGS[lang]["content.toastFocusEditor"] ?? UI_STRINGS.en["content.toastFocusEditor"] ?? "Focus a text editor, then use the Verbia shortcut again.");
  }

  function scanReddit() {
    scanFrame = 0;
    if (document.querySelector("[data-verbia-root='true']")) return;
    const active = isSafeEditable(document.activeElement) ? document.activeElement : null;
    const composers = reddit.findComposers();
    const chosen = active && composers.some(item => item.element === active) ? active : composers.at(-1)?.element;
    if (chosen) void showFor(chosen, reddit, false);
  }

  if (isReddit) {
    scanReddit();
    const observerRoot = document.querySelector("shreddit-app, main, [role='main']") ?? document.body;
    const observer = new MutationObserver(() => {
      if (scanFrame) return;
      scanFrame = requestAnimationFrame(scanReddit);
    });
    observer.observe(observerRoot, { childList: true, subtree: true });
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type !== "OPEN_VERBIA") return;
    (async () => {
      try { await activate(); sendResponse({ ok: true }); }
      catch (error) { sendResponse({ ok: false, error: String(error) }); }
    })();
    return true;
  });
}

function findReplyAnchor(element: HTMLElement): Element {
  // Prefer the outer Reddit composer. Mounting beside an inner React-managed
  // form can make Reddit remove and recreate the panel while the user types.
  return element.closest("shreddit-composer")
    ?? element.closest("[data-testid*='composer']")
    ?? element.closest("form")
    ?? element.closest("faceplate-textarea-input")
    ?? element;
}

function showToast(message: string) {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.setAttribute("role", "status");
  Object.assign(toast.style, { position: "fixed", right: "20px", bottom: "20px", zIndex: "2147483647", background: "#172019", color: "white", padding: "12px 16px", borderRadius: "10px", font: "14px system-ui" });
  document.documentElement.append(toast);
  window.setTimeout(() => toast.remove(), 4_000);
}
