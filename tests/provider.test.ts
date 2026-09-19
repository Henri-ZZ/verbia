import { describe, expect, it, vi } from "vitest";
import type { GenerateReplyRequest } from "@verbia/shared";
import { BalancedProvider, OpenAiCompatibleProvider, ProviderError, type ProviderStreamEvent, type ReplyProvider } from "../services/api/src/provider";

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
  return { id, model: `${id}-model`, generate: generate ?? (async () => ({ draft: id })) };
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

  it("logs every failed and successful attempt as structured metadata", async () => {
    const logs = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const router = new BalancedProvider([
      { provider: provider("slow", async () => { throw new ProviderError("busy", 429); }) },
      { provider: provider("fast", async () => ({ draft: "done", inputTokens: 24, outputTokens: 8 })) }
    ]);

    await router.generate(request, new AbortController().signal, { requestId: request.requestId, country: "US", colo: "IAD" });
    const events = logs.mock.calls.map(([value]) => JSON.parse(String(value))).filter(value => value.event === "model_attempt");
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ provider: "slow", model: "slow-model", attempt: 1, route: "baseline", outcome: "rate_limited", status: 429, country: "US", colo: "IAD" });
    expect(events[1]).toMatchObject({ provider: "fast", model: "fast-model", attempt: 2, route: "fallback", outcome: "success", inputTokens: 24, outputTokens: 8, country: "US", colo: "IAD" });
    expect(JSON.stringify(events)).not.toContain(request.intent.text);
  });

  it("falls back when a stream fails before its first text", async () => {
    const failed = vi.fn(async function* (): AsyncGenerator<ProviderStreamEvent> { throw new ProviderError("busy", 429); });
    const backup = vi.fn(async function* (): AsyncGenerator<ProviderStreamEvent> {
      yield { type: "delta", text: "hello" };
      yield { type: "done" };
    });
    const router = new BalancedProvider([
      { provider: { ...provider("bad"), stream: failed } },
      { provider: { ...provider("good"), stream: backup } }
    ]);
    const events: ProviderStreamEvent[] = [];
    for await (const event of router.stream(request, new AbortController().signal)) events.push(event);
    expect(events).toEqual([{ type: "delta", text: "hello" }, { type: "done", provider: "good", modelRoute: "fallback" }]);
    expect(failed).toHaveBeenCalledOnce();
    expect(backup).toHaveBeenCalledOnce();
  });

  it("does not splice in a fallback after text is already visible", async () => {
    const interrupted = vi.fn(async function* (): AsyncGenerator<ProviderStreamEvent> {
      yield { type: "delta", text: "partial" };
      throw new ProviderError("connection lost", 502);
    });
    const backup = vi.fn(async function* (): AsyncGenerator<ProviderStreamEvent> { yield { type: "delta", text: "replacement" }; });
    const router = new BalancedProvider([
      { provider: { ...provider("first"), stream: interrupted } },
      { provider: { ...provider("second"), stream: backup } }
    ]);
    const received: ProviderStreamEvent[] = [];
    await expect((async () => { for await (const event of router.stream(request, new AbortController().signal)) received.push(event); })()).rejects.toThrow("connection lost");
    expect(received).toEqual([{ type: "delta", text: "partial" }]);
    expect(backup).not.toHaveBeenCalled();
  });
});

describe("OpenAI-compatible streaming", () => {
  it("decodes SSE chunks that split JSON across network reads", async () => {
    const encoder = new TextEncoder();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Hel'));
        controller.enqueue(encoder.encode('lo "}}]}\n\ndata: {"choices":[{"delta":{"content":"world"}}]}\n\ndata: [DONE]\n\n'));
        controller.close();
      }
    }), { headers: { "content-type": "text/event-stream" } }));
    const model = new OpenAiCompatibleProvider({ id: "groq", apiKey: "test", endpoint: "https://example.com/chat", model: "test", maxOutputTokens: 100, temperature: 0 });
    const events: ProviderStreamEvent[] = [];
    for await (const event of model.stream(request, new AbortController().signal)) events.push(event);
    expect(events).toEqual([{ type: "delta", text: "Hello " }, { type: "delta", text: "world" }, { type: "done", provider: "groq" }]);
  });
});
