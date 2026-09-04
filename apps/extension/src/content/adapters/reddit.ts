import type { ContextEnvelope, EditableTarget, SiteAdapter } from "@verbia/shared";
import { insertText, isSafeEditable, toTarget } from "../editor/editable";

const COMMENT = "shreddit-comment, [data-testid='comment'], .Comment, .thing.comment";
const POST = "shreddit-post, [data-testid='post-container'], .Post, .thing.link";
const BODY = "[slot='comment'], [data-testid='comment'], [data-click-id='text'], .md, [slot='text-body']";

function clean(value?: string | null, max = 6_000): { text: string; truncated: boolean } {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  return { text: text.slice(0, max), truncated: text.length > max };
}

function bodyOf(node: Element | null): { text: string; truncated: boolean } {
  if (!node) return { text: "", truncated: false };
  const body = node.querySelector<HTMLElement>(BODY);
  return clean(body?.innerText || body?.textContent || node.getAttribute("body") || node.getAttribute("data-body"));
}

function directParentComment(node: Element): Element | null {
  let parent = node.parentElement;
  while (parent) {
    const candidate = parent.closest(COMMENT);
    if (candidate && candidate !== node) return candidate;
    parent = parent.parentElement;
  }
  return null;
}

export class RedditAdapter implements SiteAdapter {
  id = "reddit";
  version = "1.0.0";
  matches(url: URL): boolean { return /(^|\.)reddit\.com$/.test(url.hostname); }
  findComposers(root: ParentNode = document): EditableTarget[] {
    const selectors = [
      "textarea[name='text']", "textarea[placeholder*='comment' i]", "textarea[placeholder*='reply' i]",
      "[contenteditable='true'][role='textbox']", "div[contenteditable='true']"
    ];
    return [...root.querySelectorAll<HTMLElement>(selectors.join(","))].filter(isSafeEditable).map(toTarget);
  }
  async extractContext(target: EditableTarget): Promise<ContextEnvelope> {
    const targetComment = target.element.closest(COMMENT);
    const post = target.element.closest(POST) ?? document.querySelector(POST);
    const titleNode = post?.querySelector<HTMLElement>("h1, h2, [slot='title'], [data-testid='post-title']");
    const title = clean(titleNode?.innerText || titleNode?.textContent, 500);
    const postBody = bodyOf(post);
    const targetBody = bodyOf(targetComment);
    const ancestors: Array<{ depth: number; body: string }> = [];
    let parent = targetComment ? directParentComment(targetComment) : null;
    let depth = 1;
    let truncated = title.truncated || postBody.truncated || targetBody.truncated;
    while (parent && depth <= 3) {
      const item = bodyOf(parent);
      if (item.text) ancestors.unshift({ depth, body: item.text.slice(0, 2_500) });
      truncated ||= item.truncated;
      parent = directParentComment(parent);
      depth += 1;
    }
    const relation = targetComment ? "reply_to_comment" : post ? "reply_to_post" : "unknown";
    const missingFields = [!title.text && "post.title", targetComment && !targetBody.text && "target.body"].filter(Boolean) as string[];
    return {
      relation,
      ...(title.text || postBody.text ? { post: { ...(title.text ? { title: title.text } : {}), ...(postBody.text ? { body: postBody.text } : {}) } } : {}),
      ...(ancestors.length ? { ancestors } : {}),
      ...(targetBody.text ? { target: { body: targetBody.text } } : {}),
      truncated,
      extractorVersion: this.version,
      confidence: relation === "unknown" ? "low" : missingFields.length ? "medium" : "high",
      ...(missingFields.length ? { missingFields } : {})
    };
  }
  insertDraft(target: EditableTarget, text: string, mode: "replace" | "append") { return insertText(target, text, mode); }
}
