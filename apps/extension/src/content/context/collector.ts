// Handing the model a region instead of a picked block.
//
// Reading "which block is the message being answered" off the page is what made
// the mail adapters fragile: every version of that decision was a guess, it was
// wrong often enough to need a fix per mail — a footer between the reply box and
// the body was read as "Copyright © 阿里云 2009-2026 All Rights Reserved" — and
// each fix was another fixture guessing at a page this project does not control.
//
// The collector answers an easier question: how far around this composer does
// the conversation reach? It climbs from the composer to the smallest container
// that already holds a real block of text, hands that whole region over, and
// cleans it of chrome. A wrong boundary still *contains* the message and merely
// drags a neighbour or two along, which the model can sort out because the
// message is in front of it — unlike a pick, where a wrong answer replaces the
// message with something else entirely.

// Reported with every extraction request so a change in what the collector hands
// over can be told apart from a change in what the model does with it.
export const COLLECTOR_VERSION = "1.0.0";

export type CollectedContext = {
  /** The region's text, in document order, with chrome removed. */
  text: string;
  truncated: boolean;
  /**
   * False when nothing above the composer reads as a conversation (a brand new
   * compose form): the caller has a new message then, not a reply.
   */
  replyDetected: boolean;
  /** Elements that carried text, for size reports and telemetry buckets. */
  nodeCount: number;
  /** Elements dropped as chrome — the composer's own block included — so the
   *  cleaning is visible in a report. */
  stripped: number;
};

const MAX_CHARS = 6_000;
// How much text a block above the composer needs before it counts as the start
// of a conversation. The same floor the adapters use to tell mail from interface
// (see MIN_MESSAGE_LENGTH in the mail adapters): below it, whatever sits above a
// reply box is a compose form's own labels (From / To / Subject rows).
const MESSAGE_FLOOR = 40;

// Everything that exists to be *operated* rather than read, plus the
// assistive-only text apps ship for screen readers.
//
// Attribute-based only. The region is read from a detached clone with no layout,
// so `aria-hidden`, `hidden` and an inline `display:none` are all "invisible"
// can mean here; the structured collector of the AI path can afford real
// computed-style checks against the live tree.
export const NOISE_SELECTOR = [
  "script", "style", "noscript", "template", "head", "title", "svg", "canvas", "iframe",
  "button", "[role='button']", "[role='toolbar']", "[role='menu']", "[role='menuitem']",
  "[role='tab']", "[role='tablist']", "[role='tabpanel']", "[role='combobox']",
  "[role='listbox']", "[role='option']", "[aria-haspopup]",
  "select", "option", "textarea", "input", "form", "label",
  "[aria-hidden='true']", "[hidden]", "[style*='display:none']", "[style*='display: none']",
  "[class*='a11y']", "[class*='sr-only']", "[class*='screenReader']",
  "[contenteditable='true']", "[contenteditable='plaintext-only']", "[contenteditable='']", "[role='textbox']"
].join(",");

function textOf(node: HTMLElement): string {
  return (node.textContent ?? "").replace(/\s+/g, " ").trim();
}

function precedingSiblings(node: HTMLElement): HTMLElement[] {
  const before: HTMLElement[] = [];
  for (let sibling = node.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
    if (sibling instanceof HTMLElement) before.unshift(sibling);
  }
  return before;
}

// The region, and whether one was actually found. The boundary is the smallest
// ancestor whose siblings above the composer already contain a real block of
// text. A compose form has none — its rows are labels and controls — so a new
// message never gets a region at all, while a reply gets the smallest container
// holding the message and the reply box together.
//
// The page itself is never a region: an editor with nothing above it belongs to
// no conversation, and answering with the whole document is worse than
// answering with nothing.
function regionAround(editor: HTMLElement): { region: HTMLElement; found: boolean } {
  let node: HTMLElement | null = editor;
  while (node && node !== document.body) {
    const parent: HTMLElement | null = node.parentElement;
    if (!parent) break;
    const above = precedingSiblings(node);
    if (above.some(sibling => textOf(sibling).length >= MESSAGE_FLOOR)
      && parent !== document.body && parent !== document.documentElement) {
      return { region: parent, found: true };
    }
    node = parent;
  }
  // Stay next to the composer: whatever the caller does with a text-free region
  // beats reaching for the page around it.
  return { region: editor.parentElement ?? document.body, found: false };
}

