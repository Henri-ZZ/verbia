import type { ContextEnvelope, EditableTarget, GenerateReplyRequest, GenerateReplyResponse, SiteAdapter, UiLang, UserSettings } from "@verbia/shared";
import { DEFAULT_SETTINGS, LENGTH_VALUES, REPLY_LANGUAGE_OPTIONS, TONE_VALUES, UI_STRINGS, resolveUiLang } from "@verbia/shared";
import { readEditable } from "../editor/editable";
import { msgColor, msgIcon, type MsgKind } from "../../ui/message";

const styles = `
:host{all:initial;display:block;inline-size:100%;color-scheme:light;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#172019}
*,*::before,*::after{box-sizing:border-box}button,textarea,select,input{font:inherit}button{cursor:pointer}.panel :focus-visible{outline:1.5px solid #9FE1CB;outline-offset:1px}
.inline-shell{display:block;inline-size:100%;margin-block-start:10px;container-type:inline-size;contain:layout style paint}.panel{inline-size:100%;overflow:auto;background:#fbfcf7;border:1px solid #dfe7dd;border-radius:12px;box-shadow:0 1px 2px #1720190a,0 6px 18px #17201912;padding:14px}.head{display:flex;align-items:center;justify-content:space-between}.brand{font:800 18px/1 Georgia,serif;color:#0F6E56;margin:0}.brand .wordmark{display:block;height:30px;width:auto}.slogan{font-size:.75rem;color:#33604E;margin:4px 0 0;font-weight:700}.icon{display:grid;place-items:center;min-inline-size:30px;min-block-size:30px;border:0;border-radius:8px;background:transparent;color:#526057;padding:0;transition:background .15s ease}.icon:hover{background:#e8efe9}.icon svg{inline-size:16px;block-size:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:transform .18s ease}.panel.collapsed .icon svg{transform:rotate(180deg)}.panel.collapsed{padding-block:6px}.panel.collapsed .panel-body{display:none}.panel.collapsed .slogan{display:none}.chip{display:inline-flex;margin:12px 0 8px;padding:6px 9px;border-radius:999px;background:#E1F5EE;color:#0F6E56;font-size:.75rem;font-weight:700}.warning{background:#fff2cf;color:#6f4b00;padding:8px 10px;border-radius:9px;font-size:.75rem;margin:6px 0}.context{border:1px solid #dfe7dd;border-radius:10px;margin:0 0 12px}.context summary{padding:9px 11px;cursor:pointer;font-size:.8rem;font-weight:700}.context-body{padding:0 11px 9px;white-space:pre-wrap;max-block-size:150px;overflow:auto;font-size:.75rem;color:#526057}.remove-context{margin:0 11px 9px;border:0;background:transparent;color:#9c3c34;padding:0;text-decoration:underline;font-size:.75rem}
label{display:block;font-size:.75rem;font-weight:750;color:#39483e;margin:10px 0 5px}.intent,.draft{inline-size:100%;resize:vertical;min-block-size:84px;border:1px solid #cad6cc;background:white;border-radius:10px;padding:9px 10px;line-height:1.45}.draft{min-block-size:100px}select{inline-size:100%;min-block-size:32px;appearance:none;-webkit-appearance:none;border:1px solid #cad6cc;border-radius:9px;background-color:#fff;padding:6px 27px 6px 9px;font-size:.78rem;font-weight:600;color:#1b2a20;cursor:pointer;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%23526d5c' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M4 6.5L8 10.5L12 6.5'/></svg>");background-repeat:no-repeat;background-position:right 8px center;background-size:14px 14px;transition:border-color .15s ease,box-shadow .15s ease}
select:hover{border-color:#8fae9b}
select:focus-visible{border-color:#0F6E56;box-shadow:0 0 0 1px #0F6E5626}
.head-actions{display:flex;align-items:center;gap:2px}.remove-panel{display:none;color:#87362f}.remove-panel:hover{background:#fae3df}.panel.collapsed .remove-panel{display:grid}.panel.collapsed .head-actions .icon svg{transform:none}.panel.collapsed .head-actions [data-action="collapse"] svg{transform:rotate(180deg)}
.row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-block-start:10px}.primary,.secondary,.danger{min-block-size:32px;border:0;border-radius:9px;padding:8px 12px;font-weight:750}.primary{background:#0F6E56;color:white}.secondary{background:#e7eee8;color:#214531}.danger{background:#fae3df;color:#87362f}.primary:disabled,.secondary:disabled{opacity:.45;cursor:not-allowed}.status{min-block-size:18px;margin:8px 0 0;color:#526057;font-size:.75rem;display:flex;align-items:center;gap:6px}.status img{inline-size:14px;block-size:14px;flex:none}.status.recording{display:block;color:#a72c25;font-weight:800}.foot{font-size:.7rem;color:#718078;margin:10px 0 0}.insert-choice{border:1px solid #efcf8b;background:#fff9e8;padding:10px;border-radius:10px;margin-block-start:10px}.hidden{display:none!important}@container (max-width:380px){.row{grid-template-columns:1fr}}
`;

