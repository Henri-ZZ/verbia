import { describe, expect, it } from "vitest";
import type { ContextExtractionResponse } from "@verbia/shared";
import { contextFromExtraction, extractionSummary } from "../apps/extension/src/content/context/mapping";

// The extractor answers a JSON shape of its own; the rest of Verbia speaks
// ContextEnvelope. This is the seam, and these are its rules.

const MESSAGE = "尊敬的ambitious98：您的账户ambitious98已产生欠费，您的按量付费商品延期停服的额度为10.00元。";

const extraction = (overrides: Partial<ContextExtractionResponse> = {}): ContextExtractionResponse => ({
  requestId: "ad37fb67-54ed-4b84-b9c3-658f65252c0d",
  task: "reply",
  subject: "您的阿里云账户ambitious98已欠费即将逾期",
  sender: { name: "阿里云", email: "system@notice.aliyun.com" },
  currentMessage: MESSAGE,
  previousMessages: [],
  confidence: 0.9,
  validation: { grounded: true, warnings: [] },
  latencyMs: 820,
  ...overrides
});

const map = (overrides: Partial<ContextExtractionResponse> = {}, regionTruncated = false) =>
  contextFromExtraction(extraction(overrides), { regionTruncated });

describe("extraction to context envelope", () => {
  it("maps a grounded answer onto the envelope the reply prompt reads", () => {
    const context = map();
    expect(context).not.toBeNull();
    expect(context!.relation).toBe("reply_to_email");
    expect(context!.post).toEqual({ title: "您的阿里云账户ambitious98已欠费即将逾期" });
    expect(context!.target).toEqual({ body: MESSAGE });
    expect(context!.confidence).toBe("high");
    expect(context!.truncated).toBe(false);
    expect(context!.extractorVersion).toBe("ai-manual/1");
  });

  // The PRD's thresholds, applied to the number the server already capped by
  // grounding: accept from 0.80, warn between 0.60 and 0.79, refuse below that.
  it("turns the model's number into the panel's three bands", () => {
    expect(map({ confidence: 0.8 })!.confidence).toBe("high");
    expect(map({ confidence: 0.79 })!.confidence).toBe("medium");
    expect(map({ confidence: 0.6 })!.confidence).toBe("medium");
    expect(map({ confidence: 0.59 })!.confidence).toBe("low");
  });

  it("maps the task onto the relation the chip already speaks", () => {
    expect(map({ task: "compose" })!.relation).toBe("compose_new");
    expect(map({ task: "reply_all" })!.relation).toBe("reply_to_email");
    expect(map({ task: "forward" })!.relation).toBe("reply_to_email");
    expect(map({ task: "unknown" })!.relation).toBe("unknown");
  });

  // Nothing usable must never replace the read the user already has.
  it("refuses an answer that did not survive grounding", () => {
    expect(map({ validation: { grounded: false, warnings: ["no_current_message"] } })).toBeNull();
  });

  it("refuses an answer with no message in it", () => {
    expect(map({ currentMessage: null })).toBeNull();
  });

  it("carries the region's truncation through to the reply prompt", () => {
    expect(map({}, true)!.truncated).toBe(true);
  });

  it("leaves the subject out rather than sending an empty one", () => {
    expect(map({ subject: null })!.post).toBeUndefined();
  });

  // The earlier rounds ride along as ancestors — the envelope's shape for "what
  // came before this message", depth 1 being the one right before it — so the
  // reply prompt keeps the conversation without a schema change.
  it("carries the earlier rounds as ancestors, newest first", () => {
    const context = map({ previousMessages: ["第二轮的内容", "第一轮的内容"] });
    expect(context!.ancestors).toEqual([{ depth: 1, body: "第二轮的内容" }, { depth: 2, body: "第一轮的内容" }]);
  });

  it("leaves ancestors out when the thread is a single message", () => {
    expect(map()!.ancestors).toBeUndefined();
  });

  it("never sends more rounds than the envelope allows", () => {
    expect(map({ previousMessages: ["a", "b", "c", "d"] })!.ancestors).toHaveLength(3);
  });
});

describe("identification summary", () => {
  it("shows a name and an address together", () => {
    expect(extractionSummary(extraction()).from).toBe("阿里云 <system@notice.aliyun.com>");
  });

  it("shows whichever half of the sender it has", () => {
    expect(extractionSummary(extraction({ sender: { name: "阿里云", email: null } })).from).toBe("阿里云");
    expect(extractionSummary(extraction({ sender: { name: null, email: "system@notice.aliyun.com" } })).from).toBe("system@notice.aliyun.com");
    expect(extractionSummary(extraction({ sender: null })).from).toBeNull();
  });

  it("reports the mode in the same words as the chip", () => {
    expect(extractionSummary(extraction({ task: "reply" })).mode).toBe("reply_to_email");
    expect(extractionSummary(extraction({ task: "compose" })).mode).toBe("compose_new");
  });
});
