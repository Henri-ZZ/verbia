import type { ContextEnvelope, EditableTarget, SiteAdapter } from "@verbia/shared";
import { insertText, isSafeEditable, toTarget } from "../editor/editable";

// Gmail renders the message composer inline in the top document (the editor
// with aria-label="Message Body" lives there, not in a sub-frame). The content
// script therefore activates on the top frame for mail.google.com and reads
// the editor + main pane from the same document. Sub-frames stay dormant.
//
// Selectors and quote parsing are best-effort and Gmail-version dependent;
// keep the heuristics in one place so they can be tuned during live testing.

const EDITOR_SELECTORS = [
  '[contenteditable="true"]',
  '[contenteditable="plaintext-only"]',
  '[contenteditable=""]',
  '[role="textbox"][contenteditable]'
];

const QUOTE_SELECTORS = [
  // The genuine Gmail quoted block always carries the gmail_quote class.
  // We deliberately do NOT match plain `<blockquote>`: Gmail's in-editor
  // smart-compose prompt ("Press / to write using your Gmail & Drive") and
  // similar help text are also wrapped in `<blockquote>` elements and would
  // otherwise be misread as the message we are replying to.
  ".gmail_quote",
  '[class*="gmail_quote"]',
  ".adP.adO"
];

// Search-results / inbox row snippets share the .a3s class with real message
// bodies, so picking the longest .a3s in the main pane used to grab snippet
// text. Require a minimum length so we only accept genuinely-expanded emails
// (which have hundreds of characters of body content).
const MIN_EXPANDED_BODY_LENGTH = 300;

function clean(value?: string | null, max = 6_000): { text: string; truncated: boolean } {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  return { text: text.slice(0, max), truncated: text.length > max };
}

// The same cap, keeping the end instead of the start. It is for the one read that
// runs in document order, oldest message first: when a long thread has to be cut,
// what survives must be the newest text — the message being answered — and not
// the round from five replies ago. The quoted block the client inserts is the
// other way round (newest first), which is why `clean` keeps its head.
function cleanTail(value?: string | null, max = 6_000): { text: string; truncated: boolean } {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  return { text: text.length > max ? text.slice(-max) : text, truncated: text.length > max };
}

// The text the user actually typed into the editor. Gmail renders smart-compose
// prompts and other ghost text inside the editable region itself; those nodes
// are non-editable decorations and must not be treated as user content. Read a
// cloned tree with them removed so the visible placeholder ("Press / to write
// using your Gmail & Drive") never shows up in context.
function userTypedBody(editor: HTMLElement): string {
  const clone = editor.cloneNode(true) as HTMLElement;
  // Drop non-editable decorations (compose tips, suggestions, picker chips…)
  // and any bare <blockquote> that is not a genuine .gmail_quote quote block.
  clone.querySelectorAll<HTMLElement>(
    '[contenteditable="false"], blockquote:not([class*="gmail_quote"])'
  ).forEach(node => node.remove());
  return (clone.innerText ?? "").replace(/\s+/g, " ").trim();
}

function editorBody(root: ParentNode): HTMLElement | null {
  const body = root instanceof HTMLElement ? root : document.body;
  if (body.isContentEditable) return body;
  for (const selector of EDITOR_SELECTORS) {
    const found = body.querySelector<HTMLElement>(selector);
    if (found && found.isContentEditable) return found;
  }
  return null;
}

// Gmail collapses the quoted block behind its "…" toggle: the element stays in
// the DOM, but innerText comes back empty for a hidden subtree. Fall back to
// textContent — the point is to read the message being answered, whether or not
// the user has it expanded on screen. The fallback reads a clone without the
// invisible element types, so a collapsed quote of an HTML email cannot leak
// <style> rules or <script> source into the context. Everything a real browser
// shows is already handled by innerText, which drops both on its own.
function nodeText(node: HTMLElement): string {
  if (node.innerText?.trim()) return node.innerText;
  const clone = node.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("style,script,noscript,template,head,title").forEach(hidden => hidden.remove());
  return clone.textContent ?? "";
}

function quotedOriginal(editor: HTMLElement): HTMLElement | null {
  for (const selector of QUOTE_SELECTORS) {
    const node = editor.querySelector<HTMLElement>(selector);
    if (node && nodeText(node).trim()) return node;
  }
  return null;
}

