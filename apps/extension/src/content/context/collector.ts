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
  /** Same-origin frames whose own body text was read into the region. A webmail
   *  that renders the message in a frame is the ordinary case, and this is the
   *  count that says whether the region had one (@see frameText). */
  frames: number;
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

// The frame's own document, when the browser lets us read it. A cross-origin frame
// throws on access and has nothing we could ever have shown the model: it stays
// empty, and the noise pass deletes it like any other control.
//
// The frame's text is cleaned exactly like any other: it is a document, so it
// carries script, style and controls of its own — and `textContent` would hand
// their source to the model as if it were the mail. A webmail's message frame is
// where that hurts most: it usually opens with the stylesheet that lays the message
// out, which buries the message itself under a wall of CSS.
function frameText(frame: Element): string {
  if (!(frame instanceof HTMLIFrameElement)) return "";
  try {
    const body = frame.contentDocument?.body;
    if (!body) return "";
    const scope = body.cloneNode(true) as HTMLElement;
    stripNoise(scope);
    return textOf(scope);
  } catch {
    return "";
  }
}

// What a subtree actually reads as. `textContent` cannot see into a frame, and a
// webmail that renders the message in a same-origin one is the ordinary case (163
// among them). Without this, a mail whose body lives in a frame reads as "the
// region above this composer holds a header" — the boundary test passes on the
// header, the frame is deleted as noise, and the model is handed a region with
// nothing in it to answer (@see the `no_current_message` failure).
function readableText(node: Element): string {
  const frames = node instanceof HTMLIFrameElement ? [node] : Array.from(node.querySelectorAll("iframe"));
  let text = node.textContent ?? "";
  for (const frame of frames) text += ` ${frameText(frame)}`;
  return text.replace(/\s+/g, " ").trim();
}

function precedingSiblings(node: HTMLElement): HTMLElement[] {
  const before: HTMLElement[] = [];
  for (let sibling = node.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
    if (sibling instanceof HTMLElement) before.unshift(sibling);
  }
  return before;
}

// How much more text a widened pass has to bring in before it is worth a second
// model call: a wrapper's own chrome is not a reason to ask again.
const WIDEN_MIN_CHARS = 60;
// How far a widened pass will climb, counted in ancestors. A page that nests ten
// wrappers between the message and the box stops here rather than walking to the
// top of the document.
const WIDEN_MAX_LEVELS = 6;

// The region, and whether one was actually found. The boundary is the smallest
// ancestor whose siblings above the composer already contain a real block of
// text. A compose form has none — its rows are labels and controls — so a new
// message never gets a region at all, while a reply gets the smallest container
// holding the message and the reply box together.
//
// The page itself is never a region: an editor with nothing above it belongs to
// no conversation, and answering with the whole document is worse than
// answering with nothing.
//
// `widen` asks for the second pass of an identification that came back with
// nothing usable. It climbs until the region reads as meaningfully more than the
// narrow one did, because a boundary drawn on "the row above the box holds text"
// can land on a reply area that has a hint of its own while the message itself
// sits in a wrapper beside it — the shape that produced a region of mail header
// and an empty answer.
function regionAround(editor: HTMLElement, widen = false): { region: HTMLElement; found: boolean } {
  let node: HTMLElement | null = editor;
  let region: HTMLElement | null = null;
  while (node && node !== document.body) {
    const parent: HTMLElement | null = node.parentElement;
    if (!parent) break;
    const above = precedingSiblings(node);
    // Readable, not just textContent: a message sitting in a frame is exactly the
    // case that used to make this test answer "no conversation here" and keep
    // climbing past the mail.
    if (above.some(sibling => readableText(sibling).length >= MESSAGE_FLOOR)
      && parent !== document.body && parent !== document.documentElement) {
      region = parent;
      break;
    }
    node = parent;
  }
  if (!region) {
    // Stay next to the composer: whatever the caller does with a text-free region
    // beats reaching for the page around it.
    return { region: editor.parentElement ?? document.body, found: false };
  }
  if (!widen) return { region, found: true };
  const target = readableText(region).length + WIDEN_MIN_CHARS;
  for (let level = 0; level < WIDEN_MAX_LEVELS; level += 1) {
    const parent: HTMLElement | null = region.parentElement;
    if (!parent || parent === document.body || parent === document.documentElement) break;
    region = parent;
    if (readableText(region).length >= target) break;
  }
  return { region, found: true };
}

