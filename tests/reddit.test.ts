// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { RedditAdapter } from "../apps/extension/src/content/adapters/reddit";
import { toTarget } from "../apps/extension/src/content/editor/editable";

describe("Reddit context adapter", () => {
  beforeEach(() => { document.body.innerHTML = `<shreddit-post><h1>A useful tool</h1><div slot="text-body">Post body</div><shreddit-comment><div slot="comment">Oldest parent</div><shreddit-comment><div slot="comment">Nearest parent</div><shreddit-comment><div slot="comment">Target claim</div><textarea name="text"></textarea></shreddit-comment></shreddit-comment></shreddit-comment></shreddit-post>`; });
  it("extracts target and ancestors without siblings", async () => {
    const textarea = document.querySelector("textarea")!;
    const context = await new RedditAdapter().extractContext(toTarget(textarea));
    expect(context.relation).toBe("reply_to_comment");
    expect(context.target?.body).toBe("Target claim");
    expect(context.ancestors?.map(item => item.body)).toEqual(["Oldest parent", "Nearest parent"]);
    expect(context.post?.title).toBe("A useful tool");
  });
});