// When the user is composing a *new* email but the main pane shows an
// already-open message (e.g. clicking "Check activity" or "Report phishing"
// from a security email), the new compose has no quoted block — but the
// email the user is looking at is clearly the context they want Verbia to
// use. Gmail tags expanded message bodies with class `a3s` inside a
// `[data-thread-id]` container; list-row snippets carry the same class and
// are filtered out by the minimum-length check below.
// Gmail has shipped several wrappers around a message body: the class that holds
// the text (`a3s`) has stayed put, the ancestor attributes around it have not.
// Try the precise shapes first, then the class inside the main pane on its own —
// the minimum-length filter, not the wrapper, is what keeps list-row snippets
// out of the result.
const BODY_SELECTORS = [
  '[role="main"] [data-thread-id] [data-message-id] .a3s',
  '[role="main"] [data-thread-id] [data-message-id] [class*="a3s"]',
  '[role="main"] [data-message-id] .a3s',
  '[role="main"] .a3s'
];

function visibleEmailBody(): HTMLElement | null {
  let best: HTMLElement | null = null;
  let bestLength = 0;
  for (const selector of BODY_SELECTORS) {
    for (const node of document.querySelectorAll<HTMLElement>(selector)) {
      // Measured with the same fallback as the read below: a collapsed message
      // reports an empty innerText, and dropping it here would hide the very
      // message the user is looking at.
      const len = nodeText(node).trim().length;
      if (len < MIN_EXPANDED_BODY_LENGTH || len <= bestLength) continue;
      best = node;
      bestLength = len;
    }
  }
  return best;
}

// Everything that exists to be *operated* rather than read: control labels,
// toolbars, form fields, and the assistive-only text Gmail ships for screen
// readers ("Search for all messages with label Inbox"). A newsletter's own links
// survive — they are anchors, and their text is message content.
const NON_CONTENT = [
  "style", "script", "noscript", "template", "head", "title",
  "button", "[role='button']", "[role='toolbar']", "[role='menu']", "[role='menuitem']",
  "[role='tab']", "[role='tablist']", "[role='tabpanel']", "[role='combobox']",
  "[role='listbox']", "[role='option']", "[aria-haspopup]",
  "select", "option", "textarea", "input", "form", "label",
  "[class*='a11y']", "[class*='sr-only']", "[class*='screenReader']",
  "[contenteditable='true']", "[contenteditable='plaintext-only']", "[contenteditable='']", "[role='textbox']"
].join(",");

function stripNonContent(root: HTMLElement) {
  root.querySelectorAll(NON_CONTENT).forEach(node => node.remove());
}

function siblingsBefore(node: HTMLElement): HTMLElement[] {
  const before: HTMLElement[] = [];
  for (let sibling = node.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
    if (sibling instanceof HTMLElement) before.unshift(sibling);
  }
  return before;
}

// Reading the thread as a whole is the one fallback that needs no Gmail class
// names at all: `role="main"` is an accessibility landmark, and that contract has
// outlived every class rename the UI has shipped. Only an *in-thread* reply is
// eligible — a docked compose window sits outside the landmark, and letting it
// through here would hand the inbox list to the model as "context".
function threadBody(editor: HTMLElement): string {
  const main = document.querySelector<HTMLElement>('[role="main"]');
  if (!main || !main.contains(editor)) return "";
  // Everything that precedes the composer *in document order*, one level at a
  // time. A reply box can sit beside the message it answers or several wrappers
  // deep inside the thread, and only the per-level walk covers both — stopping at
  // the pane's direct child would miss a message nested next to the composer.
  // Cloning an ancestor is not an option: it would drag the composer into its own
  // context. This keeps the composer's recipient rows and send controls out while
  // still carrying the conversation above it.
  const parts: HTMLElement[] = [];
  for (let node: HTMLElement | null = editor; node && node !== main; node = node.parentElement) {
    parts.unshift(...siblingsBefore(node));
  }
  const scope = document.createElement("div");
  for (const part of parts) scope.append(part.cloneNode(true));
  stripNonContent(scope);
  return nodeText(scope);
}

