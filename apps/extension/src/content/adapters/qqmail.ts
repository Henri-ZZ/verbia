import type { ContextEnvelope, EditableTarget, SiteAdapter } from "@verbia/shared";
import { insertText, isSafeEditable, toTarget } from "../editor/editable";

// QQ Mail's current web app (wx.mail.qq.com) is a single-page app whose composer
// lives in the top document — verified against the live page: no frames at all,
// and the editor is a plain contenteditable div carrying aria-label="输入正文".
// Its classes are namespaced (`xmail-cmp-…`), a steadier base than Gmail's
// minified names, but the app is young and still moving, so every selector below
// has a structural fallback instead of leaning on one class.
//
// aria-label is preferred over the class: it is what the editor exposes to
// assistive tech, and it has outlived the markup around it.

const EDITOR_SELECTOR = '[contenteditable="true"][aria-label="输入正文"], [contenteditable="true"][class*="xmail-cmp-editor"]';
const EDITOR_FALLBACK = '[contenteditable="true"]';

// The message being answered, when the composer carries it: the app's own
// history block first, then the usual quote markers, then the labels a Chinese
// build would use for the same thing.
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

// Existing to be *operated* rather than read: control labels, toolbars, form
// fields, and the assistive-only text these apps ship for screen readers.
const NON_CONTENT = [
  "style", "script", "noscript", "template", "head", "title",
  "button", "[role='button']", "[role='toolbar']", "[role='menu']", "[role='menuitem']",
  "[role='tab']", "[role='tablist']", "[role='tabpanel']", "[role='combobox']",
  "[role='listbox']", "[role='option']", "[aria-haspopup]",
  "select", "option", "textarea", "input", "form", "label",
  "[class*='a11y']", "[class*='sr-only']", "[class*='screenReader']",
  "[contenteditable='true']", "[contenteditable='plaintext-only']", "[contenteditable='']", "[role='textbox']"
].join(",");

// App chrome that must never be read as if it were mail: the folder tree, the
// navigation, and the message list around the open conversation.
const CHROME_HINTS = "nav,header,footer,aside,[role='navigation'],[class*='xmail-side'],[class*='xmail-folder'],[class*='xmail-nav']";

// How much text a block needs before it counts as mail rather than interface.
// The floor is relative to *this* site's structure, never inherited:
//
//   - On Gmail the bar has to be high, because its message-list rows carry the
//     same class as message bodies, so length is the only thing telling them
//     apart (see the Gmail adapter's MIN_EXPANDED_BODY_LENGTH).
//   - Here the block is chosen by proximity to the composer and by the controls
//     it contains, so the floor only has to clear the app's own control labels
//     ("发送", "取消", "邮件可翻译为中文"). A real message must pass however short
//     it is — an activation code is exactly the mail a user answers.
//
// Copying Gmail's 300 rejected precisely that case, so this number is derived
// from this page, not carried over.
const MIN_MESSAGE_LENGTH = 40;
// A quoted original inside the composer is often shorter than a full message (a
// one-line reply worth quoting), so the bar is lower there.
const MIN_QUOTE_LENGTH = 24;

function depthOf(node: HTMLElement): number {
  let depth = 0;
  for (let parent = node.parentElement; parent; parent = parent.parentElement) depth += 1;
  return depth;
}

// How deep the nearest shared ancestor of two elements sits. A message and the
// reply box under it share a deep ancestor (the reading pane); the folder tree
// and the message list only share the app root. This is the class-free signal
// that keeps a list row from being read as the message being answered.
function commonAncestorDepth(a: HTMLElement, b: HTMLElement): number {
  const ancestors = new Set<Element>();
  for (let node: Element | null = a; node; node = node.parentElement) ancestors.add(node);
  for (let node: Element | null = b; node; node = node.parentElement) {
    if (ancestors.has(node)) return depthOf(node as HTMLElement);
  }
  return -1;
}

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

