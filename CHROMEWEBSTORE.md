# Chrome Web Store Listing — Verbia

> Last Updated: 2026-09-04

## Store Listing

**Extension Name:** Verbia

**Tagline (EN):** Your intent. The right words.  
**Tagline (中文):** 你的意图，恰如其言。

**Short Description (EN):** Your intent. The right words. Verbia turns what you mean into a natural reply draft—review, edit, and send it yourself.

**Short Description (中文):** 你的意图，恰如其言。Verbia 把你的想法变成自然的回复草稿——由你检查、编辑并亲自发送。

**Detailed Description (EN):**

You mean it. Verbia says it.（官方中文：你的想法，Verbia 帮你表达。）

Verbia helps multilingual professionals express what they mean in a natural reply without composing every sentence in English first.

On Reddit, Verbia shows the relevant post and reply chain before generating. Elsewhere, you can use selected text or no context. Write or speak your intent, choose a tone and length, review the draft, then insert or copy it.

To use Verbia, focus a reply field, click the Verbia icon, review the visible context, enter your intent, and choose Generate. Verbia always shows a draft first. It never sends or submits a message; only you do that.

Verbia reads page content only after you invoke it, limits access to the reply you are working on, stores preferences locally, and does not use message text for analytics.

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

Screenshot 1 should show reviewed Reddit context and the intent controls. Screenshot 2 should show a generated draft before insertion and the “Verbia never sends” boundary.

## Permissions Justification

| Permission | Type | Justification |
|---|---|---|
| storage | permissions | Saves the user's language, tone, length, privacy, and backend preferences locally, plus non-content request state needed to recover from worker suspension. |
| activeTab | permissions | Gives Verbia temporary access to only the page where the user clicks its toolbar icon, so Universal Mode can locate the focused editor without permanent all-sites access. |
| scripting | permissions | Loads Verbia's bundled interface into the active page after the user invokes it. No remotely hosted code is loaded. |
| http://localhost:8787/* | host_permissions | Development builds send an explicit Generate request to the local Verbia gateway. Replace this with the production HTTPS origin before release. |
| reddit.com origins | host_permissions | Shows the inline assistant under Reddit reply boxes, reads only the active reply chain, and inserts a user-reviewed draft into its composer. |

## Privacy & Data Use

**Does the extension collect user data?** Yes — only when the user clicks Generate.

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|---|---|---|---|---|
| Personal communications | Yes | Yes | Generate the requested reply | Model processor only |
| Website content | Yes | Yes | Provide minimum conversation context | Model processor only |
| User activity | Limited metadata, opt-in | If enabled | Reliability diagnostics | No sale/advertising |
| Authentication info | No | No | — | No |
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

**Publisher Name:** [REQUIRED]  
**Contact Email:** [REQUIRED]  
**Support URL / Email:** [REQUIRED]

## Version History

| Version | Date | Changes | Status |
|---|---|---|---|
| 0.1.0 | 2026-09-04 | Reddit inline reply assistant, settings side panel, and Universal reply-drafting MVP | Draft |

## Review Notes

Known release blockers: store assets, public privacy-policy URL, publisher identity, support contact, production HTTPS backend origin, final Gemini model benchmark, and current Reddit manual validation.
