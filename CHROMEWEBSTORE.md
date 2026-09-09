# Chrome Web Store Listing — Verbia

> Last Updated: 2026-09-06

## Store Listing

**Extension Name:** Verbia - AI Reply & Writing Assistant（中文副语言：Verbia - AI 回复与写作助手）

**Tagline (EN):** Your intent. The right words.  
**Tagline (中文):** 你的意图，恰如其言。

**Short Description (EN):** Speak or type in any language. Verbia understands the conversation and turns what you mean into natural, context-aware replies.

**Short Description (中文):** 使用任何语言说出或输入你想表达的内容。Verbia 理解对话上下文，将你的真实意图转化为自然、贴合语境的回复。

**Detailed Description (EN):**

You mean it. Verbia says it.（官方中文：你的想法，Verbia 帮你表达。）

Verbia helps multilingual professionals express what they mean in a natural reply without composing every sentence in English first.

Automatic mode now supports Reddit, Gmail, and Outlook on the web, with more platforms on the way. On these sites, Verbia detects the conversation you are replying to and shows it before generating — the post and reply chain, or the original email being answered. Elsewhere, you can use selected text or no context. Write or speak your intent, choose a tone and length, review the draft, then insert or copy it.

To use Verbia, sign in, focus a reply field, and use your configured shortcut to open the reply panel. Review the visible context, enter your intent, and choose Generate. Verbia always shows a draft first. It never sends or submits a message; only you do that. The toolbar icon opens the Dashboard, where you can manage your account and preferences.

Verbia reads page content only after you invoke it, limits access to the reply you are working on, stores preferences locally, and does not use message text for analytics.

**Detailed Description (中文):**

你的想法，Verbia 帮你表达。（You mean it. Verbia says it.）

Verbia 帮助多语言使用者直接用自己熟悉的语言表达想法，不必先在英文里组织好每一句话，也能得到自然、贴切、符合语境的回复草稿。

自动模式目前支持 Reddit、Gmail 与 Outlook 网页版，更多平台正在路上。在这些站点上，Verbia 会在生成前识别并展示你正在回复的相关对话——帖子与回复链，或正在回复的那封邮件；在其他网页，你可以使用选中的文字作为上下文，也可以不带上下文直接起草。写下或说出你的意图，选择语气和长度，检查草稿后再插入或复制。

要使用 Verbia：登录后聚焦任意回复框，用你配置的快捷键唤起回复面板。先确认面板中可见的上下文，输入你的意图，然后点击 Generate。Verbia 总是先把草稿展示给你，绝不会替你发送或提交任何消息——发送永远由你自己完成。点击工具栏图标可打开控制面板，管理账号与偏好设置。

Verbia 只在你主动唤起后才读取页面内容，访问范围限定于你正在编辑的这条回复；偏好设置仅保存在本地，消息文本不会用于任何分析。

**Category:** Social & Communication

**Single Purpose:** Generate contextual, cross-language reply drafts for the user's current text editor.

**Primary Language:** English（提交时可为商店列表添加 Simplified Chinese 副语言，对应中文文案见上；扩展内 manifest 文案已通过 `_locales` 随浏览器语言切换）

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|---|---:|---|---|
| Store Icon | 128×128 PNG | ✅ Created | `brand/icons/icon128.png` |
| Screenshot 1 | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 2 | 1280×800 or 640×400 | ⬜ Not created | |
| Small Promo Tile | 440×280 | ⬜ Not created | |

Screenshot 1 should show reviewed Reddit context and the intent controls. Screenshot 2 should show a generated draft before insertion and the “Verbia never sends” boundary. Refresh the toolbar popup/settings screenshot to include the daily usage meter and reorganized account card.

## Permissions Justification

| Permission | Type | Justification |
|---|---|---|
| storage | permissions | Saves the user's language, tone, length, privacy, and backend preferences locally, plus non-content request state needed to recover from worker suspension. |
| activeTab | permissions | Gives Verbia temporary access to only the page where the user clicks its toolbar icon, so Universal Mode can locate the focused editor without permanent all-sites access. |
| scripting | permissions | Loads Verbia's bundled interface into the active page after the user invokes it. No remotely hosted code is loaded. |
| http://localhost:8787/* | host_permissions | Unpacked development builds can send an explicit Generate request to a gateway running on the developer's own computer. |
| https://api.verbia.henriz.dev/* | host_permissions | Sends conversation context and the user's stated intent only after they click Generate, then returns a reply draft for review. |
| reddit.com origins | host_permissions | Shows the inline assistant under Reddit reply boxes, reads only the active reply chain, and inserts a user-reviewed draft into its composer. |
| https://mail.google.com/* | host_permissions | Lets the content script run in Gmail's message-composer frame (all_frames + match_about_blank) so Verbia can draft replies inside the email composer the user is writing. Reads only the email being replied to after the composer is opened. |
| outlook origins (`outlook.live.com`, `outlook.office.com`, `outlook.com`) | host_permissions | Lets the content script locate the message composer in Outlook on the web and read only the email being replied to after the user opens a reply. |
| https://pthfyoejvlcwxboskrjr.supabase.co/* | host_permissions | Completes user-initiated Google or email sign-in with Verbia's Supabase project and refreshes the resulting account session. |

## Privacy & Data Use

**Does the extension collect user data?** Yes — only when the user clicks Generate.

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|---|---|---|---|---|
| Personal communications | Yes | Yes | Generate the requested reply | Model processor only |
| Website content | Yes | Yes | Provide minimum conversation context | Model processor only |
| User activity | Limited metadata, opt-in | If enabled | Reliability diagnostics | No sale/advertising |
| Authentication info | Yes | Yes | Sign in, maintain the account session, and attribute usage quota | Supabase authentication processor |
| Financial, health, location, web history | No | No | — | No |

- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL:** [REQUIRED before submission — host `PRIVACY.md` publicly]

## Distribution

**Visibility:** Unlisted for initial 10–30 person validation  
**Regions:** All regions

## Developer Info

**Homepage URL:** https://verbia.henriz.dev/  
**Publisher Name:** [REQUIRED]  
**Contact Email:** [REQUIRED]  
**Support URL / Email:** [REQUIRED]

## Version History

| Version | Date | Changes | Status |
|---|---|---|---|
| 0.1.0 | 2026-09-06 | Reddit inline reply assistant, removable reply panels with clean-session reopening, Universal reply drafting, dashboard access from the popup, Google profile identity, and visible daily free-usage allowance | Draft |

## Review Notes

Known release blockers: store assets, public privacy-policy URL, publisher identity, support contact, final model benchmark, and current Reddit manual validation.
