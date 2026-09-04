# Verbia Brand

品牌文案的唯一来源。任何对外、对内的表述都以本文件为准，不要在各处另起一套说法。

## 1. 三层文案体系

| 层级 | 英文原句 | 官方中文版 | 用途 |
|---|---|---|---|
| Brand Slogan | **You mean it. Verbia says it.** | **你的想法，Verbia 帮你表达。** | 品牌层。凡是界面里出现 Verbia 名称的地方，紧跟其下方都用这一句：设置页主标题、插件面板头部、README、商店列表、PRD、宣传物料。 |
| Product Tagline | **Your intent. The right words.** | **你的意图，恰如其言。** | 产品层。商店短描述、manifest description、对外物料的副标。 |
| Core UX Line | **Just tell me what you mean. Any language.** | **告诉我你想说什么，什么语言都可以。** | 交互层。意图输入区的引导语。 |

三者分工固定：Slogan 表达品牌承诺，Tagline 描述产品价值，UX Line 在用户动手的那一刻给出指令。不要用 Slogan 顶替 UX Line。

界面里 Verbia 名称的正下方一律放 Slogan，顺序固定为「Verbia → Slogan → 页面/功能标题」。同一个界面只出现一句标语，不叠 Tagline。

### 双语规范

- 英文原句是准绳，中文版与其语义绑定，中英任一侧都不可脱离对方单独改写。改文案必须两侧同步并更新本表。
- 界面标语随操作界面语言：中文界面显示中文版，英文界面显示英文原句（词典 key：`brand.slogan` / `brand.tagline` / `brand.uxLine`）。
- 静态物料随浏览器语言：manifest 的 name/description/title 类字段通过 `_locales` + `__MSG_` 提供 en / zh_CN 两版（`apps/extension/_locales/`）。
- 中文文档正式引用时写英文原句，可括注官方中文版，例如：*You mean it. Verbia says it.*（官方中文：你的想法，Verbia 帮你表达。）。文档的日常叙述可以用其它口语化说法，但正式标语必须是上表中的原句。

## 2. 语气

- 克制、直接，句子短。
- 讲事实，不夸张。不说“完美”“一键”“无脑”。
- 承认边界：Verbia 只生成草稿，用户自己发送。任何文案都不暗示“替你发出”。
- 不承诺语气或文化的完全准确，只承诺“给出可编辑的自然草稿”。

## 3. 品牌边界

Verbia 只做生成、预览、复制和插入草稿，绝不替用户点击发送或提交。这条边界是产品红线，所有文案都要与之一致。当文案里的“帮你”可能被理解为接管发送权时，正文里必须紧跟一句澄清，例如“Verbia never sends”。

中文 Slogan「你的想法，Verbia 帮你表达。」里的“帮你表达”只指在面板内产出可编辑草稿，不指发送。回复面板底部常驻 “Verbia never sends or submits. You stay in control.” 脚注，设置页「Privacy by design」段含“绝不会点击发送按钮”声明，因此这两处标语不必另加澄清；标语若用于不带任何解释文字的纯物料（如宣传图），必须随附 “Verbia never sends” 澄清。

## 4. Logo

四笔错位叠放的深 V（错版描边），圆头笔画，米白底。

| 元素 | 值 |
|---|---|
| 深墨绿（前层） | `#33604E` |
| 鼠尾草绿（中层） | `#7FA28D` |
| 浅灰绿（后层） | `#C7D5C4` |
| 米白底 | `#F2EDE2` |

- 源文件：`brand/verbia-logo.svg`
- 图标：`brand/icons/icon{16,32,48,128,512}.png`
- 重绘脚本：`brand/render_icons.py`（改配色或笔画粗细后重跑即可）

使用规则：logo 四周留白不小于笔画宽度的二分之一；不要给笔画加渐变、阴影或描边；不要在深绿以外的色相上重绘 V；小尺寸（16/32）只用图标，不加文字。

## 5. 变更记录

| 日期 | 变更 |
|---|---|
| 2026-09-04 | 确立三层文案体系与 logo 规范，同步至 README、商店列表、PRD 与插件 UI。 |
| 2026-09-04 | 确立三层文案官方中文版与双语规范：界面随操作界面语言（词典 `brand.*`），manifest 等静态物料随浏览器语言（`_locales`）。 |
