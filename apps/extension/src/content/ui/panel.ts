import type { ContextEnvelope, ContextExtractionRequest, ContextExtractionResponse, EditableTarget, GenerateReplyRequest, GenerateReplyResponse, SiteAdapter, UiLang, UserSettings } from "@verbia/shared";
import { DEFAULT_SETTINGS, LENGTH_VALUES, REPLY_LANGUAGE_OPTIONS, TONE_VALUES, UI_STRINGS, isRtl, resolveUiLang, voiceTagFor } from "@verbia/shared";
import { readEditable } from "../editor/editable";
import { COLLECTOR_VERSION, collectLocalContext, collectProvidedRegion, regionFingerprint, type CollectedContext } from "../context/collector";
import { isMailSite, type SiteMode } from "../site-mode";
import { contextFromExtraction } from "../context/mapping";
import { extensionVersion, runtimeUrl, sendToBackground, uiLanguage } from "../../runtime";
import { msgColor, msgIcon, type MsgKind } from "../../ui/message";

// Every background reply is an ExtensionResponse; each caller knows which
// `data` variant it asked for, so it narrows the union locally instead of
// fighting the shared union type.
type Reply<T> = { ok?: boolean; data?: T; error?: { code?: string; userMessage?: string; detail?: string } };

const styles = `
:host{all:initial;display:block;inline-size:100%;color-scheme:light;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#172019}
*,*::before,*::after{box-sizing:border-box}button,textarea,select,input{font:inherit}button{cursor:pointer}.panel :focus-visible{outline:1.5px solid #9FE1CB;outline-offset:1px}:host(.is-dragging){cursor:grabbing}:host(.is-dragging) .head{cursor:grabbing}:host(.floating) .inline-shell{margin-block-start:0}:host([dir="rtl"]){direction:rtl}
.inline-shell{display:block;inline-size:100%;margin-block-start:10px;container-type:inline-size;contain:layout style paint}.panel{inline-size:100%;overflow:auto;background:#fbfcf7;border:1px solid #dfe7dd;border-radius:12px;box-shadow:0 1px 2px #1720190a,0 6px 18px #17201912;padding:14px}.head{display:flex;align-items:center;justify-content:space-between;cursor:grab;touch-action:none}.brand{font:800 18px/1 Georgia,serif;color:#0F6E56;margin:0}.brand .wordmark{display:block;height:30px;width:auto}.slogan{font-size:.75rem;color:#33604E;margin:4px 0 0;font-weight:700}.icon{display:grid;place-items:center;min-inline-size:30px;min-block-size:30px;border:0;border-radius:8px;background:transparent;color:#526057;padding:0;transition:background .15s ease}.icon:hover{background:#e8efe9}.icon svg{inline-size:16px;block-size:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:transform .18s ease}.panel.collapsed .icon svg{transform:rotate(180deg)}.panel.collapsed{padding-block:6px}.panel.collapsed .panel-body{display:none}.panel.collapsed .slogan{display:none}.chip{display:inline-flex;margin:12px 0 8px;padding:6px 9px;border-radius:999px;background:#E1F5EE;color:#0F6E56;font-size:.75rem;font-weight:700}.warning{background:#fff2cf;color:#6f4b00;padding:8px 10px;border-radius:9px;font-size:.75rem;margin:6px 0}.context{border:1px solid #dfe7dd;border-radius:10px;margin:0 0 12px}.context summary{padding:9px 11px;cursor:pointer;font-size:.8rem;font-weight:700}.context-body{padding:0 11px 9px;white-space:pre-wrap;max-block-size:150px;overflow:auto;font-size:.75rem;color:#526057}.remove-context{margin:0 11px 9px;border:0;background:transparent;color:#9c3c34;padding:0;text-decoration:underline;font-size:.75rem}
label{display:block;font-size:.75rem;font-weight:750;color:#39483e;margin:10px 0 5px}.intent,.draft{inline-size:100%;resize:vertical;min-block-size:84px;border:1px solid #cad6cc;background:white;border-radius:10px;padding:9px 10px;line-height:1.45}.draft{min-block-size:100px}select{inline-size:100%;min-block-size:32px;appearance:none;-webkit-appearance:none;border:1px solid #cad6cc;border-radius:9px;background-color:#fff;padding:6px 27px 6px 9px;font-size:.78rem;font-weight:600;color:#1b2a20;cursor:pointer;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%23526d5c' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M4 6.5L8 10.5L12 6.5'/></svg>");background-repeat:no-repeat;background-position:right 8px center;background-size:14px 14px;transition:border-color .15s ease,box-shadow .15s ease}
select:hover{border-color:#8fae9b}
select:focus-visible{border-color:#0F6E56;box-shadow:0 0 0 1px #0F6E5626}
.head-actions{display:flex;align-items:center;gap:2px}.remove-panel{display:none;color:#87362f}.remove-panel:hover{background:#fae3df}.panel.collapsed .remove-panel{display:grid}.panel.collapsed .head-actions .icon svg{transform:none}.panel.collapsed .head-actions [data-action="collapse"] svg{transform:rotate(180deg)}
.row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-block-start:10px}
.language-control{display:grid;grid-template-columns:minmax(0,1fr) 32px;gap:5px}.language-more{display:grid;place-items:center;min-block-size:32px;border:1px solid #cad6cc;border-radius:9px;background:#fff;color:#355143;font-weight:800;cursor:pointer}.language-more:hover{border-color:#8fae9b;background:#f4f8f5}.language-dialog{inline-size:min(390px,calc(100% - 24px));max-block-size:min(520px,calc(100% - 24px));margin:auto;border:1px solid #d3ded5;border-radius:14px;padding:0;background:#fff;color:#172019;box-shadow:0 20px 60px #17201938}.language-dialog::backdrop{background:#17201966}.language-dialog-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:15px 15px 10px}.language-dialog-head strong{font-size:.9rem}.language-dialog-head p{margin:3px 0 0;color:#718078;font-size:.68rem}.dialog-close{display:grid;place-items:center;flex:none;inline-size:30px;block-size:30px;border:0;border-radius:8px;background:#edf2ed;color:#526159;font-size:1.2rem}.language-search{inline-size:calc(100% - 30px);min-block-size:34px;margin:0 15px 9px;border:1px solid #cad6cc;border-radius:9px;padding:7px 9px}.language-results{max-block-size:330px;overflow:auto;border-block-start:1px solid #edf1ed;padding:6px}.language-result{display:flex;align-items:center;justify-content:space-between;inline-size:100%;min-block-size:36px;border:0;border-radius:8px;padding:7px 9px;background:transparent;color:#172019;font-size:.75rem;font-weight:700;text-align:start}.language-result:hover{background:#edf6f0}.language-result small{color:#86928a;font-size:.62rem}
.identify{display:flex;flex-direction:column;align-items:flex-start;gap:6px;margin-block-start:10px}.identify-status{margin:0;font-size:.75rem;line-height:1.4;color:#526057}.identify-status.error{color:#9c3c34}.identify-hint{margin:0;font-size:.7rem;line-height:1.4;color:#718078}.primary,.secondary,.danger{min-block-size:32px;border:0;border-radius:9px;padding:8px 12px;font-weight:750}.primary{background:#0F6E56;color:white}.secondary{background:#e7eee8;color:#214531}.danger{background:#fae3df;color:#87362f}.primary:disabled,.secondary:disabled{opacity:.45;cursor:not-allowed}.status{min-block-size:18px;margin:8px 0 0;color:#526057;font-size:.75rem;display:flex;align-items:center;gap:6px}.status img{inline-size:14px;block-size:14px;flex:none}.status.recording{display:block;color:#a72c25;font-weight:800}.foot{font-size:.7rem;color:#718078;margin:10px 0 0}.insert-choice{border:1px solid #efcf8b;background:#fff9e8;padding:10px;border-radius:10px;margin-block-start:10px}.hidden{display:none!important}@container (max-width:380px){.row{grid-template-columns:1fr}}
`;

type Phase = "idle" | "context_ready" | "recording" | "generating" | "draft_ready" | "inserting" | "inserted" | "error";

