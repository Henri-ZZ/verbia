import type { ContextEnvelope, EditableTarget, SiteAdapter } from "@verbia/shared";
import { insertText, isSafeEditable, toTarget } from "../editor/editable";

// WhatsApp Web changes generated class names frequently. Accessibility roles,
// message direction classes and data attributes have been considerably more
// stable, so the adapter stays on those signals.
const COMPOSER_SELECTORS = [
  'footer [contenteditable="true"][role="textbox"]',
  'main [contenteditable="true"][role="textbox"][aria-placeholder]',
  '[contenteditable="true"][role="textbox"][data-tab]'
];
const MESSAGE_SELECTORS = [
  '[data-testid="msg-container"]',
  '[role="row"] [data-id]',
  '[role="row"] [data-pre-plain-text]',
  '[data-id][data-pre-plain-text]'
];
const BODY_SELECTORS = [
  '[data-testid="msg-text"]',
  '.selectable-text.copyable-text',
  '.copyable-text',
  '[data-pre-plain-text]'
];
const QUOTED_SELECTORS = [
  'footer [data-testid="quoted-message"]',
  'footer [data-testid*="quoted" i]',
  'footer [aria-label*="quoted" i]'
];
const MAX_MESSAGES = 6;
const FALLBACK_MESSAGES = 4;
const MAX_MESSAGE_CHARS = 2_500;
const MAX_TRANSCRIPT_CHARS = 6_000;
const CONVERSATION_GAP_MS = 2 * 60 * 60 * 1_000;

type Direction = "you" | "contact" | "unknown";
type ChatMessage = { body: string; direction: Direction; timestamp?: number; truncated: boolean };

function clean(value?: string | null, max = MAX_MESSAGE_CHARS) {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  return { text: text.slice(0, max), truncated: text.length > max };
}

function composerNodes(root: ParentNode): HTMLElement[] {
  const found = new Set<HTMLElement>();
  for (const selector of COMPOSER_SELECTORS) {
    for (const node of root.querySelectorAll<HTMLElement>(selector)) {
      if (node.isContentEditable && !node.closest('[aria-label*="Search" i]')) found.add(node);
    }
  }
  return [...found];
}

