# Verbia SEO URL Registry

> 创建日期：2026-09-13  
> 适用市场：美国 / 英文搜索  
> 规则：一个 semantic intent 只允许一个 `owner` URL；新增或修改 URL 前必须先更新本表。

## 状态与证据

- URL 状态：`live`、`ready_local`、`spec_review`、`planned_top10`、`planned_batch2`、`planned_batch3`、`deferred`、`retired`。
- 证据类型：`semrush_keyword_demand`、`competitor_ranking`、`inference_to_validate`。
- `owner` 表示该 URL 独占主要搜索意图；其他页面只能以不同任务或平台角度辅助并内链。

## 已上线页面

| URL | Intent owner | 页面类型 | Cluster | 状态 | 备注 |
|---|---|---|---|---|---|
| `/` | Verbia 品牌与总产品定位 | Brand/Product | — | live | 中英文主页分别为 `/`、`/zh` |
| `/supported-platforms/` | Verbia 当前支持的平台与上下文模式 | Product/Directory | — | ready_local | 中英文页面分别为 `/supported-platforms`、`/zh/supported-platforms`；作为能力范围单一事实来源 |
| `/ai-reply-generator/` | 通用 AI reply generator | Product | C1/C3 | live | 不与具体 email situation 抢主意图 |
| `/ai-email-reply-generator/` | Email reply generator | Product | C1 | live | **Top 10 #10 的唯一 owner** |
| `/context-aware-reply-generator/` | Context-aware reply generator | Capability | C1/C2/C3 | live | 解释 context 能力 |
| `/multilingual-reply-generator/` | Multilingual reply generator | Capability | C1/C2/C3 | live | 解释任意输入/输出语言 |
| `/ai-browser-writing-assistant/` | AI browser writing assistant | Product | — | live | Chrome/Edge 产品承接页 |
| `/gmail-ai-reply-assistant/` | Gmail AI reply assistant | Platform | C1 | live | Gmail 自动模式已上线 |
| `/outlook-ai-reply-assistant/` | Outlook AI reply assistant | Platform | C1 | live | Outlook 自动模式已上线 |
| `/reddit-reply-generator/` | Reddit reply generator | Platform/Situation | — | live | 产品验证与演示，不作为核心 acquisition cluster |
| `/ai-reddit-assistant/` | AI Reddit assistant | Platform | — | live | 与上一页边界后续单独复核 |
| `/around-the-web/` | Verbia 被第三方收录的页面集合 | Brand/External | — | ready_local | 英文单语页面；用于承接 software directory / community 的 reciprocal link，把外链集中到一页而不是全站页脚；入口仅页脚版权行，不进主导航；收录数据维护在 `apps/web/lib/around-the-web.ts` |

## Hub 规划

保持现有根级 situation URL，不为目录整齐而迁移。Hub 负责导航和主题关系，不能复制子页面正文。

| URL | Intent owner | 状态 | 首期内容范围 |
|---|---|---|---|
| `/situations/` | Communication situation library | ready_local | 按 follow-up/remind、confirm/coordinate、career decisions 组织当前 8 个英文邮件场景 |
| `/career/` | Career & workplace communication | ready_local | 按 interview invitation、job offer response、decline 的阶段关系组织当前职业页 |

子 Hub 暂不提前创建。当前页面数量用两个高质量根 Hub 已能清楚组织；只有相关页面数量和独立导航价值足够时，才考虑 `/situations/follow-up-and-remind/`、`/career/interview/` 等 URL。

## Top 10 生产队列

| # | Owner URL | Primary intent | Cluster | Evidence | 状态 | 边界 |
|---:|---|---|---|---|---|---|
| 1 | `/follow-up-email-after-no-response/` | Follow up after an unanswered email | C1 | semrush_keyword_demand + competitor_ranking | ready_local | 不覆盖普通 follow-up、meeting 或 interview follow-up；[Page Specification](./specs/follow-up-email-after-no-response.md) |
| 2 | `/how-to-ask-for-payment-politely/` | Ask/remind someone to pay without harming the relationship | C2/C3 | semrush_keyword_demand + competitor_ranking | ready_local | 首次请求、到期/逾期提醒作为同一 payment job 的 variations；排除法律催收；[Page Specification](./specs/how-to-ask-for-payment-politely.md) |
| 3 | `/how-to-respond-to-a-job-offer-email/` | Respond to an offer before a firm rejection | C2 | semrush_keyword_demand + competitor_ranking | ready_local | 覆盖 accept、ask for time、clarify、initial negotiate；明确拒绝归 #9；[Page Specification](./specs/how-to-respond-to-a-job-offer-email.md) |
| 4 | `/reply-to-email-confirmation/` | Acknowledge or respond to a confirmation email | C1/C2 | semrush_keyword_demand + competitor_ranking | ready_local | 限定为已成立 confirmation 的接收方回应；排除 RSVP、participation 与 interview invitation；[Page Specification](./specs/reply-to-email-confirmation.md) |
| 5 | `/how-to-remind-someone-politely-in-an-email/` | Send a polite reminder about an expected action | C1/C3 | semrush_keyword_demand + competitor_ranking | ready_local | Reminder 有明确 expected action；generic follow-up 归 #8；[Page Specification](./specs/how-to-remind-someone-politely-in-an-email.md) |
| 6 | `/how-to-reply-to-a-recruiter-on-linkedin/` | Reply to a LinkedIn recruiter | C2 | semrush_keyword_demand + competitor_ranking | planned_top10 | 暂停：等待 LinkedIn 专用支持完成后再实现 |
| 7 | `/how-to-respond-to-an-interview-invitation-email/` | Accept, confirm or schedule an interview invitation | C2 | semrush_keyword_demand + competitor_ranking | ready_local | 不覆盖 thank-you 或 interview 后 follow-up；[Page Specification](./specs/how-to-respond-to-an-interview-invitation-email.md) |
| 8 | `/how-to-follow-up-on-an-email-politely/` | Generic polite email follow-up | C1 | semrush_keyword_demand + competitor_ranking | ready_local | 不以“未回复”为必要触发条件；no-response 归 #1；[Page Specification](./specs/how-to-follow-up-on-an-email-politely.md) |
| 9 | `/how-to-politely-decline-a-job-offer/` | Decline/reject/turn down a job offer | C2/C3 | semrush_keyword_demand + competitor_ranking | ready_local | 与仍在考虑的 offer response 分开；[Page Specification](./specs/how-to-politely-decline-a-job-offer.md) |
| 10 | `/ai-email-reply-generator/` | Generate a contextual email reply | C1 | semrush_keyword_demand + inference_to_validate | ready_local | 已增强现有 URL 并承接全部邮件场景；不创建 `/email-reply-generator/`；[Page Specification](./specs/ai-email-reply-generator.md) |

