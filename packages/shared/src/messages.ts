import type { ContextEnvelope, GenerateReplyRequest, GenerateReplyResponse, UserSettings } from "./schema";

// The part of a staged right-click selection that travels to the content
// script. The full record (with pageUrl/updatedAt) stays in session storage.
export type StagedSelection = { text: string; truncated: boolean };

// Sign-in state reported by the background, which owns the session lifecycle.
// provider tells the UI which method the account used (google vs magic-link
// email), so surfaces can show the matching provider mark next to the email.
export type AccountUsage = {
  plan: "free" | "premium";
  used: number;
  limit: number | null;
  resetsAt: string;
  // UTC calendar date (YYYY-MM-DD) the current Premium entitlement lapses, at
  // day precision. Only present for Premium accounts whose server-side record
  // carries an end date; free accounts and open-ended grants omit it.
  premiumUntil?: string;
};

export type AuthState = {
  signedIn: boolean;
  email?: string;
  provider?: "google" | "email";
  avatarUrl?: string;
  plan?: AccountUsage["plan"];
  usage?: Pick<AccountUsage, "used" | "limit" | "resetsAt" | "premiumUntil">;
};

export type ExtensionRequest =
  | { type: "GENERATE_REPLY"; payload: GenerateReplyRequest }
  | { type: "CANCEL_GENERATION"; requestId: string }
  | { type: "GET_SETTINGS" }
  | { type: "SAVE_SETTINGS"; settings: UserSettings }
  | { type: "RESET_SETTINGS" }
  | { type: "OPEN_DASHBOARD" }
  | { type: "SYNC_WEB_SIGN_IN"; accessToken: string }
  | { type: "OPEN_VERBIA"; source: "action" | "shortcut"; stagedSelection?: StagedSelection }
  // Sent from the background to the page that owns a right-click selection.
  // The content script merges it into an open panel, or replies merged:false
  // (the background then stages it per tab for the next OPEN_VERBIA).
  | { type: "ADD_VERBIA_CONTEXT"; payload: StagedSelection }
  // Auth queries handled by the background (popup/options ask, background owns
  // the persisted Supabase session and silent refresh).
  | { type: "GET_AUTH_STATE" }
  | { type: "SIGN_OUT" };

export type ExtensionResponse =
  | { ok: true; data?: GenerateReplyResponse | UserSettings | { reset: true } | AuthState }
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
