import type { ContextEnvelope, GenerateReplyRequest, GenerateReplyResponse, UserSettings } from "./schema";

export type ExtensionRequest =
  | { type: "GENERATE_REPLY"; payload: GenerateReplyRequest }
  | { type: "CANCEL_GENERATION"; requestId: string }
  | { type: "GET_SETTINGS" }
  | { type: "SAVE_SETTINGS"; settings: UserSettings }
  | { type: "RESET_SETTINGS" }
  | { type: "OPEN_VERBIA"; source: "action" | "shortcut" };

export type ExtensionResponse =
  | { ok: true; data?: GenerateReplyResponse | UserSettings | { reset: true } }
  | { ok: false; error: { code: string; userMessage: string; retryable: boolean; detail?: string } };

export type EditableKind = "textarea" | "input" | "contenteditable";
export type EditableTarget = { ref: string; element: HTMLElement; kind: EditableKind };
export type InsertResult = { ok: boolean; reason?: string };

export interface SiteAdapter {
  id: string;
  version: string;
  matches(url: URL): boolean;
  findComposers(root?: ParentNode): EditableTarget[];
  extractContext(target: EditableTarget): Promise<ContextEnvelope>;
  insertDraft(target: EditableTarget, text: string, mode: "replace" | "append"): Promise<InsertResult>;
}
