// Keyboard-shortcut display, shared by the popup and the settings page.
//
// Two things this has to get right:
//
// 1. The commands API reports a binding in either shape — "Command+Shift+Y" when
//    it names the keys, "⌘⇧Y" when it hands back the glyphs already joined — so
//    both have to end up as one chip per key.
// 2. The glyphs are macOS-only. ⌃ is the Mac Control key and ⌥ the Mac Option
//    key, so a Windows user whose default binding is Ctrl+Shift+Y would be shown
//    ⌃⇧Y — keys their keyboard does not have. Pick the labels by platform.
//
// This lived as two verbatim copies (popup + options) before; they are one file
// now so the two surfaces cannot drift.

const MAC_LABELS: Record<string, string> = { Command: "⌘", Shift: "⇧", Alt: "⌥", Option: "⌥", Control: "⌃", Ctrl: "⌃", MacCtrl: "⌃" };
const PC_LABELS: Record<string, string> = { Shift: "Shift", Alt: "Alt", Option: "Alt", Control: "Ctrl", Ctrl: "Ctrl", MacCtrl: "Ctrl" };

// Glyphs that arrive inside the string rather than as "+"-joined key names.
const SHORTCUT_GLYPHS = new Set(["⌘", "⇧", "⌥", "⌃", "⌫", "⌦", "⏎", "⇥"]);

export function isMacPlatform(): boolean {
  return /Mac|iP(hone|ad|od)/.test(typeof navigator === "undefined" ? "" : navigator.platform ?? "");
}

export function splitShortcutKeys(raw: string): string[] {
  if (!raw) return [];
  if (raw.includes("+")) return raw.split("+").map(key => key.trim()).filter(Boolean);
  const parts: string[] = [];
  let buffer = "";
  for (const char of raw) {
    if (SHORTCUT_GLYPHS.has(char)) {
      if (buffer) { parts.push(buffer); buffer = ""; }
      parts.push(char);
    } else buffer += char;
  }
  if (buffer) parts.push(buffer);
  return parts;
}

// An unknown token is returned unchanged: the unset-placeholder string ("未设置"
// / "Not set") travels this same path and must render as its own chip.
export function shortcutKeyLabel(key: string, mac: boolean): string {
  return (mac ? MAC_LABELS : PC_LABELS)[key] ?? key;
}

export function renderShortcutKeys(container: HTMLElement, shortcut: string, mac = isMacPlatform()): void {
  container.replaceChildren();
  for (const key of splitShortcutKeys(shortcut)) {
    const chip = document.createElement("kbd");
    chip.textContent = shortcutKeyLabel(key, mac);
    container.append(chip);
  }
}
