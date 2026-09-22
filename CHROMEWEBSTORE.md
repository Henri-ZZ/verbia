# Chrome Web Store Listing — Verbia - AI Reply & Writing Assistant

> Last Updated: 2026-09-22

<!-- 单一事实来源：商店各字段的可复制文本 + 权限理由 + 隐私披露。
     改动 manifest 的 permissions / host_permissions / content_scripts 时，必须同步本文件的
     「Permissions Justification」与「Version History」，否则提交时会出现口径不一致。 -->

## Store Listing

**Extension Name** [REQUIRED]

```
Verbia - AI Reply & Writing Assistant
```

来源：`apps/extension/_locales/en/messages.json` 的 `extensionName`（39 字符，上限 75）。

**Short Description** [REQUIRED]

```
Draft replies in any language — Verbia reads the email or thread you are answering and writes the reply you mean.
```

来源：同一文件的 `description`（116 字符，上限 132）。与 manifest 保持一致。

**Detailed Description** [REQUIRED]

```
Verbia writes the reply you meant — in the language, tone, and length you choose.

Reading a long thread and still having to phrase the answer is the part that costs time. Verbia reads what you are answering, takes one line of intent from you, and returns a draft you can edit, insert, or copy.

Where it works

Email — Gmail, Outlook, QQ Mail and Tencent Exmail. Verbia reads the message you are replying to and writes the reply.

Reddit — posts and comments. It reads the thread as it stands and answers in the same voice.

WhatsApp Web — it reads the conversation and drafts the message you have in mind.

Any other page — select the text you want to answer, open Verbia, and it writes from that selection. Nothing to set up.

What you can count on

It drafts; it never sends. You insert the draft into the box, or copy it, and decide what goes out.

31 interface languages, and a reply language you choose separately from your own — write in Japanese while reading English, for example.

Tone and length are choices, not guesses: formal or casual, short or detailed, on every draft.

Speak instead of type: say your intent and it writes it out.

Your settings travel with your account, so the next reply takes one line, not a setup.

How to use it

1. Install Verbia and sign in.
2. Open the box you are writing in — a reply field, a chat input, a comment box.
3. Press Alt+R, or click the Verbia icon, then type or dictate what you want to say and press Generate.
4. Read the draft, then Insert it into the box or Copy it.

Your data

Verbia sends the text you are answering and the intent you typed to its own servers, and that is the whole of it: those two things are what a draft is written from, and nothing else leaves your browser. It reads a page only when you summon it on that page, it runs no analytics or tracking, and it never sells or shares your data. Settings and your signed-in session stay in your browser. The full policy is at https://verbia.henriz.dev/privacy.

Feedback and support: henri@henriz.dev or https://verbia.henriz.dev/contact
```

**Category** [REQUIRED]

```
Productivity
```

（备选：Social & Communication。选 Productivity 是因为主要使用场景是"回复邮件/评论"，而非社交网络本身。）

**Single Purpose** [REQUIRED]

```
Drafts a reply to the message, thread, or selected text you are answering, and puts that draft in the box you are writing in.
```

**Primary Language** [REQUIRED]

```
English
```

界面语言共 31 种（`apps/extension/_locales/`），随浏览器语言自动切换；商店可按需补充本地化 listing。

### 中文 listing（可选，提交时按需填写）

```
标题：Verbia - AI 回复与写作助手
简短说明：读取你正在回复的邮件或帖子，用你选定的语言、语气与长度写出草稿。
详细说明：Verbia 读取你正在回复的内容，你只需给一句意图，它就写出可编辑的草稿——邮件（Gmail、Outlook、QQ 邮箱、腾讯企业邮箱）、Reddit 帖子与评论、WhatsApp Web 会话，以及任何页面上的选中文字都支持。它只生成草稿，绝不自作主张发送：插入或复制由你决定。支持 31 种界面语言，回复语言可与界面语言分开选择。发送的只有"你正在回复的文本"与"你输入的意图"，无任何埋点追踪，不转售数据。隐私政策：https://verbia.henriz.dev/zh/privacy
```

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready（实测 128×128） | `apps/extension/icons/icon128.png` |
| Icon 16 | 16×16 PNG | ✅ Ready（实测 16×16） | `apps/extension/icons/icon16.png` |
| Screenshot 1 [REQUIRED] | 1280×800 或 640×400 | 🟡 需确认（仓库内无成品，见下） | — |
| Screenshot 2 [RECOMMENDED] | 1280×800 或 640×400 | 🟡 需确认 | — |
| Screenshot 3 [RECOMMENDED] | 1280×800 或 640×400 | 🟡 需确认 | — |
| Small Promo Tile [RECOMMENDED] | 440×280 | ⬜ Not created | 候选素材：`apps/web/public/promo_tile.*`（尺寸需先确认） |
| Marquee Promo Tile | 1400×560 | ⬜ Not created | — |

