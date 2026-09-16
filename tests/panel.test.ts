// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VerbiaPanel } from "../apps/extension/src/content/ui/panel";
import { QqMailAdapter } from "../apps/extension/src/content/adapters/qqmail";
import { RedditAdapter } from "../apps/extension/src/content/adapters/reddit";
import { UniversalAdapter } from "../apps/extension/src/content/adapters/universal";
import { WhatsAppAdapter } from "../apps/extension/src/content/adapters/whatsapp";
import { toTarget } from "../apps/extension/src/content/editor/editable";
import { DEFAULT_SETTINGS, UI_STRINGS, type ContextEnvelope } from "@verbia/shared";

// The panel builds a *closed* shadow root, which a test cannot reach. Open it
// while it is being created so the rendered markup can be asserted on at all.
let attachShadow: typeof Element.prototype.attachShadow;

beforeEach(() => {
  attachShadow = Element.prototype.attachShadow;
  vi.spyOn(Element.prototype, "attachShadow").mockImplementation(function (this: Element, init: ShadowRootInit) {
    return attachShadow.call(this, { ...init, mode: "open" });
  } as typeof Element.prototype.attachShadow);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

function context(confidence: ContextEnvelope["confidence"]): ContextEnvelope {
  return {
    relation: "reply_to_email",
    target: { body: "您的账户已产生欠费，请尽快结清。" },
    truncated: false,
    extractorVersion: "test",
    confidence
  };
}

async function render(confidence: ContextEnvelope["confidence"]): Promise<string> {
  const editor = document.createElement("div");
  editor.setAttribute("contenteditable", "true");
  document.body.append(editor);
  const panel = new VerbiaPanel(new QqMailAdapter(), toTarget(editor), context(confidence), () => {});
  panel.mountAfter(editor);
  await panel.open(false);
  const host = document.querySelector<HTMLElement>("[data-verbia-root='true']");
  return host?.shadowRoot?.innerHTML ?? "";
}

const detailsTag = (html: string) => html.match(/<details class="context"[^>]*>/)?.[0] ?? "";

describe("panel context warnings", () => {
  it("labels WhatsApp context as a conversation and identifies both sides", async () => {
    const editor = document.createElement("div");
    editor.setAttribute("contenteditable", "true");
    document.body.append(editor);
    const panel = new VerbiaPanel(new WhatsAppAdapter(), toTarget(editor), {
      relation: "unknown",
      target: { body: "Contact: Are you free?\nYou: After six." },
      truncated: false,
      extractorVersion: "test",
      confidence: "high"
    }, () => {});
    panel.mountAfter(editor);
    await panel.open(false);
    const text = document.querySelector<HTMLElement>("[data-verbia-root='true']")?.shadowRoot?.textContent ?? "";
    expect(text).toContain(UI_STRINGS.en["context.recentConversation"]);
    expect(text).toContain(`${UI_STRINGS.en["context.contact"]}: Are you free?`);
    expect(text).toContain(`${UI_STRINGS.en["context.you"]}: After six.`);
    expect(text).not.toContain(UI_STRINGS.en["context.originalMessage"]);
  });

  // Regression: the two warning rows were built from single-quoted strings
  // inside the template literal, so the panel rendered the source code
  // `${this.t("panel.warningLow")}` instead of the sentence.
  it("writes the warning text, not the source that builds it", async () => {
    const html = await render("low");
    expect(html).not.toContain("${");
    expect(html).toContain(UI_STRINGS.en["panel.warningLow"]);
    // The low that is a guess at the page, not the low of an answer the user
    // asked for (@see the identification tests).
    expect(html).not.toContain(UI_STRINGS.en["panel.warningLowIdentified"]);
  });

  // The button is the one path to a model the user starts by hand. It has to be
  // obvious that it is AI doing the reading, and that the press costs a reply.
  it("says what the identify button does and what it costs", async () => {
    const html = await render("low");
    expect(html).toContain(UI_STRINGS.en["context.identify"]);
    expect(html).toContain(UI_STRINGS.en["context.identifyHint"]);
  });

  // A low-confidence context is the case a correction path exists for, and the
  // user cannot judge a read they cannot see.
  it("opens the context preview when the read is a guess", async () => {
    const html = await render("low");
    expect(detailsTag(html)).toContain("open");
  });

  it("leaves a normal read folded, as the user's settings ask", async () => {
    const html = await render("high");
    expect(detailsTag(html)).not.toContain("open");
    expect(html).not.toContain(UI_STRINGS.en["panel.warningLow"]);
  });

  it("says so when the context was truncated", async () => {
    const editor = document.createElement("div");
    editor.setAttribute("contenteditable", "true");
    document.body.append(editor);
    const panel = new VerbiaPanel(new QqMailAdapter(), toTarget(editor), { ...context("high"), truncated: true }, () => {});
    panel.mountAfter(editor);
    await panel.open(false);
    const html = document.querySelector<HTMLElement>("[data-verbia-root='true']")?.shadowRoot?.innerHTML ?? "";
    expect(html).toContain(UI_STRINGS.en["panel.warningTruncated"]);
  });
});

// ---------------------------------------------------------------------------
// The repair path: the button, what a press does, and what it refuses to do.
// ---------------------------------------------------------------------------

const REGION = `<div class="read">
  <div class="body">尊敬的ambitious98：您的账户ambitious98已产生欠费，您的按量付费商品延期停服的额度为10.00元。欠费详情请至用户中心首页查询。</div>
  <div class="cmp"><div contenteditable="true" aria-label="输入正文"></div></div>
</div>`;

// The shape a widened pass exists for: the message sits in a wrapper beside a reply
// area that has a hint of its own above the box, so the narrow boundary stops at the
// hint and the first read finds no message in it.
const WIDENABLE_REGION = `<div class="read">
  <div class="body">${"尊敬的用户，您的账户存在异常登录风险，请尽快修改密码并完成身份验证。".repeat(4)}</div>
  <div class="reply">
    <div class="tip">温馨提示：请勿泄露验证码及密码等信息，客服人员不会以任何理由向您索要验证码，请提高警惕。</div>
    <div class="cmp"><div contenteditable="true" aria-label="输入正文"></div></div>
  </div>
</div>`;

const IDENTIFIED_MESSAGE = "尊敬的ambitious98：您的账户ambitious98已产生欠费，您的按量付费商品延期停服的额度为10.00元。";

const EARLIER_ROUND = "上一轮：您的续费申请已收到，如需取消请回复本邮件。";

const identified = {
  requestId: "ad37fb67-54ed-4b84-b9c3-658f65252c0d",
  task: "reply",
  subject: "您的阿里云账户ambitious98已欠费即将逾期",
  sender: { name: "阿里云", email: "system@notice.aliyun.com" },
  currentMessage: IDENTIFIED_MESSAGE,
  previousMessages: [EARLIER_ROUND],
  confidence: 0.9,
  validation: { grounded: true, warnings: [] },
  latencyMs: 700
};

type Sent = { type?: string; payload?: Record<string, unknown> };

function fakeChrome(reply: (message: Sent) => Promise<unknown>, settings: Record<string, unknown> = DEFAULT_SETTINGS) {
  return {
    runtime: {
      id: "verbia-test",
      getURL: (path: string) => `chrome-extension://verbia-test/${path}`,
      getManifest: () => ({ version: "0.1.4" }),
      // The panel pulls settings on every open; only the identify request is the
      // test's business.
      sendMessage: (message: Sent) => message.type === "GET_SETTINGS"
        ? Promise.resolve({ ok: true, data: settings })
        : reply(message)
    },
    storage: { onChanged: { addListener: () => {}, removeListener: () => {} } },
    i18n: { getUILanguage: () => "en-US" }
  };
}

async function buildPanel(html: string, reply: (message: Sent) => Promise<unknown>) {
  vi.stubGlobal("chrome", fakeChrome(reply));
  document.body.innerHTML = html;
  const editor = document.querySelector<HTMLElement>('[contenteditable="true"]');
  if (!editor) throw new Error("fixture has no editor");
  const panel = new VerbiaPanel(new QqMailAdapter(), toTarget(editor), context("low"), () => {});
  panel.mountAfter(editor);
  await panel.open(false);
  return panel;
}

// The panel carries the direction on its own host, because a closed shadow root
// resets what the page around it sets (@see the [dir="rtl"] rule in the styles).
// Hebrew reaches the host through the same two steps Arabic does — resolveUiLang,
// then isRtl — so this is what catches a new right-to-left language being added to
// the string table and then laid out left to right anyway.
describe("right-to-left layout", () => {
  it("turns the panel around for a right-to-left language", async () => {
    vi.stubGlobal("chrome", fakeChrome(async () => ({ ok: true, data: identified }), { ...DEFAULT_SETTINGS, uiLanguage: "he" }));
    document.body.innerHTML = REGION;
    const editor = document.querySelector<HTMLElement>('[contenteditable="true"]');
    if (!editor) throw new Error("fixture has no editor");
    const panel = new VerbiaPanel(new QqMailAdapter(), toTarget(editor), context("high"), () => {});
    panel.mountAfter(editor);
    await panel.open(false);
    expect(document.querySelector<HTMLElement>("[data-verbia-root='true']")?.dir).toBe("rtl");
  });
});

// Dictation had no test until this one, which is how "Auto" came to read the
// browser language while the interface said something else. The recognizer is told
// the interface language instead, because that is the language the user is looking
// at — and the one they are most likely about to speak.
describe("dictation", () => {
  it("listens in the interface language when the voice setting is Auto", async () => {
    const listened: string[] = [];
    class FakeRecognition {
      continuous = false;
      interimResults = false;
      lang = "";
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onresult: ((event: unknown) => void) | null = null;
      start() { listened.push(this.lang); }
      stop() {}
    }
    vi.stubGlobal("SpeechRecognition", FakeRecognition);
    vi.stubGlobal("chrome", fakeChrome(async () => ({ ok: true, data: identified }), { ...DEFAULT_SETTINGS, uiLanguage: "sv" }));
    document.body.innerHTML = REGION;
    const editor = document.querySelector<HTMLElement>('[contenteditable="true"]');
    if (!editor) throw new Error("fixture has no editor");
    const panel = new VerbiaPanel(new QqMailAdapter(), toTarget(editor), context("high"), () => {});
    panel.mountAfter(editor);
    await panel.open(false);

    const speak = document.querySelector<HTMLElement>("[data-verbia-root='true']")?.shadowRoot?.querySelector<HTMLElement>('[data-action="record"]');
    expect(speak).not.toBeNull();
    speak?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(listened).toEqual(["sv-SE"]);
  });
});

const shadow = () => document.querySelector<HTMLElement>("[data-verbia-root='true']")!.shadowRoot!;
const shadowHtml = () => shadow().innerHTML;
// What the user reads, with entities already resolved: the summary is escaped on
// its way into the markup, so "name <address>" is not findable in the HTML.
const shadowText = () => shadow().textContent ?? "";
const identifyButton = () => shadow().querySelector<HTMLButtonElement>('[data-action="identify"]');
// The line under the button. Kept separate from the rest of the panel text so an
// assertion about the status message cannot be satisfied by the context preview.
const identifyStatus = () => shadow().querySelector(".identify-status")?.textContent ?? "";
const pressIdentify = () => identifyButton()!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

describe("identifying the context", () => {
  it("sends the region on click and reports what came back", async () => {
    const sent: Sent[] = [];
    await buildPanel(REGION, async message => { sent.push(message); return { ok: true, data: identified }; });
    pressIdentify();
    await vi.waitFor(() => expect(shadowHtml()).toContain(UI_STRINGS.en["context.identified"]));

    // The status line says what happened and nothing else — no sender, no subject,
    // no body. That content is the context itself, which just opened below it.
    expect(identifyStatus()).toBe(UI_STRINGS.en["context.identified"]);
    expect(detailsTag(shadowHtml())).toContain("open");
    // The sender leads the context, so the user can check who they are answering.
    expect(shadowText()).toContain(UI_STRINGS.en["context.from"]);
    expect(shadowText()).toContain("阿里云 <system@notice.aliyun.com>");
    // The context is now the identified message, not the read it replaced, and
    // the round before it arrives under the mail heading rather than Reddit's.
    expect(shadowHtml()).toContain("按量付费商品延期停服");
    expect(shadowText()).toContain(UI_STRINGS.en["context.earlierMessages"]);
    expect(shadowText()).toContain(EARLIER_ROUND);

    expect(sent).toHaveLength(1);
    expect(sent[0]?.type).toBe("EXTRACT_CONTEXT");
    // The gate the server checks before paying for a call.
    expect(sent[0]?.payload?.trigger).toBe("explicit_user_click");
    expect((sent[0]?.payload?.collected as { text: string }).text).toContain("已产生欠费");
    expect(sent[0]?.payload?.schemaVersion).toBe("1");
  });

  it("sends one request per press, not one per click event", async () => {
    const sent: Sent[] = [];
    await buildPanel(REGION, async message => { sent.push(message); return { ok: true, data: identified }; });
    pressIdentify();
    pressIdentify();
    await vi.waitFor(() => expect(shadowHtml()).toContain(UI_STRINGS.en["context.identified"]));
    expect(sent).toHaveLength(1);
  });

  it("disables the button while the identification is in flight", async () => {
    let release: (value: unknown) => void = () => {};
    const pending = new Promise(resolve => { release = resolve; });
    await buildPanel(REGION, async () => pending);
    pressIdentify();
    await vi.waitFor(() => expect(identifyButton()?.hasAttribute("disabled")).toBe(true));
    expect(shadowHtml()).toContain(UI_STRINGS.en["context.identifying"]);

    release({ ok: true, data: identified });
    await vi.waitFor(() => expect(shadowHtml()).toContain(UI_STRINGS.en["context.identified"]));
    expect(identifyButton()?.hasAttribute("disabled")).toBe(false);
  });

  // Nothing usable came back: the read the user already had is still the best
  // thing on screen, so it stays and the panel says what happened.
  it("keeps the adapter's read when the answer did not survive grounding", async () => {
    await buildPanel(REGION, async () => ({ ok: true, data: { ...identified, currentMessage: null, validation: { grounded: false, warnings: ["no_current_message"] } } }));
    pressIdentify();
    await vi.waitFor(() => expect(shadowHtml()).toContain(UI_STRINGS.en["context.identifyFailed"]));
    expect(shadowHtml()).toContain("请尽快结清");
    expect(shadowHtml()).not.toContain("按量付费商品延期停服");
  });

  // A grounded answer can still come back with a low confidence — the server caps
  // the model's own number by what it could trace back to the region. That low is
  // not the adapter's guess, so its wording does not point back at the button that
  // just produced it.
  it("tells a low-confidence identification apart from the adapter's guess", async () => {
    await buildPanel(REGION, async () => ({ ok: true, data: { ...identified, confidence: 0.3 } }));
    expect(shadowHtml()).toContain(UI_STRINGS.en["panel.warningLow"]);
    pressIdentify();
    await vi.waitFor(() => expect(shadowHtml()).toContain(UI_STRINGS.en["panel.warningLowIdentified"]));
    expect(shadowHtml()).not.toContain(UI_STRINGS.en["panel.warningLow"]);
  });

  it("reports a failed call instead of pretending", async () => {
    await buildPanel(REGION, async () => { throw new Error("upstream is down"); });
    pressIdentify();
    await vi.waitFor(() => expect(shadowHtml()).toContain(UI_STRINGS.en["context.identifyFailed"]));
  });


  // The server words its failures in English; the panel words them in the
  // interface language, by the code — the server's own sentence goes to the
  // console.
  // The adapter knows its site better than the collector does: when it hands over
  // a region, that is what goes to the model — not the collector's own read.
  it("prefers the region the adapter hands over", async () => {
    const sent: Sent[] = [];
    class HintedAdapter extends QqMailAdapter {
      identifyRegion() { return { text: "Thread text handed over by the adapter, long enough to count as prose.", truncated: false }; }
    }
    vi.stubGlobal("chrome", fakeChrome(async message => { sent.push(message); return { ok: true, data: identified }; }));
    document.body.innerHTML = REGION;
    const editor = document.querySelector<HTMLElement>('[contenteditable="true"]')!;
    const panel = new VerbiaPanel(new HintedAdapter(), toTarget(editor), context("low"), () => {});
    panel.mountAfter(editor);
    await panel.open(false);

    pressIdentify();
    await vi.waitFor(() => expect(identifyStatus()).toBe(UI_STRINGS.en["context.identified"]));
    const payload = sent.find(message => message.type === "EXTRACT_CONTEXT")?.payload as { collected: { text: string } };
    expect(payload.collected.text).toContain("handed over by the adapter");
  });

  it("words a server failure in the interface language", async () => {
    await buildPanel(REGION, async () => ({ ok: false, error: { code: "PROVIDER_ERROR", userMessage: "Verbia could not identify the context on this page. Select the text you are answering instead.", retryable: true } }));
    pressIdentify();
    await vi.waitFor(() => expect(identifyStatus()).toBe(UI_STRINGS.en["context.identifyFailed"]));
  });

  it("words a busy model by its code, not by the server's English", async () => {
    await buildPanel(REGION, async () => ({ ok: false, error: { code: "RATE_LIMITED", userMessage: "The model is busy or quota-limited. Try again shortly.", retryable: true } }));
    pressIdentify();
    await vi.waitFor(() => expect(identifyStatus()).toBe(UI_STRINGS.en["error.busy"]));
  });

  // A compose form has no conversation above it, and a model asked about one
  // would only invent it.
  it("does not spend a call when there is nothing to identify", async () => {
    const sent: Sent[] = [];
    await buildPanel(`<div class="cmp"><div contenteditable="true" aria-label="输入正文"></div></div>`, async message => { sent.push(message); return { ok: true, data: identified }; });
    pressIdentify();
    await vi.waitFor(() => expect(shadowHtml()).toContain(UI_STRINGS.en["context.identifyFailed"]));
    expect(sent).toHaveLength(0);
  });

  // The rule the user asked for: the context only moves when the panel is
  // *opened*. Folding it, unfolding it, clicking back into the editor — all of
  // those keep it, even when the page has moved on. The preview shows what is
  // being used, and the button re-reads on demand.
  it("leaves the answer alone until an explicit summon", async () => {
    const panel = await buildPanel(REGION, async () => ({ ok: true, data: identified }));
    pressIdentify();
    await vi.waitFor(() => expect(shadowHtml()).toContain(UI_STRINGS.en["context.identified"]));
    expect(panel.dropsStaleIdentification(true)).toBe(false);

    // Another message opened while the panel stayed mounted.
    document.querySelector(".body")!.textContent = "这是完全另一封邮件的内容，和刚才那封没有任何关系，长度也足够构成一段正文。";
    // None of these opens the panel, so none of them may drop the answer.
    expect(panel.dropsStaleIdentification(false)).toBe(false);
    expect(panel.dropsStaleIdentification(false)).toBe(false);
    // The shortcut is the user asking Verbia to look again — that one does.
    expect(panel.dropsStaleIdentification(true)).toBe(true);
    // Already forgotten: a second call has nothing left to compare against.
    expect(panel.dropsStaleIdentification(true)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Pages that are not mail sites. The identification is a mail feature: it answers
// "which message am I replying to", and a generic page has no answer to that — the
// model would name whichever text it liked and the panel would offer it as context.
// ---------------------------------------------------------------------------

describe("sites without mail", () => {
  async function build(adapter: UniversalAdapter | RedditAdapter, mode: "universal" | "auto") {
    vi.stubGlobal("chrome", fakeChrome(async () => ({ ok: true, data: identified })));
    document.body.innerHTML = REGION;
    const editor = document.querySelector<HTMLElement>('[contenteditable="true"]');
    if (!editor) throw new Error("fixture has no editor");
    const panel = new VerbiaPanel(adapter, toTarget(editor), context("high"), () => {}, mode);
    panel.mountAfter(editor);
    await panel.open(false);
    return panel;
  }

  it("offers no identification on a generic page", async () => {
    await build(new UniversalAdapter(), "universal");
    expect(identifyButton()).toBeNull();
    expect(shadowText()).not.toContain(UI_STRINGS.en["context.identify"]);
  });

  // Reddit has its own read of the thread and no mail to identify: the repair path
  // there is selecting the text, not asking a model about a conversation.
  it("offers no identification on Reddit", async () => {
    await build(new RedditAdapter(), "auto");
    expect(identifyButton()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Email mode: a webmail host with no adapter of its own. Nothing reads the page
// for the user, so the panel's job is to say so and make the one useful action
// the obvious one.
// ---------------------------------------------------------------------------

const NOTHING_READ: ContextEnvelope = { relation: "none", truncated: false, extractorVersion: "1.0.0", confidence: "medium" };

async function buildEmailPanel(reply: (message: Sent) => Promise<unknown>) {
  vi.stubGlobal("chrome", fakeChrome(reply));
  document.body.innerHTML = REGION;
  const editor = document.querySelector<HTMLElement>('[contenteditable="true"]');
  if (!editor) throw new Error("fixture has no editor");
  const panel = new VerbiaPanel(new UniversalAdapter(), toTarget(editor), NOTHING_READ, () => {}, "email");
  panel.mountAfter(editor);
  await panel.open(false);
  return panel;
}

describe("email mode", () => {
  // A first answer that found no message in the region gets one wider read before
  // the user is told to select the text by hand: the boundary can sit right around
  // the reply box and still hold a hint instead of the mail. The wait is relabelled
  // rather than reported as a failure — it is the same press, reading further out.
  it("reads a wider region once when the first answer finds no message", async () => {
    const sent: Sent[] = [];
    let attempt = 0;
    await buildPanel(WIDENABLE_REGION, async message => {
      sent.push(message);
      attempt += 1;
      return attempt === 1
        ? { ok: true, data: { ...identified, currentMessage: null, validation: { grounded: false, warnings: ["no_current_message"] } } }
        : { ok: true, data: identified };
    });
    pressIdentify();
    await vi.waitFor(() => expect(shadowHtml()).toContain(UI_STRINGS.en["context.identified"]));
    const texts = sent.map(message => (message.payload?.collected as { text: string }).text);
    expect(texts).toHaveLength(2);
    // The second request carries more of the page: that is the whole of the retry.
    expect(texts[1]!.length).toBeGreaterThan(texts[0]!.length);
  });

  it("labels the wider read instead of reporting a failure on the way", async () => {
    let release: (value: unknown) => void = () => {};
    const pending = new Promise(resolve => { release = resolve; });
    let attempt = 0;
    await buildPanel(WIDENABLE_REGION, async () => {
      attempt += 1;
      return attempt === 1
        ? { ok: true, data: { ...identified, currentMessage: null, validation: { grounded: false, warnings: ["no_current_message"] } } }
        : pending;
    });
    pressIdentify();
    await vi.waitFor(() => expect(shadowHtml()).toContain(UI_STRINGS.en["context.identifyingWider"]));
    // The first answer is not the user's business: it is one press, still working.
    expect(shadowHtml()).not.toContain(UI_STRINGS.en["context.identifyFailed"]);
    expect(identifyButton()?.hasAttribute("disabled")).toBe(true);

    release({ ok: true, data: identified });
    await vi.waitFor(() => expect(shadowHtml()).toContain(UI_STRINGS.en["context.identified"]));
  });

  // Widening is only worth a second call when it actually brings in more text: a
  // region that cannot grow is a page with nothing further to read, and asking
  // again would spend a model call to get the same answer.
  it("does not ask twice when a wider read adds nothing", async () => {
    const sent: Sent[] = [];
    await buildPanel(REGION, async message => {
      sent.push(message);
      return { ok: true, data: { ...identified, currentMessage: null, validation: { grounded: false, warnings: ["no_current_message"] } } };
    });
    pressIdentify();
    await vi.waitFor(() => expect(shadowHtml()).toContain(UI_STRINGS.en["context.identifyFailed"]));
    expect(sent).toHaveLength(1);
  });

  it("labels the host as mail and asks for an identification", async () => {
    await buildEmailPanel(async () => ({ ok: true, data: identified }));
    expect(shadowText()).toContain(UI_STRINGS.en["context.email"]);
    expect(shadowHtml()).toContain(UI_STRINGS.en["panel.warningNoContext"]);
    // Nothing was read, so the only way to get a context leads with the primary
    // weight — the reverse of a site whose adapter already read the page.
    expect(identifyButton()?.classList.contains("primary")).toBe(true);
  });

  // The telemetry story of this mode: `siteMode` separates "the model could not
  // read this provider" from "our adapter could not", so it is what says where an
  // adapter is worth writing next. It travels as its own optional field because
  // `platform` is a closed enum — a client that ships a new value before the API
  // does gets a 400, which is exactly what an `email` platform value cost.
  it("reports the mode beside the platform, never inside it", async () => {
    const sent: Sent[] = [];
    await buildEmailPanel(async message => { sent.push(message); return { ok: true, data: identified }; });
    pressIdentify();
    await vi.waitFor(() => expect(identifyStatus()).toBe(UI_STRINGS.en["context.identified"]));
    expect(sent[0]?.payload?.siteMode).toBe("email");
    expect(sent[0]?.payload?.platform).toBe("universal");
  });

  // The reader is checking this very read, so its words must not change under them
  // when the task came back unclassified: a subject is not a post title and a message
  // is not a target comment just because the model could not name the task.
  it("describes the read in mail words even when the task is unknown", async () => {
    await buildEmailPanel(async () => ({ ok: true, data: { ...identified, task: "unknown" } }));
    pressIdentify();
    await vi.waitFor(() => expect(shadowHtml()).toContain(UI_STRINGS.en["context.identified"]));
    expect(shadowText()).toContain(UI_STRINGS.en["context.subject"]);
    expect(shadowText()).toContain(UI_STRINGS.en["context.originalMessage"]);
    expect(shadowText()).not.toContain(UI_STRINGS.en["context.postTitle"]);
    expect(shadowText()).not.toContain(UI_STRINGS.en["context.targetComment"]);
    // The chip says what is on screen rather than "unknown context", which reads as a
    // contradiction over a mail the reader can see.
    expect(shadowText()).toContain(UI_STRINGS.en["context.rel.identified"]);
    expect(shadowText()).not.toContain(UI_STRINGS.en["context.rel.unknown"]);
  });

  it("drops the prompt and the primary weight once the mail is read", async () => {
    await buildEmailPanel(async () => ({ ok: true, data: identified }));
    pressIdentify();
    await vi.waitFor(() => expect(shadowHtml()).toContain(UI_STRINGS.en["context.identified"]));
    expect(shadowHtml()).not.toContain(UI_STRINGS.en["panel.warningNoContext"]);
    expect(identifyButton()?.classList.contains("secondary")).toBe(true);
  });
});
