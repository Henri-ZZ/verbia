import { RedditAdapter } from "./adapters/reddit";
import { UniversalAdapter } from "./adapters/universal";
import { isSafeEditable, toTarget } from "./editor/editable";
import { VerbiaPanel } from "./ui/panel";
import { msgIcon, type MsgKind } from "../ui/message";
import { DEFAULT_SETTINGS, UI_STRINGS, resolveUiLang, type ContextEnvelope, type StagedSelection } from "@verbia/shared";

declare global { interface Window { __verbiaLoaded?: boolean; } }

if (!window.__verbiaLoaded) {
  window.__verbiaLoaded = true;
  const reddit = new RedditAdapter();
  const universal = new UniversalAdapter();
  const isReddit = reddit.matches(new URL(location.href));
  let lastEditable: HTMLElement | null = isSafeEditable(document.activeElement) ? document.activeElement : null;
  let panel: VerbiaPanel | undefined;
  let currentRef = "";
  let dismissedRef = "";
  let ignoreNextFocusRef = "";
  let scanFrame = 0;

  document.addEventListener("focusin", event => {
    if (!isSafeEditable(event.target)) return;
    lastEditable = event.target;
    const focusedRef = toTarget(event.target).ref;
    // destroy() restores focus to the editor. Ignore that synthetic return
    // once so removing the panel does not immediately recreate it.
    if (focusedRef === ignoreNextFocusRef) { ignoreNextFocusRef = ""; return; }
    dismissedRef = "";
    if (isReddit && reddit.findComposers().some(target => target.element === event.target)) {
      void showFor(event.target, reddit, false);
    }
  }, true);

  async function showFor(element: HTMLElement, adapter: RedditAdapter | UniversalAdapter, focusIntent: boolean, stagedSelection?: StagedSelection) {
    const target = toTarget(element);
    if (target.ref === currentRef && document.querySelector("[data-verbia-root='true']")) {
      // Explicit re-invocation (shortcut/action) unfolds a folded panel in
      // place so typed content survives. Passive focus-in does not, so the
      // panel stays folded when the user simply clicks back into the editor.
      // A staged right-click selection merges into the open panel either way.
      if (stagedSelection) panel?.mergeContextSelection(stagedSelection.text, stagedSelection.truncated);
      if (focusIntent) void panel?.unfoldIfCollapsed();
      return;
    }
    const base = await adapter.extractContext(target);
    const context = applyStagedSelection(base, stagedSelection);
    if (panel) panel.update(target, context); else panel = new VerbiaPanel(adapter, target, context, () => {
      dismissedRef = currentRef;
      ignoreNextFocusRef = currentRef;
      currentRef = "";
      panel = undefined;
    });
    currentRef = target.ref;
    panel.mountAfter(findReplyAnchor(element));
    await panel.open(focusIntent);
  }

  // A selection staged from the right-click menu wins over whatever the page
  // currently has selected: by the time Verbia opens the user has usually
  // clicked into an editor, which clears window.getSelection().
  function applyStagedSelection(base: ContextEnvelope, staged?: StagedSelection): ContextEnvelope {
    if (!staged) return base;
    return { ...base, relation: "selected_text", selectedText: staged.text, truncated: base.truncated || staged.truncated, confidence: "high" };
  }

  // Returns true when a panel was open/opened for this invocation. The
  // background clears its per-tab staged selection only when this is true.
  async function activate(stagedSelection?: StagedSelection): Promise<boolean> {
    const element = isSafeEditable(document.activeElement) ? document.activeElement : lastEditable;
    const adapter = isReddit ? reddit : universal;
    const fallback = adapter.findComposers().at(-1)?.element ?? null;
    const chosen = element && isSafeEditable(element) ? element : fallback;
    if (!chosen) {
      await showToastFor("content.toastFocusEditor", "Focus a text editor, then use the Verbia shortcut again.", "info");
      return false;
    }
    await showFor(chosen, adapter, true, stagedSelection);
    return true;
  }

  // Right-click → "Add to Verbia context". Merges into an already-open panel;
  // otherwise confirm with a toast and report back so the background stages
  // the selection per tab for the next time Verbia opens on this page.
  async function addContextFromMenu(selection: StagedSelection): Promise<boolean> {
    if (panel?.mergeContextSelection(selection.text, selection.truncated)) return true;
    await showToastFor("content.contextStaged", "Added to Verbia context.", "success");
    return false;
  }

  async function showToastFor(key: string, fallback: string, kind: MsgKind = "info") {
    const { settings } = await chrome.storage.local.get("settings");
    const stored = (settings ?? DEFAULT_SETTINGS) as typeof DEFAULT_SETTINGS;
    const lang = resolveUiLang(stored.uiLanguage, chrome.i18n.getUILanguage());
    showToast(UI_STRINGS[lang][key] ?? UI_STRINGS.en[key] ?? fallback, kind);
  }

  function scanReddit() {
    scanFrame = 0;
    if (document.querySelector("[data-verbia-root='true']")) return;
    const active = isSafeEditable(document.activeElement) ? document.activeElement : null;
    const composers = reddit.findComposers();
    const chosen = active && composers.some(item => item.element === active) ? active : composers.at(-1)?.element;
    if (chosen && toTarget(chosen).ref === dismissedRef) return;
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
    if (message.type === "OPEN_VERBIA") {
      (async () => {
        try {
          const opened = await activate(message.stagedSelection as StagedSelection | undefined);
          sendResponse({ ok: true, opened });
        } catch (error) { sendResponse({ ok: false, error: String(error) }); }
      })();
      return true;
    }
    if (message.type === "ADD_VERBIA_CONTEXT") {
      (async () => {
        try {
          const merged = await addContextFromMenu(message.payload as StagedSelection);
          sendResponse({ ok: true, merged });
        } catch (error) { sendResponse({ ok: false, error: String(error) }); }
      })();
      return true;
    }
    return false;
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

function showToast(message: string, kind: MsgKind = "info") {
  const toast = document.createElement("div");
  // The page-level toast sits on a dark surface (the page can be light or
  // dark), so its text stays white; the kind icon carries the meaning and
  // colour, mirroring the typed rows used inside Verbia's own surfaces.
  Object.assign(toast.style, { position: "fixed", right: "20px", bottom: "20px", zIndex: "2147483647", display: "flex", alignItems: "center", gap: "10px", background: "#172019", color: "white", padding: "12px 16px", borderRadius: "10px", font: "14px system-ui", boxShadow: "0 8px 24px rgba(23,32,25,.25)" });
  const icon = msgIcon(kind, 16);
  // The toast lives in the host page's DOM, where site CSS can target bare
  // img elements; pin its box so it renders as the icon author drew it.
  Object.assign(icon.style, { flex: "none", display: "block", border: "0", borderRadius: "0", margin: "0", maxWidth: "none" });
  toast.append(icon, document.createTextNode(message));
  toast.setAttribute("role", "status");
  document.documentElement.append(toast);
  window.setTimeout(() => toast.remove(), 4_000);
}