// A context with nothing to send: a fresh compose box, or a page read that ran
// before the composer had rendered what it is answering. Distinguishes "the page
// has nothing for us" from "we looked too early" (see refreshContextIfEmpty).
// How much new text the widened second pass has to bring in before it is worth
// another model call: a wrapper's own chrome is not a reason to ask again.
const WIDEN_MIN_GAIN = 60;

const hasContextBody = (context: ContextEnvelope): boolean =>
  Boolean(context.selectedText || context.target?.body || context.post?.body || context.post?.title || context.ancestors?.length);

export class VerbiaPanel {
  private host = document.createElement("div");
  private root = this.host.attachShadow({ mode: "closed" });
  private target: EditableTarget;
  private context: ContextEnvelope;
  private settings: UserSettings = DEFAULT_SETTINGS;
  private lang: UiLang = "en";
  private t(key: string) { return UI_STRINGS[this.lang][key] ?? UI_STRINGS.en[key] ?? key; }
  private phase: Phase = "idle";
  private draft = "";
  private requestId?: string;
  private recognition?: SpeechRecognition;
  private voiceTranscript = false;
  private stopRequested = false;
  private hadSpeech = false;
  private voiceError = false;
  private restartCount = 0;
  private restartTimer?: number;
  private recordingBase = "";
  private previousFocus: HTMLElement | null = null;
  // Floating overlay position: the panel parks beside the focused editor and
  // follows it while the page scrolls or resizes. The user can instead grab
  // the header and drag the panel anywhere; dragging disables auto-follow and
  // a double-click on the header re-enables it.
  private floating = false;
  private floatAnchor: HTMLElement | null = null;
  // Where the panel is currently attached (the inline anchor, or the editor for
  // the floating variant). Used to tell "same editor" from "the editor moved".
  private anchor: Element | null = null;
  private followAnchor = true;
  // Floating panels overlay a mail composer (Gmail, Outlook), where the body
  // text arrives as full-width paragraphs — the inline width reads cramped
  // there, so the overlay starts about 1.5× wider. The viewport clamp below
  // still wins on narrow windows, and `positionFloat()` measures the real width
  // after mount, so the placement math stays correct either way.
  private floatWidth = 600;
  private floatFrame = 0;
  private dragging = false;
  private dragStart = { x: 0, y: 0, left: 0, top: 0 };
  // The repair path's state. It belongs to one conversation: how the button
  // reads, what the last answer said, and the region that answer was about.
  private identify: "idle" | "loading" | "done" | "failed" = "idle";
  private identifyMessage = "";
  // True while the second, wider read is in flight: the same wait, labelled as
  // reading further out (@see identifyContext).
  private identifyWidening = false;
  private aiFingerprint = "";

  // `mode` defaults to "auto" — an adapter-backed page, which is what every
  // constructed-with-an-adapter panel is. Only the generalized mail mode passes
  // something else (@see SiteMode).
  constructor(private adapter: SiteAdapter, target: EditableTarget, context: ContextEnvelope, private onRemove: () => void, private mode: SiteMode = "auto") {
    this.target = target;
    this.context = context;
    this.host.dataset.verbiaRoot = "true";
    // Reddit has page-level single-key shortcuts (for example J/K and submit
    // actions). Keep typing inside Verbia from reaching those delegated handlers.
    for (const type of ["keydown", "keyup", "keypress"] as const) {
      this.root.addEventListener(type, event => event.stopPropagation());
    }
    // Bind once on the stable shadow root. renderPanel() replaces innerHTML on
    // every open, so listeners added there would accumulate and fire a click
    // multiple times after the panel is opened and closed a few times.
    this.root.addEventListener("click", this.onClick);
    this.root.addEventListener("keydown", this.onKeyDown);
    this.root.addEventListener("input", this.onInput);
    this.root.addEventListener("change", this.onChange);
    // Floating drag handles live in the rebuilt header; delegate pointer
    // events on the stable root so they survive every renderPanel().
    this.root.addEventListener("pointerdown", this.onPanelPointerDown);
    this.root.addEventListener("dblclick", this.onPanelDoubleClick);
    // The panel is a page-lifetime singleton (content/index.ts creates it
    // once), so a storage listener bound here never accumulates. It keeps a
    // mounted panel in sync when the Options page changes settings.
    try {
      chrome.storage.onChanged.addListener(this.onSettingsChanged);
    } catch {
      // Extension already gone (updated while this tab stayed open). The panel
      // shell still renders; there is simply no settings stream to follow.
    }
  }

  private onInput = (rawEvent: Event) => {
    const target = rawEvent.target as HTMLElement | null;
    if (target?.classList?.contains("language-search")) {
      this.renderLanguageResults((target as HTMLInputElement).value);
      return;
    }
    if (!target?.classList?.contains("draft")) return;
    // Editing the draft after an insert re-enables the Insert button so the
    // user can apply the revised draft.
    if (this.phase === "inserted") this.phase = "draft_ready";
    const insert = this.action("insert");
    if (insert) { insert.disabled = false; insert.textContent = this.t("panel.insert"); }
  };

  // Reply Language / Tone / Length chosen in the panel are the same
  // preferences shown on the Settings page: persist each change so both
  // surfaces stay in sync and the next panel session opens with this choice.
  private onChange = (event: Event) => {
    const target = event.target as HTMLSelectElement | null;
    if (!target?.id) return;
    if (target.id === "language") {
      this.settings.outputLanguage = target.value;
      this.syncPanelRows(target.value);
    }
    else if (target.id === "tone") this.settings.defaultTone = target.value as UserSettings["defaultTone"];
    else if (target.id === "length") this.settings.defaultLength = target.value as UserSettings["defaultLength"];
    else return;
    void sendToBackground({ type: "SAVE_SETTINGS", settings: this.settings });
  };

  private onKeyDown = (rawEvent: Event) => {
    const event = rawEvent as KeyboardEvent;
    if (event.key === "Escape") {
      event.preventDefault();
      if (!this.root.querySelector(".panel")?.classList.contains("collapsed")) this.setCollapsed(true);
    }
  };

  update(target: EditableTarget, context: ContextEnvelope, anchor: Element) {
    // The editor changed (the user clicked Reply on a different Reddit comment,
    // opened a new Gmail compose, …): re-anchor the panel to the new editor.
    // Leaving an inline panel parked next to the previous editor can put it
    // out of view entirely, which reads as "the panel didn't open". Staying on
    // the same editor keeps any manual drag position the user chose.
    const movedEditor = this.anchor !== anchor;
    this.target = target;
    this.context = context;
    if (!movedEditor) return;
    // A different editor is a different conversation: an identification of the
    // old one must not follow the panel across. The context itself was just
    // handed over by the caller, so it is left alone.
    this.forgetIdentification(false);
    this.anchor = anchor;
    this.floatAnchor = target.element;
    this.followAnchor = true;
    if (this.floating) this.scheduleFloat();
    else this.mountAfter(anchor);
  }

  // Gmail injects the reply composer before it parses the thread it answers, so
  // the first extract can report a contextless "new email". showFor skips the
  // extract once a panel owns an editor, so that early reading would otherwise
  // stick for the rest of the session. Every later summon re-reads the page
  // while the panel still has nothing to send, and swaps in the richer context
  // once the page catches up. A context the user removed by hand ("none") is a
  // decision, not a gap, so it is left alone.
  async refreshContextIfEmpty(): Promise<void> {
    if (this.context.relation === "none" || hasContextBody(this.context)) return;
    const next = await this.adapter.extractContext(this.target).catch(() => null);
    if (!next || !hasContextBody(next)) return;
    this.applyContext(next);
  }

  // Swaps in a freshly-read context without rebuilding the panel, so a typed
  // intent, a ready draft, and a collapsed state all survive the refresh.
  private applyContext(context: ContextEnvelope) {
    this.context = context;
    const chip = this.root.querySelector(".chip");
    if (chip) chip.textContent = this.contextLabel();
    const body = this.root.querySelector(".context-body");
    if (body) body.textContent = this.contextText();
  }

