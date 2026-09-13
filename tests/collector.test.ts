// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { collectLocalContext, regionFingerprint } from "../apps/extension/src/content/context/collector";

// The collector replaces "pick the block that is the message" with "hand over the
// region around it", so what these test is the *boundary*: how far the region
// reaches, what it leaves out, and when it says there is no conversation at all.

const EDITOR = `<div class="cmp"><div contenteditable="true" aria-label="输入正文"></div></div>`;
const editor = () => document.querySelector<HTMLElement>('[contenteditable="true"]')!;

beforeEach(() => { document.body.innerHTML = ""; });

describe("local context collector", () => {
  it("stops at the smallest container holding both the message and the box", () => {
    document.body.innerHTML = `<div class="app">
      <div class="list"><div>${"Promo row. ".repeat(30)}</div></div>
      <div class="read">
        <div class="body">Here is your activation code for ReplyKit: 978271. It expires in 15 minutes.</div>
        ${EDITOR}
      </div>
    </div>`;
    const collected = collectLocalContext(editor());
    expect(collected.replyDetected).toBe(true);
    expect(collected.text).toContain("978271");
    // The message list is outside the boundary, even though it is the longest
    // text on the page.
    expect(collected.text).not.toContain("Promo row.");
  });

  it("reaches up as far as it must when the message sits one level higher", () => {
    document.body.innerHTML = `<div class="app">
      <div class="read">
        <div class="wrapper"><div class="body">您好，请确认周五前能否交付最终版本，谢谢。期待您的回复，如有任何疑问请随时联系我。</div></div>
        <div class="cmp"><div contenteditable="true" aria-label="输入正文"></div></div>
      </div>
    </div>`;
    const collected = collectLocalContext(editor());
    expect(collected.replyDetected).toBe(true);
    expect(collected.text).toContain("最终版本");
  });

  // A new compose form has labels and controls above the editor, never a block of
  // prose, so it must not be read as a conversation.
  it("finds no conversation above a compose form", () => {
    document.body.innerHTML = `<div class="app"><div class="compose">
      <div class="row">To</div><div class="row">Subject</div>
      ${EDITOR}
    </div></div>`;
    const collected = collectLocalContext(editor());
    expect(collected.replyDetected).toBe(false);
    expect(collected.text).not.toContain("Subject");
  });

  it("finds no conversation when the composer stands alone", () => {
    document.body.innerHTML = EDITOR;
    const collected = collectLocalContext(editor());
    expect(collected.replyDetected).toBe(false);
    expect(collected.text).toBe("");
  });

  // Everything inside the region that exists to be operated rather than read is
  // dropped, and the count is reported so a size report can show the cleaning.
  it("drops the chrome and reports how much it dropped", () => {
    document.body.innerHTML = `<div class="read">
      <div class="toolbar" role="toolbar"><button>删除</button><button>转发</button></div>
      <div class="body">Daily report: 1 change. ${"Detail. ".repeat(20)}</div>
      <div class="cmp"><div contenteditable="true" aria-label="输入正文"></div></div>
      <div role="toolbar"><button>发送</button></div>
    </div>`;
    const collected = collectLocalContext(editor());
    expect(collected.text).toContain("Daily report: 1 change");
    expect(collected.text).not.toContain("删除");
    expect(collected.text).not.toContain("发送");
    expect(collected.stripped).toBeGreaterThan(0);
    expect(collected.nodeCount).toBeGreaterThan(0);
  });

  // The box being written in is never context: its toolbar, its send control and
  // its own labels belong to the composer, not to the message. Reported from the
  // live page, where that row reached the context as "回复阿里云切换完整写信发送取消表情".
  it("drops the composer's whole block, toolbar included", () => {
    document.body.innerHTML = `<div class="read">
      <div class="body">Your invoice is overdue and the account will be suspended tomorrow.</div>
      <div class="cmp">
        <div class="cmp-head">回复 客服 <span>发送</span> <span>取消</span></div>
        <div contenteditable="true" aria-label="输入正文"></div>
      </div>
    </div>`;
    const collected = collectLocalContext(editor());
    expect(collected.text).toContain("overdue");
    expect(collected.text).not.toContain("发送");
    expect(collected.text).not.toContain("取消");
    expect(collected.text).not.toContain("客服");
  });

  // Hidden content is invisible to a browser but very much present in the DOM
  // (a collapsed quote, a display:none menu). Attribute-level filtering is what
  // the detached clone can do; computed styles would need the live tree.
  it("leaves out what the page marks as hidden", () => {
    document.body.innerHTML = `<div class="read">
      <div class="body">This is the message being answered, long enough to count as prose.</div>
      <div aria-hidden="true">Screen-reader-only toolbar noise</div>
      <div style="display:none">Collapsed quote that must not be read</div>
      <div class="cmp"><div contenteditable="true" aria-label="输入正文"></div></div>
    </div>`;
    const collected = collectLocalContext(editor());
    expect(collected.text).toContain("message being answered");
    expect(collected.text).not.toContain("toolbar noise");
    expect(collected.text).not.toContain("Collapsed quote");
  });

  // What the user types — and any draft inserted into the box — is not part of
  // the conversation. Counting it made a fresh identification look stale as soon
  // as the user's own text changed, which is how an answer about the mail got
  // thrown away one click after it was applied.
  it("ignores the reply box's own text when telling conversations apart", () => {
    document.body.innerHTML = `<div class="read">
      <div class="body">Your invoice is overdue and the account will be suspended tomorrow.</div>
      ${EDITOR}
    </div>`;
    const before = regionFingerprint(editor());
    editor().textContent = "Thank you, I am very happy.";
    expect(regionFingerprint(editor())).toBe(before);

    // The conversation itself still counts.
    document.querySelector(".body")!.textContent = "A different message entirely, long enough to count as prose.";
    expect(regionFingerprint(editor())).not.toBe(before);
  });

  it("keeps the newest end of a long region when it has to cut", () => {
    document.body.innerHTML = `<div class="read">
      <div class="first">第一轮：${"旧内容。".repeat(30)}</div>
      <div class="latest">最后一轮：请确认本周五前能否交付最终版本。</div>
      ${EDITOR}
    </div>`;
    const collected = collectLocalContext(editor(), { maxChars: 60 });
    expect(collected.truncated).toBe(true);
    expect(collected.text.length).toBe(60);
    expect(collected.text).toContain("请确认本周五前");
    expect(collected.text).not.toContain("第一轮：");
  });

  it("does not truncate what fits", () => {
    document.body.innerHTML = `<div class="read">
      <div class="body">Congratulations, your refund has been processed and needs no action from you.</div>
      ${EDITOR}
    </div>`;
    const collected = collectLocalContext(editor());
    expect(collected.truncated).toBe(false);
    expect(collected.text).toContain("Congratulations");
  });
});