### Screenshot Notes

仓库里没有 1280×800 的截图成品，因此**提交前必须在商店后台确认现有截图是否仍符合尺寸要求**（若已发布过，通常已有一组；若尺寸不合规需重做）。建议至少覆盖这四张：

1. 邮件回复：面板浮在回复框旁，上下文显示"replying to email"，草稿已生成。
2. Reddit 评论回复：面板贴着评论框，显示上下文为帖子/评论。
3. WhatsApp Web：会话上下文 + 草稿。
4. 通用模式：任意网页上选中一段文字 → 面板写出回复（体现"任何页面可用"）。

## Permissions Justification

<!-- 逐条写清楚"为哪个用户可见功能服务"。审核团队读这一节。
     改 manifest 的权限/宿主后必须同步本表。 -->

| Permission | Type | Justification |
|------------|------|---------------|
| `storage` | permissions | Saves your preferences (interface language, reply language, tone, length, voice) and your signed-in session so they survive a browser restart. No page content is stored. |
| `activeTab` | permissions | This is how Verbia reaches every page that is not one of the six supported sites: when you press Alt+R or click the toolbar icon, the browser's own temporary grant for that action lets Verbia read the box you are in and show the reply panel. It shows no warning at install and grants nothing until the user acts. |
| `scripting` | permissions | Places the reply panel into the current page for that one action (with `activeTab` above), and — for a site the user has granted — registers the same panel script so it is ready without a summon. Also refreshes it after an extension update. |
| `contextMenus` | permissions | Adds the right-click item "Add to Verbia context", which turns a selected paragraph into the text Verbia answers. |
| `https://verbia.henriz.dev/*` | host_permissions | The Verbia website itself: used only to pass your sign-in between the website and the extension, so one sign-in covers both. This is the **only** origin in the install dialog. |

### `optional_host_permissions` — 支持站点，用哪个才申请哪个

| Site | Type | Justification |
|------|------|---------------|
| `https://www.reddit.com/*`, `https://old.reddit.com/*` | optional_host_permissions | Reddit posts and comments: to read the thread being answered and place the panel next to the reply box. |
| `https://mail.google.com/*` | optional_host_permissions | Gmail: to read the message being replied to and write the draft into the reply box. |
| `https://outlook.live.com/*`, `https://outlook.office.com/*`, `https://outlook.com/*`, `https://www.outlook.com/*` | optional_host_permissions | Outlook — the four addresses it serves the mail UI from — same flow as Gmail. |
| `https://wx.mail.qq.com/*` | optional_host_permissions | QQ Mail: read the message being answered, insert the draft. |
| `https://exmail.qq.com/*` | optional_host_permissions | Tencent Exmail (business QQ Mail): same flow; it renders the reply box in a frame of its own, which is why the registered script for this site runs in every frame. |
| `https://web.whatsapp.com/*` | optional_host_permissions | WhatsApp Web: read the open conversation, draft the message. |

**为什么站点是 optional 而不是必需**（这一段也解释了安装提示为何只有一行）：

