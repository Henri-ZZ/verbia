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

export async function insertText(target: EditableTarget, text: string, mode: "replace" | "append"): Promise<InsertResult> {
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
  // execCommand and applies the edit asynchronously, so the synchronous
  // fallback write below raced the framework's own queued apply and produced
  // the draft twice back-to-back. Fire exactly one native input primitive and
  // do NOT layer a synthetic input/change event on top.
  element.focus();
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(element);
  selection?.removeAllRanges();
  selection?.addRange(range);
  if (mode === "append") range.collapse(false);

  // `execCommand("insertText", ...)` treats the argument as plain text: Gmail's
  // contenteditable drops embedded "\n" so multi-line drafts collapse onto a
  // single line. Gmail happily accepts `insertHTML` with `<br>` separators, so
  // on mail.google.com we route through that path; other editors (Reddit,
  // universal) keep the plain-text command so we don't fight their handlers.
  const payload = mode === "append" && current ? `\n${text}` : text;
  if (/(^|\.)mail\.google\.com$/.test(location.hostname)) {
    document.execCommand("insertHTML", false, escapeHtml(payload).replace(/\n/g, "<br>"));
  } else {
    document.execCommand("insertText", false, payload);
  }

  // Fall back to a direct write only if the framework did not apply the text
  // within a short window. Delayed, not synchronous, to avoid the duplicate.
  window.setTimeout(() => {
    if (!element.isConnected) return;
    const applied = readEditable(element).trim().includes(text.trim());
    if (!applied) element.textContent = next;
  }, 300);
  return { ok: true };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]!);
}
