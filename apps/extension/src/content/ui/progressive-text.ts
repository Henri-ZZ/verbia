type Timer = ReturnType<typeof setTimeout>;

const graphemes = (text: string): string[] => {
  if (typeof Intl.Segmenter === "function") {
    return Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text), item => item.segment);
  }
  return Array.from(text);
};

/** Smooth arbitrary network chunks into visible drafting progress. */
export class ProgressiveTextRenderer {
  private pending: string[] = [];
  private timer?: Timer;
  private waiters: Array<() => void> = [];

  constructor(private readonly render: (text: string) => void, private readonly intervalMs = 24) {}

  push(text: string) {
    if (!text) return;
    this.pending.push(...graphemes(text));
    this.schedule();
  }

  flush(): Promise<void> {
    if (!this.pending.length && this.timer === undefined) return Promise.resolve();
    return new Promise(resolve => this.waiters.push(resolve));
  }

  stop() {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    this.pending = [];
    this.resolveWaiters();
  }

  private schedule() {
    if (this.timer !== undefined) return;
    this.timer = setTimeout(() => this.tick(), this.intervalMs);
  }

  private tick() {
    this.timer = undefined;
    const count = Math.max(1, Math.ceil(this.pending.length / 18));
    const next = this.pending.splice(0, count).join("");
    if (next) this.render(next);
    if (this.pending.length) this.schedule();
    else this.resolveWaiters();
  }

  private resolveWaiters() {
    for (const resolve of this.waiters.splice(0)) resolve();
  }
}
