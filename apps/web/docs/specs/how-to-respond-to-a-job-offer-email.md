# Page Specification: How to Respond to a Job Offer Email

## 1. 页面身份

| 字段 | 内容 |
|---|---|
| Page name | How to Respond to a Job Offer Email |
| Status | ready_local |
| Intent owner | `/how-to-respond-to-a-job-offer-email/` |
| Target market/language | United States / English |
| Cluster | C2 — Career & Workplace Communication |
| Planned publish batch | Top 10 · Stage 2A · #3 |

## 2. Intent 与证据

**Intent brief：** 用户已经收到具体 job offer，需要接受、请求考虑时间、澄清条款或开始协商，同时准确表达当前决定状态。

**Primary keyword：** `how to respond to a job offer email`

**Search intent：** mixed（how-to + examples）

| Query/evidence | Volume | KD | CPC | Evidence type | Source/date |
|---|---:|---:|---:|---|---|
| How to Respond to a Job Offer Email | US 390 / Global 2.4K | 22 | $0.04 | semrush_keyword_demand + competitor_ranking | v3 roadmap / 2026-09-12 |
| how to respond to job offer email | 260 | 16 | $0.26 | semrush_keyword_demand | v3 roadmap / 2026-09-12 |
| how to respond to offer letter email | 320 | 19 | $0.04 | semrush_keyword_demand | v3 roadmap / 2026-09-12 |
| Tufts #1、Indeed #2、Reddit #3，另有 Emory、SoFi、UML、Kickresume | — | — | — | competitor_ranking | v3 roadmap / 2026-09-12 |

近义词数据只用于验证方向，不机械相加。

## 3. URL Governance

| 字段 | 内容 |
|---|---|
| Final slug | `/how-to-respond-to-a-job-offer-email/` |
| Intent owner | 收到 offer 后、明确拒绝以前的回应 |
| Self-canonical | `https://verbia.henriz.dev/how-to-respond-to-a-job-offer-email/` |
| Included variants | accept、ask for time、clarify terms、initial negotiation |
| Explicitly excluded intents | decline/reject、面试邀请、rejection email、post-interview follow-up、复杂薪资谈判 |
| Redirects required | none |

**Cannibalization conclusion：** 本页是 job offer response 父级 situation。明确拒绝由 `/how-to-politely-decline-a-job-offer/` 承接；low salary 与复杂 negotiation 只有经后续 SERP 验证才拆页。

## 4. Metadata 与首屏

| 字段 | 内容 |
|---|---|
| SEO title | How to Respond to a Job Offer Email: Examples \| Verbia |
| Meta description | Learn how to respond to a job offer email when accepting, asking for time, clarifying terms, or starting a professional negotiation. |
| H1 | How to respond to a job offer email |
| Canonical | `/how-to-respond-to-a-job-offer-email` |
| Schema | FAQPage，与可见 FAQ 共用数据 |

首屏直接说明：感谢雇主，明确当前状态，引用真实职位、期限与条款；协商时保持兴趣并提出一个有依据的具体请求。

## 5. Contextual Demo 与页面结构

交互情境：接受 offer、请求考虑时间、澄清 travel 条款、提出 $125,000 初步薪资协商。每个场景同步切换 offer 内容、母语 intent、英文回复、解释与关键 metadata。

页面包括：直接答案、四步结构、交互 demo、发送前核对、能力边界、Gmail/Outlook、相关页、FAQ、安装 CTA。

## 6. Internal Links

- `/ai-email-reply-generator/`：从完整邮件上下文生成。
- `/reply-to-email-confirmation/`：offer 后续确认的相邻任务。
- `/follow-up-email-after-no-response/`：等待 offer 决定或条款回复后的跟进。
- `/gmail-ai-reply-assistant/`、`/outlook-ai-reply-assistant/`：已上线自动模式。
- 未来 `/how-to-politely-decline-a-job-offer/` 上线后增加双向链接。

## 7. Product Truth 与 QA

- [x] 自动模式仅声明 Gmail/Outlook web。
- [x] 用户用任意语言表达 intent；示例输出英文不构成语言限制。
- [x] 用户审阅并自行发送；不暗示自动申请、接受或谈判。
- [x] 每天 10 次免费生成；安装 CTA 自动识别 Chrome/Edge。
- [x] 明确 job title、salary、date 等需由用户核对。
- [x] 唯一 title、description、H1、self-canonical、FAQ schema 与 sitemap。
- [x] 语义化 button、`aria-pressed`、focus、无 JS 默认内容。
- [x] 320px 至桌面无横向溢出。
- [x] `pnpm web:typecheck`、`pnpm web:build`、`git diff --check`。

## 8. 发布与复盘

Publish date 与 Search Console 检查待用户部署后记录；analytics identifier：`how_to_respond_to_a_job_offer_email`。

## 9. 决策记录

| 日期 | 决策 | 原因 |
|---|---|---|
| 2026-09-13 | 接受、考虑时间、澄清和初步协商合并在父页 | 当前均属于收到同一 offer 后尚未拒绝的 response job |
| 2026-09-13 | 明确 decline 不纳入 | 决定与答案结构显著不同，路线图已规划独立 owner |
