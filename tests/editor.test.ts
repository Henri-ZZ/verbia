// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { insertText, toTarget } from "../apps/extension/src/content/editor/editable";

describe("safe editor insertion", () => {
  it("replaces and dispatches input for textarea", async () => {
    const textarea = document.createElement("textarea"); document.body.append(textarea);
    Object.defineProperty(textarea, "getBoundingClientRect", { value: () => ({ width: 100, height: 40 }) });
    let inputs = 0; textarea.addEventListener("input", () => inputs++);
    const result = await insertText(toTarget(textarea), "Hello 👋", "replace");
    expect(result.ok).toBe(true); expect(textarea.value).toBe("Hello 👋"); expect(inputs).toBe(1);
  });
  it("appends without silently overwriting", async () => {
    const input = document.createElement("input"); input.value = "Existing"; document.body.append(input);
    Object.defineProperty(input, "getBoundingClientRect", { value: () => ({ width: 100, height: 40 }) });
    await insertText(toTarget(input), "Draft", "append");
    expect(input.value).toBe("Existing Draft");
  });
});
