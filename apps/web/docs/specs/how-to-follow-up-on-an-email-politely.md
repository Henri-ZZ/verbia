# Page Specification: How to Follow Up on an Email Politely

## 1. 页面身份

| 字段 | 内容 |
|---|---|
| Page name | How to Follow Up on an Email Politely |
| Status | ready_local |
| Intent owner | `/how-to-follow-up-on-an-email-politely/` |
| Target market/language | United States / English |
| Cluster | C1 — Email Replies & Follow-Ups |
| Planned publish batch | Top 10 · Stage 4A · #8 |

## 2. Intent 与证据

**Intent brief：** 用户希望继续一段已有邮件交流，可能是补充承诺的信息、支持正在进行的决定，或按约定时间重新联系；对方未回复不是必要条件。

**Primary keyword：** `how to follow up on an email politely`

**Search intent：** mixed（how-to + examples）

| Query/evidence | Volume | KD | CPC | Evidence type | Source/date |
|---|---:|---:|---:|---|---|
| How to Follow Up on an Email Politely | US 170 / Global 410 | 31 | $0 | semrush_keyword_demand | v3 roadmap / 2026-09-12 |
| Reddit #1；另有 Daylite、Exclaimer、LiveAgent、Adobe、Quora | — | — | — | competitor_ranking | v3 roadmap / 2026-09-12 |
| Fyxer 分开 generic follow-up 与 no-response URL | — | — | — | competitor_architecture | v3 roadmap / 2026-09-12 |

## 3. URL Governance

| 字段 | 内容 |
|---|---|
| Final slug | `/how-to-follow-up-on-an-email-politely/` |
| Intent owner | Generic polite email follow-up that continues an existing conversation |
| Self-canonical | `https://verbia.henriz.dev/how-to-follow-up-on-an-email-politely/` |
| Included variants | deliver promised information、check an acknowledged active decision、reconnect at agreed timing |
| Explicitly excluded intents | no-response follow-up、known-action reminder、payment request、meeting/interview-specific follow-up |
| Redirects required | none |

**Cannibalization conclusion：** 本页是 generic follow-up 父级 intent，但不把“沉默”作为必要条件。No-response、reminder 和 payment 均有改变答案结构的明确触发条件，保留各自 owner。

## 4. Metadata 与首屏

| 字段 | 内容 |
|---|---|
| SEO title | How to Follow Up on an Email Politely \| Verbia |
| Meta description | Learn how to follow up on an email politely, with examples for sharing promised information, checking progress, and reconnecting at the right time. |
| H1 | How to follow up on an email politely |
| Canonical | `/how-to-follow-up-on-an-email-politely` |
| Schema | FAQPage，与可见 FAQ 共用数据 |

首屏直接回答：引用此前交流，说明现在联系的有用原因，添加新信息或承认已有进展，并提供一个清晰下一步。

## 5. Contextual Demo 与页面结构

交互情境：发送承诺的 case study、对方已确认内部评估后检查进展、按对方要求在九月重新联系。三例均不依赖“未回复”或“已逾期任务”。

页面包括：直接答案、四步结构、交互 demo、有用 follow-up 与反例、Gmail/Outlook、相关 intent owner 对比、FAQ、安装 CTA。

## 6. Product Truth 与 Internal Links

- 自动模式只声明 Gmail/Outlook web；用户用任意语言表达 intent，审阅后自行发送。
- 不暗示自动 follow-up、定时发送、打开/回复追踪。
- 每天 10 次免费生成；CTA 自动识别 Chrome/Edge。
- 内链：`/follow-up-email-after-no-response/`、`/how-to-remind-someone-politely-in-an-email/`、`/how-to-ask-for-payment-politely/`、`/ai-email-reply-generator/`、Gmail 与 Outlook 页面。

## 7. QA

- [x] 唯一 title、description、H1、self-canonical、FAQ schema 与 sitemap。
- [x] 语义化 button、`aria-pressed`、focus、无 JS 默认内容。
- [x] 320px、390px 与桌面端无横向溢出。
- [x] 控制台无 error/warning。
- [x] `pnpm web:typecheck`、`pnpm web:build`、`git diff --check`。

## 8. 发布与复盘

Publish date 与 Search Console 检查待用户部署后记录；analytics identifier：`how_to_follow_up_on_an_email_politely`。

## 9. 决策记录

| 日期 | 决策 | 原因 |
|---|---|---|
| 2026-09-13 | Generic follow-up 与 no-response 分页 | 沉默是否为主要触发会改变首屏答案、时机和措辞 |
| 2026-09-13 | 示例使用补充资料、active review、agreed reconnect | 证明 generic follow-up 并不等于催促未回复 |
