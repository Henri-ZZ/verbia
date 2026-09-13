import type { ContextEnvelope, EditableTarget, SiteAdapter } from "@verbia/shared";
import { insertText, isSafeEditable, toTarget } from "../editor/editable";

// Outlook web (outlook.live.com / outlook.office.com) renders the composer
// inline in the page like modern Gmail. The message body is a contenteditable
// region whose accessible name is "Message body" (localized).
//
// Reply compose does NOT embed the quoted original inside the editor (unlike
// Gmail); the original sits in the reading pane / conversation area. That
// pane has no stable container class across Outlook versions, so the body
// extractor uses structural heuristics: the email body is the container whose
// text contains a long natural line ("Hi, Wang 明天春天…") while the UI
// ribbons / navigation / icon soup around it are made of short labels and
// icon-font (Private Use Area) glyphs.
//
// Selectors and heuristics are best-effort and Outlook-version dependent;
// keep them in one place so they can be tuned during live testing.

const EDITOR_SELECTORS = [
  '[role="textbox"][contenteditable]',
  '[contenteditable="true"][aria-label*="essage body" i]',
  '[contenteditable="plaintext-only"][aria-label]',
  'textarea[aria-label*="essage" i]'
];

// Extended hostname list covering consumer and work/school accounts. The
// manifest content_scripts matches stay narrower (see manifest.json) but the
// adapter stays permissive so future hosts don't need a code change to be
// recognised once their host permission + content script entry are added.
const OUTLOOK_HOSTS = [
  "outlook.live.com",
  "www.outlook.com",
  "outlook.com",
  "outlook.office.com",
  "outlook.office365.com"
];

const READING_PANE_SELECTORS = [
  '[data-app-section="MessageBody"]',
  '[aria-roledescription="email"]',
  'div[role="article"]'
];
// Body text threshold: the original message can be short (a few sentences),
// so 40 chars total is enough — anything less is a label / snippet fragment.
const MIN_TEXT_LENGTH = 40;
// A body always contains at least one fairly long sentence (>= 30 chars);
// Outlook's UI ribbons and icon-font toolbars never do.
const MIN_LINE_LENGTH = 30;
// Header labels around the *compose* form (sender / recipient / cc rows)
// contain these tokens. The reading pane's message body never does —
// excluding them keeps us from picking the compose header block over the
// (short) original email.
const HEADER_LABELS = ["发件人:", "收件人:", "抄送:", "密件抄送:", "主题:", "From:", "To:", "Cc:", "Bcc:", "Subject:"];

function clean(value?: string | null, max = 6_000): { text: string; truncated: boolean } {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  return { text: text.slice(0, max), truncated: text.length > max };
}

