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
  // Matched by name, not by class: a frame of the document being read belongs to
  // that document's realm, and `instanceof` against ours answers "no" to a frame
  // that is plainly there (@see the frame-anchored read in collectLocalContext).
  const name = frame.localName;
  if (name !== "iframe" && name !== "frame") return "";
  try {
    const body = (frame as HTMLIFrameElement).contentDocument?.body;
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
  const name = node.localName;
  const frames = name === "iframe" || name === "frame" ? [node] : Array.from(node.querySelectorAll("iframe, frame"));
  let text = node.textContent ?? "";
  for (const frame of frames) text += ` ${frameText(frame)}`;
  return text.replace(/\s+/g, " ").trim();
}

function precedingSiblings(node: HTMLElement): HTMLElement[] {
  const before: HTMLElement[] = [];
  for (let sibling = node.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
    before.unshift(sibling as HTMLElement);
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
  // The anchor's own document, not the one this script runs in: the region may be
  // read from the page that owns the frame the editor sits in (@see the
  // frame-anchored read in collectLocalContext).
  const doc = editor.ownerDocument;
  const body = doc.body;
  const root = doc.documentElement;
  let node: HTMLElement | null = editor;
  let region: HTMLElement | null = null;
  while (node && node !== body) {
    const parent: HTMLElement | null = node.parentElement;
    if (!parent) break;
    const above = precedingSiblings(node);
    // Readable, not just textContent: a message sitting in a frame is exactly the
    // case that used to make this test answer "no conversation here" and keep
    // climbing past the mail.
    if (above.some(sibling => readableText(sibling).length >= MESSAGE_FLOOR)
      && parent !== body && parent !== root) {
      region = parent;
      break;
    }
    node = parent;
  }
  const content = region ?? regionByContent(editor, body, root);
  if (!content) {
    // Stay next to the composer: whatever the caller does with a text-free region
    // beats reaching for the page around it.
    return { region: editor.parentElement ?? body ?? root, found: false };
  }
  region = content;
  if (!widen) return { region, found: true };
  const target = readableText(region).length + WIDEN_MIN_CHARS;
  for (let level = 0; level < WIDEN_MAX_LEVELS; level += 1) {
    const parent: HTMLElement | null = region.parentElement;
    if (!parent || parent === body || parent === root) break;
    region = parent;
    if (readableText(region).length >= target) break;
  }
  return { region, found: true };
}

// The smallest ancestor whose text *outside* the composer already reads as a
// conversation.
//
// The rule above needs the message to sit in a sibling above the box. A table-based
// webmail can put the two in wrappers that are not siblings — a row here, a cell
// there — and then no level above the box ever holds the message, while the
// container that holds both is exactly what this finds. Consulted only when that
// rule came up empty, so the shapes it already reads are left as they were.
function regionByContent(editor: HTMLElement, body: HTMLElement | null, root: HTMLElement): HTMLElement | null {
  for (let node = editor.parentElement; node && node !== body && node !== root; node = node.parentElement) {
    const composer = composerBlock(node, editor);
    const own = readableText(node).length - (composer ? readableText(composer).length : 0);
    if (own >= MESSAGE_FLOOR) return node;
  }
  return null;
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
    // Element rather than HTMLElement: a clone read from another document (a frame
    // read from its parent) is not an instance of this realm's classes.
    const child = node.children[index] as HTMLElement | undefined;
    if (!child) return null;
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
  // The same anchor the collection used, so "did the conversation change" is asked
  // about the text that was actually read (@see frameAnchor).
  const frame = frameAnchor(editor);
  const anchor = frame && !regionAround(editor).found ? frame : editor;
  const { region } = regionAround(anchor);
  const composer = composerBlock(region, anchor);
  let text = "";
  for (const child of Array.from(region.children)) {
    if (child === composer) continue;
    text += ` ${readableText(child)}`;
  }
  const normalised = text.replace(/\s+/g, " ").trim();
  return `${normalised.length}:${normalised.slice(0, 60)}`;
}

// The box being written in is never context: it is the editor plus the row it sits
// in — toolbar, send and cancel controls. The collector drops the whole block the
// editor sits in, which is steadier than listing control selectors that have to keep
// up with the app (QQ Mail's 发送 / 取消 / 表情 row is not made of <button> elements,
// so a control list leaks it straight into the context).
function composerBlock(region: HTMLElement, editor: HTMLElement): HTMLElement | null {
  for (let node: HTMLElement = editor; ;) {
    const parent: HTMLElement | null = node.parentElement;
    if (!parent) return null;
    if (parent === region) return node;
    node = parent;
  }
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
  const local = collectedAround(editor, options);
  if (local.replyDetected) return local;
  // Nothing reads as a conversation at the boundary the first pass drew. Before
  // reporting that there is no mail here, look further out: a boundary based on
  // "the row above the box holds text" lands short whenever the message sits in a
  // wrapper the reply box is not a sibling of, which is the ordinary shape of a
  // table-based webmail. Climbing is a read, not a model call, so it costs a wait
  // rather than a request.
  const wider = options.widen ? local : collectedAround(editor, { ...options, widen: true });
  if (wider.replyDetected) return wider;
  // A reply can carry the message it answers inside the box itself — that is where a
  // quote goes — so the box is read before the walk up the frames begins.
  const quoted = collectQuotedInBox(editor, options.maxChars ?? MAX_CHARS);
  if (quoted) return quoted;
  // A reply box can be the whole body of a frame of its own — that is how a legacy
  // webmail builds its editor — and then the message it answers is in the document
  // that owns that frame, or one above that when the app nests a content frame
  // inside the page. Every level is read with the frame as the anchor, which is also
  // what keeps the draft out of the context: the block dropped as the composer is
  // the frame itself.
  //
  // Deliberately a fallback rather than the default: a composer inside a frame can
  // also answer a conversation that lives in that same frame (a chat panel), and
  // reading the page around it would hand the model the surrounding document.
  for (let anchor = frameAnchor(editor); anchor; anchor = frameAnchor(anchor)) {
    const above = collectedAround(anchor, options);
    if (above.replyDetected && above.text.length >= CLIMB_FLOOR) return above;
    const aboveWider = options.widen ? above : collectedAround(anchor, { ...options, widen: true });
    if (aboveWider.replyDetected && aboveWider.text.length >= CLIMB_FLOOR) return aboveWider;
  }
  return local;
}

// A read taken further up the frame tree passes a page's own chrome on its way: a
// compose form's recipient, subject and toolbar rows clear the floor that tells a
// conversation from interface inside the document the editor lives in. Volume is what
// tells the two apart, because a message read a document up is longer than the form
// it sits in.
const CLIMB_FLOOR = MESSAGE_FLOOR * 3;

// A reply can carry the message it answers inside the box itself — that is where a
// quote goes — and some webmail keeps nothing else around it: the page above the box
// is the compose form's own rows. Read that way only when the box actually shows a
// quoted original, because a draft the user typed is not a conversation, and handing
// one over is how the model ends up identifying the user's own words as the mail. A
// quote sits below the draft, so keeping the end of the text is what keeps the quote.
const QUOTE_MARK = /(-{2,}\s*(original|forwarded|转发|原始)|^\s*(from|发件人)\s*[:：])/im;

function collectQuotedInBox(editor: HTMLElement, maxChars: number): CollectedContext | null {
  if (editor.localName === "textarea" || editor.localName === "input") return null;
  const own = (editor.innerText ?? "").replace(/[ \t]+/g, " ").trim();
  if (own.length < MESSAGE_FLOOR) return null;
  if (!QUOTE_MARK.test(own) && !editor.querySelector("blockquote")) return null;
  return {
    text: own.length > maxChars ? own.slice(-maxChars) : own,
    truncated: own.length > maxChars,
    replyDetected: true,
    nodeCount: 0,
    stripped: 0,
    frames: 0
  };
}

// The frame an element's document sits in, when the browser lets us reach it: null
// for a top-level document and for a cross-origin parent, which is what keeps the
// read local where no walk up is possible. Asked of the element rather than of
// `window`, because the walk above asks the same question again of every frame it
// reaches.
function frameAnchor(element: HTMLElement): HTMLElement | null {
  const frame = (element.ownerDocument?.defaultView?.frameElement ?? null) as HTMLElement | null;
  return frame && frame !== element ? frame : null;
}

// One read of the region around an anchor, in the document the anchor belongs to.
function collectedAround(anchor: HTMLElement, options: { maxChars?: number; widen?: boolean } = {}): CollectedContext {
  const maxChars = options.maxChars ?? MAX_CHARS;
  const narrow = regionAround(anchor);
  const { region, found } = options.widen ? regionAround(anchor, true) : narrow;
  const scope = region.cloneNode(true) as HTMLElement;
  // The composer's own block is dropped as seen from the *narrow* region: in a
  // widened clone the child holding the editor can be the whole reading area, and
  // dropping that would leave nothing of the page behind. Nested at the same place
  // in the widened clone, the narrow region keeps the drop exact.
  //
  // Located here and removed below, because the clone still mirrors the live region
  // node for node at this point: inlining a frame replaces an *element* with a text
  // node, which shifts every index computed against the live region afterwards.
  const composerScope = region === narrow.region ? scope : nodeAtPath(scope, childPath(region, narrow.region));
  const liveBlock = composerBlock(narrow.region, anchor);
  const copyBlock = liveBlock && composerScope ? nodeAtPath(composerScope, childPath(narrow.region, liveBlock)) : null;
  // Frames are read before anything is dropped, because the noise pass deletes the
  // ones it finds — and a message inside a frame is the ordinary shape of a webmail:
  // the reply box is a frame, and the message it answers sits in another one beside
  // it in the page that owns them both. Reading them in place keeps the order the
  // messages run in, which is what tells the newest from the oldest.
  //
  // A frame that is the composer itself needs no exception: text read out of a frame
  // has that frame's own nested frames stripped first (@see frameText), and the
  // composer's block is dropped here in any case.
  const frames = inlineFrameText(scope, region);
  let stripped = copyBlock ? 1 + copyBlock.querySelectorAll("*").length : 0;
  copyBlock?.remove();
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
