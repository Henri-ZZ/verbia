# Verbia 使用手册（USER MANUAL）

> 适用对象：**人类用户**（产品如何使用）与 **AI Agent**（系统机制、行为边界与代码索引）。
> 本文描述当前实现（Manifest V3 扩展 + 官网 + 后端网关），并随功能演进更新。
> 最后更新：2026-09-08

---

## 1. 这是什么 / 不是什么

**Verbia** 是一个跨语言、理解当前对话上下文的回复助手：你说出（或输入）自己想表达的意思，它结合正在回复的上下文，生成自然、符合语气与场合的目标语言草稿。

**Verbia 做的事**
- 只在你主动唤起时读取“正在回复的这条对话”的可见上下文；
- 把你的意图翻译/改写成语境合适的回复**草稿**；
- 草稿由你检查、编辑、复制或一键插入输入框。

**Verbia 不做什么（产品硬边界，不得破坏）**
- 绝不自动替你点击“发送/提交”；
- 不在后台扫描网页、不做常驻内容读取；
- 不把消息正文用于分析/训练（元数据诊断默认关闭且不含正文）；
- 不替用户做出发送决定。

---

## 2. 术语表

| 术语 | 含义 |
|---|---|
| Intent（意图） | 用户想表达的原意，可用任意语言输入或语音说出 |
| Context（上下文） | 生成时参考的对话内容（目前仅纯文本） |
| Draft（草稿） | 生成结果，插入前由用户审阅 |
| 回复面板（Panel） | 唤起后出现在输入框附近的 Verbia 内嵌 UI |
| Reddit 模式 | Reddit 网页上的自动上下文提取 |
| Gmail 模式 | Gmail 网页版写信与回复场景的自动上下文提取 |
| Outlook 模式 | Outlook 网页版写信与回复场景的自动上下文提取 |
| Universal Mode（通用模式） | 其它网站：聚焦输入框 + 可选手动加入的上下文 |
| 自动适配 | 某个网站“开箱即用”的接入（当前支持 Reddit、Gmail 网页版和 Outlook 网页版） |
| Dashboard/账号 | 官网 `/account` 与插件设置页的账号中心 |

---

## 3. 安装与浏览器支持

- 目前以 Chrome 扩展形式发布（Chrome Web Store），其余 Chromium 内核浏览器可从同一商店安装。
- 官网“立即安装/Install now”按钮会**自动识别浏览器**：Firefox/Edge 上架后分别跳转各自商店，未上架时回退 Chrome 商店（链接维护在 `apps/web/components/install-link.tsx` 的 `STORE_URLS` 常量中）。
- 安装后在 `chrome://extensions` 固定到工具栏。

---

## 4. 账号体系

- **一个账号，多端共享身份**：扩展与官网使用**同一个 Supabase 项目**，因此你在官网登录的账号与插件登录的是同一个账号（同一份 `profiles`、同一份每日用量）。
- **登录方式**：Google 或邮箱 Magic Link（免密），无密码。
- **登录会自动同步**：在插件完成一次新登录时，官网也会建立自己的登录状态；在官网完成一次新登录时，同一浏览器中已安装的插件也会建立自己的登录状态。
- **登录状态彼此独立**：网站存 localStorage、扩展存 `chrome.storage`；一端退出不会退出另一端（两端登出都使用 `scope: "local"`）。
- **线上生成需要登录**：网关配置 `AUTH_REQUIRED=1`，未登录不能起草。
- 任何一端 401/token 失效会自动变成“已退出”，不会出现“仍显示登录但用量不可用”。

### 登录入口
- 插件：options 页顶部 **Account** 卡片 / popup 底部登录行。
- 官网：右上角“登录 / Sign in”→ `/account`。

---

## 5. 使用模式

### 5.1 Reddit（自动模式）

内容脚本只在 Reddit 域名注入。流程：

1. 打开 Reddit 的帖子/回复场景；
2. 点击任意回复框（或用快捷键唤起）→ 面板出现在输入框下方；
3. Verbia 自动提取“正在回复的内容链”：帖子正文、目标评论、最多数层祖先评论；
4. 面板里可先查看上下文，再输入/说出意图 → Generate → 检查草稿 → Insert/Copy。

如果上下文识别不确定，会给出**低置信度提示**；超长内容会**按字段边界截断**并在面板标记 `truncated`。

### 5.2 Gmail Web（自动模式）

写信/回复邮件的正文编辑框位于 Gmail 的同源 iframe 中，因此扩展按 `all_frames + match_about_blank` 注入到写信帧：

