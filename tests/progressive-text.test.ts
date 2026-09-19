import { describe, expect, it, vi } from "vitest";
import { ProgressiveTextRenderer } from "../apps/extension/src/content/ui/progressive-text";

describe("ProgressiveTextRenderer", () => {
  it("shows a single provider chunk over multiple frames before flushing", async () => {
    vi.useFakeTimers();
    const frames: string[] = [];
    const renderer = new ProgressiveTextRenderer(text => frames.push(text), 20);
    const reply = "Who's the main audience for this extension?";

    renderer.push(reply);
    const flushed = renderer.flush();
    await vi.advanceTimersByTimeAsync(20);

    expect(frames).toHaveLength(1);
    expect(frames.join("").length).toBeLessThan(reply.length);
    await vi.runAllTimersAsync();
    await flushed;
    expect(frames.length).toBeGreaterThan(1);
    expect(frames.join("")).toBe(reply);
    vi.useRealTimers();
  });

  it("discards unseen buffered text when generation is cancelled", async () => {
    vi.useFakeTimers();
    let rendered = "";
    const renderer = new ProgressiveTextRenderer(text => { rendered += text; });
    renderer.push("unfinished reply");
    const flushed = renderer.flush();
    renderer.stop();

    await flushed;
    await vi.runAllTimersAsync();
    expect(rendered).toBe("");
    vi.useRealTimers();
  });
});
