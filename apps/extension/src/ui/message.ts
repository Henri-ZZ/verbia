// Typed status messages shared by every Verbia surface that renders a
// transient line of feedback (the options save/account rows, the inline
// panel status line, the content-script toast, the auth landing page).
//
// Each message renders as "[kind icon] text" and the text is tinted to the
// kind's colour so info / success / warning / error read at a glance.
//
// Icons live in apps/extension/assets (msg_info.svg, msg_success.svg,
// msg_warning.svg, msg_error.svg — plus google.svg for the sign-in marks).
// scripts/build.mjs copies the whole directory into dist/extension/assets;
// content-script surfaces reach the files through web_accessible_resources
// (manifest.json lists assets/*), extension pages resolve them the same way
// chrome.runtime.getURL is used for icons/verbia-logo.svg.

export type MsgKind = "info" | "success" | "warning" | "error";

// Text colours pick up each icon's dominant hue: info blue #4F79DB,
// success green #25AE88 (deepened for text contrast), warning amber #EDBB4F
// (deepened), error red #C0392B.
const MSG_META: Record<MsgKind, { file: string; color: string }> = {
  info: { file: "msg_info.svg", color: "#4F79DB" },
  success: { file: "msg_success.svg", color: "#1E9E77" },
  warning: { file: "msg_warning.svg", color: "#8F6200" },
  error: { file: "msg_error.svg", color: "#C0392B" }
};

export function msgColor(kind: MsgKind): string {
  return MSG_META[kind].color;
}

export function msgIcon(kind: MsgKind, size = 14): HTMLImageElement {
  const img = document.createElement("img");
  img.src = chrome.runtime.getURL(`assets/${MSG_META[kind].file}`);
  img.alt = "";
  img.width = size;
  img.height = size;
  img.decoding = "async";
  return img;
}

// Renders "[icon] text" into `host`, tinting the text with the kind's colour
// (the icon keeps its own fixed colours). Pass an empty `text` to clear the
// row back to its resting CSS state. The host is expected to be a flex row
// (align-items: center, small gap) — each page styles that class itself.
export function setStatusMessage(host: HTMLElement, text: string, kind: MsgKind = "info"): void {
  host.replaceChildren();
  host.style.color = "";
  if (!text) return;
  host.append(msgIcon(kind, 14), document.createTextNode(text));
  host.style.color = msgColor(kind);
}