- `host_permissions` 里的每一条**都会**在安装对话框里显示成一行"读取你在某网站上的数据"，而且 Chrome 文档明确：`content_scripts.matches` 里的匹配模式**同样**触发警告。因此把六个站点的宿主写死在清单里，用户装完就会看到一串域名列表——在本扩展真正用在哪、用来干什么都不清楚的时刻。
- 改成 optional 后，安装对话框只剩 `verbia.henriz.dev` 这一行（那是登录交接用的自家站点）。**用户在哪个站点第一次真正使用，Chrome 才在该站点上问一次**，一次一个站点。
- 运行机制：授予后的站点由 `chrome.scripting.registerContentScripts` 动态注册（`background/sites.ts`，`persistAcrossSessions`），授权变更时双向同步——所以没有声明式注入也照样能工作。用户在**任何**未授权页面按 Alt+R 依然可用（走 `activeTab`），只是不会在页面加载时就驻留。
- 撤销授权（用户在 `chrome://extensions` 里改站点访问权限）会同步注销该站点的注册，不需要重装。
- **申请入口在弹窗里**：在目标站点打开弹窗，会看到一张卡片——先解释作用（"启用后点进回复框面板自动出现；不启用也能用快捷键"），下面一个 primary 按钮"Enable on this site"（31 种语言均有）。点它只申请**当前这个站点**，Chrome 的提示框当场出现——不是安装时一次性列一串域名。拒绝**不会**影响使用（快捷键在任何页面都可用），按钮会保留，再点即可再申请；已授权的站点在弹窗里显示 `✓ 域名`。
- **发现路径**：在未授权的支持站点按快捷键时，扩展会**主动打开该弹窗说明一次**（每站点仅一次，之后不再打扰）。这样用户不必猜到要去点工具栏图标。

### 刻意**不**申请的权限（请勿加回）

| 未申请项 | 原因 |
|---|---|
| `https://api.verbia.henriz.dev/*` | Verbia 自己的接口按 CORS 放行扩展来源（预检 `access-control-allow-origin: *`，允许 `content-type, authorization`），且扩展只用 Bearer 头、不带 cookie → 不需要宿主权限。 |
| `https://pthfyoejvlcwxboskrjr.supabase.co/*` | 同上：登录接口的预检放行扩展来源（允许 `apikey, authorization, content-type, x-client-info`）。 |
| `http://localhost:8787/*` | 仅开发用；发布构建会移除（`scripts/build.mjs --release`）。 |
| `optional_permissions` | 保持为空：`contextMenus` 这类 API 权限**不产生**安装警告，改成可选反而要求用户先去设置里开启，而右键菜单又必须先创建才能被点到。站点宿主是 `optional_host_permissions`（见上表），不需要重复声明。 |

> 判断某个站点该不该写进清单的标准很简单：**写进 `host_permissions` 或 `content_scripts` = 每个新用户装完就看到这一行**。所以只有"不用就会坏、且用户必然知情"的自家站点留在必需里（登录交接），其余一律 optional。

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** Yes

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Personally identifiable info | Yes（账户邮箱） | Yes | 登录与账号识别 | No |
| Health info | No | No | — | No |
| Financial info | No | No | — | No |
| Authentication info | Yes（登录会话令牌） | Yes | 维持登录状态、为请求鉴权 | No |
| Personal communications | Yes（你正在回复的文本 + 你输入的意图） | Yes | 写草稿本身 | No |
| Location | No | No | — | No |
| Web history | No | No | — | No |
| User activity | Yes（仅生成次数计数） | Yes | 套餐额度统计 | No |
| Website content | Yes（仅你召唤 Verbia 的那一页上、编辑器周围的文本） | Yes | 写草稿本身 | No |

补充说明（与代码一致）：

- **无埋点**：`apps/extension/src` 里没有 analytics / posthog / gtag / mixpanel / sentry 等任何第三方上报。
- **不上传整页**：只有"编辑器周围的可视文字"（邮件正文/帖子/会话/选中的段落）会随一次生成请求发出，长度上限 6,000 字符。
- **不发送草稿**：插入到编辑框里的草稿不会回传。
- **本地留存**：设置、面板位置、会话令牌存在浏览器里。

### Data Use Certification

- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL** [REQUIRED]

```
https://verbia.henriz.dev/privacy
```

中文版：`https://verbia.henriz.dev/zh/privacy`（两页实测 HTTP 200）。