function parentIsGmail(): boolean {
  try {
    const parent = window.parent;
    return parent !== window && /(^|\.)mail\.google\.com$/.test(parent.location.hostname);
  } catch {
    return false; // cross-origin parent: not a Gmail composer frame we can use
  }
}

function isComposerDocument(): boolean {
  return Boolean(editorBody(document));
}

export class GmailAdapter implements SiteAdapter {
  id = "gmail";
  version = "1.0.0";

  // Only the composer document activates. It can be reached either directly
  // (mail.google.com URLs) or as a same-origin about:blank frame under the
  // Gmail app (needs manifest match_about_blank to be injected there).
  matches(url: URL): boolean {
    if (!isComposerDocument()) return false;
    if (/(^|\.)mail\.google\.com$/.test(url.hostname)) return true;
    return url.protocol === "about:" && parentIsGmail();
  }

  findComposers(root: ParentNode = document): EditableTarget[] {
    const editor = editorBody(root);
    if (!editor) return [];
    const candidates = root === document && editor === document.body
      ? [document.body, ...document.querySelectorAll<HTMLElement>(EDITOR_SELECTORS.join(","))]
      : [editor];
    return [...candidates].filter(isSafeEditable).map(toTarget);
  }

  async extractContext(target: EditableTarget): Promise<ContextEnvelope> {
    const editor = target.element;
    const quote = quotedOriginal(editor);
    if (quote) {
      const body = clean(nodeText(quote), 6_000);
      return {
        relation: "reply_to_email",
        target: { body: body.text || userTypedBody(editor).slice(0, 6_000) },
        truncated: body.truncated,
        extractorVersion: this.version,
        confidence: body.text ? "high" : "medium"
      };
    }
    // No quoted block in the editor. Two non-reply cases remain:
    //   1. The user typed something into a new compose. Use it.
    //   2. The composer is empty but the main pane has an *expanded* email
    //      (security alerts, "Check activity", phishing reports, etc.) —
    //      use that message as context, because it is what the user is
    //      looking at while writing.
    const full = clean(userTypedBody(editor), 6_000);
    if (full.text) {
      return {
        relation: "reply_to_email",
        target: { body: full.text },
        truncated: full.truncated,
        extractorVersion: this.version,
        confidence: "medium"
      };
    }
    const visible = visibleEmailBody();
    if (visible) {
      const body = clean(nodeText(visible), 6_000);
      // The length floor keeps inbox snippets out, but the pick itself is
      // "longest .a3s in the pane": a guess about which message in the thread is
      // the one being answered. Claiming `high` for it was over-claiming — a
      // guess is reported as `low`, like the other picked-not-handed reads.
      return {
        relation: "reply_to_email",
        target: { body: body.text },
        truncated: body.truncated,
        extractorVersion: this.version,
        confidence: "low"
      };
    }
    // Nothing matched by name: read the thread text itself. Heavy HTML mail
    // (tables, buttons, images) is where Gmail most often leaves the composer
    // without a quoted block, so this is the path that still carries it.
    const thread = cleanTail(threadBody(editor), 6_000);
    if (thread.text.length >= MIN_EXPANDED_BODY_LENGTH) {
      return {
        relation: "reply_to_email",
        target: { body: thread.text },
        truncated: thread.truncated,
        extractorVersion: this.version,
        confidence: "medium"
      };
    }
    return {
      relation: "compose_new",
      truncated: false,
      extractorVersion: this.version,
      confidence: "high"
    };
  }

  // The region an identification should read. The generic collector draws its
  // boundary by geometry, and Gmail's nesting defeats it — the thread sits beside
  // the composer behind landmarks and class names only Gmail knows, so the
  // collector came back with a sliver of compose chrome and the model, correctly,
  // reported that there was no message in it. This hands over the read the
  // adapter already trusts for replies (@see threadBody).
  identifyRegion(editor: HTMLElement): { text: string; truncated: boolean } | null {
    const thread = cleanTail(threadBody(editor), 6_000);
    return thread.text ? { text: thread.text, truncated: thread.truncated } : null;
  }

  insertDraft(target: EditableTarget, text: string, mode: "replace" | "append") { return insertText(target, text, mode, "html"); }
}