type Phase = "idle" | "context_ready" | "recording" | "generating" | "draft_ready" | "inserting" | "inserted" | "error";

export class VerbiaPanel {
  private host = document.createElement("div");
  private root = this.host.attachShadow({ mode: "closed" });
  private target: EditableTarget;
  private context: ContextEnvelope;
  private settings: UserSettings = DEFAULT_SETTINGS;
  private lang: UiLang = "en";
  private t(key: string) { return UI_STRINGS[this.lang][key] ?? key; }
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

  constructor(private adapter: SiteAdapter, target: EditableTarget, context: ContextEnvelope, private onRemove: () => void) {
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
    // The panel is a page-lifetime singleton (content/index.ts creates it
    // once), so a storage listener bound here never accumulates. It keeps a
    // mounted panel in sync when the Options page changes settings.
    chrome.storage.onChanged.addListener(this.onSettingsChanged);
  }

  private onInput = (rawEvent: Event) => {
    const target = rawEvent.target as HTMLElement | null;
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
    if (target.id === "language") this.settings.outputLanguage = target.value;
    else if (target.id === "tone") this.settings.defaultTone = target.value as UserSettings["defaultTone"];
    else if (target.id === "length") this.settings.defaultLength = target.value as UserSettings["defaultLength"];
    else return;
    void chrome.runtime.sendMessage({ type: "SAVE_SETTINGS", settings: this.settings });
  };

  private onKeyDown = (rawEvent: Event) => {
    const event = rawEvent as KeyboardEvent;
    if (event.key === "Escape") {
      event.preventDefault();
      if (!this.root.querySelector(".panel")?.classList.contains("collapsed")) this.setCollapsed(true);
    }
  };

  update(target: EditableTarget, context: ContextEnvelope) { this.target = target; this.context = context; }

  mountAfter(anchor: Element) {
    if (anchor.nextSibling === this.host) return;
    anchor.parentNode?.insertBefore(this.host, anchor.nextSibling);
  }

  async open(focusIntent = true) {
    this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const response = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
    if (response?.ok && response.data) this.settings = response.data as UserSettings;
    // Resolve "auto" from the browser UI language (chrome.i18n), the same
    // source the Settings page and popup use. navigator.language reflects the
    // page content-language preference and can disagree with it.
    this.lang = resolveUiLang(this.settings.uiLanguage, chrome.i18n.getUILanguage());
    this.phase = "context_ready";
    this.renderPanel();
    if (focusIntent) queueMicrotask(() => this.el<HTMLTextAreaElement>("intent")?.focus());
  }

  private contextLabel() {
    const source = this.adapter.id === "reddit" ? "Reddit" : this.t("context.universal");
    const relation = this.t(`context.rel.${this.context.relation}`);
    return `${source} · ${relation}`;
  }

  private contextText() {
    const parts: string[] = [];
    if (this.context.post?.title) parts.push(`${this.t("context.postTitle")}\n${this.context.post.title}`);
    if (this.context.post?.body) parts.push(`${this.t("context.post")}\n${this.context.post.body}`);
    for (const item of this.context.ancestors ?? []) parts.push(`${this.t("context.parentComment")}\n${item.body}`);
    if (this.context.target?.body) parts.push(`${this.t("context.targetComment")}\n${this.context.target.body}`);
    if (this.context.selectedText) parts.push(`${this.t("context.selectedText")}\n${this.context.selectedText}`);
    return parts.join("\n\n") || this.t("context.noText");
  }