// The chain of child indices from `ancestor` down to `node`, or null when the node
// is not inside it. It is what lets a widened clone find the narrower region the
// composer's block was located in (@see collectLocalContext).
function childPath(ancestor: HTMLElement, node: HTMLElement): number[] | null {
  const path: number[] = [];
  for (let current: HTMLElement | null = node; current && current !== ancestor; current = current.parentElement) {
    const parent: HTMLElement | null = current.parentElement;
    if (!parent) return null;
    path.unshift(Array.prototype.indexOf.call(parent.children, current));
  }
  return path.length ? path : null;
}

function nodeAtPath(base: HTMLElement, path: number[] | null): HTMLElement | null {
  if (!path) return null;
  let node: HTMLElement = base;
  for (const index of path) {
    const child = node.children[index];
    if (!(child instanceof HTMLElement)) return null;
    node = child;
  }
  return node;
}

// Wraps a region an adapter handed over in the same shape the collector returns,
// so the panel does not have to know which of the two it got. The text is capped
// the same way — keeping the end, where the newest text is — and the adapter's
// own truncation flag is carried through.
export function collectProvidedRegion(text: string, truncated: boolean): CollectedContext {
  const clean = text.replace(/\s+/g, " ").trim();
  return {
    text: clean.length > MAX_CHARS ? clean.slice(-MAX_CHARS) : clean,
    truncated: clean.length > MAX_CHARS || truncated,
    replyDetected: clean.length >= MESSAGE_FLOOR,
    nodeCount: 0,
    stripped: 0,
    // The adapter read the text itself; there is no frame in this path.
    frames: 0
  };
}

// Same-origin frame bodies, moved into the clone at the position the frame held.
// Order is what tells the messages apart — the newest runs last, next to the reply
// box — so the text has to land in place rather than be appended at the end. Frames
// with nothing readable (cross-origin, empty) are left for the noise pass.
function inlineFrameText(scope: HTMLElement, region: HTMLElement): number {
  const frames = Array.from(scope.querySelectorAll("iframe"));
  const live = Array.from(region.querySelectorAll("iframe"));
  let inlined = 0;
  frames.forEach((frame, index) => {
    const text = live[index] ? frameText(live[index]) : "";
    if (!text) return;
    frame.replaceWith(scope.ownerDocument.createTextNode(text));
    inlined += 1;
  });
  return inlined;
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
//
// The composer's own block is left out on purpose. It is not part of the
// conversation — the user's typing and an inserted draft live there — and reading
// it made an identification look stale the moment the user's own text changed,
// which is how a freshly identified context got thrown away after a reply had
// been inserted into the box.
export function regionFingerprint(editor: HTMLElement): string {
  const { region } = regionAround(editor);
  const composer = composerBlock(region, editor);
  let text = "";
  for (const child of Array.from(region.children)) {
    if (child === composer) continue;
    text += ` ${readableText(child)}`;
  }
  const normalised = text.replace(/\s+/g, " ").trim();
  return `${normalised.length}:${normalised.slice(0, 60)}`;
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
export function collectLocalContext(editor: HTMLElement, options: { maxChars?: number; widen?: boolean } = {}): CollectedContext {
  const maxChars = options.maxChars ?? MAX_CHARS;
  const narrow = regionAround(editor);
  const { region, found } = options.widen ? regionAround(editor, true) : narrow;
  const scope = region.cloneNode(true) as HTMLElement;
  // The composer's own block is dropped as seen from the *narrow* region: in a
  // widened clone the child holding the editor can be the whole reading area, and
  // dropping that would leave nothing of the page behind. Nested at the same place
  // in the widened clone, the narrow region keeps the drop exact.
  const composerScope = region === narrow.region ? scope : nodeAtPath(scope, childPath(region, narrow.region));
  let stripped = composerScope ? dropComposer(composerScope, narrow.region, editor) : 0;
  // Read the frames first: the noise pass deletes the ones it finds, and a message
  // that lives in one would be deleted with it.
  const frames = inlineFrameText(scope, region);
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
    stripped,
    frames
  };
}