function stripNoise(scope: HTMLElement): number {
  let stripped = 0;
  scope.querySelectorAll(NOISE_SELECTOR).forEach(node => {
    // A removed parent takes its descendants with it, and `isConnected` is false
    // for the whole detached clone: count what is still inside the scope.
    if (scope.contains(node)) { node.remove(); stripped += 1; }
  });
  return stripped;
}

// The region's direct child that holds the editor: the composer's own block.
// A cheap "is this still the same conversation" signal, read without cloning the
// region: its size plus how its text opens. An AI answer is about the
// conversation that was on screen when the button was clicked, and the panel
// outlives a switch to the next message.
export function regionFingerprint(editor: HTMLElement): string {
  const { region } = regionAround(editor);
  const text = (region.textContent ?? "").replace(/\s+/g, " ").trim();
  return `${region.childElementCount}:${text.length}:${text.slice(0, 60)}`;
}

function composerBlock(region: HTMLElement, editor: HTMLElement): HTMLElement | null {
  for (let node: HTMLElement = editor; ;) {
    const parent: HTMLElement | null = node.parentElement;
    if (!parent) return null;
    if (parent === region) return node;
    node = parent;
  }
}

// The box being written in is never context: it is the editor plus the row it
// sits in — toolbar, send and cancel controls. Dropped as a whole subtree, which
// is steadier than listing control selectors that have to keep up with the app
// (QQ Mail's 发送 / 取消 / 表情 row is not made of <button> elements, so a control
// list leaks it straight into the context).
function dropComposer(scope: HTMLElement, region: HTMLElement, editor: HTMLElement): number {
  const block = composerBlock(region, editor);
  if (!block) return 0;
  const index = Array.prototype.indexOf.call(region.children, block);
  const target = index < 0 ? null : scope.children[index];
  if (!target) return 0;
  const dropped = 1 + target.querySelectorAll("*").length;
  target.remove();
  return dropped;
}

function countTextCarriers(scope: HTMLElement): number {
  let carriers = 0;
  scope.querySelectorAll<HTMLElement>("*").forEach(node => {
    if (!node.children.length && (node.textContent ?? "").trim()) carriers += 1;
  });
  return carriers;
}

// Collects the cleaned region around a composer. `editor` is the element the
// user is typing into; the composer's own subtree is dropped as noise along with
// the rest of the chrome, so the text that comes back is what the message area
// holds and nothing that belongs to the box being written in.
export function collectLocalContext(editor: HTMLElement, options: { maxChars?: number } = {}): CollectedContext {
  const maxChars = options.maxChars ?? MAX_CHARS;
  const { region, found } = regionAround(editor);
  const scope = region.cloneNode(true) as HTMLElement;
  let stripped = dropComposer(scope, region, editor);
  stripped += stripNoise(scope);
  const text = textOf(scope);
  return {
    // Keep the *end* of the region. The region is read in document order — the
    // messages run downwards and the reply box is the last thing in it — so the
    // newest text, the message being answered and what was said in the rounds
    // just before it, is nearest the end. Capping the head kept the oldest round
    // of a long thread and threw away the one part that mattered.
    text: text.length > maxChars ? text.slice(-maxChars) : text,
    truncated: text.length > maxChars,
    replyDetected: found && text.length >= MESSAGE_FLOOR,
    nodeCount: countTextCarriers(scope),
    stripped
  };
}