function stripNonContent(root: HTMLElement) {
  root.querySelectorAll(NON_CONTENT).forEach(node => node.remove());
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

function rawText(node: HTMLElement): string {
  return (node.textContent ?? "").replace(/\s+/g, " ").trim();
}

function rawLength(node: HTMLElement): number {
  return rawText(node).length;
}

// The tail of a message — legal notice, branding, QR codes, an unsubscribe
// link — sits between the message and the reply box, so "the block nearest
// above the composer" lands on it instead of on the message. The live case: an
// Alibaba Cloud billing notice, where the panel read
// "Copyright © 阿里云 2009-2026 All Rights Reserved" out of the footer and never
// showed the billing text above it.
//
// Recognised by content, not by class, like everything else here. The phrases
// are the ones a message rarely carries of its own accord: disclaimers are
// deliberately absent, because "本邮件为系统发出，请勿回复" is in the *body* of
// that very notice. The length bound keeps the list from reaching into a block
// that merely quotes a phrase — a tail is a line or two, a message is longer.
const TAIL_HINTS = /(©|\bcopyright\b|all rights reserved|unsubscribe|退订|公众号|二维码|扫码)/i;
const TAIL_MAX_LENGTH = 200;

function isTail(node: HTMLElement): boolean {
  return rawLength(node) <= TAIL_MAX_LENGTH && TAIL_HINTS.test(rawText(node));
}

// Legal lines that travelled inside the message are noise in the context, and a
// small block is exactly what a legal line is — the bound is what keeps this
// from ever removing the block that carries the message itself.
const LEGAL_HINTS = /(©|\bcopyright\b|all rights reserved|unsubscribe|退订)/i;

function dropLegalLines(scope: HTMLElement) {
  scope.querySelectorAll<HTMLElement>("div,td,section,article,p,span").forEach(node => {
    if (rawLength(node) <= TAIL_MAX_LENGTH && LEGAL_HINTS.test(rawText(node))) node.remove();
  });
}

// The candidate nearest *above* the editor in document order. Order is the point:
// in a reply the message sits above the composer, so the block closest above the
// editor is that message — even when a longer sender/recipient header sits higher
// up.
function nearestAbove(nodes: HTMLElement[], editor: HTMLElement): HTMLElement | null {
  let best: HTMLElement | null = null;
  for (const node of nodes) {
    if (!(editor.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_PRECEDING)) continue;
    if (!best || (best.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING)) best = node;
  }
  return best;
}

// Qualifying siblings directly above a block belong to the same message — the
// sender header, or a body split across paragraphs. A subject line or a toolbar
// stops the walk on its own, because neither clears the floor.
function siblingsAbove(node: HTMLElement): HTMLElement[] {
  const above: HTMLElement[] = [];
  for (let sibling = node.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
    if (!(sibling instanceof HTMLElement)) break;
    if (rawLength(sibling) < MIN_MESSAGE_LENGTH || sibling.closest(CHROME_HINTS)) break;
    above.unshift(sibling);
  }
  return above;
}

// The message on screen, for a composer that carries no quote of its own. Three
// class-free signals, in this order:
//   1. Closeness to the composer — the message shares a deep ancestor with the
//      reply box, the folder tree and the message list do not (see
//      commonAncestorDepth).
//   2. Position — among those, the block nearest *above* the composer is the
//      message. Ranking by longest instead grabbed a verbose sender/recipient
//      header and dropped the body beneath it, which is often the shorter of the
//      two.
//   3. Absorption — qualifying siblings above that block travel with it, so a
//      body split into paragraphs, or the header above it, is not lost.
//   4. Tail — closeness and position both point at a footer when the message
//      carries one, so blocks that read as a tail are stepped over (@see isTail).
function visibleMessageText(editor: HTMLElement): string {
  const candidates: Array<{ node: HTMLElement; closeness: number }> = [];
  for (const node of document.querySelectorAll<HTMLElement>("div,td,section,article")) {
    // textContent is the cheap signal; innerText needs layout, so only the
    // winning block is read with it.
    if (rawLength(node) < MIN_MESSAGE_LENGTH) continue;
    if (node.contains(editor) || node.closest(CHROME_HINTS)) continue;
    candidates.push({ node, closeness: commonAncestorDepth(node, editor) });
  }
  if (!candidates.length) return "";
  const closest = Math.max(...candidates.map(item => item.closeness));
  const peers = candidates.filter(item => item.closeness === closest).map(item => item.node);
  // Stepping over the tail leaves the message as the nearest block above the
  // reply box. When every block at this depth is a tail there is nothing better
  // to read, and the nearest one stands rather than reading nothing at all.
  const anchor = nearestAbove(peers.filter(node => !isTail(node)), editor) ?? nearestAbove(peers, editor);
  if (!anchor) return "";
  const scope = document.createElement("div");
  for (const part of [anchor, ...siblingsAbove(anchor)]) scope.append(part.cloneNode(true));
  stripNonContent(scope);
  // Only safe once a real message block was found: when the tail is all there
  // is (the fallback above), sweeping would leave nothing to send.
  if (!isTail(anchor)) dropLegalLines(scope);
  return nodeText(scope);
}

export class QqMailAdapter implements SiteAdapter {
  id = "qqmail";
  // 1.1.0: the message read skips a footer that sits above the reply box, so the
  // same page can report a different (correct) body than 1.0.0 did.
  version = "1.1.0";

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
    // No quote in the composer: either the user typed something (their own words
    // are then the context, same as the other mail adapters), or the composer is
    // empty and the message on screen is what they are answering.
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
    const visible = clean(visibleMessageText(editor));
    if (visible.text.length >= MIN_MESSAGE_LENGTH) {
      return {
        relation: "reply_to_email",
        target: { body: visible.text },
        truncated: visible.truncated,
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
