// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { collectLocalContext } from "../apps/extension/src/content/context/collector";
import { rectIn, unreachableFrame, viewDocument } from "../apps/extension/src/content/page-claim";

// The shapes a legacy webmail actually ships, and that this file keeps honest:
// the editor is a document of its own (a src-less designMode frame on Tencent
// Exmail, where the whole body is the editable), the message it answers is in the
// page that owns that frame — sometimes in a frame beside it — and a reply can
// carry the quote inside the box itself.
//
// Every case here cost a round of debugging in the field. A fixture is what keeps
// the next change from quietly taking one of them away again.

const MAIL = "Hi Henri, thanks for the quick turnaround on the fix. One more thing before we ship: the billing address on the invoice is wrong.";

beforeEach(() => { document.body.innerHTML = ""; });

// jsdom has no layout, and a zero-sized box is not an editor to this extension:
// rects are stubbed where anything reads them.
function giveBox(element: Element, top: number, left: number, height = 300, width = 600): void {
  Object.defineProperty(element, "getBoundingClientRect", {
    value: () => ({ x: left, y: top, top, left, right: left + width, bottom: top + height, width, height })
  });
}

// jsdom does not implement innerText, which is what a browser reports for the text
// a contenteditable reads as. Defined on the element under test, like the browser
// would answer for plain markup.
function giveInnerText(element: HTMLElement): void {
  Object.defineProperty(element, "innerText", { get: () => element.textContent ?? "" });
}

// A frame of its own, same-origin and reachable. jsdom does expose `frameElement`,
// so nothing is stubbed for the walk up the frame tree.
function addFrame(parent: ParentNode, html: string): HTMLIFrameElement {
  const frame = document.createElement("iframe");
  parent.appendChild(frame);
  frame.contentDocument!.body.innerHTML = html;
  return frame;
}

describe("webmail frames", () => {
  it("reads the message from the page that owns the editor frame", () => {
    // The editor is the whole body of its frame, so this document holds nothing to
    // read: the conversation is above the frame, in the page that owns it.
    document.body.innerHTML = `<div class="app"><div class="read"><div class="mail">${MAIL}</div><div class="reply"></div></div></div>`;
    const frame = addFrame(document.querySelector(".reply")!, `<div>Dear Rob,</div>`);
    const collected = collectLocalContext(frame.contentDocument!.body);

    expect(collected.replyDetected).toBe(true);
    expect(collected.text).toContain("billing address");
    // The draft in the box never becomes context: the block dropped as the composer
    // is the frame the editor lives in.
    expect(collected.text).not.toContain("Dear Rob");
    // Read a document up: the label an aggregate counts, asserted here so the two
    // cannot drift apart silently.
    expect(collected.readPath).toBe("up");
  });

  it("folds a message that sits in a frame beside the editor into the region", () => {
    // The message is not a sibling *node* of the editor here, it is a sibling frame:
    // reading frames in place is what keeps it out of the noise pass, which deletes
    // every frame it finds.
    document.body.innerHTML = `<div class="read"><div class="mail"></div><div class="reply"></div></div>`;
    addFrame(document.querySelector(".mail")!, `<div>${MAIL}</div>`);
    const frame = addFrame(document.querySelector(".reply")!, `<div>Dear Rob,</div>`);
    const collected = collectLocalContext(frame.contentDocument!.body);

    expect(collected.replyDetected).toBe(true);
    expect(collected.text).toContain("billing address");
    expect(collected.frames).toBeGreaterThan(0);
    expect(collected.text).not.toContain("Dear Rob");
    expect(collected.readPath).toBe("up");
  });

  it("reads a quote carried inside the box instead of the compose form around it", () => {
    // A reply that keeps the message it answers in the box: the page around it holds
    // only the compose form's own rows, which are not a conversation.
    document.body.innerHTML = `<div class="compose"><div class="rows">收件人 david@krispitech.com | 添加抄送 | 主题 添加附件 插入正文 表情 正文模版 截屏 样式</div><div class="reply"></div></div>`;
    const quote = "--------- Original --------- From: David from KrispiTech <david@krispitech.com> Date: 2026-09-22 Subject: Verbia on Product Hunt Thanks for the listing — here is what we offer, in case it helps.";
    const frame = addFrame(document.querySelector(".reply")!, `<div>${quote}</div><div>Dear David,</div>`);
    const editor = frame.contentDocument!.body;
    giveInnerText(editor);

    const collected = collectLocalContext(editor);

    expect(collected.replyDetected).toBe(true);
    expect(collected.text).toContain("KrispiTech");
    expect(collected.text).not.toContain("添加附件");
    expect(collected.readPath).toBe("quoted");
  });

  it("does not mistake a compose form for a conversation", () => {
    // The form's rows clear the floor that tells a conversation from interface, so a
    // read taken a document up needs a higher one: a message is longer than the form
    // it sits in, and reading a form produces an invented identification.
    document.body.innerHTML = `<div class="compose"><div class="rows">收件人 david@krispitech.com | 添加抄送 | 主题 | 添加附件 | 插入正文 | 表情 | 正文模版 | 截屏 | 样式 | 发送</div><div class="reply"></div></div>`;
    const frame = addFrame(document.querySelector(".reply")!, `<div>Dear David,</div>`);
    const editor = frame.contentDocument!.body;
    giveInnerText(editor);

    expect(collectLocalContext(editor).replyDetected).toBe(false);
  });

  it("mounts the panel one document up and measures the editor there", () => {
    const frame = addFrame(document.body, "");
    giveBox(frame, 120, 40);
    const editor = frame.contentDocument!.body;
    giveBox(editor, 10, 5, 80, 200);

    // The panel belongs to the outermost document the script can reach: a panel left
    // in a frame is clipped to that frame's box, and a reply box is smaller than the
    // panel is.
    expect(viewDocument(frame.contentDocument!)).toBe(document);

    // The editor's rect is only meaningful once every frame on the way up is added.
    const rect = rectIn(document, editor);
    expect(rect.top).toBe(130);
    expect(rect.left).toBe(45);
  });

  it("tells a frame no script can enter apart from one that is merely empty", () => {
    // The two look the same from the outside — the caret is in neither document this
    // instance can read — and the summon answers them with different words: "look
    // for an editor" against "this one is out of reach, select the text instead".
    const host = addFrame(document.body, "");
    const inner = host.contentDocument!;
    expect(unreachableFrame(document)).toBeNull();

    const foreign = document.createElement("iframe");
    inner.body.append(foreign);
    Object.defineProperty(foreign, "contentDocument", { value: null, configurable: true });
    Object.defineProperty(inner, "activeElement", { value: foreign, configurable: true });

    expect(unreachableFrame(document)).toBe(foreign);
    expect(unreachableFrame(inner)).toBe(foreign);
  });
});
