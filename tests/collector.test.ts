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

  // A webmail that renders the message in a same-origin frame (163 among them) put
  // the body where `textContent` cannot see it, and the noise list then deleted the
  // frame outright. The region came out holding a mail header and nothing to reply
  // to, which the model answered with no_current_message — a failure that looked
  // like the model giving up and was the collector's doing.
  it("reads the message out of a same-origin frame instead of deleting it", () => {
    document.body.innerHTML = `<div class="read">
      <div class="head">网易邮箱提醒：登录网易邮箱失败 发件人：网易邮件中心 收件人：someone@163.com</div>
      <iframe class="body"></iframe>
      ${EDITOR}
    </div>`;
    const frame = document.querySelector("iframe")!;
    // A mail frame is a document: it opens with the stylesheet that lays the message
    // out, and `textContent` alone would hand that source to the model instead of the
    // mail.
    frame.contentDocument!.body.innerHTML = `<style>.nds-quote-trigger{display:none}</style><script>var tracking=1;</script><div>尊敬的用户，您的账户存在异常登录风险，请尽快修改密码并完成身份验证。</div>`;
    const collected = collectLocalContext(editor());
    expect(collected.replyDetected).toBe(true);
    expect(collected.text).toContain("账户存在异常登录风险");
    // The frame is read, not dropped: the count says so, and the header still leads.
    expect(collected.frames).toBe(1);
    expect(collected.text).toContain("登录网易邮箱失败");
    // The frame's own chrome is cleaned like any other: styles and scripts are not
    // the message.
    expect(collected.text).not.toContain("nds-quote-trigger");
    expect(collected.text).not.toContain("tracking");
  });

  // The second pass of an identification: a page that keeps its message outside the
  // narrow boundary — a reply area with a hint of its own right above the box —
  // answers "no message" on the first read. Widening reaches the message, and the
  // composer is still dropped, which is the part that needed the narrow boundary to
  // stay exact inside a bigger clone.
  it("reaches a message the narrow boundary left out", () => {
    document.body.innerHTML = `<div class="read">
      <div class="body">您申请重置密码的验证码是 978271，十五分钟内有效，请勿转发给他人。</div>
      <div class="reply">
        <div class="tip">温馨提示：请勿泄露验证码及密码等信息，客服人员不会以任何理由向您索要验证码，请提高警惕。</div>
        <div class="cmp"><div contenteditable="true" aria-label="输入正文">我已收到，稍后处理。</div></div>
      </div>
    </div>`;
    const narrow = collectLocalContext(editor());
    expect(narrow.replyDetected).toBe(true);
    // The hint above the box satisfies the boundary rule, so the message is not in.
    expect(narrow.text).toContain("温馨提示");
    expect(narrow.text).not.toContain("978271");

    const wider = collectLocalContext(editor(), { widen: true });
    expect(wider.text).toContain("978271");
    // The composer's own text is still dropped, and it was dropped by locating the
    // narrow region inside the wider clone rather than by index of the clone itself.
    expect(wider.text).not.toContain("我已收到");
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

  // Gmail's shape: the reply box is a sibling of the expanded message it answers,
  // nested a level below the thread, with the older rounds above it collapsed.
  it("finds the conversation around Gmail's nested reply box", () => {
    document.body.innerHTML = `<div role="main">
      <div class="aia">
        <div class="gE">Inbox — Project timeline</div>
        <div class="aHu">
          <div class="adn"><div class="a3s">Earlier: the first message of the thread, long enough to count as prose.</div></div>
          <div class="adn"><div class="a3s">Latest: can you confirm the final version is ready by Friday?</div></div>
        </div>
        <div class="aDg"><div class="aDj"><div aria-label="Message Body" contenteditable="true"></div></div></div>
      </div>
    </div>`;
    const collected = collectLocalContext(editor());
    expect(collected.replyDetected).toBe(true);
    expect(collected.text).toContain("confirm the final version");
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
