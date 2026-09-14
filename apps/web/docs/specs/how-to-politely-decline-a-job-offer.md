# Page Specification: How to Politely Decline a Job Offer

## 页面身份

| 字段 | 内容 |
|---|---|
| Status | ready_local |
| Intent owner | `/how-to-politely-decline-a-job-offer/` |
| Target market/language | United States / English |
| Cluster | C2/C3 — Career & Delicate Communication |
| Planned publish batch | Top 10 · Stage 4B · #9 |

## Intent 与 URL Governance

用户已作出不接受 offer 的最终决定，需要清晰、礼貌地结束招聘流程。主词为 `how to politely decline a job offer`，并聚合 decline、reject、turn down、refuse 等同义表达；路线图记录的近义词数据只用于验证需求，不机械相加。

- Self-canonical：`https://verbia.henriz.dev/how-to-politely-decline-a-job-offer/`
- 包含：接受其他职位、岗位/条款不合适、考虑后退出。
- 排除：接受、请求时间、澄清、仍在协商；这些由 `/how-to-respond-to-a-job-offer-email/` 承接。
- Schema：FAQPage，与可见 FAQ 共用数据。

## 页面与示例

首屏直接回答如何拒绝，随后给出四步结构、三个可切换真实情境、发送前检查、表达禁区、Gmail/Outlook 使用方式、相关页、FAQ 和安装 CTA。示例强调决定明确、理由简短、不批评雇主，并提示已接受后退出时应检查已签协议。

## 内链

- 与 `/how-to-respond-to-a-job-offer-email/` 双向链接并明确决策边界。
- 链接 `/ai-email-reply-generator/`、interview invitation、generic follow-up、Gmail 和 Outlook 页面。
- 收录于页脚和 sitemap，并由 Email Reply Generator 产品入口链接。

## Product Truth 与 QA

- [x] 自动模式仅声明 Gmail/Outlook web；用户用任意语言表达 intent。
- [x] 每天 10 次免费生成；用户审阅并自行发送。
- [x] 唯一 title、description、H1、canonical 和 FAQ schema。
- [x] 交互控件具备语义与无 JS 默认内容。
- [x] typecheck、production build、diff check 与 320px 至桌面视觉 QA。

Publish date 与 Search Console 数据待用户部署后记录；analytics identifier：`how_to_politely_decline_a_job_offer`。

