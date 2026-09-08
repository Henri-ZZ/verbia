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

function quotedOriginal(editor: HTMLElement): HTMLElement | null {
  for (const selector of QUOTE_SELECTORS) {
    const node = editor.querySelector<HTMLElement>(selector);
    if (node && node.innerText.trim()) return node;
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
function visibleEmailBody(): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>(
    '[role="main"] [data-thread-id] [data-message-id] .a3s, [role="main"] [data-thread-id] [data-message-id] [class*="a3s"]'
  );
  let best: HTMLElement | null = null;
  for (const node of candidates) {
    const len = (node.innerText || "").trim().length;
    if (len < MIN_EXPANDED_BODY_LENGTH) continue;
    if (!best || len > (best.innerText || "").trim().length) best = node;
  }
  return best;
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
      const body = clean(quote.innerText, 6_000);
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
      const body = clean(visible.innerText, 6_000);
      // visibleEmailBody only returns genuinely-expanded emails (filtered
      // for length), so the body is a real thread message and we can call
      // this a high-confidence reply context.
      return {
        relation: "reply_to_email",
        target: { body: body.text },
        truncated: body.truncated,
        extractorVersion: this.version,
        confidence: "high"
      };
    }
    return {
      relation: "compose_new",
      truncated: false,
      extractorVersion: this.version,
      confidence: "high"
    };
  }

  insertDraft(target: EditableTarget, text: string, mode: "replace" | "append") { return insertText(target, text, mode, "html"); }
}
