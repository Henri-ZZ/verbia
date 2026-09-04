import type { ContextEnvelope, EditableTarget, SiteAdapter } from "@verbia/shared";
import { insertText, isSafeEditable, toTarget } from "../editor/editable";

export class UniversalAdapter implements SiteAdapter {
  id = "universal";
  version = "1.0.0";
  matches(): boolean { return true; }
  findComposers(root: ParentNode = document): EditableTarget[] {
    return [...root.querySelectorAll<HTMLElement>("textarea, input, [contenteditable='true'], [contenteditable='plaintext-only']")]
      .filter(isSafeEditable).map(toTarget);
  }
  async extractContext(): Promise<ContextEnvelope> {
    const selected = window.getSelection()?.toString().trim().slice(0, 8_000) ?? "";
    return {
      relation: selected ? "selected_text" : "none",
      ...(selected ? { selectedText: selected } : {}),
      truncated: (window.getSelection()?.toString().length ?? 0) > 8_000,
      extractorVersion: this.version,
      confidence: selected ? "high" : "medium"
    };
  }
  insertDraft(target: EditableTarget, text: string, mode: "replace" | "append") { return insertText(target, text, mode); }
}
