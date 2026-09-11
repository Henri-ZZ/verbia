// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { isMacPlatform, renderShortcutKeys, shortcutKeyLabel, splitShortcutKeys } from "../apps/extension/src/ui/shortcut";

// The popup and the settings page both print the binding returned by
// chrome.commands.getAll(). Two things went wrong before this module existed:
// the two surfaces had verbatim copies of the same code, and the labels were
// macOS glyphs on every platform — so a Windows user whose default binding is
// Ctrl+Shift+Y was shown "⌃⇧Y", keys their keyboard does not have.

describe("shortcut key splitting", () => {
  it("splits the named form the commands API returns", () => {
    expect(splitShortcutKeys("Command+Shift+Y")).toEqual(["Command", "Shift", "Y"]);
    expect(splitShortcutKeys("Alt+Y")).toEqual(["Alt", "Y"]);
  });

  it("splits the already-glyph form into one chip per key", () => {
    expect(splitShortcutKeys("⌘⇧Y")).toEqual(["⌘", "⇧", "Y"]);
    expect(splitShortcutKeys("⌥⇧Y")).toEqual(["⌥", "⇧", "Y"]);
  });

  it("keeps non-shortcut text (the unset placeholder) in one piece", () => {
    expect(splitShortcutKeys("未设置")).toEqual(["未设置"]);
    expect(splitShortcutKeys("")).toEqual([]);
  });
});

describe("shortcut labels", () => {
  it("uses the Mac glyphs on macOS", () => {
    expect(shortcutKeyLabel("Command", true)).toBe("⌘");
    expect(shortcutKeyLabel("Shift", true)).toBe("⇧");
    expect(shortcutKeyLabel("Alt", true)).toBe("⌥");
    expect(shortcutKeyLabel("Option", true)).toBe("⌥");
    expect(shortcutKeyLabel("Control", true)).toBe("⌃");
    // Glyphs that arrive pre-joined pass straight through.
    expect(shortcutKeyLabel("⌘", true)).toBe("⌘");
    expect(shortcutKeyLabel("Y", true)).toBe("Y");
  });

  it("uses words elsewhere, so nothing names a key the keyboard lacks", () => {
    expect(shortcutKeyLabel("Control", false)).toBe("Ctrl");
    expect(shortcutKeyLabel("Ctrl", false)).toBe("Ctrl");
    expect(shortcutKeyLabel("Alt", false)).toBe("Alt");
    expect(shortcutKeyLabel("Option", false)).toBe("Alt");
    expect(shortcutKeyLabel("Shift", false)).toBe("Shift");
    expect(shortcutKeyLabel("Y", false)).toBe("Y");
  });

  it("leaves the unset placeholder alone", () => {
    expect(shortcutKeyLabel("Not set", false)).toBe("Not set");
    expect(shortcutKeyLabel("未设置", true)).toBe("未设置");
  });
});

describe("shortcut rendering", () => {
  it("renders one kbd chip per key with platform labels", () => {
    const container = document.createElement("span");

    renderShortcutKeys(container, "Ctrl+Shift+Y", false);
    expect([...container.querySelectorAll("kbd")].map(chip => chip.textContent)).toEqual(["Ctrl", "Shift", "Y"]);

    renderShortcutKeys(container, "Alt+Shift+Y", true);
    expect([...container.querySelectorAll("kbd")].map(chip => chip.textContent)).toEqual(["⌥", "⇧", "Y"]);
  });

  it("replaces the previous binding instead of appending to it", () => {
    const container = document.createElement("span");
    renderShortcutKeys(container, "Ctrl+Shift+Y", false);
    renderShortcutKeys(container, "Alt+Y", false);
    expect([...container.querySelectorAll("kbd")].map(chip => chip.textContent)).toEqual(["Alt", "Y"]);
  });
});

describe("platform detection", () => {
  it("does not throw when navigator is unavailable", () => {
    expect(typeof isMacPlatform()).toBe("boolean");
  });
});
