import { describe, expect, it } from "vitest";
import { isEmailHost, resolveSiteMode } from "../apps/extension/src/content/site-mode";
import { GmailAdapter } from "../apps/extension/src/content/adapters/gmail";
import { QqMailAdapter } from "../apps/extension/src/content/adapters/qqmail";
import { WhatsAppAdapter } from "../apps/extension/src/content/adapters/whatsapp";
import { UniversalAdapter } from "../apps/extension/src/content/adapters/universal";

// The mode is resolved from the host and the adapter, never from what the page
// contains: a wrong answer here is only a wording and placement mistake, and that
// is the point of the whole design — this is the one decision left that can be
// wrong without reading a page wrong.
describe("site mode", () => {
  const universal = new UniversalAdapter();

  it("gives a mail host with no adapter of its own the generalized email mode", () => {
    expect(resolveSiteMode(universal, "mail.163.com")).toBe("email");
    expect(resolveSiteMode(universal, "mail.proton.me")).toBe("email");
    // Tencent Exmail renders the reply editor in a src-less iframe, so the frame
    // that holds it has no hostname of its own: the parent's host is resolved
    // before this call (@see frameHostname in content/index.ts).
    expect(resolveSiteMode(universal, "exmail.qq.com")).toBe("email");
  });

  it("leaves every other page on universal", () => {
    expect(resolveSiteMode(universal, "example.com")).toBe("universal");
    expect(resolveSiteMode(universal, "mail.163.com.evil.example")).toBe("universal");
  });

  // An adapter that claims the page always wins: email mode exists for the hosts
  // Verbia has no read for, never to override one it does have.
  it("keeps a site with an adapter on auto, mail host or not", () => {
    expect(resolveSiteMode(new GmailAdapter(), "mail.google.com")).toBe("auto");
    expect(resolveSiteMode(new QqMailAdapter(), "wx.mail.qq.com")).toBe("auto");
    expect(resolveSiteMode(new WhatsAppAdapter(), "web.whatsapp.com")).toBe("auto");
  });

  it("matches hosts case-insensitively and never by suffix", () => {
    expect(isEmailHost("MAIL.163.COM")).toBe(true);
    expect(isEmailHost("mail.163.com")).toBe(true);
    // Suffix matching would hand the mode to any subdomain of a mail host, which
    // is how a lookalike domain would inherit trust it was never granted.
    expect(isEmailHost("mail.163.com.evil.example")).toBe(false);
    expect(isEmailHost("evil.example")).toBe(false);
  });
});
