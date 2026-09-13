// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { claimPage, dropPanelRoots, ownsPage, PANEL_ROOT_SELECTOR } from "../apps/extension/src/content/page-claim";

// The bug this arbitrates: two live content script instances on one page (an
// extension update re-injecting over the instance already running there, or a
// Web Store build installed next to a development build) used to leave two
// panels on screen. Only one instance may act, and the newest claim wins.
describe("page claim", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-verbia-epoch");
    document.body.innerHTML = "";
  });

  it("gives the page to the instance that claims it", () => {
    const epoch = claimPage();
    expect(epoch).toBe(1);
    expect(ownsPage(epoch)).toBe(true);
  });

  it("retires the earlier instance when a newer one claims the page", () => {
    const first = claimPage();
    const second = claimPage();
    // The instance a takeover is about: it must stop acting, or it mounts a
    // second panel next to the new one.
    expect(ownsPage(first)).toBe(false);
    expect(ownsPage(second)).toBe(true);
  });

  it("stays retired: later checks keep answering for the newest claim only", () => {
    const first = claimPage();
    const second = claimPage();
    expect(ownsPage(second)).toBe(true);
    expect(ownsPage(first)).toBe(false);
    expect(ownsPage(second)).toBe(true);
  });

  it("reports an instance that never claimed the page as a loser", () => {
    claimPage();
    expect(ownsPage(0)).toBe(false);
    expect(ownsPage(1)).toBe(true);
  });

  it("starts over from a claim it cannot read", () => {
    // A stray value must not poison the count into NaN, which would leave
    // every instance a loser and the page without a panel at all.
    document.documentElement.setAttribute("data-verbia-epoch", "not-a-number");
    const epoch = claimPage();
    expect(epoch).toBe(1);
    expect(ownsPage(epoch)).toBe(true);
  });

  it("drops every panel shell, whatever instance mounted it", () => {
    document.body.innerHTML = `<div data-verbia-root="true"></div><div id="page-content"></div><div data-verbia-root="true"></div>`;
    expect(dropPanelRoots()).toBe(2);
    expect(document.querySelector(PANEL_ROOT_SELECTOR)).toBeNull();
    // Only the panels go; the host page is left exactly as it was.
    expect(document.querySelector("#page-content")).not.toBeNull();
  });

  it("reports nothing to drop on a page without panels", () => {
    document.body.innerHTML = `<div id="page-content"></div>`;
    expect(dropPanelRoots()).toBe(0);
    expect(document.querySelector("#page-content")).not.toBeNull();
  });
});
