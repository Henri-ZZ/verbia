// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { QqMailAdapter } from "../apps/extension/src/content/adapters/qqmail";
import { toTarget } from "../apps/extension/src/content/editor/editable";

// The selector is copied from the live app: the composer is a contenteditable
// div whose aria-label is 输入正文 ("enter body").
const EDITOR = "div[contenteditable='true'][aria-label='输入正文']";
// An expanded message has to clear the adapter's minimum-length floor.
const MESSAGE = `Daily report: 1 change. ${"Detail. ".repeat(60)}`;

describe("QQ Mail context adapter", () => {
  beforeEach(() => { document.body.innerHTML = ""; });

  it("matches the QQ Mail web app host only", () => {
    const adapter = new QqMailAdapter();
    expect(adapter.matches(new URL("https://wx.mail.qq.com/home/index?sid=x#/list/1"))).toBe(true);
    // The legacy host is deliberately not supported.
    expect(adapter.matches(new URL("https://mail.qq.com/cgi-bin/frame_html"))).toBe(false);
    expect(adapter.matches(new URL("https://mail.google.com/"))).toBe(false);
  });

  it("reads the quoted original out of the composer", async () => {
    document.body.innerHTML = `<div contenteditable="true" aria-label="输入正文"><div class="xmail-cmp-history">在 2026-09-13，Exstats 写道：the original report</div></div>`;
    const context = await new QqMailAdapter().extractContext(toTarget(document.querySelector(EDITOR)!));
    expect(context.relation).toBe("reply_to_email");
    expect(context.target?.body).toContain("the original report");
  });

  it("uses what the user typed when the composer carries no quote", async () => {
    document.body.innerHTML = `<div contenteditable="true" aria-label="输入正文">帮我说一句收到</div>`;
    const context = await new QqMailAdapter().extractContext(toTarget(document.querySelector(EDITOR)!));
    expect(context.relation).toBe("reply_to_email");
    expect(context.target?.body).toBe("帮我说一句收到");
  });

  // The composer is empty and carries no quote: the region around it is what the
  // user is answering, and the app's own controls inside that region must not
  // travel with it.
  it("falls back to the message on screen and drops the app chrome", async () => {
    document.body.innerHTML = `<div class="xmail-app">
      <div role="toolbar"><button>删除</button></div>
      <div class="xmail-read-detail">${MESSAGE}<button>转发</button><div role="toolbar"><span>字体</span></div></div>
      <div class="xmail-cmp"><div contenteditable="true" aria-label="输入正文"></div></div>
    </div>`;
    const context = await new QqMailAdapter().extractContext(toTarget(document.querySelector(EDITOR)!));
    expect(context.relation).toBe("reply_to_email");
    expect(context.target?.body).toContain("Daily report: 1 change");
    expect(context.target?.body).not.toContain("转发");
    expect(context.target?.body).not.toContain("字体");
  });

  // Reported from a real reply: a short message (an activation code, a one-line
  // confirmation) is still a message, and the longer list beside it must not be
  // read in its place. The composer sits inside the reading pane, which is what
  // tells the two apart without leaning on class names.
  it("reads a short message and ignores the longer list beside it", async () => {
    document.body.innerHTML = `<div class="xmail-app">
      <div class="xmail-list"><div>${"Promo row. ".repeat(40)}</div></div>
      <div class="xmail-read-detail">
        <div class="xmail-read-body">Here is your activation code for ReplyKit: 978271. This code expires in 15 minutes.</div>
        <div class="xmail-cmp"><div contenteditable="true" aria-label="输入正文"></div></div>
      </div>
    </div>`;
    const context = await new QqMailAdapter().extractContext(toTarget(document.querySelector(EDITOR)!));
    expect(context.relation).toBe("reply_to_email");
    expect(context.target?.body).toContain("978271");
    expect(context.target?.body).not.toContain("Promo row.");
  });

  // Reported from the live page: the sender/recipient header is *longer* than the
  // body. Ranking blocks by length therefore picked the header and dropped the
  // code underneath it, so position decides instead — the block nearest above the
  // composer — and the header above it is absorbed along with it.
  it("reads the body even when the header above it is longer", async () => {
    const header = "ReplyKit<noreply@fredericlegrand.me>更多操作由 010201a0671155a2-c06e1ff2-f79d-4658-9513-ff1f52f295dc-000000@send.fredericlegrand.me 代发2026年9月3日 19:39详情信息收件人我 <371595867@qq.com>";
    document.body.innerHTML = `<div class="xmail-app"><div class="xmail-read-detail">
      <div class="xmail-header">${header}</div>
      <div class="xmail-body">Here is your activation code for ReplyKit: 978271. This code expires in 15 minutes.</div>
      <div class="xmail-cmp"><div contenteditable="true" aria-label="输入正文"></div></div>
    </div></div>`;
    const context = await new QqMailAdapter().extractContext(toTarget(document.querySelector(EDITOR)!));
    expect(context.relation).toBe("reply_to_email");
    expect(context.target?.body).toContain("978271");
    expect(header.length).toBeGreaterThan(120); // the header really is the longer block
  });

  // Reported from a real reply: an Alibaba Cloud billing notice whose footer —
  // branding, QR codes, "Copyright © 阿里云 2009-2026 All Rights Reserved" — sits
  // between the message and the reply box. Picking "the block nearest above the
  // composer" read that footer as the message being answered; the region read
  // hands over the whole area above the box instead, so the message is *in* the
  // context rather than replaced by its own footer.
  it("hands over the region above the reply box, footer included", async () => {
    const body = "尊敬的ambitious98：您的账户ambitious98已产生欠费，您的按量付费商品延期停服的额度为10.00元，目前已使用0.06元。延停额度用尽后按量付费产品出账后将立即进入停服处理流程，请您尽快结清欠费账单，以免免费停服给您带来不必要的损失。欠费详情请至用户中心首页查询。如有任何问题，您可登录我司网站获得在线售后支持。我们将竭诚为您服务。本邮件为系统发出，请勿回复。";
    document.body.innerHTML = `<div class="xmail-app"><div class="xmail-read-detail">
      <div class="xmail-read-body">${body}</div>
      <div class="xmail-footer">
        <div class="xmail-footer-brand">关注阿里云 阿里云公众号 关注阿里云公众号下载阿里云APP，关注云资讯，随时随地运维管控云服务 联系我 们：4008013260</div>
        <div class="xmail-footer-legal">Copyright © 阿里云 2009-2026 All Rights Reserved</div>
      </div>
      <div class="xmail-cmp"><div contenteditable="true" aria-label="输入正文"></div></div>
    </div></div>`;
    const context = await new QqMailAdapter().extractContext(toTarget(document.querySelector(EDITOR)!));
    expect(context.relation).toBe("reply_to_email");
    expect(context.target?.body).toContain("已产生欠费");
    expect(context.target?.body).toContain("尊敬的ambitious98");
    // The footer rides along: that is the accepted cost of not picking a block.
    // It is a neighbour the model can ignore, where a pick had replaced the
    // message with it.
    expect(context.target?.body).toContain("Copyright");
    // Read off the page rather than handed over by the app: the panel has to say
    // it is not sure, and that is the signal a correction path hangs off.
    expect(context.confidence).toBe("low");
  });

  // A short notice is still a message, and nothing in its own text disqualifies
  // it: this one says "请勿回复" in its body. A region read has no phrase list
  // that could get that wrong.
  it("reads a short notice whose own text says 请勿回复", async () => {
    document.body.innerHTML = `<div class="xmail-app"><div class="xmail-read-detail">
      <div class="xmail-read-body">尊敬的客户：您的账户已开通自动续费，系统将在到期前24小时自动扣款。本邮件为系统发出，请勿回复。</div>
      <div class="xmail-footer-legal">Copyright © Example Corp. All Rights Reserved</div>
      <div class="xmail-cmp"><div contenteditable="true" aria-label="输入正文"></div></div>
    </div></div>`;
    const context = await new QqMailAdapter().extractContext(toTarget(document.querySelector(EDITOR)!));
    expect(context.target?.body).toContain("自动续费");
    expect(context.confidence).toBe("low");
  });

  // A footer is all the region holds: it is still something the user is looking
  // at while answering, and reading it beats reporting a reply as a new email.
  it("still reads the region when a footer is all it holds", async () => {
    document.body.innerHTML = `<div class="xmail-app"><div class="xmail-read-detail">
      <div class="xmail-footer-legal">Copyright © 阿里云 2009-2026 All Rights Reserved</div>
      <div class="xmail-cmp"><div contenteditable="true" aria-label="输入正文"></div></div>
    </div></div>`;
    const context = await new QqMailAdapter().extractContext(toTarget(document.querySelector(EDITOR)!));
    expect(context.relation).toBe("reply_to_email");
    expect(context.target?.body).toContain("阿里云");
  });

  it("reports an empty composer with nothing on screen as a new email", async () => {
    document.body.innerHTML = `<div class="xmail-cmp"><div contenteditable="true" aria-label="输入正文"></div></div>`;
    const context = await new QqMailAdapter().extractContext(toTarget(document.querySelector(EDITOR)!));
    expect(context.relation).toBe("compose_new");
    expect(context.target).toBeUndefined();
  });
});