function textOf(el: HTMLElement): string {
  // Keep paragraph breaks readable but collapse runs of spaces / odd glyphs.
  return (el.innerText ?? "").replace(/[ \t\u00a0]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function countPrivateUseChars(value: string): number {
  let count = 0;
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    // Segoe MDL2 Assets / icon fonts live in the Private Use Area.
    if (code >= 0xE000 && code <= 0xF8FF) count += 1;
  }
  return count;
}

const BASE64_BLOB_RE = /^[A-Za-z0-9+/=\s]+$/;

function looksLikeBase64Blob(value: string, min = 40): boolean {
  const t = value.trim();
  if (t.length < min || t.length % 4 !== 0) return false;
  return BASE64_BLOB_RE.test(t);
}

// Scan a document (top or iframe) and pick the element most likely to hold an
// email body: minimal container, not full of icon-font glyphs, and whose
// longest line is a real sentence. We keep the element with the longest such
// line — the actual paragraph of the open message wins over any short label.
function pickParagraphContainer(root: ParentNode): HTMLElement | null {
  const textOfElement = (el: HTMLElement) => textOf(el);
  let best: HTMLElement | null = null;
  let bestLine = 0;
  for (const el of root.querySelectorAll<HTMLElement>("div, section, article, main, [role='region'], [role='article']")) {
    const t = textOfElement(el);
    if (t.length < MIN_TEXT_LENGTH) continue;
    if (looksLikeBase64Blob(t)) continue; // encoded preview blob, handled separately
    if (el.closest("[aria-hidden='true']")) continue;
    if (el.querySelector("[contenteditable='true'], textarea")) continue; // compose surface
    // Skip wrappers whose single child carries almost all the text — keep
    // descending to the minimal container that owns the sentences.
    const carriedByChild = Array.from(el.children).some(child =>
      textOfElement(child as HTMLElement).length >= t.length * 0.95
    );
    if (carriedByChild) continue;
    const pua = countPrivateUseChars(t);
    if (pua > Math.max(t.length * 0.04, 4)) continue; // icon-font soup (toolbars/nav)
    // The compose form's "From / To / Subject / 抄送 / 密件抄送" header sits
    // right next to the editor and otherwise looks like text. Skip it so a
    // short reading-pane body can still win.
    if (HEADER_LABELS.some(label => t.includes(label))) continue;
    const longest = Math.max(0, ...t.split("\n").map(line => line.trim().length));
    if (longest < MIN_LINE_LENGTH) continue;
    if (longest > bestLine) { best = el; bestLine = longest; }
  }
  return best;
}

// Resolve the visible original message the user is replying to, as text plus
// how it was obtained.
// Order: known Outlook container selectors -> structural scan of the top
// document -> same-origin iframes (Outlook embeds some bodies in a frame) ->
// base64 round-trip of an HTML preview blob.
//
// Only the first step reads something the app names; the rest *pick* a
// container by structure and line length, which is a guess about which block is
// the message being answered. Guesses come back as `low` so the panel can say
// it is not sure.
type VisibleEmail = { text: string; confidence: "medium" | "low" };

function visibleEmailText(): VisibleEmail | null {
  // 1) Known container attributes.
  for (const node of document.querySelectorAll<HTMLElement>(READING_PANE_SELECTORS.join(","))) {
    const t = textOf(node);
    if (t.length >= MIN_TEXT_LENGTH) return { text: t.slice(0, 6_000), confidence: "medium" };
  }
  // 2) Structural scan of the top document. Scans the whole body — in some
  //    Outlook reply layouts the original message sits outside [role="main"]
  //    (e.g. in the conversation / message-list pane), and the icon-font and
  //    header-label filters already keep nav and ribbons out.
  const fromTop = pickParagraphContainer(document.body);
  if (fromTop) return { text: textOf(fromTop).slice(0, 6_000), confidence: "low" };
  // 3) Same-origin iframes (cross-origin / sandbox-blocked throw and skip).
  for (const iframe of Array.from(document.querySelectorAll<HTMLIFrameElement>("iframe"))) {
    let innerDoc: Document | null = null;
    try { innerDoc = iframe.contentDocument; } catch { continue; }
    if (!innerDoc?.body) continue;
    const fromIframe = pickParagraphContainer(innerDoc.body);
    if (fromIframe) return { text: textOf(fromIframe).slice(0, 6_000), confidence: "low" };
  }
  // 4) Base64-encoded HTML preview ("show original" payload).
  const decoded = visibleEmailBase64Text();
  return decoded ? { text: decoded, confidence: "low" } : null;
}

// Outlook's HTML reply preview can encode the original as a base64 text node.
// Tries each base64-shaped text node, longest first, returning the first that
// decodes into a meaningful amount of readable text.
function visibleEmailBase64Text(): string | null {
  if (typeof atob !== "function") return null;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const candidates: string[] = [];
  let node = walker.nextNode();
  while (node) {
    const t = (node.nodeValue ?? "").trim();
    if (looksLikeBase64Blob(t)) candidates.push(t);
    node = walker.nextNode();
  }
  candidates.sort((a, b) => b.length - a.length);
  for (const raw of candidates) {
    try {
      const decoded = atob(raw);
      const parser = new DOMParser();
      const doc = parser.parseFromString(decoded, "text/html");
      const text = (doc.body?.textContent ?? "").replace(/\s+/g, " ").trim();
      if (text.length >= MIN_TEXT_LENGTH) return text.slice(0, 6_000);
    } catch {
      // not real base64; try the next candidate
    }
  }
  return null;
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

function isOutlookHost(hostname: string): boolean {
  return OUTLOOK_HOSTS.some(host => hostname === host || hostname.endsWith(`.${host}`));
}

export class OutlookAdapter implements SiteAdapter {
  id = "outlook";
  version = "1.0.0";

  matches(url: URL): boolean {
    return isOutlookHost(url.hostname);
  }

  findComposers(root: ParentNode = document): EditableTarget[] {
    const editor = editorBody(root);
    if (!editor) return [];
    return [editor].filter(isSafeEditable).map(toTarget);
  }

  async extractContext(target: EditableTarget): Promise<ContextEnvelope> {
    const editor = target.element;
    // 1. The user already typed something, or Outlook embedded the quoted
    //    original in the editor — treat the whole editor text as context.
    const body = clean(textOf(editor), 6_000);
    if (body.text) {
      return {
        relation: "reply_to_email",
        target: { body: body.text },
        truncated: body.truncated,
        extractorVersion: this.version,
        confidence: "medium"
      };
    }
    // 2. Editor is empty (Outlook's default reply layout): find the original
    //    message in the reading pane / conversation area.
    const visible = visibleEmailText();
    if (visible) {
      const visibleBody = clean(visible.text, 6_000);
      if (visibleBody.text) {
        return {
          relation: "reply_to_email",
          target: { body: visibleBody.text },
          truncated: visibleBody.truncated,
          extractorVersion: this.version,
          confidence: visible.confidence
        };
      }
    }
    // 3. Genuinely nothing to quote from.
    return {
      relation: "compose_new",
      truncated: false,
      extractorVersion: this.version,
      confidence: "high"
    };
  }

  insertDraft(target: EditableTarget, text: string, mode: "replace" | "append") { return insertText(target, text, mode, "html"); }
}
