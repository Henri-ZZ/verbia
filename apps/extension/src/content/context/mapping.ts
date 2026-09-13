import type { ContextEnvelope, ContextExtractionResponse, ExtractionTask } from "@verbia/shared";

// Turning one identification into the context the panel works with.
//
// The extraction answers a JSON shape of its own (task / subject / sender /
// currentMessage); the rest of Verbia speaks ContextEnvelope, which the reply
// prompt is built from. The mapping stays here, away from both, so it can be
// read and tested on its own — and so it is obvious that nothing else in the
// product learns about the extractor.
//
// `sender` is deliberately not mapped: the envelope has nowhere to put it, and
// adding a field would change the reply request schema and the server prompt for
// a line of UI text. The panel shows it in its own summary instead.

// The PRD's thresholds, applied to the number the server already capped by
// grounding: accept from 0.80, warn between 0.60 and 0.79, refuse below that.
// Calibrated against the fixture set later; until then they are one place to
// change.
const ACCEPT_CONFIDENCE = 0.8;

function confidenceBand(confidence: number): ContextEnvelope["confidence"] {
  return confidence >= ACCEPT_CONFIDENCE ? "high" : confidence >= 0.6 ? "medium" : "low";
}

function relationFor(task: ExtractionTask): ContextEnvelope["relation"] {
  if (task === "compose") return "compose_new";
  if (task === "reply" || task === "reply_all" || task === "forward") return "reply_to_email";
  return "unknown";
}

// Null means "nothing usable came back": the caller keeps the adapter's read and
// tells the user to select the text by hand. An answer without a message, or one
// whose message did not survive grounding, is not worth overwriting a working
// context with.
export function contextFromExtraction(
  result: ContextExtractionResponse,
  options: { regionTruncated: boolean; extractorVersion?: string }
): ContextEnvelope | null {
  if (!result.validation.grounded || !result.currentMessage) return null;
  return {
    relation: relationFor(result.task),
    ...(result.subject ? { post: { title: result.subject } } : {}),
    // The earlier rounds ride along as ancestors: the envelope has carried that
    // shape — "what came before this message", depth 1 being the one right before
    // it — since Reddit's parent comments, so the conversation stays visible to
    // the reply prompt without touching the reply request schema.
    ...(result.previousMessages.length
      ? { ancestors: result.previousMessages.slice(0, 3).map((body, index) => ({ depth: index + 1, body })) }
      : {}),
    target: { body: result.currentMessage },
    // The region was cut, so the message may be cut with it. Carried through
    // rather than assumed away: the reply prompt warns on a truncated context.
    truncated: options.regionTruncated,
    extractorVersion: options.extractorVersion ?? "ai-manual/1",
    confidence: confidenceBand(result.confidence)
  };
}

// What the panel shows above the context so the user can check the answer at a
// glance: who sent it, and what it is about. Either may be missing — a model that
// found the message but no sender is still useful.
export function extractionSummary(result: ContextExtractionResponse): { from: string | null; subject: string | null; mode: ContextEnvelope["relation"] } {
  const name = result.sender?.name ?? null;
  const email = result.sender?.email ?? null;
  return {
    from: name && email ? `${name} <${email}>` : name ?? email,
    subject: result.subject,
    mode: relationFor(result.task)
  };
}