  mountAfter(anchor: Element) {
    this.anchor = anchor;
    if (anchor.nextSibling === this.host) return;
    anchor.parentNode?.insertBefore(this.host, anchor.nextSibling);
  }

  // True while the panel's host is still part of the page. Host pages rebuild
  // the subtree we mounted into (Reddit re-creates its composer on every open),
  // which takes our node with it: the panel would then stay "open" while
  // rendering into a detached element, so nothing shows and no later summon can
  // recover — the content script thinks an invisible panel is already up.
  isMounted(): boolean {
    return this.host.isConnected;
  }

  // Re-attach after such a rebuild. No-op while the panel is still mounted.
  ensureMounted(anchor: Element) {
    if (this.host.isConnected) return;
    if (this.floating) {
      this.host.ownerDocument.documentElement.append(this.host);
      this.positionFloat();
      return;
    }
    this.mountAfter(anchor);
  }

  // Overlay variant used when the editor lives inside its own document/iframe
  // (e.g. Gmail's composer): pinning the panel beside the editable region would
  // leak into the composed content, so float it over the editor viewport.
  // The panel is parked next to the anchor (the focused editor) and follows it
  // as the page scrolls/resizes; the user can drag the header to move it and
  // double-click the header to snap it back to following the editor.
  mountFloating(anchor?: HTMLElement) {
    const doc = this.host.ownerDocument;
    this.floating = true;
    this.floatAnchor = anchor ?? null;
    this.anchor = anchor ?? null;
    this.followAnchor = true;
    this.host.classList.add("floating");
    Object.assign(this.host.style, {
      position: "fixed",
      top: "0px",
      left: "0px",
      width: `min(${this.floatWidth}px, calc(100vw - 20px))`,
      maxHeight: "calc(100vh - 20px)",
      overflowY: "auto",
      zIndex: "2147483647",
      boxShadow: "0 6px 24px rgba(23,32,25,.22)"
    });
    doc.documentElement.append(this.host);
    // Prefer the width the browser actually laid out (the clamp above may have
    // shrunk it); keep the default only when the host has no box yet.
    const measured = this.host.getBoundingClientRect().width;
    if (measured) this.floatWidth = measured;
    this.positionFloat();
    window.addEventListener("resize", this.onViewportChange);
    // Capture-phase scroll sees scrollers inside the host page (Gmail moves
    // its composer by scrolling inner containers too), not just the window.
    document.addEventListener("scroll", this.onScroll, true);
  }

  private onScroll = () => { if (this.followAnchor) this.scheduleFloat(); };

  private onViewportChange = () => { if (this.followAnchor) this.positionFloat(); };

  private scheduleFloat() {
    if (this.floatFrame) return;
    this.floatFrame = requestAnimationFrame(() => {
      this.floatFrame = 0;
      this.positionFloat();
    });
  }

  // Park the floating panel beside the anchor editor (right edge, top-aligned)
  // and keep it inside the viewport. No-op when auto-follow is off (the user
  // dragged the panel somewhere) or when the anchor is gone.
  private positionFloat() {
    if (!this.floating || !this.host.isConnected || !this.followAnchor) return;
    const anchor = this.floatAnchor;
    if (!anchor || !anchor.isConnected) return;
    const rect = anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const height = Math.min(this.host.getBoundingClientRect().height || 0, vh - 20);
    const left = vw - rect.right >= this.floatWidth + 24
      ? rect.right + 16
      : Math.max(8, vw - this.floatWidth - 8);
    const top = Math.min(Math.max(8, rect.top), Math.max(8, vh - height - 8));
    this.host.style.left = `${Math.round(left)}px`;
    this.host.style.top = `${Math.round(top)}px`;
  }

  // Header drag: the pointer went down on the header (not on a button). The
  // panel leaves auto-follow from that moment so it stays exactly where the
  // user puts it.
  private onPanelPointerDown = (event: Event) => {
    if (!this.floating) return;
    const pointer = event as PointerEvent;
    if (pointer.button !== 0) return;
    const target = pointer.target as HTMLElement | null;
    if (!target?.closest(".head") || target.closest("button")) return;
    event.preventDefault();
    const rect = this.host.getBoundingClientRect();
    this.dragging = true;
    this.followAnchor = false;
    this.dragStart = { x: pointer.clientX, y: pointer.clientY, left: rect.left, top: rect.top };
    this.host.classList.add("is-dragging");
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointercancel", this.onPointerUp);
  };

