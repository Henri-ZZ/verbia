# Verbia Brand

品牌文案的唯一来源。任何对外、对内的表述都以本文件为准，不要在各处另起一套说法。

## 1. 三层文案体系

| 层级 | 英文原句 | 官方中文版 | 用途 |
|---|---|---|---|
| Brand Slogan | **You mean it. Verbia says it.** | **你的想法，Verbia 帮你表达。** | 品牌层。凡是界面里出现 Verbia 名称的地方，紧跟其下方都用这一句：设置页主标题、插件面板头部、README、商店列表、PRD、宣传物料。 |
| Product Tagline | **Your intent. The right words.** | **你的意图，恰如其言。** | 产品层。对外物料的副标、官网、README。**商店 Summary 不套用 Tagline**：商店的搜索、分类与审核按「说清功能」评估，`_locales/*/description` 写功能句（见 `apps/extension/docs/CHROMEWEBSTORE.md`）。 |
| Core UX Line | **Just tell me what you mean. Any language.** | **告诉我你想说什么，什么语言都可以。** | 交互层。意图输入区的引导语（面板引用 `brand.uxLine`，输入框占位文字用的是 `panel.intentPlaceholder`，两者都在 `ui-strings.ts`）。 |

三者分工固定：Slogan 表达品牌承诺，Tagline 描述产品价值，UX Line 在用户动手的那一刻给出指令。不要用 Slogan 顶替 UX Line。

界面里 Verbia 名称的正下方一律放 Slogan，顺序固定为「Verbia → Slogan → 页面/功能标题」。同一个界面只出现一句标语，不叠 Tagline。

### 双语规范

- 英文原句是准绳，中文版与其语义绑定，中英任一侧都不可脱离对方单独改写。改文案必须两侧同步并更新本表。
- **官方版本只有两种：英文原句与官方中文版。** 界面文案现覆盖 **31 种语言**（`packages/shared/src/ui-strings.ts`），除 en / zh-CN 之外的 29 种都是**本地化译文**：它们不构成新的官方版本，也不得改动语义——Slogan 允许多种贴合的译法，但「你想说的 → Verbia 说出来」这层意思不能变（历史上 zh-TW / uk 出现过漂移，已修正）。
- 界面标语随操作界面语言：中文界面显示官方中文版，英文界面显示英文原句，其余语言显示各自译文（词典 key：`brand.slogan` / `brand.uxLine`；不存在 `brand.tagline` 这个 key，Tagline 不进入界面）。
- 品牌与产品专名在所有语言里保持拉丁原形，不翻译、不音译：**Verbia**、Reddit、Gmail、Outlook、QQ Mail、Premium、Chrome、Edge，以及 `chrome://extensions/shortcuts` 这类地址。
- 静态物料随浏览器语言：manifest 的 name / description / 工具栏提示由 `_locales/<locale>/messages.json` + `__MSG_` 提供，目前覆盖 **22 个 locale**。新增的 9 种界面语言**暂未提供 `_locales`**（商店未上线，先不做），因此这些语言的扩展名与工具栏提示会回落到默认语言——界面内文案不受影响。
- 中文文档正式引用时写英文原句，可括注官方中文版，例如：*You mean it. Verbia says it.*（官方中文：你的想法，Verbia 帮你表达。）。文档的日常叙述可以用其它口语化说法，但正式标语必须是上表中的原句。
- 简繁共用同一句官方中文，按字形转写、不改词：zh-TW 用「你的想法，Verbia 幫你表達。」。

## 2. 语气

- 克制、直接，句子短。
- 讲事实，不夸张。不说“完美”“一键”“无脑”。
- 承认边界：Verbia 只生成草稿，用户自己发送。任何文案都不暗示“替你发出”。
- 不承诺语气或文化的完全准确，只承诺“给出可编辑的自然草稿”。

## 3. 品牌边界

Verbia 只做生成、预览、复制和插入草稿，绝不替用户点击发送或提交。这条边界是产品红线，所有文案都要与之一致。当文案里的“帮你”可能被理解为接管发送权时，正文里必须紧跟一句澄清，例如“Verbia never sends”。

中文 Slogan「你的想法，Verbia 帮你表达。」里的“帮你表达”只指在面板内产出可编辑草稿，不指发送。回复面板底部常驻脚注（词典 key `panel.foot`，当前英文 *Verbia never sends for you.*、中文「Verbia 从不替你发送。」），设置页「Privacy by design」段含“绝不点击发送按钮”声明（`settings.privacyBody`），因此这两处标语不必另加澄清；标语若用于不带任何解释文字的纯物料（如宣传图），必须随附 “Verbia never sends” 澄清。

## 4. Logo

圆角方形图标使用薄荷绿至青蓝色渐变底，两片白色与浅青色叶片组成 V。横向 Logo 由图标、深色 Verbia 字标和右上角绿色装饰线组成。

| 元素 | 值 |
|---|---|
| 渐变起点 | `#63EDA2` |
| 渐变中段 | `#20DDB9` |
| 渐变终点 | `#29BEE5` |
| 叶片主色 | `#FFFFFF` |
| 字标颜色 | `#121820` |

- 扩展图标源文件：`apps/extension/icons/icon.svg`
- 扩展图标：`apps/extension/icons/icon{16,32,48,128,512}.png`
- 扩展横向 Logo：`apps/extension/icons/verbia-horizontal-logo.svg`
- 官网图标：`apps/web/public/verbia-mark.svg`
- 官网横向 Logo：`apps/web/public/verbia-horizontal-logo.svg`

使用规则：优先直接使用以上正式资源，不改变渐变、叶片比例、圆角或字标。小尺寸（16/32）只用图标，不加文字；横向空间充足时使用完整横向 Logo。

## 5. 变更记录

| 日期 | 变更 |
|---|---|
| 2026-09-15 | 界面语言扩到 **31 种**（新增 Filipino / Română / Magyar / Ελληνικά / עברית / Svenska / Dansk / Norsk / Suomi）；RTL 语言增至两种（ar / he）。修正 zh-TW 与 uk 的 Slogan 语义漂移（原译分别为“你说得对，Verbia 也这么认为”“您说得对，Verbia 予以确认”），pl / th 措辞一并收紧。 |
| 2026-09-15 | 明确「官方版本只有 en / zh-CN，其余 29 种是译文」的边界，并补上专名保持拉丁原形的规则（见 §1 双语规范）。 |
| 2026-09-15 | 商店文案：Description **去掉版本号**（不再随每次发版改动），浏览器支持句改为 “Chrome and Microsoft Edge; Firefox support is in the works”；Summary 明确不套用 Tagline（见 §1）。 |
| 2026-09-15 | AI 识别入口改为「AI 识别当前邮件上下文 / Let AI identify this email」，按钮下常驻“消耗 1 次每日额度”说明；低置信度提示按来源拆成两句（适配器自动识别 vs AI 识别结果）。 |
| 2026-09-09 | 更新为当前薄荷绿至青蓝色叶片 V Logo，并将正式资源统一到官网和扩展目录。 |
| 2026-09-04 | 确立三层文案体系与 logo 规范，同步至 README、商店列表、PRD 与插件 UI。 |
| 2026-09-04 | 确立三层文案官方中文版与双语规范：界面随操作界面语言（词典 `brand.*`），manifest 等静态物料随浏览器语言（`_locales`）。 |