提交前自检：政策里的数据用途必须与本文件上面的表格**逐条一致**（尤其是"发送哪些文本"与"是否转售"）。

## Distribution

**Visibility**: Public
**Regions**: All regions

## Developer Info

**Publisher Name** [REQUIRED]

<!-- 待填：与商店账号主体一致的名字。站点署名出现的是 “Henri Z”，请确认用个人名还是主体名。 -->

**Contact Email** [REQUIRED]

```
henri@henriz.dev
```

**Support URL / Email** [RECOMMENDED]

```
https://verbia.henriz.dev/contact
```

**Homepage URL** [RECOMMENDED]

```
https://verbia.henriz.dev/
```

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 0.1.9（待定版本号） | — | 新增腾讯企业邮箱支持（宿主权限 + `all_frames` 注入）；**移除** `api.verbia.henriz.dev` 与 `…supabase.co` 两条宿主权限；失败提示更明确（不可达框架给出可操作指引）；**站点宿主改为 optional（安装提示从 11 个域名缩到 1 行）**，支持站点不再声明式注入，改为授权后动态注册 | Draft |
| 0.1.8 | — | 当前 `manifest.json` 版本。<!-- 待填：该版本实际提交/发布日期 --> | Published? |

提交前必做：**提升 `apps/extension/manifest.json` 的 `version`**（`scripts/package.mjs` 故意不自动改版本号），然后 `node scripts/package.mjs` 产出 `artifacts/verbia-v<version>.zip`。

## Review Notes

### Known Issues / Limitations

1. **老式 frameset 邮箱**：腾讯企业邮箱的回复框在独立帧里，host 需要 `all_frames: true` + `match_about_blank: true` 才能注入（已在 manifest 声明）。其它同类邮箱（163 等）用的是通用模式 + 选中文本路径。
2. **邮件模式是手动召唤**：没有适配器的邮箱不会在页面里自动弹面板，需要按 Alt+R。这是设计，不是缺陷（避免在无法判断编辑器的页面上乱弹）。
3. **`web_accessible_resources` 仍是 `<all_urls>`**：因为面板可能出现在任意站点（通用模式），面板里的图标必须能被页面加载。下一步计划把这几张 SVG 内联为 data URL，从而整块删除该字段（清单里将不再有任何"全站"面）。
4. **权限变更史**（供审核对照）：本版新增 `https://exmail.qq.com/*`，删除 `https://api.verbia.henriz.dev/*` 与 `https://pthfyoejvlcwboskrjr.supabase.co/*`。删除两条的理由见上文"刻意不申请的权限"——两端 CORS 均放行扩展来源，且请求不带 cookie。
5. **包内仍会出现 `localhost` 字面量，来自第三方库**：`background.js` 里有 4 处，全部在打包进来的 Supabase 登录客户端内部（库自身的默认常量、URL 校验辅助、realtime 能力探测），**不是本扩展发起的请求**。本扩展自身源码、清单、options 页、其余三个 bundle 里均为零命中；清单不含任何 localhost 权限。
6. **站点访问是运行时的，审核对照要点**：清单里除自家站点外没有任何 `host_permissions`；六个支持站点在 `optional_host_permissions` 中，且**没有**声明式 `content_scripts`（匹配模式同样会触发安装警告）。站点脚本在用户授予该站点后由 `background/sites.ts` 动态注册。因此：安装对话框只列 `verbia.henriz.dev` 一行；在任何未授权页面按 Alt+R 依然可用（`activeTab`）；在授权站点上则可驻留，无需每次召唤。既有的 `chrome://extensions` 站点访问权限被撤销时，注册会同步注销。
7. **最低 Chrome 版本为 133**（`minimum_chrome_version`）：按站点的授权提示依赖 `chrome.permissions.addHostAccessRequest`，它自 Chrome 133 起可用，且**不需要** `tabs` 权限。低于该版本要判断"当前标签页属于哪个站点"就必须申请 `tabs`（安装警告："Read your browsing history"），与本扩展的权限策略冲突，因此不提供支持。用户升级到低于 133 的 Chrome 时扩展会被禁用——这是刻意的取舍。

### Rejection History

尚无。
