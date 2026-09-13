# Page Specification: How to Remind Someone Politely in an Email

## 1. 页面身份

| 字段 | 内容 |
|---|---|
| Page name | How to Remind Someone Politely in an Email |
| Status | ready_local |
| Intent owner | `/how-to-remind-someone-politely-in-an-email/` |
| Target market/language | United States / English |
| Cluster | C1/C3 — Email / Delicate Communication |
| Planned publish batch | Top 10 · Stage 3A · #5 |

## 2. Intent 与证据

**Intent brief：** 对方已答应、被要求或按计划应完成一个明确动作，用户需要在截止日前、当天或逾期后礼貌提醒。

**Primary keyword：** `how to remind someone politely in an email`

**Search intent：** mixed（how-to + examples）

| Query/evidence | Volume | KD | CPC | Evidence type | Source/date |
|---|---:|---:|---:|---|---|
| How to Remind Someone Politely in Email | US 880 / Global 980 | 19 | $0 | semrush_keyword_demand | v3 roadmap / 2026-09-12 |
| how to send a nice reminder email | 260 | 23 | — | competitor_ranking（Maestro #1） | v3 roadmap / 2026-09-12 |
| Reddit #1；另有 Hello Bonsai、SalesHandy、Salesbread、Flowlu、Smartlead、Fyxer | — | — | — | competitor_ranking | v3 roadmap / 2026-09-12 |

## 3. URL Governance

| 字段 | 内容 |
|---|---|
| Final slug | `/how-to-remind-someone-politely-in-an-email/` |
| Intent owner | Remind someone about a known, expected action |
| Self-canonical | `https://verbia.henriz.dev/how-to-remind-someone-politely-in-an-email/` |
| Included variants | upcoming deadline、due today、overdue action、request an updated date |
| Explicitly excluded intents | generic follow-up、以未回复为主要触发、payment reminder、正式争议、自动定时提醒 |
| Redirects required | none |

**Cannibalization conclusion：** reminder 的必要条件是明确 expected action；generic follow-up 不要求承诺或期限；no-response 以沉默为触发；payment 以金额/发票为必要对象，因此四者各有 owner。

## 4. Metadata 与首屏

| 字段 | 内容 |
|---|---|
| SEO title | How to Remind Someone Politely in an Email \| Verbia |
| Meta description | Learn how to send a polite email reminder, with clear examples for an upcoming deadline, a due-today task, and an overdue action. |
| H1 | How to remind someone politely in an email |
| Canonical | `/how-to-remind-someone-politely-in-an-email` |
| Schema | FAQPage，与可见 FAQ 共用数据 |

首屏直接说明：指出明确动作和约定时间，说明真实依赖，给出容易回答的下一步；逾期后询问状态或现实的新日期。

## 5. Contextual Demo 与页面结构

交互情境：截止日前提醒、当天提醒、逾期提醒。上下文分别使用 copy review、launch approval 和 revised files，避免三个示例只是同义改写。每个情境同步切换原邮件、时点、母语 intent、英文回复与解释。

页面包括：直接答案、四项结构、交互 demo、专业语气与反例、Gmail/Outlook、相关 owner 对比、FAQ、安装 CTA。

## 6. Internal Links

- `/follow-up-email-after-no-response/`：沉默是主要触发时使用。
- `/how-to-ask-for-payment-politely/`：发票或金额是核心对象时使用。
- `/reply-to-email-confirmation/`：需要对已经确认的信息闭环时使用。
- `/ai-email-reply-generator/`：通用邮件产品 owner。
- `/gmail-ai-reply-assistant/`、`/outlook-ai-reply-assistant/`：已上线自动模式。

## 7. Product Truth 与 QA

- [x] 自动模式仅声明 Gmail/Outlook web。
- [x] 任意语言表达 intent；示例英文不限制输出语言。
- [x] 用户审阅并自行发送；没有自动发送、定时发送或自动追踪暗示。
- [x] 每天 10 次免费生成；CTA 自动识别 Chrome/Edge。
- [x] 唯一 title、description、H1、self-canonical、FAQ schema 与 sitemap。
- [x] 使用共享语义化 button、`aria-pressed`、focus 和无 JS 默认内容。
- [x] 320px、390px 与桌面端无横向溢出。
- [x] `pnpm web:typecheck`、`pnpm web:build`、`git diff --check`。

## 8. 发布与复盘

Publish date 与 Search Console 检查待用户部署后记录；analytics identifier：`how_to_remind_someone_politely_in_an_email`。

## 9. 决策记录

| 日期 | 决策 | 原因 |
|---|---|---|
| 2026-09-13 | deadline 前、当天、逾期作为同页 variations | 都围绕同一明确 expected action，只有时点和直接程度变化 |
| 2026-09-13 | payment reminder 保留给独立页面 | 金额、发票与支付状态改变答案结构和商业风险 |