## Batch 2

| Owner URL | Primary intent | Cluster | Evidence | 状态 |
|---|---|---|---|---|
| `/follow-up-with-a-client-without-being-pushy/` | Client follow-up without pressure | C1/C2 | competitor_ranking | planned_batch2 |
| `/ask-for-help-politely-in-an-email/` | Ask for help by email | C2/C3 | competitor_ranking | planned_batch2 |
| `/request-something-by-email/` | General email request | C2/C3 | competitor_ranking | planned_batch2 |
| `/confirm-participation-by-email/` | Confirm attendance/participation | C1/C3 | competitor_ranking | planned_batch2 |
| `/interview-thank-you-email/` | Thank interviewer after interview | C2 | competitor_ranking | planned_batch2 |
| `/follow-up-email-after-interview/` | Follow up after interview | C2 | competitor_ranking | planned_batch2 |
| `/follow-up-email-after-meeting/` | Follow up after meeting | C1/C2 | competitor_ranking | planned_batch2 |
| `/how-to-decline-an-interview/` | Decline an interview | C2/C3 | competitor_ranking | planned_batch2 |
| `/respond-to-a-customer-complaint/` | Respond to a customer complaint | C2/C3 | semrush_keyword_demand | planned_batch2 |
| `/respond-to-a-low-salary-offer/` | Respond to a low salary offer | C2 | semrush_keyword_demand | planned_batch2 |
| `/how-to-say-no-professionally/` | Say no in a professional setting | C3 | semrush_keyword_demand | planned_batch2 |
| `/how-to-decline-a-meeting/` | Decline a meeting | C2/C3 | semrush_keyword_demand | planned_batch2 |

## Batch 3

| Owner URL | Primary intent | Cluster | Evidence | 状态 |
|---|---|---|---|---|
| `/apologize-for-a-mistake-at-work/` | Apologize for a workplace mistake | C3 | inference_to_validate | planned_batch3 |
| `/apologize-to-a-client/` | Apologize to a client | C2/C3 | inference_to_validate | planned_batch3 |
| `/apologize-for-a-late-reply/` | Apologize for replying late | C1/C3 | inference_to_validate | planned_batch3 |
| `/ask-for-a-deadline-extension/` | Request more time | C2/C3 | inference_to_validate | planned_batch3 |
| `/cancel-a-meeting-politely/` | Cancel a meeting | C2/C3 | inference_to_validate | planned_batch3 |
| `/reschedule-a-meeting-politely/` | Reschedule a meeting | C2/C3 | inference_to_validate | planned_batch3 |
| `/give-feedback-professionally/` | Give professional feedback | C2/C3 | inference_to_validate | planned_batch3 |
| `/reply-to-a-job-rejection-email/` | Reply after being rejected for a job | C2 | semrush_keyword_demand | planned_batch3 |
| `/negotiate-a-job-offer-by-email/` | Negotiate offer terms by email | C2 | inference_to_validate | planned_batch3 |
| `/reply-to-a-meeting-invitation-email/` | Reply to a meeting invitation | C1/C2 | competitor_ranking | planned_batch3 |
| `/reply-to-an-appreciation-email/` | Reply to an appreciation email | C1/C3 | competitor_ranking | planned_batch3 |
| `/write-an-email-in-english/` | Write an email in English | C1 | semrush_keyword_demand | planned_batch3 |

## 禁用、别名与迁移决策

| URL/模式 | 决策 | 目标/原因 |
|---|---|---|
| `/email-reply-generator/` | 不创建 | `/ai-email-reply-generator/` 已是唯一 owner；避免自相竞争 |
| `/respond-to-an-interview-invitation-email/` | 不创建 | 统一使用 Top 10 的 `/how-to-respond-to-an-interview-invitation-email/` |
| `/respond-to-a-job-offer-email/` | 不创建 | 统一使用 `/how-to-respond-to-a-job-offer-email/` |
| `email reply format/sample/example/template` 独立页 | 不创建 | 合并到一个 professional email reply 页面或产品页的对应 sections |
| `decline/reject/turn down/refuse` 同一对象的独立页 | 不创建 | 同一对象合并为一个 owner URL |
| 参数、tone、demo state URL | 不索引 | canonical 指向所属 situation 主 URL |

## 新 URL 审核记录模板

新增页面前，在本节追加：

| 日期 | 候选 URL | Communication job | 最接近的 owner | SERP 是否独立 | 产品能否承接 | 决策 |
|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — |
