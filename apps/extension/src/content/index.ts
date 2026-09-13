import { GmailAdapter } from "./adapters/gmail";
import { RedditAdapter } from "./adapters/reddit";
import { UniversalAdapter } from "./adapters/universal";
import { OutlookAdapter } from "./adapters/outlook";
import { QqMailAdapter } from "./adapters/qqmail";
import { isSafeEditable, toTarget } from "./editor/editable";
import { claimPage, dropPanelRoots, ownsPage, PANEL_ROOT_SELECTOR } from "./page-claim";
import { extensionAlive, uiLanguage } from "../runtime";
import { VerbiaPanel } from "./ui/panel";
import { msgIcon, type MsgKind } from "../ui/message";
import { DEFAULT_SETTINGS, UI_STRINGS, resolveUiLang, type ContextEnvelope, type SiteAdapter, type StagedSelection } from "@verbia/shared";

// One content script instance per frame is the intent, but two can end up live
// on the same page (an update re-injecting over a running instance, or a second
// copy of Verbia installed alongside this one). Both would mount a panel, so the
// page is claimed on the document, where every instance — whatever JS world it
// runs in — can see who owns it (@see page-claim.ts).
declare global {
  interface Window {
    __verbiaLoaded?: boolean;
  }
}

if (!window.__verbiaLoaded) {
  window.__verbiaLoaded = true;
  // An extension update orphans the instance already running in this page —
  // Chrome cuts its bindings but cannot unload it — and the background re-injects
  // this file into every open tab to recover. Take over cleanly: drop the panel
  // shell a dead instance may have left behind (its shadow root is closed, so
  // nothing else can reach it), and claim the page so that instance — and any
  // other copy of Verbia running here — stops acting on a page this one owns.
  dropPanelRoots();
  const epoch = claimPage();
  const isCurrent = () => ownsPage(epoch);
  const reddit = new RedditAdapter();
  const gmail = new GmailAdapter();
  const universal = new UniversalAdapter();
  const outlook = new OutlookAdapter();
  const qqmail = new QqMailAdapter();
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
  const onOutlookHost = outlook.matches(url);
  // QQ Mail is a single-document SPA with no frames at all, so the host is the
  // whole check — its composer comes and goes with the route.
  const onQqMailHost = qqmail.matches(url);
  const isTopFrame = window === window.top;
  const startDormant = onGmailHost && !isTopFrame;

  if (startDormant) bootDormant();
  else bootActive();

  function bootActive() {
    const site: SiteAdapter = onQqMailHost ? qqmail : onOutlookHost ? outlook : onGmailHost ? gmail : reddit.matches(url) ? reddit : universal;
    const autoAdapter = site === reddit || site === gmail || site === outlook || site === qqmail ? site : null;

    let lastEditable: HTMLElement | null = isSafeEditable(document.activeElement) ? document.activeElement : null;
    let panel: VerbiaPanel | undefined;
    let currentRef = "";
    // Manual-dismissal marker. When the user closes the panel we record which
    // editor it was attached to and stop auto-opening for that editor — the
    // user closing it is an explicit "stop asking me here". The marker is only
    // lifted by an explicit summon (shortcut/action); focusing elsewhere does
    // not clear it, so returning to that editor stays silent too.
    let dismissedRef = "";
    let dismissHintShown = false;
    let scanFrame = 0;

    document.addEventListener("focusin", event => {
      if (!isCurrent()) return;
      if (!isSafeEditable(event.target)) return;
      lastEditable = event.target;
      const focusedRef = toTarget(event.target).ref;
      // A manually-dismissed editor stays silent: keep the marker and skip
      // auto-open until the user summons Verbia again.
      if (focusedRef === dismissedRef) return;
      if (autoAdapter && autoAdapter.findComposers().some(target => target.element === event.target)) {
        autoOpen(event.target, autoAdapter);
      }
    }, true);

    // focusin alone misses two real cases: an editor clicked while it already
    // holds focus (no focusin fires at all), and one whose box is still
    // zero-sized when focus lands (@see isSafeEditable rejects those, and the
    // mutation scan skips them because a panel is already mounted elsewhere on
    // the page). A click inside a composer the adapter recognises is an
    // unambiguous "open here", so it gets its own entry point.
    document.addEventListener("click", event => {
      if (!autoAdapter || !isCurrent()) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      // Cheap pre-filter first: the adapter scan below walks the whole document
      // and most clicks on a page are nowhere near an editor.
      if (!target?.closest("textarea, [contenteditable='true'], [role='textbox']")) return;
      const composer = autoAdapter.findComposers().find(item => item.element === target || item.element.contains(target));
      if (!composer) return;
      // A manually-dismissed editor stays silent here too, exactly like the
      // focus path.
      if (toTarget(composer.element).ref === dismissedRef) return;
      autoOpen(composer.element, autoAdapter);
    }, true);

    // Auto-open runs off page events (focus, DOM mutations) where a rejection
    // has nowhere to land: report it and keep the listener alive.
    function autoOpen(element: HTMLElement, adapter: SiteAdapter) {
      void showFor(element, adapter, false).catch(error => {
        console.warn("[verbia] panel could not open", error);
      });
    }

    // Returns true when a panel ended up open and rendered for this editor.
    async function showFor(element: HTMLElement, adapter: SiteAdapter, focusIntent: boolean, stagedSelection?: StagedSelection): Promise<boolean> {
      // A losing instance must not act at all: it would mount a second panel
      // next to the one the instance that owns the page is showing.
      if (!isCurrent()) return false;
      const target = toTarget(element);
      // Mail sites render the composer inline in the host page; float the panel
      // so it never becomes part of the outgoing message. Park it next to the
      // editor so the eye doesn't have to jump to the opposite corner of the
      // page. Everywhere else the panel is inlined right after the reply box.
      const floating = adapter === gmail || adapter === outlook || adapter === qqmail;
      const anchorFor = () => (floating ? element : findReplyAnchor(element));
      // Already open for this editor and still on the page: nothing to rebuild.
      // The check goes through the panel, not the document: host pages re-render
      // the subtree our host sits in (Reddit re-creates its composer on every
      // open), which detaches the node while a document query would still be
      // answered by some *other* stale root.
      if (target.ref === currentRef && panel?.isMounted()) {
        // Explicit re-invocation unfolds a folded panel in place so typed
        // content survives; passive focus-in never unfolds.
        if (stagedSelection) panel.mergeContextSelection(stagedSelection.text, stagedSelection.truncated);
        if (focusIntent) void panel.unfoldIfCollapsed();
        // An identification is an answer about the conversation that was on
        // screen when the user asked for it, and this panel outlives a switch to
        // the next message. Keeping that answer would be worse than the read it
        // replaced, so the page is read again and the answer dropped.
        if (panel.dropsStaleIdentification()) {
          panel.update(target, await adapter.extractContext(target), anchorFor());
          await panel.open(false);
          return true;
        }
        // The panel owns this editor now, so nothing below re-reads the page —
        // but the page may have caught up since the first read (see the method).
        void panel.refreshContextIfEmpty();
        return true;
      }
      // This content script is orphaned: the extension was reloaded, updated or
      // disabled while the tab stayed open, so every chrome.* call throws and
      // nothing we mount could work. Only a page reload installs a live copy —
      // tell the user that instead of failing silently.
      if (!extensionAlive()) {
        // …unless a newer instance already took over this page (the background
        // re-injects on update), in which case the panel works and this advice
        // would send the user to refresh a perfectly good tab.
        if (isCurrent()) await showToastFor("content.needsReload", "Verbia was updated. Refresh this page to use it again.", "warning");
        return false;
      }
      const base = await adapter.extractContext(target);
      const context = applyStagedSelection(base, stagedSelection);
      // The page read above is the one await that matters: a newer instance can
      // take the page over while it is in flight, and everything below — the
      // panel included — would then be built a second time.
      if (!isCurrent()) return false;
      const mountAnchor = anchorFor();
      // Focus and click arrive as two separate events, and an explicit summon can
      // race the auto-open, so two invocations can both clear the check at the top
      // and meet again only here — after the page read. Whoever lands second must
      // adopt the panel the first one mounted; without this the page ends up with
      // two stacked panels.
      if (panel && currentRef === target.ref) {
        panel.update(target, context, mountAnchor);
        if (focusIntent) void panel.unfoldIfCollapsed();
        return true;
      }
      if (panel) {
        panel.update(target, context, mountAnchor);
      } else {
        // Last line of defence: whatever shell is on this page is not ours to
        // keep, so it goes before ours arrives. An instance that ignores the
        // page claim (an older build, a second copy) cannot leave its panel
        // standing next to this one.
        dropPanelRoots();
        panel = new VerbiaPanel(adapter, target, context, () => {
          // User closed the panel: remember this editor so auto-open leaves it
          // alone until they explicitly summon Verbia again.
          dismissedRef = currentRef;
          currentRef = "";
          panel = undefined;
          void notifyDismissedOnce();
        });
        if (floating) panel.mountFloating(element);
        else panel.mountAfter(mountAnchor);
      }
      // The page may have thrown our host away since the last render; put it
      // back before drawing into it.
      panel.ensureMounted(mountAnchor);
      currentRef = target.ref;
      try {
        await panel.open(focusIntent);
      } catch (error) {
        // Never leave an editor marked as "open with an invisible panel": that
        // swallows every later summon for it, the shortcut included.
        currentRef = "";
        throw error;
      }
      return true;
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
      if (!isCurrent()) return false;
      const element = isSafeEditable(document.activeElement) ? document.activeElement : lastEditable;
      const fallback = site.findComposers().at(-1)?.element ?? null;
      const chosen = element && isSafeEditable(element) ? element : fallback;
      if (!chosen) {
        await showToastFor("content.toastFocusEditor", "Focus a text editor, then use the Verbia shortcut again.", "info");
        return false;
      }
      const shown = await showFor(chosen, site, true, stagedSelection);
      // An explicit summon (shortcut / action) lifts the manual dismissal so
      // auto-open for this editor behaves normally from now on.
      if (shown) dismissedRef = "";
      return shown;
    }

    // Right-click → "Add to Verbia context".
    async function addContextFromMenu(selection: StagedSelection): Promise<boolean> {
      if (!isCurrent()) return false;
      if (panel?.mergeContextSelection(selection.text, selection.truncated)) return true;
      await showToastFor("content.contextStaged", "Added to Verbia context.", "success");
      return false;
    }

    async function showToastFor(key: string, fallback: string, kind: MsgKind = "info") {
      // Best-effort read: this throws once the extension is gone, and "reload
      // the page" is precisely the toast we still need to be able to show.
      let stored: typeof DEFAULT_SETTINGS = DEFAULT_SETTINGS;
      try {
        const { settings } = await chrome.storage.local.get("settings");
        if (settings) stored = settings as typeof DEFAULT_SETTINGS;
      } catch {
        // Orphaned context: fall back to the bundled defaults.
      }
      const lang = resolveUiLang(stored.uiLanguage, uiLanguage());
      showToast(UI_STRINGS[lang][key] ?? UI_STRINGS.en[key] ?? fallback, kind);
    }

    // Closing the panel explicitly means "stop showing Verbia on this editor".
    // Tell the user once per page session how to summon it back.
    function notifyDismissedOnce() {
      if (dismissHintShown) return;
      dismissHintShown = true;
      void showToastFor("content.dismissHint", "Panel closed. Press the Verbia shortcut to reopen.", "info");
    }

    // Auto-open on a focused/visible composer for adapters that support it
    // (Reddit, Gmail). Universal mode stays manual.
    function scanComposer() {
      scanFrame = 0;
      if (!autoAdapter || !isCurrent() || document.querySelector(PANEL_ROOT_SELECTOR)) return;
      const active = isSafeEditable(document.activeElement) ? document.activeElement : null;
      const composers = autoAdapter.findComposers();
      const chosen = active && composers.some(item => item.element === active) ? active : composers.at(-1)?.element;
      if (!chosen) return;
      const ref = toTarget(chosen).ref;
      if (ref === dismissedRef) return;
      autoOpen(chosen, autoAdapter);
    }

    if (autoAdapter) {
      scanComposer();
      const observerRoot = (autoAdapter === reddit ? document.querySelector("shreddit-app, main, [role='main']") : document.body) ?? document.body;
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
