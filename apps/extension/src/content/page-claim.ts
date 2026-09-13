// One panel per page, arbitrated on the document itself.
//
// The content script is written to run once per frame, and normally it does:
// it bails at its own load marker, and an extension update hands the tab a
// fresh instance that sweeps away whatever the orphaned one left behind. Two
// situations still leave two live instances on the same page, and each of them
// used to end with two panels side by side:
//
//   - the background re-injects on update while the previous instance is still
//     current (a dev reload is the everyday version of this), and
//   - two copies of Verbia are installed at once — a Web Store build and an
//     unpacked development build — which Chrome happily injects into the same
//     tab.
//
// `window` cannot arbitrate either case: a second extension copy does not share
// the first one's JS world, so a flag written there is invisible to it. The
// document is shared, whatever world an instance runs in, so the claim lives
// there. Every instance takes an epoch at boot — one above whatever it finds —
// and only the highest epoch may act on the page. The newest instance wins; an
// older one stands down instead of drawing a second panel.

const EPOCH_ATTRIBUTE = "data-verbia-epoch";

// The shell a mounted panel lives in (@see VerbiaPanel). Sweeping it also
// cleans up after a losing instance, whose shadow root is closed and therefore
// out of reach for anyone but its owner.
export const PANEL_ROOT_SELECTOR = "[data-verbia-root='true']";

// Takes the page for this instance and returns the epoch that identifies it.
// A later claim always beats an earlier one, which is what a takeover needs.
// 0 means "could not claim" (a document with no document element yet): the
// instance then owns nothing and stays out of the way, which is the safe side
// of the two — a panel could not be mounted there either.
export function claimPage(doc: Document = document): number {
  const root = doc.documentElement;
  if (!root) return 0;
  // An unreadable value (another tool, a page that happens to use the name)
  // starts the count over rather than poisoning it with NaN, so the next claim
  // still wins over whatever left it there.
  const stored = Number(root.getAttribute(EPOCH_ATTRIBUTE));
  const next = Number.isFinite(stored) && stored > 0 ? stored + 1 : 1;
  root.setAttribute(EPOCH_ATTRIBUTE, String(next));
  return next;
}

// False once another instance claimed the page after this one did. Checked at
// every entry point, and again after every await: an instance that reads the
// page can be superseded while that read is in flight, and mounting the panel
// it built from the stale read is exactly how a second panel used to appear.
export function ownsPage(epoch: number, doc: Document = document): boolean {
  if (!epoch) return false;
  return doc.documentElement?.getAttribute(EPOCH_ATTRIBUTE) === String(epoch);
}

// Removes every panel shell on the page and reports how many there were.
export function dropPanelRoots(doc: Document = document): number {
  const roots = doc.querySelectorAll(PANEL_ROOT_SELECTOR);
  roots.forEach(node => node.remove());
  return roots.length;
}