1. 打开 Gmail 回复某封邮件（或新建邮件）；
2. 正文框获得焦点时自动出现 Verbia 面板（浮在编辑区上，不进入邮件正文）；
3. 回复场景自动提取“被回复邮件的引用文本”作为上下文；新建邮件为无上下文；
4. 生成、插入/追加替换逻辑与 Reddit 一致。

> 注：Gmail 页面结构与 iframe 行为可能随版本变化。识别不到引用时，当前实现会回退到编辑器内可见文字并降低上下文置信度，生成前请先检查预览。

### 5.3 Outlook Web（自动模式）

适用于 `outlook.com`、`live.com`、`office.com` 与 `office365.com` 的网页版邮件场景：

1. 新建邮件或打开回复编辑器，并让正文区域获得焦点；
2. Verbia 优先读取编辑器内可见的引用内容，回复场景也会从阅读窗格或会话区域提取当前可见邮件；
3. 在面板检查上下文，输入或说出意图，再选择输出语言、语气与长度；
4. 生成后插入或复制草稿，完成修改并由你自己点击发送。

> 注：如果 Outlook 页面结构变化或无法可靠定位上下文，Verbia 会降低置信度或退化为无自动上下文。此时可选中文字，通过右键菜单手动加入。

### 5.4 Universal Mode（其它页面）

任意普通网页/应用：

1. 聚焦一个可编辑输入框：`textarea`、单行文本框、普通 `contenteditable`；
2. 可**不带上下文**直接写意图生成；
3. 或先选中页面文字 → 右键 **“加入 Verbia 上下文”**，再聚焦输入框唤起；
4. 生成与插入逻辑同 Reddit。

复杂富文本编辑器（部分 WebMail/在线文档等）如果不能可靠定位插入点，会退化为“Copy 到剪贴板手动粘贴”。

> 规则：Verbia 只有在聚焦编辑器或被主动唤起后才读取当前编辑器；手动加入的上下文只有你选中并主动添加的内容。

---

## 6. 上下文（Context）机制与当前限制

**组成方式**
- Reddit 自动上下文：帖 + 目标评论 + 祖先链；
- Gmail / Outlook 自动上下文：当前写信或回复场景中的可见邮件文字；
- 手动选择文本（右键加入）；
- 也可以完全没有上下文（“直接写我的意思”）。

**面板行为**
- 生成前可展开预览、移除某段或全部上下文；
- 系统消息与上下文截断/低置信度均有类型化提示（图标 + 颜色）。

**当前限制（重要）**
- 上下文目前**仅支持纯文本**；
- 有字符预算与截断保护（手动选中上限 `MAX_SELECTION_LENGTH = 8000`，超长按字段边界截断）；
- **图片、视频等多媒体上下文暂不支持**，为未来能力（如 X 等平台的图文推文）。

---

## 7. 意图输入：打字或语音

- **打字**：用自己最舒服的语言写想表达的意思（不是写 prompt）。
- **语音**：点击麦克风，用浏览器语音识别（Web Speech）把你的话转成 Intent；语音语言可在设置页“Voice language”指定（仅用于识别，最终草稿语言不受它限制）。
- 可再选择：输出语言、语气（Tone）、长度（Length）——设置页可配置默认值，面板也能临时调整（是否在面板显示这些控件可在设置里开关）。

---

## 8. 生成、草稿与插入

请求流程：
- 前端发起后若超时会取消（网关整体也有超时/多模型容错）；
- 返回的总是**草稿**，先展示、可编辑、可重新生成；
- “复制”复制到剪贴板；“插入”写入目标输入框；
- 若目标输入框已有内容，会要求你选择**追加或替换**；
- Verbia **不会点击任何发送/提交按钮**。

---

## 9. 快捷键

默认（可在浏览器内自定义）：
- Windows/Linux：`Alt+Shift+Y`
- macOS：`⌥⇧Y`（即 `Alt+Shift+Y`；Chromium 在 macOS 上把 `Alt` 视作 Option 键）

自定义：`chrome://extensions` → 左下角“键盘快捷键”（插件 options 页也有“Open shortcut settings”入口）。
说明文字（“唤起回复面板”等）在 popup 与 options 中会按当前实际绑定实时显示（由 `chrome.commands.getAll()` 读取）；按键符号**按平台区分**——macOS 显示 `⌘⇧⌥⌃` 字形，Windows/Linux 显示 `Ctrl` / `Alt` / `Shift` 文字（实现在 `apps/extension/src/ui/shortcut.ts`）。

> 注意两点：① **修改建议快捷键只对全新安装生效**，已安装用户的绑定不会被改动；② Chromium 在建议快捷键与其它扩展或系统快捷键冲突时会**静默留空**，不报错——所以用户装完后可能看到“未设置”，需要在上面那个页面手动设置一次。

