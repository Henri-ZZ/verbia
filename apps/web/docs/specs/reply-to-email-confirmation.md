# Page Specification: Reply to Email Confirmation

## 1. 页面身份

| 字段 | 内容 |
|---|---|
| Page name | Reply to Email Confirmation |
| Status | ready_local |
| Intent owner | `/reply-to-email-confirmation/` |
| Target market/language | United States / English |
| Cluster | C1/C2 — Email & Workplace Communication |
| Planned publish batch | Top 10 · Stage 2B · #4 |

## 2. Intent 与证据

**Intent brief：** 用户收到一封已经确认安排、文件或交易状态的邮件，需要判断是否回复，并以简短回应确认收到、承诺下一步或纠正错误。

**Primary keyword：** `reply to email confirmation`

**Search intent：** mixed（how-to + examples；SERP 混合）

| Query/evidence | Volume | KD | CPC | Evidence type | Source/date |
|---|---:|---:|---:|---|---|
| Reply to Email Confirmation | US 1.9K / Global 1.9K | 20 | $0 | semrush_keyword_demand | v3 roadmap / 2026-09-12 |
| confirmation email reply sample | 50 | 24 | — | competitor_ranking（Maestro #1） | v3 roadmap / 2026-09-12 |
| Reddit #1、Quora #2、Indeed #3、Fyxer #4 | — | — | — | competitor_ranking | v3 roadmap / 2026-09-12 |

## 3. URL Governance

| 字段 | 内容 |
|---|---|
| Final slug | `/reply-to-email-confirmation/` |
| Intent owner | 回应已经成立的 confirmation |
| Self-canonical | `https://verbia.henriz.dev/reply-to-email-confirmation/` |
| Included variants | acknowledge receipt、confirm a requested next step、correct a confirmed detail |
| Explicitly excluded intents | RSVP/决定是否参与、confirm participation、面试邀请、meeting invitation、发送 confirmation email |
| Redirects required | none |

**Cannibalization conclusion：** 本页回答接收方如何处理“已经确认”的信息。`/confirm-participation-by-email/` 和未来 RSVP 页涉及尚未确定的参与决定，不能与本页并存为近义模板页；上线前需再次检查 SERP，必要时合并到一个 owner。

## 4. Metadata 与首屏

| 字段 | 内容 |
|---|---|
| SEO title | Reply to an Email Confirmation: Examples \| Verbia |
| Meta description | Learn when and how to reply to a confirmation email, with examples for acknowledging details, confirming a next step, and correcting information. |
| H1 | How to reply to an email confirmation |
| Canonical | `/reply-to-email-confirmation` |
| Schema | FAQPage，与可见 FAQ 共用数据 |

首屏直接回答何时需要回复：对方明确要求确认、用户需要承诺下一步或关键信息错误；明确无须回复的自动回执通常不回复。

## 5. Contextual Demo 与页面结构

交互情境：简单确认收到、确认签署下一步、纠正 2:00/3:00 p.m. 时间冲突。每个场景同步切换 confirmation、母语 intent、自然回复、解释和状态。

页面包括：直接答案、判断步骤、交互 demo、何时回复/暂停、Gmail/Outlook、相关页、FAQ、安装 CTA。

## 6. Internal Links

- `/ai-email-reply-generator/`：通用邮件产品 owner。
- `/how-to-respond-to-a-job-offer-email/`：职业决定后的确认相邻任务。
- `/follow-up-email-after-no-response/`：未收到 confirmation 的相邻任务。
- `/gmail-ai-reply-assistant/`、`/outlook-ai-reply-assistant/`：已上线自动模式。
- 不渲染尚未上线的 RSVP、participation 或 interview invitation 链接。

## 7. Product Truth 与 QA

- [x] 自动模式仅声明 Gmail/Outlook web。
- [x] 用户用任意语言表达 intent；输出可为任意语言。
- [x] 用户审阅并自行发送；不暗示自动确认或自动回复。
- [x] 每天 10 次免费生成；CTA 自动识别 Chrome/Edge。
- [x] 提醒用户核对日期、时间与下一步，避免确认错误事实。
- [x] 唯一 title、description、H1、self-canonical、FAQ schema 与 sitemap。
- [x] 语义化 button、`aria-pressed`、focus、无 JS 默认内容。
- [x] 320px 至桌面无横向溢出。
- [x] `pnpm web:typecheck`、`pnpm web:build`、`git diff --check`。

## 8. 发布与复盘

Publish date 与 Search Console 检查待用户部署后记录；analytics identifier：`reply_to_email_confirmation`。

## 9. 决策记录

| 日期 | 决策 | 原因 |
|---|---|---|
| 2026-09-13 | 本页限定为已成立 confirmation 的接收方回应 | 解决混合 SERP 下的清晰 communication job |
| 2026-09-13 | RSVP、参与确认和面试邀请排除 | 这些任务需要用户作决定，答案结构不同 |
