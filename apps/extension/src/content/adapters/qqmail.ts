import type { ContextEnvelope, EditableTarget, SiteAdapter } from "@verbia/shared";
import { insertText, isSafeEditable, toTarget } from "../editor/editable";
import { collectLocalContext } from "../context/collector";

// QQ Mail's current web app (wx.mail.qq.com) is a single-page app whose composer
// lives in the top document — verified against the live page: no frames at all,
// and the editor is a plain contenteditable div carrying aria-label="输入正文".
// Its classes are namespaced (`xmail-cmp-…`), a steadier base than Gmail's
// minified names, but the app is young and still moving, so every selector below
// has a structural fallback instead of leaning on one class.
//
// aria-label is preferred over the class: it is what the editor exposes to
// assistive tech, and it has outlived the markup around it.
//
// This adapter no longer decides which block on the page is the message being
// answered. That decision was the fragile part — it was wrong often enough to
// need a fix per mail, and a footer sitting between the reply box and the body
// was read as "Copyright © 阿里云 2009-2026 All Rights Reserved". The region
// around the composer is collected instead (@see context/collector).

const EDITOR_SELECTOR = '[contenteditable="true"][aria-label="输入正文"], [contenteditable="true"][class*="xmail-cmp-editor"]';
const EDITOR_FALLBACK = '[contenteditable="true"]';

// The message being answered, when the composer carries it: the app's own
// history block first, then the usual quote markers, then the labels a Chinese
// build would use for the same thing. This is the one read the app itself hands
// over, so it is worth more than anything read off the page around it.
const QUOTE_HINTS = [
  '[class*="xmail-cmp-history"]',
  '[class*="xmail-cmp-quote"]',
  '[class*="quote"]',
  '[class*="cite"]',
  '[class*="original"]',
  '[class*="引用"]',
  '[class*="原邮件"]',
  "blockquote"
];

// A quoted original inside the composer is often shorter than a full message (a
// one-line reply worth quoting), so the bar is lower than the collector's.
const MIN_QUOTE_LENGTH = 24;

function clean(value: string, max = 6_000): { text: string; truncated: boolean } {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  return { text: text.slice(0, max), truncated: text.length > max };
}

// innerText is empty for a hidden subtree, so fall back to textContent — read
// from a clone without the invisible element types, which keeps <style> rules and
// <script> source out of the context. Everything a real browser shows is already
// handled by innerText, which drops both on its own.
function nodeText(node: HTMLElement): string {
  if (node.innerText?.trim()) return node.innerText;
  const clone = node.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("style,script,noscript,template,head,title").forEach(hidden => hidden.remove());
  return clone.textContent ?? "";
}

function editorBody(root: ParentNode): HTMLElement | null {
  const found = root.querySelector<HTMLElement>(EDITOR_SELECTOR) ?? root.querySelector<HTMLElement>(EDITOR_FALLBACK);
  return found && found.isContentEditable ? found : null;
}

// The original message, when QQ Mail put it inside the composer (the usual reply
// shape in this app).
function quotedOriginal(editor: HTMLElement): HTMLElement | null {
  for (const selector of QUOTE_HINTS) {
    for (const node of editor.querySelectorAll<HTMLElement>(selector)) {
      if (nodeText(node).trim().length >= MIN_QUOTE_LENGTH) return node;
    }
  }
  return null;
}

// What the user typed, with the quote removed first so the message being answered
// never doubles as the user's own words.
function userTypedBody(editor: HTMLElement): string {
  const clone = editor.cloneNode(true) as HTMLElement;
  clone.querySelectorAll<HTMLElement>(QUOTE_HINTS.join(",")).forEach(node => node.remove());
  return nodeText(clone);
}

export class QqMailAdapter implements SiteAdapter {
  id = "qqmail";
  // 1.2.0: the page read collects the region around the reply box instead of
  // picking one block out of it, so the same page can report a different body
  // than 1.1.0 did — and a wrong read now contains the message rather than
  // replacing it.
  version = "1.2.0";

  // The whole app is one document and the composer appears with the route, so the
  // host identifies the site. The manifest only injects here, and findComposers()
  // returns nothing until a composer actually exists.
  matches(url: URL): boolean {
    return url.hostname === "wx.mail.qq.com";
  }

  findComposers(root: ParentNode = document): EditableTarget[] {
    const editor = editorBody(root);
    return editor && isSafeEditable(editor) ? [toTarget(editor)] : [];
  }

  async extractContext(target: EditableTarget): Promise<ContextEnvelope> {
    const editor = target.element;
    const quote = quotedOriginal(editor);
    if (quote) {
      const body = clean(nodeText(quote));
      return {
        relation: "reply_to_email",
        target: { body: body.text || clean(userTypedBody(editor)).text },
        truncated: body.truncated,
        extractorVersion: this.version,
        confidence: body.text ? "high" : "medium"
      };
    }
    // No quote in the composer: the region around the reply box is what the user
    // is answering. The boundary is ours rather than the app's, so the read is
    // reported as `low` — the panel says so and opens the preview, which is the
    // signal a correction path hangs off.
    //
    // This comes before reading what the user typed, and deliberately so: their
    // own draft is not the conversation. Reported from a real reply — a draft was
    // generated, inserted, and then handed back as "Original message" because the
    // text in the box outranked the mail above it.
    const collected = collectLocalContext(editor);
    if (collected.replyDetected) {
      return {
        relation: "reply_to_email",
        target: { body: collected.text },
        truncated: collected.truncated,
        extractorVersion: this.version,
        confidence: "low"
      };
    }
    // Nothing above the box reads as a conversation: a new message. What the user
    // typed is then the only context there is (same as the other mail adapters).
    const typed = clean(userTypedBody(editor));
    if (typed.text) {
      return {
        relation: "reply_to_email",
        target: { body: typed.text },
        truncated: typed.truncated,
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

  insertDraft(target: EditableTarget, text: string, mode: "replace" | "append") {
    return insertText(target, text, mode, "html");
  }
}
