# Page Specification: How to Respond to an Interview Invitation Email

## 1. 页面身份

| 字段 | 内容 |
|---|---|
| Page name | How to Respond to an Interview Invitation Email |
| Status | ready_local |
| Intent owner | `/how-to-respond-to-an-interview-invitation-email/` |
| Target market/language | United States / English |
| Cluster | C2 — Career & Workplace Communication |
| Planned publish batch | Top 10 · Stage 3C · #7 |

## 2. Intent 与证据

**Intent brief：** 用户已经收到面试邀请，需要接受指定时间、从候选时间中选择，或保持兴趣并请求替代时间。

**Primary keyword：** `how to respond to an interview invitation email`

**Search intent：** mixed（how-to + examples）

| Query/evidence | Volume | KD | CPC | Evidence type | Source/date |
|---|---:|---:|---:|---|---|
| how to respond to an interview invitation email | US 110 / Global 790 | 13 | $0.21 | semrush_keyword_demand + competitor_ranking | v3 roadmap / 2026-09-12 |
| how to respond for an interview request | 390 | 17 | $0.09 | semrush_keyword_demand | v3 roadmap / 2026-09-12 |
| how to respond to a job interview via email | 260 | 17 | $0.24 | semrush_keyword_demand | v3 roadmap / 2026-09-12 |
| Robert Walters #1；另有 Kickresume、Indeed、Foundit、Robert Half | — | — | — | competitor_ranking | v3 roadmap / 2026-09-12 |

近义词数据只验证方向，不机械相加。

## 3. URL Governance

| 字段 | 内容 |
|---|---|
| Final slug | `/how-to-respond-to-an-interview-invitation-email/` |
| Intent owner | Accept, confirm, choose or reschedule an incoming interview invitation |
| Self-canonical | `https://verbia.henriz.dev/how-to-respond-to-an-interview-invitation-email/` |
| Included variants | accept proposed time、choose offered slot、request alternative time、clarify essential logistics |
| Explicitly excluded intents | interview thank-you、post-interview follow-up、decline interview、job offer response、general RSVP |
| Redirects required | none |

**Cannibalization conclusion：** 该页只处理面试前的邀请与排期。普通 confirmation 页处理已成立信息的闭环；感谢信与 interview follow-up 发生在面试后，应保留独立 owner。

## 4. Metadata 与首屏

| 字段 | 内容 |
|---|---|
| SEO title | How to Respond to an Interview Invitation Email \| Verbia |
| Meta description | Learn how to respond to an interview invitation email, with examples for accepting a time, choosing a slot, or requesting another time. |
| H1 | How to respond to an interview invitation email |
| Canonical | `/how-to-respond-to-an-interview-invitation-email` |
| Schema | FAQPage，与可见 FAQ 共用数据 |

首屏直接回答：感谢邀请，明确接受或提出替代，复述职位、日期、时间、时区和形式；必要信息缺失时只问一个清晰问题。

## 5. Contextual Demo 与页面结构

交互情境：接受单一时间、从时间段中选择具体 slot、拒绝原时间并给出两个替代时间。每个场景同步切换邀请内容、metadata、母语 intent、英文回复和解释。

页面包括：直接答案、四步安排结构、交互 demo、确认前核对与反例、Gmail/Outlook、招聘阶段相关页、FAQ、安装 CTA。

## 6. Product Truth 与 Internal Links

- 自动模式只声明 Gmail/Outlook web；用户用任意语言表达 intent，审阅后自行发送。
- 不暗示 Verbia 会查看日历、接受邀请、预约面试或自动发送。
- 每天 10 次免费生成；CTA 自动识别 Chrome/Edge。
- 内链：`/how-to-respond-to-a-job-offer-email/`、`/reply-to-email-confirmation/`、`/follow-up-email-after-no-response/`、`/ai-email-reply-generator/`、Gmail 与 Outlook 页面。

## 7. QA

- [x] 唯一 title、description、H1、self-canonical、FAQ schema 与 sitemap。
- [x] 语义化 button、`aria-pressed`、focus、无 JS 默认内容。
- [x] 320px、390px 与桌面端无横向溢出。
- [x] 控制台无 error/warning。
- [x] `pnpm web:typecheck`、`pnpm web:build`、`git diff --check`。

## 8. 发布与复盘

Publish date 与 Search Console 检查待用户部署后记录；analytics identifier：`how_to_respond_to_an_interview_invitation_email`。

## 9. 决策记录

| 日期 | 决策 | 原因 |
|---|---|---|
| 2026-09-13 | 接受、选时与请求替代时间合并 | 都是同一 incoming invitation 的 scheduling variants |
| 2026-09-13 | 排除 thank-you 与 post-interview follow-up | 事件阶段、目标和答案结构不同 |
