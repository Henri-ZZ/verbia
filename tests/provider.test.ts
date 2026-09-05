import { describe, expect, it, vi } from "vitest";
import type { GenerateReplyRequest } from "@verbia/shared";
import { BalancedProvider, ProviderError, type ReplyProvider } from "../services/api/src/provider";

const request = {
  requestId: "ad37fb67-54ed-4b84-b9c3-658f65252c0d",
  schemaVersion: "1",
  platform: "universal",
  page: { urlOrigin: "https://example.com" },
  context: { relation: "none", truncated: false, extractorVersion: "1.0.0", confidence: "high" },
  intent: { text: "请告诉他我会晚到十分钟", source: "typed" },
  output: { language: "ja", tone: "polite", length: "short" },
  client: { extensionVersion: "0.1.0", adapterVersion: "1.0.0" }
} satisfies GenerateReplyRequest;

function provider(id: string, generate?: ReplyProvider["generate"]): ReplyProvider {
  return { id, generate: generate ?? (async () => ({ draft: id })) };
}

describe("BalancedProvider", () => {
  it("distributes successful requests evenly", async () => {
    const router = new BalancedProvider([
      { provider: provider("a") }, { provider: provider("b") }, { provider: provider("c") }
    ]);
    const selected: string[] = [];
    for (let index = 0; index < 9; index += 1) {
      selected.push((await router.generate(request, new AbortController().signal)).provider!);
    }
    expect(selected.sort()).toEqual(["a", "a", "a", "b", "b", "b", "c", "c", "c"]);
    expect(router.snapshot().map(item => item.attempts)).toEqual([3, 3, 3]);
  });

  it("honors weights using attempts per weight", async () => {
    const router = new BalancedProvider([
      { provider: provider("a"), weight: 2 }, { provider: provider("b"), weight: 1 }
    ]);
    for (let index = 0; index < 6; index += 1) await router.generate(request, new AbortController().signal);
    expect(router.snapshot().map(item => item.attempts)).toEqual([4, 2]);
  });

  it("falls back after failure and cools the failing provider", async () => {
    const failed = vi.fn(async () => { throw new ProviderError("limited", 429, "quota"); });
    const backup = vi.fn(async () => ({ draft: "ok" }));
    const router = new BalancedProvider([
      { provider: provider("bad", failed) }, { provider: provider("good", backup) }
    ], 1_000, 30_000, () => 1_000);

    const first = await router.generate(request, new AbortController().signal);
    const second = await router.generate(request, new AbortController().signal);

    expect(first).toMatchObject({ draft: "ok", provider: "good", modelRoute: "fallback" });
    expect(second).toMatchObject({ provider: "good", modelRoute: "baseline" });
    expect(failed).toHaveBeenCalledTimes(1);
    expect(router.snapshot().find(item => item.provider === "bad")?.coolingDown).toBe(true);
  });

  it("reports combined failures without exposing credentials", async () => {
    const router = new BalancedProvider([
      { provider: provider("a", async () => { throw new ProviderError("bad", 500, "upstream a"); }) },
      { provider: provider("b", async () => { throw new Error("network b"); }) }
    ]);
    await expect(router.generate(request, new AbortController().signal)).rejects.toMatchObject({
      message: "All configured model providers failed.",
      detail: "a: upstream a | b: network b"
    });
  });

  it("does not call providers again while every route is cooling down", async () => {
    const failed = vi.fn(async () => { throw new ProviderError("limited", 429, "quota"); });
    const router = new BalancedProvider([{ provider: provider("a", failed) }], 1_000, 30_000, () => 1_000);
    await expect(router.generate(request, new AbortController().signal)).rejects.toMatchObject({ status: 502 });
    await expect(router.generate(request, new AbortController().signal)).rejects.toMatchObject({ status: 429 });
    expect(failed).toHaveBeenCalledTimes(1);
  });
});