---

## 10. 账号、配额与 Premium

- 用量在插件 Account 卡与官网 `/account` 展示（used/limit + 重置时间）。
- 配额为服务端逻辑：登录请求起草时调用一次 `consume_generation_quota`，在数据库事务内判断套餐并计数；网关当前配置 `FREE_DAILY_QUOTA=10`，Premium 更高（100），额度到 UTC 每天 0 点重置、不结转。
- **升级 Premium**：popup/options 免费用户的升级入口会打开官网首页价格区 `#pricing`；结账由官网调用网关 `/v1/billing/checkout` → Waffo 托管收银台（按月/按年）完成；支付后通过 Webhook 自动开通，Account 卡显示 Premium 徽标。
- 账号套餐判定依赖 Waffo 订阅订单状态（active/canceling）；取消/欠费后回到免费版。

---

## 11. 设置项一览（options）

- **回复面板设置**：输出语言 / 语气 / 长度 / 语音语言；是否在面板显示语言、语气、长度控件；
- **默认展开上下文预览**；
- **界面语言**：en / 中文（跟随浏览器或手动指定）；
- **界面与隐私**：仅元数据诊断开关（默认关，只可能上报运行指标、不含正文）；
- **高级设置（可折叠）**：重置设置；
- **开发者设置（仅开发构建）**：后端 URL 可编辑；**发布构建不含此模块**，后端固定生产地址。

---

## 12. 隐私与数据边界（摘要）

- 只有你主动唤起后，插件才读取当前编辑器与相关可见上下文；
- Reddit 只读取当前回复所需的帖/评论链；Gmail / Outlook 只读取当前写信或回复场景所需的可见邮件文字；Universal 只读取你选中的文本；
- 上下文与 Intent 仅在你点 Generate 时发给后端；
- 草稿只展示/由你插入；偏好设置存本地；
- 正文不用于分析，不保存页面上下文/Intent/转写/草稿/音频；
- 官网接入 GA 仅统计匿名访问指标。

---

## 13. 已知限制与路线图

- **自动适配范围**：当前支持 Reddit、Gmail Web 与 Outlook Web；下一个目标是 X（Twitter）（通过新增 adapter 扩展，见 14 节代码结构）。
- **上下文媒体类型**：暂只支持纯文字；图片/视频为未来目标。
- **编辑器兼容性**：复杂富文本编辑器可能退化为手动复制。
- **语音输入**：依赖浏览器/系统语音识别能力。
- **浏览器分发**：Chrome 已上架；Edge / Firefox 商店待发布（`install-link.tsx` 已预留常量）。
- **支付地区/币种**：当前收银台以 USD 计价，国际卡 / Apple/Google Pay；微信支付/支付宝与中国大陆 CNY 计价需 Waffo 侧开放本地支付能力。
- Reddit DOM 变更频繁，线上以大版本回归测试为准。

---

## 14. 面向 AI Agent：机制与代码索引

> Agent 阅读本手册后，应先定位以下目录再动手，遵守产品边界（不自动发送、不改隐私语义）。

### 扩展（`apps/extension/`）
| 路径 | 职责 |
|---|---|
| `src/background/index.ts` | 常驻逻辑：消息路由、生成请求、用量快照、401 刷新后登出、Supabase 回跳 code 捕获、右键菜单 |
| `src/content/adapters/reddit.ts` | Reddit 自动适配：回复框定位、帖/评论链上下文提取 |
| `src/content/adapters/gmail.ts` | Gmail 写信 iframe 内编辑器定位与引用邮件上下文提取（`all_frames + match_about_blank`，仅写信帧激活） |
| `src/content/adapters/outlook.ts` | Outlook 网页版编辑器定位，以及阅读窗格/会话区域的可见邮件上下文提取 |
| `src/content/adapters/universal.ts` | 通用模式：编辑器定位与无站点适配 |
| `src/content/editor/editable.ts` | 可编辑目标封装（textarea/input/contenteditable 插入、追加/替换） |
| `src/content/ui/panel.ts` | 回复面板 UI 与交互（HTML 模板内联样式 + 渲染） |
| `src/content/index.ts` | 内容脚本入口、消息桥接；被重新注入时清理旧实例遗留的面板并接管 |
| `src/background/migrate.ts` | 扩展更新后为所有已打开标签页换上新内容脚本（Chrome 不会卸载旧实例，只会切断它的扩展绑定） |
| `src/runtime.ts` | chrome.* 安全层：上下文失效时降级而不是抛出（内容脚本在扩展更新后会变成孤儿） |
| `src/popup/` `src/options/` | popup 与设置页（Account/额度/升级/快捷键/加载态等） |
| `src/ui/message.ts` | 面板系统消息（类型化图标/颜色） |
| `src/ui/shortcut.ts` | 快捷键展示（popup + options 共用）：平台感知的按键字形 + 两种返回形态的拆分 |
| `src/auth/supabase.ts` | PKCE 客户端 + chrome.storage 会话适配器 + local-scope 登出 |
| `manifest.json` | 命令 `open-verbia`（默认 `Alt+Shift+Y`，macOS 上即 `⌥⇧Y`）；`web_accessible_resources` 需列出注入页面会请求的资源（如 `icons/*.svg`、`assets/*`） |

