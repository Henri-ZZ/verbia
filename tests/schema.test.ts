import { describe, expect, it } from "vitest";
import { generateReplyRequestSchema } from "@verbia/shared";

const valid = { requestId: "ad37fb67-54ed-4b84-b9c3-658f65252c0d", schemaVersion: "1", platform: "reddit", page: { urlOrigin: "https://www.reddit.com" }, context: { relation: "reply_to_comment", target: { body: "Price is still low." }, truncated: false, extractorVersion: "1.0.0", confidence: "high" }, intent: { text: "礼貌地不同意", source: "typed" }, output: { language: "en", tone: "polite", length: "short" }, client: { extensionVersion: "0.1.0", adapterVersion: "1.0.0" } };

describe("generation schema", () => {
  it("accepts a bounded, normalized request", () => expect(generateReplyRequestSchema.safeParse(valid).success).toBe(true));
  it("rejects an empty intent", () => expect(generateReplyRequestSchema.safeParse({ ...valid, intent: { ...valid.intent, text: " " } }).success).toBe(false));
  it("rejects a query-bearing full URL as origin", () => expect(generateReplyRequestSchema.safeParse({ ...valid, page: { urlOrigin: "not a url" } }).success).toBe(false));
});
