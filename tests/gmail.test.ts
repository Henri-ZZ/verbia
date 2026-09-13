// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { GmailAdapter } from "../apps/extension/src/content/adapters/gmail";
import { toTarget } from "../apps/extension/src/content/editor/editable";

const COMPOSER = "div[contenteditable='true']";
// visibleEmailBody only accepts genuinely-expanded messages, so the fixture has
// to clear its minimum-length floor.
const THREAD_BODY = `The whole original message. ${"Detail. ".repeat(60)}`;

describe("Gmail context adapter", () => {
  beforeEach(() => { document.body.innerHTML = ""; });

  // The quote is the message the user is answering. Gmail keeps it in the DOM
  // while collapsing it behind the "…" toggle, where innerText reads empty — the
  // adapter must still report a reply rather than "no context".
  it("reads the quoted original of a reply composer", async () => {
    document.body.innerHTML = `<div role="main"><div contenteditable="true"><div>…</div><div class="gmail_quote">On Sat, Muhammad Zahid wrote: the original question</div></div></div>`;
    const context = await new GmailAdapter().extractContext(toTarget(document.querySelector(COMPOSER)!));
    expect(context.relation).toBe("reply_to_email");
    expect(context.target?.body).toContain("the original question");
  });

  // Wrapper shape without data-message-id: the expanded thread message still has
  // to be found, otherwise an empty compose box reports a blank new email.
  it("falls back to an expanded thread message when the composer is empty", async () => {
    document.body.innerHTML = `<div role="main"><div data-thread-id="t1"><div class="a3s">${THREAD_BODY}</div></div><div contenteditable="true"></div></div>`;
    const context = await new GmailAdapter().extractContext(toTarget(document.querySelector(COMPOSER)!));
    expect(context.relation).toBe("reply_to_email");
    expect(context.target?.body).toContain("The whole original message.");
    // Picked by "longest .a3s", not handed over by Gmail: reported honestly as a
    // guess, so the panel shows it and the user can correct it.
    expect(context.confidence).toBe("low");
  });

  // HTML emails (newsletters, reports, tables) need no parsing: the adapter
  // reads rendered text, so markup and <style> rules stay out of the context.
  it("reads the text of a table-based HTML email without its markup", async () => {
    document.body.innerHTML = `<div role="main"><div contenteditable="true"><div class="gmail_quote"><style>.btn{font-family:Arial;color:#fff}</style><table><tbody><tr><td>Daily report: 1 change</td></tr><tr><td>Rank 124.9K <span>▲ +25</span></td></tr></tbody></table><a class="btn" href="https://example.com">View full report</a></div></div></div>`;
    const context = await new GmailAdapter().extractContext(toTarget(document.querySelector(COMPOSER)!));
    expect(context.relation).toBe("reply_to_email");
    expect(context.target?.body).toContain("Daily report: 1 change");
    expect(context.target?.body).toContain("View full report");
    expect(context.target?.body).not.toContain("font-family");
    expect(context.target?.body).not.toContain("<td");
  });

  // Nothing class-based to lean on (no quote, no a3s): the thread text is read
  // from the main landmark minus the composer, so the reply still carries the
  // message being answered even when Gmail's class names have moved on.
  it("falls back to the thread text when no known body class matches", async () => {
    document.body.innerHTML = `<div role="main"><div><p>${THREAD_BODY}</p></div><div contenteditable="true"></div></div>`;
    const context = await new GmailAdapter().extractContext(toTarget(document.querySelector(COMPOSER)!));
    expect(context.relation).toBe("reply_to_email");
    expect(context.target?.body).toContain("The whole original message.");
  });

  // The thread text runs oldest → newest, so a cap has to keep the end: cutting
  // the head drops the message being answered and keeps the round from five
  // replies ago. (The quoted block Gmail inserts is the other way round, newest
  // first, which is why that read still keeps its head.)
  it("keeps the newest end when a long thread has to be cut", async () => {
    const oldest = `Old round: ${"stale detail. ".repeat(500)}`;
    const newest = "Newest round: can you confirm the final version is ready by Friday?";
    document.body.innerHTML = `<div role="main"><div><p>${oldest}</p><p>${newest}</p></div><div contenteditable="true"></div></div>`;
    const context = await new GmailAdapter().extractContext(toTarget(document.querySelector(COMPOSER)!));
    expect(context.relation).toBe("reply_to_email");
    expect(context.truncated).toBe(true);
    expect(context.target?.body).toContain("final version is ready by Friday");
    expect(context.target?.body).not.toContain("Old round:");
  });

  // The identification reads what the adapter hands over rather than drawing its
  // own boundary: Gmail's nesting defeats the generic collector.
  it("hands the adapter's thread read to the identification", async () => {
    const adapter = new GmailAdapter();
    document.body.innerHTML = `<div role="main"><div><p>${THREAD_BODY}</p></div><div contenteditable="true"></div></div>`;
    expect(adapter.identifyRegion!(toTarget(document.querySelector(COMPOSER)!).element)).toEqual({
      text: expect.stringContaining("The whole original message."),
      truncated: false
    });
  });

  it("offers no region when the composer is outside the thread", async () => {
    const adapter = new GmailAdapter();
    document.body.innerHTML = `<div><div contenteditable="true"></div></div>`;
    expect(adapter.identifyRegion!(toTarget(document.querySelector('[contenteditable="true"]')!).element)).toBeNull();
  });

  // A docked compose window sits outside the message landmark: whatever is on
  // screen behind it is not the message being answered.
  it("ignores the message list when the composer is outside the thread", async () => {
    document.body.innerHTML = `<div role="main"><div>${THREAD_BODY}</div></div><div contenteditable="true"></div>`;
    const context = await new GmailAdapter().extractContext(toTarget(document.querySelector(COMPOSER)!));
    expect(context.relation).toBe("compose_new");
  });

  // Shape reported from a real Gmail reply: the pane carries Gmail's toolbar and
  // screen-reader labels, then the message, then the composer with its recipient
  // rows and send controls. Only the message belongs in the context.
  it("keeps the message and drops Gmail's chrome around it", async () => {
    document.body.innerHTML = `<div role="main">
      <div role="toolbar"><button>Print all</button><button>In new window</button></div>
      <div><span class="a11y">Search for all messages with label Inbox</span><span>Inbox</span></div>
      <div data-message-id="m1">
        <div>Exstats &lt;noreply@mail.exstats.com&gt; Sat, Sep 12, 11:00 AM (20 hours ago)</div>
        <div>Daily report: 1 change</div>
        <div>1 change — Sep 11th</div>
        <div>Stealth Browser Assistant — Hide Tabs &amp; Panic Button</div>
        <div>Rank 124.91K (124.94K) ▲ +25 (+0.02%)</div>
        <a href="https://example.com">View full report</a>
        <div>You receive this because you track extensions on Exstats. Manage alerts or unsubscribe anytime.</div>
        <div>Rank 98.2K (99.1K) ▼ -12 (-0.01%)</div>
      </div>
      <div role="toolbar"><button>Reply</button><button>Forward</button></div>
      <div contenteditable="true"><div>…</div></div>
      <form><label>From</label><input value="henriz0718@gmail.com"><span>Recipients</span><button>Send</button><button>Schedule send</button></form>
    </div>`;
    const context = await new GmailAdapter().extractContext(toTarget(document.querySelector(COMPOSER)!));
    expect(context.relation).toBe("reply_to_email");
    const body = context.target?.body ?? "";
    // The message itself survives.
    expect(body).toContain("Daily report: 1 change");
    expect(body).toContain("View full report");
    expect(body).toContain("Manage alerts or unsubscribe anytime.");
    // Gmail's own chrome does not.
    expect(body).not.toContain("Print all");
    expect(body).not.toContain("Search for all messages with label Inbox");
    expect(body).not.toContain("Schedule send");
    expect(body).not.toContain("Recipients");
  });

  // The reply box sits *inside* the thread container, next to the message it
  // answers. Stopping the walk at the pane's direct child would take only the
  // toolbar above the container and lose the message entirely.
  it("reads the message when the composer is nested inside the thread", async () => {
    document.body.innerHTML = `<div role="main"><div role="toolbar"><button>Print all</button></div><div class="thread"><div class="message"><p>${THREAD_BODY}</p></div><div class="reply"><div contenteditable="true"></div></div></div></div>`;
    const context = await new GmailAdapter().extractContext(toTarget(document.querySelector(COMPOSER)!));
    expect(context.relation).toBe("reply_to_email");
    expect(context.target?.body).toContain("The whole original message.");
    expect(context.target?.body).not.toContain("Print all");
  });

  it("reports a genuinely empty compose as a new email", async () => {
    document.body.innerHTML = `<div role="main"><div contenteditable="true"></div></div>`;
    const context = await new GmailAdapter().extractContext(toTarget(document.querySelector(COMPOSER)!));
    expect(context.relation).toBe("compose_new");
    expect(context.target).toBeUndefined();
  });
});
