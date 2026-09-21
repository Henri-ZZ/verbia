import type { EditableKind, EditableTarget, InsertResult } from "@verbia/shared";

const refs = new WeakMap<HTMLElement, string>();

export function isSafeEditable(value: EventTarget | Element | null): value is HTMLElement {
  if (!(value instanceof HTMLElement) || !value.isConnected) return false;
  if (value.matches(":disabled, [aria-disabled='true'], [hidden]")) return false;
  const rect = value.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  if (value instanceof HTMLTextAreaElement) return true;
  if (value instanceof HTMLInputElement) {
    return ["text", "search", "email", "url"].includes(value.type) && !looksSensitive(value);
  }
  return value.isContentEditable;
}

function looksSensitive(element: HTMLInputElement): boolean {
  const hint = `${element.name} ${element.id} ${element.autocomplete} ${element.getAttribute("aria-label") ?? ""}`.toLowerCase();
  return /(password|passcode|otp|one.time|credit|card|cvv|cvc|ssn|identity|payment)/.test(hint);
}

export function toTarget(element: HTMLElement): EditableTarget {
  let ref = refs.get(element);
  if (!ref) {
    ref = crypto.randomUUID();
    refs.set(element, ref);
  }
  const kind: EditableKind = element instanceof HTMLTextAreaElement ? "textarea" : element instanceof HTMLInputElement ? "input" : "contenteditable";
  return { ref, element, kind };
}

export function readEditable(element: HTMLElement): string {
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) return element.value;
  return element.innerText;
}

export async function insertText(target: EditableTarget, text: string, mode: "replace" | "append", strategy: "text" | "html" | "paste" = "text"): Promise<InsertResult> {
  const element = target.element;
  if (!isSafeEditable(element)) return { ok: false, reason: "The original editor is no longer available." };
  const current = readEditable(element);
  const separator = element instanceof HTMLInputElement ? " " : current.endsWith("\n") ? "" : "\n";
  const next = mode === "append" && current ? `${current}${separator}${text}` : text;

  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (!setter) return { ok: false, reason: "This editor cannot be written safely." };
    setter.call(element, next);
    element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.focus();
    return { ok: true };
  }

  // Framework-controlled contenteditable (e.g. Reddit's editor): it intercepts
  // execCommand and applies the edit asynchronously, so do NOT also queue a
  // synchronous fallback write — that raced the framework's own apply and
  // produced the draft twice back-to-back.
  // Selecting the editor's contents is what "replace" means on a rich editor: the
  // primitive writes over the selection. Append puts the caret at the end instead.
  // Kept in one place because a second pass needs the same starting point (@see the
  // HTML retry below).
  const selectForInsert = () => {
    element.focus();
    const range = document.createRange();
    range.selectNodeContents(element);
    if (mode === "append") range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  // Which primitive to use is a property of the *site*, so each adapter passes it
  // in rather than this layer sniffing hostnames — adding a site never edits this
  // file:
  //   "text"  execCommand("insertText"). Plain text, but some editors drop the
  //           embedded "\n" and collapse a multi-line draft onto one line.
  //   "html"  execCommand("insertHTML") with <br> separators (Gmail, Outlook).
  //   "paste" a synthetic paste event (WhatsApp Web). Editors that keep their own
  //           document model — Lexical, ProseMirror, Quill — ignore execCommand
  //           and discard a plain textContent write, because neither goes through
  //           the model. A paste does, and it is the only insert the site will
  //           actually send.
  const payload = mode === "append" && current ? `\n${text}` : text;
  selectForInsert();
  if (strategy === "paste") {
    pasteText(element, payload);
  } else if (strategy === "html") {
    document.execCommand("insertHTML", false, escapeHtml(payload).replace(/\n/g, "<br>"));
  } else {
    document.execCommand("insertText", false, payload);
  }

  // Success is read back, not assumed. Reporting "inserted" while the box stayed
  // empty is worse than reporting a failure the user can act on — the panel
  // answers a failed insert by offering the clipboard instead.
  if (await appliedText(element, text)) return { ok: true };

  // The words are in the box but the line breaks are not: this editor answered the
  // plain-text primitive by collapsing "\n" into its flow, and what it kept is the
  // draft without its paragraphs. Saying the same draft again through the HTML
  // primitive is what keeps them — the box is re-selected first, so the words are
  // replaced rather than repeated.
  if (strategy === "text" && payload.includes("\n") && await appliedText(element, text, { flatten: true })) {
    selectForInsert();
    document.execCommand("insertHTML", false, escapeHtml(payload).replace(/\n/g, "<br>"));
    if (await appliedText(element, text)) return { ok: true };
    // This editor insists on one line. The draft is in the box and editable, and
    // calling that a refusal would send the user to the clipboard for text they can
    // already see in front of them.
    if (await appliedText(element, text, { flatten: true })) return { ok: true };
  }

  // Last resort: write the DOM directly. Editors with their own model discard
  // that on their next render, which is why it is the fallback rather than the
  // first move — and why it still has to be verified before being called success.
  if (element.isConnected) {
    element.textContent = next;
    // Verified with the breaks flattened: a text node cannot carry a paragraph in a
    // rich editor, so an exact comparison would fail a write that did land.
    if (await appliedText(element, text, { flatten: true })) return { ok: true };
  }
  return { ok: false, reason: "The editor did not accept the text." };
}

// A paste event is how a rich-text editor expects to receive foreign text: it
// runs the editor's own insert path, so the text lands in its model.
function pasteText(element: HTMLElement, payload: string): void {
  try {
    const data = new DataTransfer();
    data.setData("text/plain", payload);
    element.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: data }));
  } catch {
    // Engines that cannot construct a DataTransfer/ClipboardEvent: use the plain
    // text primitive rather than doing nothing at all.
    document.execCommand("insertText", false, payload);
  }
}

// Editors apply asynchronously, so give the page a moment and then read it back.
// `flatten` compares with the line breaks taken out of both sides: an editor that
// keeps the words and drops the paragraphs has still taken the text, and reading
// that as a refusal is what sent a draft the user could already see to the clipboard.
async function appliedText(element: HTMLElement, text: string, options: { flatten?: boolean } = {}): Promise<boolean> {
  const wanted = text.trim();
  const flat = wanted.replace(/\s+/g, " ");
  for (const delay of [120, 300]) {
    await new Promise(resolve => window.setTimeout(resolve, delay));
    if (!element.isConnected) return false;
    const read = readEditable(element).trim();
    if (read.includes(wanted)) return true;
    if (options.flatten && read.replace(/\s+/g, " ").includes(flat)) return true;
  }
  return false;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]!);
}