### 共享包（`packages/shared/`）
| 路径 | 职责 |
|---|---|
| `src/messages.ts` | 扩展内部消息类型（GET_AUTH_STATE/SIGN_OUT/GENERATE_REPLY…）与账号用量类型 |
| `src/schema.ts` | 用户设置结构、默认值、后端 base URL 常量 |
| `src/ui-strings.ts` | 所有 UI 双语文案（en/zh 对称；新增文案应加在这里） |

> 命名约定：面向用户的套餐名是 **Premium**，不是 Pro；代码内部 `plan: "pro"`/`intent=pro` 等历史标识符不可面向用户展示。

### 后端网关（`services/api/`）
| 路径 | 职责 |
|---|---|
| `src/app.ts` | HTTP 路由：`/health`、`/v1/account/usage`、`/v1/billing/checkout`、`/v1/billing/webhook`、`/v1/replies:generate`；配额 gate；CORS |
| `src/auth.ts` | 使用 Supabase ES256 JWKS 本地验证 Bearer JWT |
| `src/billing.ts` | Waffo Pancake 集成：创建结账会话（当前锁 USD）、订阅状态查询、Webhook 验签 |
| `src/worker.ts` | Cloudflare Worker 入口（`wrangler.jsonc` 部署） |

### 官网（`apps/web/`）
| 路径 | 职责 |
|---|---|
| `lib/verbia-auth.ts` | 纯前端 Supabase PKCE 客户端；`scope:"local"` 登出 |
| `app/account/` | 登录/登出/用量/Premium 升级（401 自动登出） |
| `components/pro-checkout.tsx` | 结账按钮（月付白 / 年付绿推荐）→ 网关 checkout |
| `components/install-link.tsx` | 商店安装链接（常量 + 浏览器自动识别） |

### 需要 Agent 遵守的关键行为
- **永不发送/提交**：任何改动不得触发网页发送动作。
- **401=登出**：用量等接口 401/403 → 先刷新一次，仍失败即本地登出。
- **配额服务端判定**：前端不要自欺显示额度，以网关返回为准。
- **会话独立**：web 与扩展登出均用 local scope，不得互相吊销。
- **UI 文案**：先看 `ui-strings.ts` 是否已有对应 key，新增需 en/zh 对称。
- **可访问资源**：新增“注入网页中加载的扩展内资源”（如 svg/图片）必须同步加进 manifest `web_accessible_resources`。
- **多平台扩展**：新增站点自动适配时，新建 `content/adapters/<site>.ts` 并注册到内容脚本入口，同时补充对应 host 权限说明与测试。

---

## 15. 常见问题（FAQ 速查）

- **为什么没自动出现面板？** 确认已聚焦 Reddit 回复框、Gmail / Outlook 写信或回复编辑器，或其它网页中的可编辑框；检查快捷键绑定（见 9）。两种情况需要额外一步：① 面板曾在该输入框上被手动关闭——按快捷键重新唤起即可（自动弹出不会替你把关掉的面板叫回来）；② 刚更新（或在 `chrome://extensions` 重载）过扩展——已打开的页面里旧的内容脚本会失效。正常情况下扩展会在更新时**自动为这些页面换上新实例**，你不需要做任何事；只有极少数情况（更新时该页面无法被注入）才会看到「Verbia 已更新，刷新本页面后可继续使用」，此时刷新页面即恢复；按快捷键时若无法注入，只会在工具栏图标上出现一个红色 `!` 与提示文案。
- **为什么要求登录？** 线上启用 `AUTH_REQUIRED`；登录用 Google/Magic Link（见 4）。
- **额度今天用完怎么办？** 明天 UTC 0 点重置，或升级 Premium（见 10）。
- **能翻译整页/长文吗？** 不能：Verbia 面向“正在回复的这一条”，上下文按字段边界截断，不做整页处理。
- **会替我发送吗？** 永远不会（见 1）。
