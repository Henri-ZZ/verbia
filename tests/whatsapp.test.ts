// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { WhatsAppAdapter } from "../apps/extension/src/content/adapters/whatsapp";
import { toTarget } from "../apps/extension/src/content/editor/editable";

function makeVisible(element: Element) {
  Object.defineProperty(element, "getBoundingClientRect", { value: () => ({ width: 400, height: 42, top: 500, bottom: 542, left: 20, right: 420 }) });
  Object.defineProperty(element, "isContentEditable", { value: true });
}

describe("WhatsApp Web adapter", () => {
  beforeEach(() => { document.body.innerHTML = ""; });

  it("matches only the real WhatsApp Web host", () => {
    const adapter = new WhatsAppAdapter();
    expect(adapter.matches(new URL("https://web.whatsapp.com/"))).toBe(true);
    expect(adapter.matches(new URL("https://web.whatsapp.com.evil.example/"))).toBe(false);
    expect(adapter.matches(new URL("https://www.whatsapp.com/"))).toBe(false);
  });

  it("finds the chat composer without mistaking search for a composer", () => {
    document.body.innerHTML = `<main><div contenteditable="true" role="textbox" aria-label="Search"></div><footer><div contenteditable="true" role="textbox" aria-placeholder="Type a message"></div></footer></main>`;
    const editor = document.querySelector("footer [contenteditable]")!;
    makeVisible(editor);
    expect(new WhatsAppAdapter().findComposers()).toHaveLength(1);
    expect(new WhatsAppAdapter().findComposers()[0]?.element).toBe(editor);
  });

  it("builds one role-aware transcript from the current conversation window", async () => {
    document.body.innerHTML = `<main>
      <div role="row"><div class="message-in" data-id="false_a" data-pre-plain-text="[10:00 AM, 9/16/2026] A:"><span class="selectable-text copyable-text">Can we move the launch to Friday?</span></div></div>
      <div role="row"><div class="message-out" data-id="true_b" data-pre-plain-text="[10:05 AM, 9/16/2026] Me:"><span class="selectable-text copyable-text">Friday works. I will update the plan.</span></div></div>
      <div role="row"><div class="message-in" data-id="false_c" data-pre-plain-text="[10:07 AM, 9/16/2026] A:"><span class="selectable-text copyable-text">Great — please tell the client today.</span></div></div>
      <footer><div contenteditable="true" role="textbox" aria-placeholder="Type a message"></div></footer>
    </main>`;
    const editor = document.querySelector<HTMLElement>("footer [contenteditable]")!;
    makeVisible(editor);
    const context = await new WhatsAppAdapter().extractContext(toTarget(editor));
    expect(context.target?.body).toBe("Contact: Can we move the launch to Friday?\nYou: Friday works. I will update the plan.\nContact: Great — please tell the client today.");
    expect(context.ancestors).toBeUndefined();
    expect(context.relation).toBe("unknown");
    expect(context.confidence).toBe("high");
  });

  it("does not duplicate one message when several selectors match its nested nodes", async () => {
    document.body.innerHTML = `<main>
      <div role="row"><div class="message-in" data-testid="msg-container" data-id="false_a" data-pre-plain-text="[10:00 AM, 9/16/2026] A:"><span data-testid="msg-text" class="selectable-text copyable-text">One message</span></div></div>
      <footer><div contenteditable="true" role="textbox" aria-placeholder="Type a message"></div></footer>
    </main>`;
    const editor = document.querySelector<HTMLElement>("footer [contenteditable]")!;
    makeVisible(editor);
    const context = await new WhatsAppAdapter().extractContext(toTarget(editor));
    expect(context.target?.body).toBe("Contact: One message");
    expect(context.ancestors).toBeUndefined();
  });

  it("does not treat an isolated outgoing message as something to reply to", async () => {
    document.body.innerHTML = `<main>
      <div role="row"><div class="message-in" data-pre-plain-text="[8:00 AM, 9/16/2026] A:"><span class="selectable-text copyable-text">Old conversation</span></div></div>
      <div role="row"><div class="message-out" data-pre-plain-text="[2:30 PM, 9/16/2026] Me:"><span class="selectable-text copyable-text">Good morning.</span></div></div>
      <footer><div contenteditable="true" role="textbox" aria-placeholder="Type a message"></div></footer>
    </main>`;
    const editor = document.querySelector<HTMLElement>("footer [contenteditable]")!;
    makeVisible(editor);
    const context = await new WhatsAppAdapter().extractContext(toTarget(editor));
    expect(context.relation).toBe("compose_new");
    expect(context.target).toBeUndefined();
  });

  it("keeps recent outgoing messages when the same conversation window includes a contact message", async () => {
    document.body.innerHTML = `<main>
      <div role="row"><div class="message-in" data-pre-plain-text="[2:25 PM, 9/16/2026] A:"><span class="selectable-text copyable-text">Are you free later?</span></div></div>
      <div role="row"><div class="message-out" data-pre-plain-text="[2:30 PM, 9/16/2026] Me:"><span class="selectable-text copyable-text">Maybe after six.</span></div></div>
      <footer><div contenteditable="true" role="textbox" aria-placeholder="Type a message"></div></footer>
    </main>`;
    const editor = document.querySelector<HTMLElement>("footer [contenteditable]")!;
    makeVisible(editor);
    const context = await new WhatsAppAdapter().extractContext(toTarget(editor));
    expect(context.target?.body).toBe("Contact: Are you free later?\nYou: Maybe after six.");
  });

  it("prioritizes an explicitly quoted message regardless of the visible history", async () => {
    document.body.innerHTML = `<main>
      <div role="row"><div class="message-out"><span class="selectable-text copyable-text">Unrelated latest message</span></div></div>
      <footer><div data-testid="quoted-message" class="message-in"><span class="selectable-text copyable-text">The message I explicitly selected</span></div><div contenteditable="true" role="textbox" aria-placeholder="Type a message"></div></footer>
    </main>`;
    const editor = document.querySelector<HTMLElement>("footer [contenteditable]")!;
    makeVisible(editor);
    const context = await new WhatsAppAdapter().extractContext(toTarget(editor));
    expect(context.target?.body).toBe("Contact: The message I explicitly selected");
  });

  it("reports a new message when the chat has no visible messages", async () => {
    document.body.innerHTML = `<main><footer><div contenteditable="true" role="textbox" aria-placeholder="Type a message"></div></footer></main>`;
    const editor = document.querySelector<HTMLElement>("footer [contenteditable]")!;
    makeVisible(editor);
    const context = await new WhatsAppAdapter().extractContext(toTarget(editor));
    expect(context.relation).toBe("compose_new");
    expect(context.target).toBeUndefined();
  });
});
