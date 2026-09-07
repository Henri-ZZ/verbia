import { GmailAdapter } from "./adapters/gmail";
import { RedditAdapter } from "./adapters/reddit";
import { UniversalAdapter } from "./adapters/universal";
import { isSafeEditable, toTarget } from "./editor/editable";
import { VerbiaPanel } from "./ui/panel";
import { msgIcon, type MsgKind } from "../ui/message";
import { DEFAULT_SETTINGS, UI_STRINGS, resolveUiLang, type ContextEnvelope, type SiteAdapter, type StagedSelection } from "@verbia/shared";

declare global { interface Window { __verbiaLoaded?: boolean; } }

if (!window.__verbiaLoaded) {
  window.__verbiaLoaded = true;
  const reddit = new RedditAdapter();
  const gmail = new GmailAdapter();
  const universal = new UniversalAdapter();
  const url = new URL(location.href);

  // Gmail injects the content script into every frame of mail.google.com
  // (all_frames + match_about_blank). Modern Gmail renders the composer
  // inline in the *top* document (the editor with aria-label="Message
  // Body" lives in the main frame, not a sub-frame), so the top frame must
  // always be active — it can react once the user clicks Reply. Sub-frames
  // (chat, sidebar, etc.) start dormant and promote to active only if a
  // composer eventually shows up inside them, which keeps non-editor
  // frames from ever showing a panel.
  const onGmailHost = /(^|\.)mail\.google\.com$/.test(url.hostname) ||
    (url.protocol === "about:" && (() => { try { return window.parent !== window && /(^|\.)mail\.google\.com$/.test(window.parent.location.hostname); } catch { return false; } })());
  const isTopFrame = window === window.top;
  const startDormant = onGmailHost && !isTopFrame;

  if (startDormant) bootDormant();
  else bootActive();

  function bootActive() {
    const site: SiteAdapter = onGmailHost ? gmail : reddit.matches(url) ? reddit : universal;
    const autoAdapter = site === reddit || site === gmail ? site : null;

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
      if (autoAdapter && autoAdapter.findComposers().some(target => target.element === event.target)) {
        void showFor(event.target, autoAdapter, false);
      }
    }, true);

    async function showFor(element: HTMLElement, adapter: SiteAdapter, focusIntent: boolean, stagedSelection?: StagedSelection) {
      const target = toTarget(element);
      if (target.ref === currentRef && document.querySelector("[data-verbia-root='true']")) {
        // Explicit re-invocation unfolds a folded panel in place so typed
        // content survives; passive focus-in never unfolds.
        if (stagedSelection) panel?.mergeContextSelection(stagedSelection.text, stagedSelection.truncated);
        if (focusIntent) void panel?.unfoldIfCollapsed();
        return;
      }
      const base = await adapter.extractContext(target);
      const context = applyStagedSelection(base, stagedSelection);
      if (panel) {
        panel.update(target, context);
      } else {
        panel = new VerbiaPanel(adapter, target, context, () => {
          dismissedRef = currentRef;
          ignoreNextFocusRef = currentRef;
          currentRef = "";
          panel = undefined;
        });
        if (adapter === gmail) {
          // Gmail renders the composer inline in the host page (or in a
          // compose sub-frame on older layouts); float the panel so it
          // never becomes part of the outgoing email. Park it next to the
          // editor so the user's eye doesn't have to jump to the opposite
          // corner of the page.
          panel.mountFloating(element);
        } else {
          panel.mountAfter(findReplyAnchor(element));
        }
      }
      currentRef = target.ref;
      await panel.open(focusIntent);
    }

    // A selection staged from the right-click menu wins over whatever the page
    // currently has selected: by the time Verbia opens the user has usually
    // clicked into an editor, which clears window.getSelection().
    function applyStagedSelection(base: ContextEnvelope, staged?: StagedSelection): ContextEnvelope {
      if (!staged) return base;
      return { ...base, relation: "selected_text", selectedText: staged.text, truncated: base.truncated || staged.truncated, confidence: "high" };
    }

    // Returns true when a panel was open/opened for this invocation.
    async function activate(stagedSelection?: StagedSelection): Promise<boolean> {
      const element = isSafeEditable(document.activeElement) ? document.activeElement : lastEditable;
      const fallback = site.findComposers().at(-1)?.element ?? null;
      const chosen = element && isSafeEditable(element) ? element : fallback;
      if (!chosen) {
        await showToastFor("content.toastFocusEditor", "Focus a text editor, then use the Verbia shortcut again.", "info");
        return false;
      }
      await showFor(chosen, site, true, stagedSelection);
      return true;
    }

    // Right-click → "Add to Verbia context".
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

    // Auto-open on a focused/visible composer for adapters that support it
    // (Reddit, Gmail). Universal mode stays manual.
    function scanComposer() {
      scanFrame = 0;
      if (!autoAdapter || document.querySelector("[data-verbia-root='true']")) return;
      const active = isSafeEditable(document.activeElement) ? document.activeElement : null;
      const composers = autoAdapter.findComposers();
      const chosen = active && composers.some(item => item.element === active) ? active : composers.at(-1)?.element;
      if (!chosen) return;
      const ref = toTarget(chosen).ref;
      if (ref === dismissedRef) return;
      void showFor(chosen, autoAdapter, false);
    }

    if (autoAdapter) {
      scanComposer();
      const observerRoot = (autoAdapter === gmail ? document.body : document.querySelector("shreddit-app, main, [role='main']")) ?? document.body;
      const observer = new MutationObserver(() => {
        if (scanFrame) return;
        scanFrame = requestAnimationFrame(scanComposer);
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

  function bootDormant() {
    // Dormant Gmail sub-frame (chat, sidebar, ads, etc.). It stays passive
    // until either a composer appears inside this frame (legacy pop-out
    // compose) or we receive an OPEN_VERBIA from background. The minimal
    // listener answers sendMessage so the background does not get
    // "Receiving end does not exist" and can show a focused hint instead.
    let promoted = false;
    const dormantListener = (message: { type?: string }, _sender: chrome.runtime.MessageSender, sendResponse: (response: unknown) => void) => {
      if (message.type === "OPEN_VERBIA") {
        sendResponse({ ok: true, opened: false, reason: "no_composer" });
        return false;
      }
      if (message.type === "ADD_VERBIA_CONTEXT") {
        sendResponse({ ok: true, merged: false });
        return false;
      }
      return false;
    };
    chrome.runtime.onMessage.addListener(dormantListener);

    const promote = () => {
      if (promoted) return;
      if (!gmail.matches(url)) return;
      promoted = true;
      observer.disconnect();
      chrome.runtime.onMessage.removeListener(dormantListener);
      bootActive();
    };
    const observer = new MutationObserver(promote);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    // The editor may already be in the DOM at script load — check now.
    promote();
  }
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