function messageText(node: HTMLElement): string {
  for (const selector of BODY_SELECTORS) {
    const bodies = [...node.querySelectorAll<HTMLElement>(selector)]
      .filter(body => !body.closest('[data-testid="quoted-message"], [data-testid*="quoted" i]'))
      .map(body => body.innerText || body.textContent || "")
      .map(value => value.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    if (bodies.length) return [...new Set(bodies)].join(" ");
  }
  return node.innerText || node.textContent || "";
}

function directionOf(node: HTMLElement): Direction {
  if (node.matches(".message-out") || node.querySelector(".message-out")) return "you";
  if (node.matches(".message-in") || node.querySelector(".message-in")) return "contact";
  const id = node.querySelector<HTMLElement>("[data-id]")?.dataset.id ?? node.dataset.id ?? "";
  if (/^true_/i.test(id)) return "you";
  if (/^false_/i.test(id)) return "contact";
  return "unknown";
}

// Current WhatsApp builds expose a human-readable stamp such as
// "[4:32 PM, 9/16/2026] Name:". Date.parse also understands many localized
// variants. If it cannot, selection falls back to a small message-count window.
function timestampOf(node: HTMLElement): number | undefined {
  const raw = node.querySelector<HTMLElement>("[data-pre-plain-text]")?.dataset.prePlainText
    ?? node.dataset.prePlainText;
  const inside = raw?.match(/^\[([^\]]+)]/)?.[1];
  if (!inside) return undefined;
  const parsed = Date.parse(inside);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function visibleMessages(editor: HTMLElement): ChatMessage[] {
  const scope = editor.closest("main") ?? document.querySelector("main") ?? document;
  const candidates = new Set<HTMLElement>();
  for (const selector of MESSAGE_SELECTORS) {
    for (const node of scope.querySelectorAll<HTMLElement>(selector)) {
      if (node.contains(editor) || node.closest("footer")) continue;
      candidates.add(node.closest<HTMLElement>('[role="row"]') ?? node);
    }
  }
  return [...candidates]
    .sort((a, b) => {
      const relation = a.compareDocumentPosition(b);
      return relation & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : relation & Node.DOCUMENT_POSITION_PRECEDING ? 1 : 0;
    })
    .map(node => {
      const value = clean(messageText(node));
      const timestamp = timestampOf(node);
      return value.text ? { body: value.text, direction: directionOf(node), ...(timestamp === undefined ? {} : { timestamp }), truncated: value.truncated } : null;
    })
    .filter((value): value is ChatMessage => value !== null);
}

function conversationWindow(messages: ChatMessage[]): ChatMessage[] {
  if (!messages.length) return [];
  const selected: ChatMessage[] = [messages.at(-1)!];
  for (let index = messages.length - 2; index >= 0 && selected.length < MAX_MESSAGES; index -= 1) {
    const newer = selected[0]!;
    const older = messages[index]!;
    if (newer.timestamp !== undefined && older.timestamp !== undefined) {
      if (newer.timestamp - older.timestamp > CONVERSATION_GAP_MS) break;
    } else if (selected.length >= FALLBACK_MESSAGES) {
      break;
    }
    selected.unshift(older);
  }
  // A run containing only the user's own messages is a continuation or a new
  // message, not something Verbia can safely claim the user is replying to.
  return selected.some(message => message.direction === "contact") ? selected : [];
}

function transcript(messages: ChatMessage[]): { text: string; truncated: boolean } {
  const full = messages.map(message => {
    const speaker = message.direction === "you" ? "You" : message.direction === "contact" ? "Contact" : "Participant";
    return `${speaker}: ${message.body}`;
  }).join("\n");
  const text = full.length > MAX_TRANSCRIPT_CHARS ? full.slice(0, MAX_TRANSCRIPT_CHARS) : full;
  return { text, truncated: full.length > MAX_TRANSCRIPT_CHARS || messages.some(message => message.truncated) };
}

function quotedMessage(editor: HTMLElement): ChatMessage | null {
  const scope = editor.closest("footer") ?? document;
  for (const selector of QUOTED_SELECTORS) {
    const node = scope.querySelector<HTMLElement>(selector);
    if (!node) continue;
    const value = clean(messageText(node));
    if (value.text) return { body: value.text, direction: directionOf(node), truncated: value.truncated };
  }
  return null;
}

export class WhatsAppAdapter implements SiteAdapter {
  id = "whatsapp";
  version = "1.1.0";

  matches(url: URL): boolean {
    return url.hostname === "web.whatsapp.com";
  }

  findComposers(root: ParentNode = document): EditableTarget[] {
    return composerNodes(root).filter(isSafeEditable).map(toTarget);
  }

  async extractContext(target: EditableTarget): Promise<ContextEnvelope> {
    const quoted = quotedMessage(target.element);
    const messages = quoted ? [quoted] : conversationWindow(visibleMessages(target.element));
    if (!messages.length) {
      return { relation: "compose_new", truncated: false, extractorVersion: this.version, confidence: "high" };
    }
    const context = transcript(messages);
    return {
      // The wire enum predates chat adapters. `unknown` is intentionally used
      // instead of pretending this transcript is an email or a comment.
      relation: "unknown",
      target: { body: context.text },
      truncated: context.truncated,
      extractorVersion: this.version,
      confidence: messages.some(message => message.direction === "unknown") ? "medium" : "high"
    };
  }

  insertDraft(target: EditableTarget, text: string, mode: "replace" | "append") {
    // "paste", not "html": the composer is a Lexical editor. It ignores
    // execCommand and discards a plain textContent write (its model stays empty,
    // so the box looks unchanged and nothing can be sent), but it does handle a
    // paste through its own model (@see insertText in ../editor/editable).
    return insertText(target, text, mode, "paste");
  }
}