  private onPointerMove = (event: PointerEvent) => {
    if (!this.dragging) return;
    const width = this.host.getBoundingClientRect().width;
    const height = this.host.getBoundingClientRect().height;
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, this.dragStart.left + event.clientX - this.dragStart.x));
    const top = Math.max(8, Math.min(window.innerHeight - height - 8, this.dragStart.top + event.clientY - this.dragStart.y));
    this.host.style.left = `${Math.round(left)}px`;
    this.host.style.top = `${Math.round(top)}px`;
  };

  private onPointerUp = () => {
    if (!this.dragging) return;
    this.dragging = false;
    this.host.classList.remove("is-dragging");
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("pointercancel", this.onPointerUp);
  };

  // Double-clicking the header while free-floating snaps the panel back to
  // following the editor.
  private onPanelDoubleClick = (event: Event) => {
    if (!this.floating) return;
    const target = event.target as HTMLElement | null;
    if (!target?.closest(".head") || target.closest("button")) return;
    this.followAnchor = true;
    this.positionFloat();
  };

  async open(focusIntent = true) {
    this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Best-effort: the settings snapshot is a nicety, the render is the point.
    // A dead extension context (reload/update) must not leave the panel mounted
    // but empty — that state is invisible and swallows every later summon.
    const response = await sendToBackground<Reply<UserSettings>>({ type: "GET_SETTINGS" });
    if (response?.ok && response.data) this.settings = response.data;
    // Resolve "auto" from the browser UI language (chrome.i18n), the same
    // source the Settings page and popup use. navigator.language reflects the
    // page content-language preference and can disagree with it.
    this.lang = resolveUiLang(this.settings.uiLanguage, uiLanguage());
    // The panel lives in a closed shadow root whose host resets every property, so
    // the direction is carried on the host and re-read by one rule inside (@see the
    // [dir="rtl"] rule in the styles): a right-to-left language would otherwise be
    // laid out left to right in the middle of a right-to-left page.
    this.host.dir = isRtl(this.lang) ? "rtl" : "ltr";
    this.phase = "context_ready";
    this.renderPanel();
    if (this.floating) this.scheduleFloat();
    if (focusIntent) queueMicrotask(() => this.el<HTMLTextAreaElement>("intent")?.focus());
  }

  private contextLabel() {
    // A task the model could not classify still left a message on screen. On a mail
    // site the chip says exactly that instead of "unknown context", which reads as a
    // contradiction over a mail the reader can see — and since the label names the
    // mail itself, the usual "Email ·" in front of it would only stutter.
    if (isMailSite(this.mode, this.adapter.id) && this.context.relation === "unknown" && hasContextBody(this.context)) {
      return this.t("context.rel.identified");
    }
    // Brand names that read the same in every language stay inline (Reddit, QQ
    // Mail); only labels that need translating live in the string table.
    if (this.adapter.id === "whatsapp") return "WhatsApp";
    const source = this.mode === "email" ? this.t("context.email") : this.mode === "universal" ? this.t("context.universal") : this.adapter.id === "reddit" ? "Reddit" : this.adapter.id === "qqmail" ? "QQ Mail" : this.adapter.id === "gmail" ? this.t("context.gmail") : this.adapter.id === "outlook" ? this.t("context.outlook") : this.t("context.universal");
    const relation = this.t(`context.rel.${this.context.relation}`);
    return `${source} · ${relation}`;
  }

  // What a request reports as its platform. Kept to values every deployed Worker
  // already knows: `platform` is a closed enum on the wire, so a client that ships
  // a new value before the API does gets a 400, not a degraded answer. The mode
  // travels beside it in `siteMode`, an optional field an older server strips —
  // and the provider itself is already in `page.urlOrigin`, so the per-host
  // grounding failure rate is readable without widening anything.
  private requestPlatform(): GenerateReplyRequest["platform"] {
    const adapter = this.adapter.id;
    return adapter === "reddit" || adapter === "gmail" || adapter === "outlook" ? adapter : "universal";
  }

  private contextText() {
    // `target` and `ancestors` hold different things across sites: Reddit uses
    // them for the comment being replied to and its parents, mail for the message
    // being answered and the rounds before it (the extraction mapping is what
    // fills the latter in). The headings follow the *site* rather than the relation
    // the model reported, because the relation is one of the things the reader is
    // checking: an identification that came back with task "unknown" on a mail page
    // is still a subject and a message, not a post title and a target comment.
    const whatsapp = this.adapter.id === "whatsapp";
    const mail = isMailSite(this.mode, this.adapter.id) || this.context.relation === "reply_to_email";
    const messageLike = mail || whatsapp;
    const parts: string[] = [];
    // Who it came from, when the reader knows. It comes first because it is what
    // makes the context verifiable at a glance: the message text alone does not
    // say who wrote it. Only an identification reports it (@see mapping.ts).
    const sender = this.context.sender;
    const from = sender ? (sender.name && sender.email ? `${sender.name} <${sender.email}>` : sender.name ?? sender.email) : null;
    if (from) parts.push(`${this.t("context.from")}\n${from}`);
    if (this.context.post?.title) parts.push(`${this.t(mail ? "context.subject" : "context.postTitle")}\n${this.context.post.title}`);
    if (this.context.post?.body) parts.push(`${this.t("context.post")}\n${this.context.post.body}`);
    const earlier = this.context.ancestors ?? [];
    // Oldest first in mail: the list arrives newest-first (depth 1 is the round
    // right before this message) and reads better ending on what is being
    // answered.
    for (const item of messageLike ? [...earlier].reverse() : earlier) {
      parts.push(`${this.t(messageLike ? "context.earlierMessages" : "context.parentComment")}\n${item.body}`);
    }
    if (this.context.target?.body) {
      const label = this.t(whatsapp ? "context.recentConversation" : messageLike ? "context.originalMessage" : "context.targetComment");
      const body = whatsapp
        ? this.context.target.body
            .replace(/^You:/gm, `${this.t("context.you")}:`)
            .replace(/^Contact:/gm, `${this.t("context.contact")}:`)
            .replace(/^Participant:/gm, `${this.t("context.participant")}:`)
        : this.context.target.body;
      parts.push(`${label}\n${body}`);
    }
    if (this.context.selectedText) parts.push(`${this.t("context.selectedText")}\n${this.context.selectedText}`);
    return parts.join("\n\n") || this.t("context.noText");
  }

  // Three preset cells (language / tone / length). Rebuilt from current
  // settings so a rebuilt .row is always consistent with stored show-* flags.
  private rowCells(settings: UserSettings) {
    const favorites = settings.favoriteReplyLanguages?.length ? settings.favoriteReplyLanguages : DEFAULT_SETTINGS.favoriteReplyLanguages;
    const favoriteOptions = favorites.map(value => REPLY_LANGUAGE_OPTIONS.find(option => option.value === value)).filter((option): option is (typeof REPLY_LANGUAGE_OPTIONS)[number] => Boolean(option));
    // No quick-pick chips next to the select: it already lists every favourite
    // language, and the extra buttons competed with the row for attention.
    const languageCell = `<div class="language-cell"><label for="language">${this.t("panel.replyLanguage")}</label><div class="language-control"><select id="language">${favoriteOptions.map(lang => `<option value="${lang.value}">${lang.label}</option>`).join("")}</select><button class="language-more" data-action="more-languages" type="button" aria-label="${this.t("panel.moreLanguages")}">＋</button></div></div>`;
    const toneCell = `<div><label for="tone">${this.t("panel.replyTone")}</label><select id="tone">${TONE_VALUES.map(v => `<option value="${v}">${this.t(`opt.${v}`)}</option>`).join("")}</select></div>`;
    const lengthCell = `<div><label for="length">${this.t("panel.replyLength")}</label><select id="length">${LENGTH_VALUES.map(v => `<option value="${v}">${this.t(`opt.${v}`)}</option>`).join("")}</select></div>`;
    return `${settings.showLanguageInPanel ? languageCell : ""}${settings.showToneInPanel ? toneCell : ""}${settings.showLengthInPanel ? lengthCell : ""}`;
  }

  // A cell that was just hidden may no longer have a select in the DOM; fall
  // back to the stored setting so the rebuilt row reflects the new snapshot.
  private syncPanelRows(language?: string) {
    const row = this.root.querySelector(".row");
    if (!row) return;
    const currentLanguage = language ?? this.root.querySelector<HTMLSelectElement>("#language")?.value ?? this.settings.outputLanguage;
    const currentTone = this.root.querySelector<HTMLSelectElement>("#tone")?.value ?? this.settings.defaultTone;
    const currentLength = this.root.querySelector<HTMLSelectElement>("#length")?.value ?? this.settings.defaultLength;
    row.innerHTML = this.rowCells(this.settings);
    this.ensureLanguageOption(currentLanguage);
    this.setSelect("language", currentLanguage);
    this.setSelect("tone", currentTone);
    this.setSelect("length", currentLength);
  }

  // Settings changed in the Options page (or any other context) while this
  // panel is mounted. Adopt the stored snapshot and update only the visible
  // controls — typed intent, draft text and recording state must survive.
  // Self-inflicted SAVE_SETTINGS events land here too, but the per-field diff
  // makes them no-ops, so there is no update loop.
  private onSettingsChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area !== "local" || !changes.settings || !this.host.isConnected) return;
    const prev = changes.settings.oldValue as UserSettings | undefined;
    const next = changes.settings.newValue as UserSettings | undefined;
    if (!next) return;
    this.settings = next;
    if (prev?.outputLanguage !== next.outputLanguage) this.setSelect("language", next.outputLanguage);
    if (prev?.defaultTone !== next.defaultTone) this.setSelect("tone", next.defaultTone);
    if (prev?.defaultLength !== next.defaultLength) this.setSelect("length", next.defaultLength);
    if (prev?.showLanguageInPanel !== next.showLanguageInPanel
      || prev?.showToneInPanel !== next.showToneInPanel
      || prev?.showLengthInPanel !== next.showLengthInPanel
      || JSON.stringify(prev?.favoriteReplyLanguages) !== JSON.stringify(next.favoriteReplyLanguages)) {
      this.syncPanelRows();
    }
  }

  // A picked-not-handed context (confidence "low") is exactly the case a
  // correction path exists for, so it is also the case where the read has to be
  // visible: the preview opens itself and the warning sits above it. An
  // identification opens it as well — the answer just replaced the context, and
  // reading the context is how the user checks it. A plain read keeps the user's
  // own contextPreviewExpanded preference.
  private renderPanel(intent = "") {
    const low = this.context.confidence === "low";
    // Two different lows: an adapter's own read, which the user has to check and
    // can repair with the button, and a low confidence in an answer the user just
    // asked for — where pointing at the same button again would be advice, not a
    // fix. The wording follows whichever one this context is.
    const lowWarning = this.identify === "done" ? "panel.warningLowIdentified" : "panel.warningLow";
    // Email mode starts with nothing at all: no adapter read the mail, and the
    // user has not asked for an identification yet. Saying so — and pointing at
    // the button — is the whole onboarding of this mode; a draft generated from an
    // empty context is worse than no draft.
    const needsIdentification = this.mode === "email" && this.identify !== "done" && !hasContextBody(this.context);
    const showContext = this.settings.contextPreviewExpanded || low || this.identify === "done";
    this.root.innerHTML = `<style>${styles}</style><div class="inline-shell"><section class="panel" role="region" aria-labelledby="verbia-title"><header class="head"><div><h2 class="brand" id="verbia-title"><img src="${runtimeUrl("icons/verbia-horizontal-logo.svg")}" alt="Verbia" class="wordmark"></h2><p class="slogan">${this.t("brand.slogan")}</p></div><button class="icon" data-action="collapse" type="button" aria-expanded="true" aria-label="${this.t("panel.collapseAria")}"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 10l4-4 4 4"/></svg></button></header><div class="panel-body"><div class="chip">${escapeHtml(this.contextLabel())}</div>${needsIdentification ? `<p class="warning">${this.t("panel.warningNoContext")}</p>` : ""}${low ? `<p class="warning">${this.t(lowWarning)}</p>` : ""}${this.context.truncated ? `<p class="warning">${this.t("panel.warningTruncated")}</p>` : ""}<details class="context" ${showContext ? "open" : ""}><summary>${this.t("panel.summaryContext")}</summary><div class="context-body">${escapeHtml(this.contextText())}</div><button class="remove-context" data-action="remove-context" type="button">${this.t("panel.removeContext")}</button></details>${this.identifyBlock()}<label for="intent">${this.t("brand.uxLine")}</label><textarea class="intent" id="intent" maxlength="2000" placeholder="${this.t("panel.intentPlaceholder")}">${escapeHtml(intent)}</textarea><div class="actions"><button class="secondary" data-action="record" type="button">${this.t("panel.speak")}</button><button class="secondary" data-action="clear" type="button">${this.t("panel.clear")}</button></div><div class="row">${this.rowCells(this.settings)}</div><div class="actions"><button class="primary" data-action="generate" type="button">${this.t("panel.generate")}</button><button class="danger hidden" data-action="cancel" type="button">${this.t("panel.cancel")}</button></div><p class="status" role="status" aria-live="polite"></p><section class="draft-area hidden"><label for="draft">${this.t("panel.draftLabel")}</label><textarea class="draft" id="draft"></textarea><div class="actions"><button class="primary" data-action="insert" type="button">${this.t("panel.insert")}</button><button class="secondary" data-action="regenerate" type="button">${this.t("panel.regenerate")}</button><button class="secondary" data-action="copy" type="button">${this.t("panel.copy")}</button></div><div class="insert-choice hidden"><strong>${this.t("panel.editorHasText")}</strong><div class="actions"><button class="secondary" data-action="append" type="button">${this.t("panel.append")}</button><button class="danger" data-action="replace" type="button">${this.t("panel.replace")}</button><button class="secondary" data-action="choice-cancel" type="button">${this.t("panel.cancel")}</button></div></div></section><p class="foot">${this.t("panel.foot")}</p></div></section></div><dialog class="language-dialog"><div class="language-dialog-head"><div><strong>${this.t("panel.replyLanguage")}</strong><p>${this.t("settings.favoriteReplyLanguagesHint")}</p></div><button class="dialog-close" data-action="close-language-dialog" type="button" aria-label="${this.t("panel.closeLanguagePicker")}">×</button></div><input class="language-search" type="search" placeholder="${this.t("settings.searchLanguages")}" aria-label="${this.t("settings.searchLanguages")}"><div class="language-results" role="listbox"></div></dialog>`;
    this.renderHeadActions();
    this.setSelect("language", this.settings.outputLanguage);
    this.setSelect("tone", this.settings.defaultTone);
    this.setSelect("length", this.settings.defaultLength);
  }

  private onClick = (event: Event) => {
    const action = (event.target as HTMLElement).closest<HTMLElement>("[data-action]")?.dataset.action;
    if (!action) return;
    if (action === "collapse") this.toggleCollapsed();
    if (action === "remove-panel") { void this.destroy(); return; }
    if (action === "clear") { const input = this.el<HTMLTextAreaElement>("intent"); if (input) input.value = ""; }
    if (action === "remove-context") this.removeContext();
    if (action === "identify") void this.identifyContext();
    if (action === "generate" || action === "regenerate") void this.generate();
    if (action === "cancel") void this.cancel();
    if (action === "insert") void this.requestInsert();
    if (action === "append" || action === "replace") void this.insert(action);
    if (action === "choice-cancel") this.el("insert-choice")?.classList.add("hidden");
    if (action === "copy") void this.copy();
    if (action === "record") this.toggleRecording();
    if (action === "more-languages") this.openLanguagePicker();
    if (action === "close-language-dialog") this.root.querySelector<HTMLDialogElement>(".language-dialog")?.close();
    if (action === "pick-language") {
      const language = (event.target as HTMLElement).closest<HTMLElement>("[data-language]")?.dataset.language;
      if (language) {
        this.ensureLanguageOption(language);
        this.setSelect("language", language);
        this.root.querySelector<HTMLDialogElement>(".language-dialog")?.close();
      }
    }
  };

  private async generate() {
    const intent = this.el<HTMLTextAreaElement>("intent")?.value.trim() ?? "";
    if (!intent) return this.status(this.t("panel.status.enterIntent"), "error");
    this.phase = "generating";
    this.requestId = crypto.randomUUID();
    this.setBusy(true);
    this.status(this.t("panel.status.writing"));
    const request: GenerateReplyRequest = {
      requestId: this.requestId, schemaVersion: "1", platform: this.requestPlatform(), siteMode: this.mode,
      page: { urlOrigin: location.origin, locale: document.documentElement.lang || undefined }, context: this.context,
      intent: { text: intent, source: this.voiceTranscript ? "voice_transcript" : "typed" },
      output: { language: this.value("language", this.settings.outputLanguage), tone: this.value("tone", this.settings.defaultTone) as GenerateReplyRequest["output"]["tone"], length: this.value("length", this.settings.defaultLength) as GenerateReplyRequest["output"]["length"] },
      client: { extensionVersion: extensionVersion(), adapterVersion: this.adapter.version }
    };
    try {
      const response = await sendToBackground<Reply<GenerateReplyResponse>>({ type: "GENERATE_REPLY", payload: request });
      if (!response?.ok || !response.data) {
        throw Object.assign(new Error(this.localisedError(response?.error, "panel.status.generationFailed")), { detail: response?.error?.detail });
      }
      const result = response.data;
      if (result.requestId !== this.requestId) return;
      this.draft = result.draft;
      const draftEl = this.el<HTMLTextAreaElement>("draft");
      if (draftEl) draftEl.value = result.draft;
      this.el("draft-area")?.classList.remove("hidden");
      this.phase = "draft_ready";
      this.status(result.warnings.length ? this.t("panel.status.draftReadyWarning") : this.t("panel.status.draftReady"), result.warnings.length ? "warning" : "success");
      // Regenerate after an earlier insert produced a fresh draft: re-enable
      // the Insert button that insert() had disabled and labelled "Inserted".
      const insert = this.action("insert");
      if (insert) { insert.disabled = false; insert.textContent = this.t("panel.insert"); }
    } catch (error) {
      this.phase = "error";
      const err = error as { message?: string; detail?: string };
      const message = err.message ?? this.t("panel.status.generationFailed");
      this.status(err.detail ? `${message} (${err.detail})` : message, "error");
    }
    finally { this.setBusy(false); }
  }

  private async cancel() {
    if (this.requestId) await sendToBackground({ type: "CANCEL_GENERATION", requestId: this.requestId });
    this.requestId = undefined; this.phase = "context_ready"; this.setBusy(false); this.status(this.t("panel.status.cancelled"));
  }

  private async requestInsert() {
    const current = readEditable(this.target.element).trim();
    if (current) this.el("insert-choice")?.classList.remove("hidden"); else await this.insert("replace");
  }

  private async insert(mode: "replace" | "append") {
    // Re-entrancy guard: inserting must be idempotent from the user's point of
    // view. A double click, a duplicated listener, or a queued second event
    // must not insert the same draft twice.
    if (this.phase === "inserting" || this.phase === "inserted") return;
    const draft = this.el<HTMLTextAreaElement>("draft")?.value.trim() ?? "";
    if (!draft) return this.status(this.t("panel.status.noDraft"), "error");
    this.phase = "inserting"; this.status(this.t("panel.status.inserting"));
    const result = await this.adapter.insertDraft(this.target, draft, mode);
    if (result.ok) {
      this.phase = "inserted"; this.status(this.t("panel.status.inserted"), "success");
      this.el("insert-choice")?.classList.add("hidden");
      const insert = this.action("insert");
      if (insert) { insert.disabled = true; insert.textContent = this.t("panel.inserted"); }
    }
    else { this.phase = "error"; this.status(`${result.reason ? `${result.reason} ` : this.t("panel.status.insertFailed")} ${this.t("panel.status.copyInstead")}`, "error"); }
  }

  private async copy() {
    const draft = this.el<HTMLTextAreaElement>("draft")?.value ?? "";
    try { await navigator.clipboard.writeText(draft); this.status(this.t("panel.status.copied"), "success"); }
    catch { this.el<HTMLTextAreaElement>("draft")?.select(); this.status(this.t("panel.status.copyManual"), "error"); }
  }

  private toggleRecording() {
    if (this.restartTimer !== undefined) { window.clearTimeout(this.restartTimer); this.restartTimer = undefined; }
    if (this.recognition) { this.stopRequested = true; this.recognition.stop(); return; }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return this.status(this.t("panel.status.voiceUnavailable"), "error");
    this.stopRequested = false;
    this.restartCount = 0;
    // Keep whatever is already in the intent field (typed or from an earlier
    // session) and append new speech to it instead of overwriting it.
    this.recordingBase = this.el<HTMLTextAreaElement>("intent")?.value ?? "";
    this.beginListening(Recognition);
  }

  private beginListening(Recognition: VoiceRecognitionConstructor) {
    this.hadSpeech = false;
    this.voiceError = false;
    const recognition = new Recognition();
    this.recognition = recognition;
    // continuous = true keeps the session alive across pauses between
    // sentences, so a short silence no longer ends the recording.
    recognition.continuous = true;
    recognition.interimResults = true;
    // Recognition has no language detection: the browser loads one model, and this
    // is the only thing telling it which. "Auto" uses the interface language the
    // user is looking at (@see voiceTagFor) — it used to read navigator.language,
    // which ignored a user who had picked a different interface language.
    recognition.lang = this.settings.voiceLanguage === "auto" ? voiceTagFor(this.lang) : this.settings.voiceLanguage;
    recognition.onstart = () => { this.phase = "recording"; this.status(this.t("panel.status.listening"), "recording"); const button = this.action("record"); if (button) button.textContent = this.t("panel.stop"); };
    recognition.onresult = (event) => {
      this.hadSpeech = true;
      this.voiceTranscript = true;
      let final = "";
      let interim = "";
      for (let i = 0; i < event.results.length; i += 1) {
        const chunk = event.results[i];
        if (!chunk) continue;
        const transcript = chunk[0]?.transcript ?? "";
        if (chunk.isFinal) final += transcript;
        else interim += transcript;
      }
      const input = this.el<HTMLTextAreaElement>("intent");
      if (input) input.value = (this.recordingBase + final + interim).slice(0, 2_000);
    };
    recognition.onerror = () => {
      // Errors are fatal: clean up now (in case onend never fires), keep the
      // text, and let onend skip its own status message.
      this.voiceError = true;
      this.stopRequested = true;
      this.recognition = undefined;
      this.phase = "context_ready";
      const button = this.action("record"); if (button) button.textContent = this.t("panel.speak");
      this.status(this.t("panel.status.voiceFailed"), "error");
    };
    recognition.onend = () => {
      this.recognition = undefined;
      const button = this.action("record"); if (button) button.textContent = this.t("panel.speak");
      if (this.voiceError) { this.voiceError = false; return; }
      const stoppedByUser = this.stopRequested;
      if (stoppedByUser || !this.host.isConnected || this.phase !== "recording") {
        this.phase = "context_ready";
        this.status(this.t("panel.status.transcriptReady"), "success");
        return;
      }
      // The browser ended the session on its own (long silence, network
      // drop). Resume a few times while the user is still in the recording
      // flow, but never restart after a session that produced no speech.
      if (!this.hadSpeech) { this.phase = "context_ready"; this.status(this.t("panel.status.noSpeech")); return; }
      if (this.restartCount >= 4) { this.phase = "context_ready"; this.status(this.t("panel.status.listeningPaused"), "warning"); return; }
      this.restartCount += 1;
      this.restartTimer = window.setTimeout(() => {
        this.restartTimer = undefined;
        const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (Recognition && !this.stopRequested && this.phase === "recording" && this.host.isConnected) {
          this.beginListening(Recognition);
        }
      }, 700);
    };
    recognition.start();
  }

  private removeContext() { this.context = { relation: "none", truncated: false, extractorVersion: this.context.extractorVersion, confidence: "high" }; this.root.querySelector(".context-body")!.textContent = this.contextText(); this.root.querySelector(".chip")!.textContent = this.contextLabel(); this.status(this.t("panel.status.contextRemoved")); }
  // --- the repair path ---------------------------------------------------------
  //
  // The adapters read the region around the reply box themselves; when that read
  // is wrong the user presses this button and the region goes to a model that
  // says which part of it is the message. This is the only place in the panel
  // that spends a model call on a click, so it is also the only place allowed to
  // build a request carrying trigger:"explicit_user_click" — the field the server
  // checks before paying for one (@see the shared schema and the PRD in
  // apps/extension/docs).

  private async identifyContext() {
    if (this.identify === "loading") return;
    // The adapter knows its site's shape better than the generic collector does:
    // when it can name the region (Gmail reads its thread), its read wins.
    const hinted = this.adapter.identifyRegion?.(this.target.element) ?? null;
    const collected = hinted
      ? collectProvidedRegion(hinted.text, hinted.truncated)
      : collectLocalContext(this.target.element);
    // Nothing above the reply box reads as a conversation: there is no email to
    // identify, and asking a model about a compose form would only invent one.
    // Logged, because a silent no-request failure is indistinguishable from a
    // broken endpoint.
    if (!collected.replyDetected) {
      console.warn("[verbia] no conversation found above the reply box");
      this.setIdentify("failed", this.t("context.identifyFailed"));
      return;
    }
    // Read before the request: the answer is about the page as it is right now.
    const fingerprint = regionFingerprint(this.target.element);
    this.setIdentify("loading", "");
    const first = await this.requestIdentification(collected);
    if (first.context) {
      this.finishIdentification(first.context, fingerprint);
      return;
    }
    // An answer that did not survive grounding is about what was handed over, not
    // about the model giving up: the boundary can be drawn right around the reply
    // box and still hold a mail header while the message sits in a wrapper beside
    // it. One wider pass costs the reader a wait instead of a tutorial on selecting
    // the text by hand, and costs nothing else — nothing is recorded until an answer
    // survives grounding (@see record_generation_quota).
    const wider = first.retryable && !hinted ? collectLocalContext(this.target.element, { widen: true }) : null;
    if (!wider || wider.text.length < collected.text.length + WIDEN_MIN_GAIN) {
      this.setIdentify("failed", first.message ?? this.t("context.identifyFailed"));
      return;
    }
    // The wait stays a wait: the first pass is not reported as a failure on its way
    // to the second one, it is reported as still reading — further out this time.
    this.setIdentify("loading", "", true);
    const second = await this.requestIdentification(wider);
    if (second.context) this.finishIdentification(second.context, fingerprint);
    else this.setIdentify("failed", second.message ?? this.t("context.identifyFailed"));
  }

  // One identification request, and the one distinction its caller needs: an answer
  // that found no message in what we sent (worth sending more of the page) versus
  // everything else, which asking the model again cannot fix.
  private async requestIdentification(collected: CollectedContext): Promise<{ context?: ContextEnvelope; retryable: boolean; message?: string }> {
    const payload: ContextExtractionRequest = {
      requestId: crypto.randomUUID(),
      schemaVersion: "1",
      trigger: "explicit_user_click",
      platform: this.requestPlatform() as ContextExtractionRequest["platform"],
      siteMode: this.mode,
      page: { urlOrigin: location.origin, locale: document.documentElement.lang || undefined },
      collected: { text: collected.text, truncated: collected.truncated, nodeCount: collected.nodeCount },
      client: { extensionVersion: extensionVersion(), collectorVersion: COLLECTOR_VERSION }
    };
    let response: Reply<ContextExtractionResponse> | undefined;
    try {
      response = await sendToBackground<Reply<ContextExtractionResponse>>({ type: "EXTRACT_CONTEXT", payload });
    } catch {
      // No answer at all — the tab closed, the context died mid-flight. The wording
      // is the same as any other failure of this button.
      return { retryable: false };
    }
    if (!response?.ok || !response.data) return { retryable: false, message: this.localisedError(response?.error, "context.identifyFailed") };
    const context = contextFromExtraction(response.data, { regionTruncated: collected.truncated });
    if (context) return { context, retryable: false };
    // Nothing usable came back (nothing grounded, or no message in it): the read
    // this would replace is still the best thing on screen. What was handed over
    // decides what happens next, so it gets a line of its own — a region holding a
    // mail header with the message sitting somewhere else reads exactly like a model
    // that gave up, and the two need opposite fixes. Numbers plus a bounded head, on
    // the user's own console; the same text has just travelled to the model.
    console.warn(`[verbia] identification not grounded: ${response.data.validation.warnings.join(", ") || "no message"}`, {
      regionChars: collected.text.length,
      frames: collected.frames,
      stripped: collected.stripped,
      truncated: collected.truncated,
      // Both ends: the head shows what the page put first (often a header, often the
      // stylesheet), the tail shows what the region actually ends on — the newest
      // message, which is the part the answer has to come from.
      head: collected.text.slice(0, 160),
      tail: collected.text.slice(-160)
    });
    return { retryable: true };
  }

  private finishIdentification(context: ContextEnvelope, fingerprint: string) {
    this.context = context;
    this.aiFingerprint = fingerprint;
    this.setIdentify("done", "");
  }

  // The button, and what the last press came back with, right below the context it
  // is about. The mode ("replying to email") is already the second half of the
  // chip above, so the summary adds the two things the chip cannot say: who the
  // mail is from, and what it is about.
  private identifyBlock(): string {
    // A mail feature, and only offered where there is mail to read: the question it
    // answers is "which message am I replying to", which a generic page does not have
    // an answer to — the model would name whatever text it liked best, and the panel
    // would present that as the context. Everywhere else the context comes from the
    // adapter, from a selection, or from nobody.
    if (!isMailSite(this.mode, this.adapter.id)) return "";
    const loading = this.identify === "loading";
    const label = loading
      ? this.t(this.identifyWidening ? "context.identifyingWider" : "context.identifying")
      : this.t("context.identify");
    const status = this.identifyStatus();
    const klass = this.identify === "failed" ? "identify-status error" : "identify-status";
    // In mail mode with nothing read yet this button is the first thing to do, not
    // a repair for something that went wrong: it is the only way this mode ever
    // gets a context, so it carries the primary weight.
    const primary = this.mode === "email" && !hasContextBody(this.context);
    // The hint under the button says what pressing it does and what it costs: it
    // is the one path to the model the user starts by hand, and the press has to
    // be informed (@see checkGenerationQuota — one press is one daily entry).
    return `<div class="identify"><button class="${primary ? "primary" : "secondary"}" data-action="identify" type="button"${loading ? " disabled" : ""}>${label}</button><p class="identify-hint">${this.t("context.identifyHint")}</p>${status ? `<p class="${klass}" role="status" aria-live="polite">${escapeHtml(status)}</p>` : ""}</div>`;
  }

  // One line and no content. What was identified is shown by the context itself,
  // which opens itself on success (@see renderPanel) — repeating a sender or a
  // subject under the button only made the panel longer to read.
  private identifyStatus(): string {
    if (this.identify === "failed") return this.identifyMessage;
    return this.identify === "done" ? this.t("context.identified") : "";
  }

  // The server words its failures in English — they are for logs and for surfaces
  // that have no translation. The panel speaks the interface language, so a
  // failure is worded here, by the code the server attached; the codes that share
  // one wording fall back to the wording of the action that failed. The server's
  // own sentence goes to the console, where it can be read in full.
  private localisedError(error: { code?: string; userMessage?: string } | undefined, fallbackKey: string): string {
    const code = error?.code;
    const key = code === "UNAUTHENTICATED" ? "error.unauthenticated"
      : code === "RATE_LIMITED" ? "error.busy"
      : code === "TIMEOUT" ? "error.timeout"
      : code === "QUOTA_EXCEEDED" ? "error.quota"
      : fallbackKey;
    if (error?.userMessage) console.warn(`[verbia] ${code ?? "unknown"}: ${error.userMessage}`);
    return this.t(key);
  }

  // Re-renders around a state change, carrying the typed intent and a visible
  // draft across the rebuild exactly like mergeContextSelection does.
  private setIdentify(state: "idle" | "loading" | "done" | "failed", message: string, widening = false) {
    const intent = this.el<HTMLTextAreaElement>("intent")?.value ?? "";
    const draftText = this.el<HTMLTextAreaElement>("draft")?.value ?? "";
    const draftVisible = !this.el("draft-area")?.classList.contains("hidden");
    this.identify = state;
    this.identifyMessage = message;
    this.identifyWidening = widening;
    this.renderPanel(intent);
    if (draftText) { const draft = this.el<HTMLTextAreaElement>("draft"); if (draft) draft.value = draftText; }
    if (draftVisible) this.el("draft-area")?.classList.remove("hidden");
  }

  // True when the conversation on screen is no longer the one the answer was
  // about — another message was opened while this panel stayed mounted. The
  // caller reads the page again; keeping the answer would be worse than the read
  // it replaced, because nothing on screen supports it any more.
  //
  // Only an explicit summon (`explicitSummon`, i.e. the shortcut or the toolbar
  // button) may ask. Focusing the editor, clicking into it, folding the panel and
  // unfolding it again are all just "the panel is still here" — none of them
  // opens anything, and changing the context under the user at one of those
  // moments is how a freshly identified answer got thrown away after the user
  // folded the panel.
  dropsStaleIdentification(explicitSummon: boolean): boolean {
    if (!explicitSummon) return false;
    if (!this.aiFingerprint || this.aiFingerprint === regionFingerprint(this.target.element)) return false;
    this.forgetIdentification(true);
    return true;
  }

  // `dropContext` is for the caller that is about to read the page again; without
  // it the envelope the caller just handed over is left alone.
  private forgetIdentification(dropContext: boolean) {
    this.aiFingerprint = "";
    this.identify = "idle";
    this.identifyMessage = "";
    this.identifyWidening = false;
    if (dropContext) this.context = { relation: "none", truncated: false, extractorVersion: this.context.extractorVersion, confidence: "high" };
  }

  private setBusy(busy: boolean) { this.action("generate")?.toggleAttribute("disabled", busy); this.action("cancel")?.classList.toggle("hidden", !busy); }
  private status(message: string, kind: MsgKind | "recording" = "info") {
    const el = this.el("status");
    if (!el) return;
    el.className = "status";
    el.replaceChildren();
    el.style.color = "";
    if (!message) return;
    // "recording" is a live state, not a feedback message: keep its bold red
    // text with no icon so the pulsing field never looks like an error.
    if (kind === "recording") {
      el.classList.add("recording");
      el.textContent = message;
      return;
    }
    el.append(msgIcon(kind, 14), document.createTextNode(message));
    el.style.color = msgColor(kind);
  }
  // The right-click menu ("Add to Verbia context") fired while this panel is
  // mounted on the page. Adopt the selection as the context's selectedText —
  // the newest selection replaces any earlier one. Typed intent, draft text
  // and the folded/unfolded state survive. Returns false when this panel is
  // no longer attached to the DOM; the caller then stages the selection for
  // the next OPEN_VERBIA instead.
  mergeContextSelection(text: string, truncated: boolean): boolean {
    if (!this.host.isConnected) return false;
    this.context = {
      ...this.context,
      relation: "selected_text",
      selectedText: text,
      truncated: this.context.truncated || truncated,
      confidence: "high"
    };
    // Recording / generating / inserting rebuild the DOM asynchronously, and a
    // folded panel has no visible body to update: keep the merged data and let
    // the next render pick it up.
    const busy = this.phase === "recording" || this.phase === "generating" || this.phase === "inserting";
    if (busy || this.root.querySelector(".panel")?.classList.contains("collapsed")) return true;
    const intent = this.el<HTMLTextAreaElement>("intent")?.value ?? "";
    const draftText = this.el<HTMLTextAreaElement>("draft")?.value ?? "";
    const draftVisible = !this.el("draft-area")?.classList.contains("hidden");
    this.renderPanel(intent);
    if (draftText) { const draft = this.el<HTMLTextAreaElement>("draft"); if (draft) draft.value = draftText; }
    if (draftVisible) this.el("draft-area")?.classList.remove("hidden");
    this.status(this.t("panel.status.contextAdded"), "success");
    return true;
  }

  // Called by the content script when the user explicitly re-invokes Verbia
  // (shortcut/action). Re-pulls settings: if the Settings page changed the
  // interface language while the panel was mounted, rebuild into the new
  // language, carrying typed intent and draft text across the rebuild. When
  // the panel was folded it is also unfolded in place. Returns true when the
  // panel was folded (and got unfolded), false when it was already open.
  async unfoldIfCollapsed(): Promise<boolean> {
    const panel = this.root.querySelector(".panel");
    const wasCollapsed = !!panel?.classList.contains("collapsed");
    await this.refreshLanguageFromSettings();
    if (wasCollapsed) this.setCollapsed(false);
    return wasCollapsed;
  }

  private async refreshLanguageFromSettings() {
    const response = await sendToBackground<Reply<UserSettings>>({ type: "GET_SETTINGS" });
    if (!response?.ok || !response.data) return;
    const next = response.data;
    const nextLang = resolveUiLang(next.uiLanguage, uiLanguage());
    if (nextLang === this.lang) { this.settings = next; return; }
    // A rebuild would disturb an in-flight generation/recording; adopt the new
    // snapshot only and let the next explicit unfold pick the language up.
    if (this.phase === "recording" || this.phase === "generating" || this.phase === "inserting") { this.settings = next; return; }
    // Interface language changed while folded: rebuild into the new language
    // without losing what the user already typed or generated.
    const intent = this.el<HTMLTextAreaElement>("intent")?.value ?? "";
    const draftText = this.el<HTMLTextAreaElement>("draft")?.value ?? "";
    const draftVisible = !this.el("draft-area")?.classList.contains("hidden");
    this.settings = next;
    this.lang = nextLang;
    this.renderPanel(intent);
    if (draftText) { const draft = this.el<HTMLTextAreaElement>("draft"); if (draft) draft.value = draftText; }
    if (draftVisible) this.el("draft-area")?.classList.remove("hidden");
  }

  private toggleCollapsed() {
    const panel = this.root.querySelector(".panel");
    if (!panel) return;
    this.setCollapsed(!panel.classList.contains("collapsed"));
  }

  private renderHeadActions() {
    const collapse = this.action("collapse");
    if (!collapse) return;
    const controls = document.createElement("div");
    controls.className = "head-actions";
    const remove = document.createElement("button");
    remove.className = "icon remove-panel";
    remove.type = "button";
    remove.dataset.action = "remove-panel";
    remove.setAttribute("aria-label", this.t("panel.removeAria"));
    remove.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>';
    collapse.replaceWith(controls);
    controls.append(remove, collapse);
  }

  private async destroy() {
    this.stopRequested = true;
    if (this.restartTimer !== undefined) window.clearTimeout(this.restartTimer);
    this.restartTimer = undefined;
    this.recognition?.stop();
    this.recognition = undefined;
    const requestId = this.requestId;
    this.requestId = undefined;
    this.phase = "idle";
    this.draft = "";
    this.voiceTranscript = false;
    this.recordingBase = "";
    this.context = { relation: "none", truncated: false, extractorVersion: this.context.extractorVersion, confidence: "high" };
    this.onPointerUp();
    if (this.floating) {
      window.removeEventListener("resize", this.onViewportChange);
      document.removeEventListener("scroll", this.onScroll, true);
    }
    this.floating = false;
    this.floatAnchor = null;
    this.anchor = null;
    this.host.classList.remove("floating");
    // Drop the DOM and hand the state back *before* touching the extension.
    // Reloading the extension while this panel is open makes the chrome.* calls
    // below throw, and "close" must still close when the user asks it to.
    try {
      chrome.storage.onChanged.removeListener(this.onSettingsChanged);
    } catch {
      // Context already dead — the listener went with it.
    }
    this.host.remove();
    this.onRemove();
    this.previousFocus?.focus();
    // Nothing here waits on the background: the panel is gone either way.
    if (requestId) void sendToBackground({ type: "CANCEL_GENERATION", requestId });
  }

  // Folding keeps the panel mounted and its typed content intact; only the
  // body below the header is hidden. Unfolding restores it in place.
  private setCollapsed(collapsed: boolean) {
    const panel = this.root.querySelector(".panel");
    if (!panel) return;
    panel.classList.toggle("collapsed", collapsed);
    const button = this.action("collapse");
    if (button) {
      button.setAttribute("aria-expanded", String(!collapsed));
      button.setAttribute("aria-label", this.t(collapsed ? "panel.expandAria" : "panel.collapseAria"));
    }
    if (collapsed) {
      this.stopRequested = true;
      if (this.restartTimer !== undefined) { window.clearTimeout(this.restartTimer); this.restartTimer = undefined; }
      this.recognition?.stop();
      this.previousFocus?.focus();
    } else {
      queueMicrotask(() => this.el<HTMLTextAreaElement>("intent")?.focus());
    }
    if (this.floating) this.scheduleFloat();
  }
  private value(id: string, fallback: string) { return this.root.querySelector<HTMLSelectElement>(`#${id}`)?.value || fallback; }
  private ensureLanguageOption(value: string) {
    const select = this.root.querySelector<HTMLSelectElement>("#language");
    if (!select || [...select.options].some(option => option.value === value)) return;
    const language = REPLY_LANGUAGE_OPTIONS.find(option => option.value === value);
    if (!language) return;
    const option = document.createElement("option");
    option.value = language.value;
    option.textContent = language.label;
    select.prepend(option);
  }

  private openLanguagePicker() {
    const dialog = this.root.querySelector<HTMLDialogElement>(".language-dialog");
    if (!dialog) return;
    const search = this.root.querySelector<HTMLInputElement>(".language-search");
    if (search) search.value = "";
    this.renderLanguageResults();
    dialog.showModal();
    search?.focus();
  }

  private renderLanguageResults(query = "") {
    const results = this.root.querySelector<HTMLElement>(".language-results");
    if (!results) return;
    const needle = query.trim().toLocaleLowerCase();
    results.innerHTML = REPLY_LANGUAGE_OPTIONS
      .filter(option => !needle || option.label.toLocaleLowerCase().includes(needle) || option.value.toLocaleLowerCase().includes(needle))
      .map(option => `<button class="language-result" data-action="pick-language" data-language="${option.value}" type="button" role="option"><span>${option.label}</span><small>${option.value}</small></button>`)
      .join("");
  }

  private setSelect(id: string, value: string) { const select = this.root.querySelector<HTMLSelectElement>(`#${id}`); if (select && [...select.options].some(option => option.value === value)) select.value = value; }
  private el<T extends HTMLElement = HTMLElement>(className: string) { return this.root.querySelector<T>(`.${className}`); }
  private action(name: string) { return this.root.querySelector<HTMLButtonElement>(`[data-action='${name}']`); }
}

function escapeHtml(value: string) { return value.replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]!); }

declare global {
  interface Window { SpeechRecognition?: VoiceRecognitionConstructor; webkitSpeechRecognition?: VoiceRecognitionConstructor; }
}

interface VoiceRecognitionConstructor { new(): SpeechRecognition; }
interface SpeechRecognitionResult { readonly 0: { readonly transcript: string }; readonly isFinal: boolean; }
interface SpeechRecognition { continuous: boolean; interimResults: boolean; lang: string; start(): void; stop(): void; onstart: (() => void) | null; onend: (() => void) | null; onerror: (() => void) | null; onresult: ((event: { results: ArrayLike<SpeechRecognitionResult> }) => void) | null; }