  // Three preset cells (language / tone / length). Rebuilt from current
  // settings so a rebuilt .row is always consistent with stored show-* flags.
  private rowCells(settings: UserSettings) {
    const languageCell = `<div><label for="language">${this.t("panel.replyLanguage")}</label><select id="language">${REPLY_LANGUAGE_OPTIONS.map(lang => `<option value="${lang.value}">${lang.label}</option>`).join("")}</select></div>`;
    const toneCell = `<div><label for="tone">${this.t("panel.replyTone")}</label><select id="tone">${TONE_VALUES.map(v => `<option value="${v}">${this.t(`opt.${v}`)}</option>`).join("")}</select></div>`;
    const lengthCell = `<div><label for="length">${this.t("panel.replyLength")}</label><select id="length">${LENGTH_VALUES.map(v => `<option value="${v}">${this.t(`opt.${v}`)}</option>`).join("")}</select></div>`;
    return `${settings.showLanguageInPanel ? languageCell : ""}${settings.showToneInPanel ? toneCell : ""}${settings.showLengthInPanel ? lengthCell : ""}`;
  }

  // A cell that was just hidden may no longer have a select in the DOM; fall
  // back to the stored setting so the rebuilt row reflects the new snapshot.
  private syncPanelRows() {
    const row = this.root.querySelector(".row");
    if (!row) return;
    const current = (id: string) => this.root.querySelector<HTMLSelectElement>(`#${id}`)?.value;
    row.innerHTML = this.rowCells(this.settings);
    this.setSelect("language", current("language") ?? this.settings.outputLanguage);
    this.setSelect("tone", current("tone") ?? this.settings.defaultTone);
    this.setSelect("length", current("length") ?? this.settings.defaultLength);
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
      || prev?.showLengthInPanel !== next.showLengthInPanel) {
      this.syncPanelRows();
    }
  }

  private renderPanel(intent = "") {
    const low = this.context.confidence === "low";
    this.root.innerHTML = `<style>${styles}</style><div class="inline-shell"><section class="panel" role="region" aria-labelledby="verbia-title"><header class="head"><div><h2 class="brand" id="verbia-title"><img src="${chrome.runtime.getURL("icons/verbia-horizontal-logo.svg")}" alt="Verbia" class="wordmark"></h2><p class="slogan">${this.t("brand.slogan")}</p></div><button class="icon" data-action="collapse" type="button" aria-expanded="true" aria-label="${this.t("panel.collapseAria")}"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 10l4-4 4 4"/></svg></button></header><div class="panel-body"><div class="chip">${escapeHtml(this.contextLabel())}</div>${low ? '<p class="warning">${this.t("panel.warningLow")}</p>' : ""}${this.context.truncated ? '<p class="warning">${this.t("panel.warningTruncated")}</p>' : ""}<details class="context" ${this.settings.contextPreviewExpanded ? "open" : ""}><summary>${this.t("panel.summaryContext")}</summary><div class="context-body">${escapeHtml(this.contextText())}</div><button class="remove-context" data-action="remove-context" type="button">${this.t("panel.removeContext")}</button></details><label for="intent">${this.t("brand.uxLine")}</label><textarea class="intent" id="intent" maxlength="2000" placeholder="${this.t("panel.intentPlaceholder")}">${escapeHtml(intent)}</textarea><div class="actions"><button class="secondary" data-action="record" type="button">${this.t("panel.speak")}</button><button class="secondary" data-action="clear" type="button">${this.t("panel.clear")}</button></div><div class="row">${this.rowCells(this.settings)}</div><div class="actions"><button class="primary" data-action="generate" type="button">${this.t("panel.generate")}</button><button class="danger hidden" data-action="cancel" type="button">${this.t("panel.cancel")}</button></div><p class="status" role="status" aria-live="polite"></p><section class="draft-area hidden"><label for="draft">${this.t("panel.draftLabel")}</label><textarea class="draft" id="draft"></textarea><div class="actions"><button class="primary" data-action="insert" type="button">${this.t("panel.insert")}</button><button class="secondary" data-action="regenerate" type="button">${this.t("panel.regenerate")}</button><button class="secondary" data-action="copy" type="button">${this.t("panel.copy")}</button></div><div class="insert-choice hidden"><strong>${this.t("panel.editorHasText")}</strong><div class="actions"><button class="secondary" data-action="append" type="button">${this.t("panel.append")}</button><button class="danger" data-action="replace" type="button">${this.t("panel.replace")}</button><button class="secondary" data-action="choice-cancel" type="button">${this.t("panel.cancel")}</button></div></div></section><p class="foot">${this.t("panel.foot")}</p></div></section></div>`;
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
    if (action === "generate" || action === "regenerate") void this.generate();
    if (action === "cancel") void this.cancel();
    if (action === "insert") void this.requestInsert();
    if (action === "append" || action === "replace") void this.insert(action);
    if (action === "choice-cancel") this.el("insert-choice")?.classList.add("hidden");
    if (action === "copy") void this.copy();
    if (action === "record") this.toggleRecording();
  };

  private async generate() {
    const intent = this.el<HTMLTextAreaElement>("intent")?.value.trim() ?? "";
    if (!intent) return this.status(this.t("panel.status.enterIntent"), "error");
    this.phase = "generating";
    this.requestId = crypto.randomUUID();
    this.setBusy(true);
    this.status(this.t("panel.status.writing"));
    const request: GenerateReplyRequest = {
      requestId: this.requestId, schemaVersion: "1", platform: this.adapter.id === "reddit" ? "reddit" : "universal",
      page: { urlOrigin: location.origin, locale: document.documentElement.lang || undefined }, context: this.context,
      intent: { text: intent, source: this.voiceTranscript ? "voice_transcript" : "typed" },
      output: { language: this.value("language", this.settings.outputLanguage), tone: this.value("tone", this.settings.defaultTone) as GenerateReplyRequest["output"]["tone"], length: this.value("length", this.settings.defaultLength) as GenerateReplyRequest["output"]["length"] },
      client: { extensionVersion: chrome.runtime.getManifest().version, adapterVersion: this.adapter.version }
    };
    try {
      const response = await chrome.runtime.sendMessage({ type: "GENERATE_REPLY", payload: request });
      if (!response?.ok) {
        const message = response?.error?.userMessage || "Generation failed.";
        const detail = response?.error?.detail;
        throw Object.assign(new Error(message), { detail });
      }
      const result = response.data as GenerateReplyResponse;
      if (result.requestId !== this.requestId) return;
      this.draft = result.draft;
      const draftEl = this.el<HTMLTextAreaElement>("draft");
      if (draftEl) draftEl.value = result.draft;
      this.el("draft-area")?.classList.remove("hidden");
      this.phase = "draft_ready";
      this.status(result.warnings.length ? this.t("panel.status.draftReadyWarning") : this.t("panel.status.draftReady"), result.warnings.length ? "warning" : "success");
    } catch (error) {
      this.phase = "error";
      const err = error as { message?: string; detail?: string };
      const message = err.message ?? this.t("panel.status.generationFailed");
      this.status(err.detail ? `${message} (${err.detail})` : message, "error");
    }
    finally { this.setBusy(false); }
  }

  private async cancel() {
    if (this.requestId) await chrome.runtime.sendMessage({ type: "CANCEL_GENERATION", requestId: this.requestId });
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
    recognition.lang = this.settings.voiceLanguage === "auto" ? navigator.language : this.settings.voiceLanguage;
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
    const response = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
    if (!response?.ok || !response.data) return;
    const next = response.data as UserSettings;
    const nextLang = resolveUiLang(next.uiLanguage, chrome.i18n.getUILanguage());
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
    if (this.requestId) await chrome.runtime.sendMessage({ type: "CANCEL_GENERATION", requestId: this.requestId }).catch(() => undefined);
    this.requestId = undefined;
    this.phase = "idle";
    this.draft = "";
    this.voiceTranscript = false;
    this.recordingBase = "";
    this.context = { relation: "none", truncated: false, extractorVersion: this.context.extractorVersion, confidence: "high" };
    chrome.storage.onChanged.removeListener(this.onSettingsChanged);
    this.host.remove();
    this.onRemove();
    this.previousFocus?.focus();
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
  }
  private value(id: string, fallback: string) { return this.root.querySelector<HTMLSelectElement>(`#${id}`)?.value || fallback; }
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
