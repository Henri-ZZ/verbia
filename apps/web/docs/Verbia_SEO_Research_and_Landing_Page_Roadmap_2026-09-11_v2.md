# Verbia SEO Research & Landing Page Roadmap v2

> **Status:** SEO Master / Single Source of Truth  
> **Date:** 2026-09-11  
> **Market:** United States / English search  
> **Supersedes:** 2026-09-11 下午旧版（旧文件在本工作区不可访问；本文是完整替代版，不是对旧文件的原位修改）  
> **Audience:** Verbia 团队、Codex、其他 Agent、内容与产品执行者

---

## 0. Executive Summary

Verbia 的 SEO 不应围绕一个尚未形成稳定搜索需求的新品类词（如 `AI Reply Assistant for non-native English speakers`），也不应模仿 broad AI keyword land-grab。今天的 Semrush 关键词需求研究与竞品真实排名共同支持一条更清晰的路线：

> **用具体 communication situation 获取搜索用户，用产品化页面现场完成从 intent 到自然回复的体验，再转化到 Chrome extension。**

核心模型：

> **Fyxer Intent Architecture + Maestro Communication Situation Library + HIX Productized SEO + Verbia Contextual Intent-to-Reply Experience**

Indeed 不是产品模板，而是 **Career & Workplace Communication 的 SERP / intent validation benchmark**。

三大 Cluster：

1. **Cluster 1 — Email Reply & Response（P0）**
2. **Cluster 2 — Career & Workplace Communication（P0）**
3. **Cluster 3 — Delicate Communication / What to Say / Communication Situations（P1）**

必须长期遵守的架构规则：

1. **Same semantic intent → one strong URL.**
2. **Different communication situation → separate URLs.**
3. **Situation first, channel second.**
4. **Audience noun ≠ SEO intent.**
5. **Product Validation Platform ≠ SEO Acquisition Market.**
6. 新站按 **Bottom/high-product-fit → middle funnel → broad informational** 扩展。
7. 早期暂不做 Gmail archive、CC/BCC、email troubleshooting 等宽泛上游内容。

第一阶段发布 **15 个强页面**，而不是批量铺几百篇文章。`generic follow-up` 与 `follow-up after no response` 必须是两个 URL。

---

## 1. Evidence Policy：证据如何记录

本文只使用三种证据类型：

| Evidence type | 含义 | 可否写 Volume/KD/CPC |
|---|---|---|
| `semrush_keyword_demand` | 今天在 Semrush Keyword Magic Tool / 已整理数据中明确看到 | 仅可写已明确记录的数字 |
| `competitor_ranking` | 今天在 Semrush Organic Rankings/Positions 中看到竞品关键词、排名和 URL | 仅可写截图/对话明确记录的数字 |
| `inference_to_validate` | 基于产品 fit、相邻关键词或竞品 URL 架构推断 | **不得**编造 Volume/KD/CPC；上线前可做 SERP/数据复核 |

补充原则：

- Semrush seed 的 `Total Volume` 常包含大量 broad-match 噪音，**不是可获得流量，也不能直接当作页面机会量**。
- 多个近义关键词的 Volume 不能机械相加，因为可能是同一人群、同一 SERP、同一 intent。
- 竞品排名证明 Google 愿意把该 intent 分配给某类 URL；它不等于 Verbia 一定能取得相同排名。
- 文中没有明确数字的候选页统一标为 `inference_to_validate`，而不是补估值。

---

## 2. Verbia 产品定位与不可违背的产品事实

### 2.1 产品定义

Verbia 的核心不是传统 rewriter，也不是自动发送工具。产品流程是：

> **native-language intent + conversation context + platform style + My Voice → natural reply**

用户可以用自己的母语表达真正想说的意思；Verbia 结合当前对话、所在平台的沟通风格与用户的 My Voice 生成自然回复。

### 2.2 用户控制与信任边界

- Verbia 生成 draft。
- 用户审阅、修改并亲自发送。
- **Never auto-send.**
- 不得为了匹配 `auto reply`、bulk outreach 或 automation 关键词，把 Verbia 描述为自动发送产品。

### 2.3 定价表述

- Free plan = **10 generations/day**。
- Verbia 是 freemium 产品，有免费额度，**不是“free tool”**。
- 可用表述：`Try Verbia with 10 free generations per day.`
- 禁止表述：`Free AI reply tool`、`Unlimited free replies`、任何暗示永久无限免费的文案。

### 2.4 产品 Roadmap 与 SEO 对齐

| Platform | 产品状态/顺序 | SEO 处理 |
|---|---|---|
| Reddit | 已完成 | 可用于产品验证与演示；不作为当前核心 SEO acquisition cluster |
| Gmail Web | 下一步 | Cluster 1/2/3 的主要产品承接平台；支持完成后强化 `/gmail` 产品页 |
| Outlook Web | Gmail 后 | 支持完成后建立对应平台页与相关内链 |
| LinkedIn | Outlook 后 | 属于 Cluster 2 的重要平台延伸；产品支持前不宣传已支持 |

**Product Validation Platform ≠ SEO Acquisition Market：** Reddit 已完成，说明它适合验证产品交互；但 `Reddit Reply` 搜索需求不足以成为核心 acquisition 方向。反过来，Gmail/Email/Career situations 搜索需求强，即使相应 adapter 尚在 roadmap 中，也应提前规划内容，但 CTA 和能力描述必须与实际上线状态一致。

---

## 3. 战略模型：四个样本各自教给 Verbia 什么

### 3.1 Fyxer：Intent Architecture

US 数据：

- **36.7K ranking keywords**
- **75.7K estimated organic traffic**
- **59.3K non-branded traffic**（约占总流量 78%）
- Traffic Cost：**$135.1K/month**（Semrush 估算）

Fyxer 验证 Cluster 1，但不应照抄其完整上游策略。

#### 一个强 URL 覆盖同一 semantic intent

Fyxer `/blog/reply-email` 同时覆盖：

| Keyword | Position | Volume | KD | Evidence |
|---|---:|---:|---:|---|
| reply email format sample | 1 | 1,000 | 28 | competitor_ranking |
| email reply format example | 1 | 1,000 | 22 | competitor_ranking |
| email reply format | 1 | 1,000 | 13 | competitor_ranking |
| short email reply sample | 6 | 1,900 | 28 | competitor_ranking |
| how to reply to an email professionally | 1 | 260 | 31 | competitor_ranking |
| example email reply | 4 | 880 | 36 | competitor_ranking |
| email reply sample | 6 | 720 | 22 | competitor_ranking |
| professional email reply | 1 | 110 | 29 | competitor_ranking |

结论：不要分别创建 `email reply format`、`email reply sample`、`professional email reply`、`short email reply sample`。它们应归入一个权威页面。

#### Follow-up 按 situation 拆 URL

Fyxer 已使用不同 URL 服务：

- generic follow-up
- follow-up after no response
- client follow-up
- follow-up after meeting
- follow-up email subject line

代表数据：

| Situation | Keyword | Volume | KD | Evidence |
|---|---|---:|---:|---|
| Generic | follow up on my previous email | 210 | 26 | competitor_ranking |
| Generic | would like to follow up on my previous email | 110 | 26 | competitor_ranking |
| No response | follow up email after no response | 1,300 | 35 | competitor_ranking |
| No response | how to politely follow up on an unanswered email | 210 | 22 | competitor_ranking |
| Client | how to follow up with a client | 90 | 28 | competitor_ranking |
| Client | how to follow up with a potential client | 90 | 17 | competitor_ranking |
| Client | how to follow up with a client without being pushy | 70 | 15 | competitor_ranking |
| After meeting | meeting follow up email example | 110 | 37 | competitor_ranking |
| After meeting | meeting follow up email template | 110 | 36 | competitor_ranking |
| After meeting | template follow up email after meeting | 110 | 31 | competitor_ranking |

#### 不学什么

Fyxer 也通过 `Google Groups`、Gmail archive、CC、email troubleshooting 等宽泛 informational 内容取得流量。这是成熟站点的上游扩张，不是 Verbia 新站的第一步。

### 3.2 Indeed：Career/Workplace Intent Validation

Indeed 的价值是验证 Google 如何拆分职业沟通任务，而不是模仿其整站内容规模。

同一 invitation-response intent 可由一个页面覆盖：

| Keyword | Indeed position | Volume | KD | Evidence |
|---|---:|---:|---:|---|
| how to respond interview request | 4 | 260 | 23 | competitor_ranking |
| how to respond interview email | 2 | 70 | 10 | competitor_ranking |
| how to respond interview invitation | 3 | 70 | 29 | competitor_ranking |

但 `interview email` 不是一个 intent：

| Situation | Keyword | Indeed position | Volume | Evidence |
|---|---|---:|---:|---|
| Invitation response | how to respond to interview email | 3 | 1,300 | competitor_ranking |
| Thank-you | thank you for the interview email | 1 | 1,900 | competitor_ranking |
| Follow-up | follow up interview email | 2 | 2,400 | competitor_ranking |
| Follow-up | after interview email follow up sample | 1 | 720 | competitor_ranking |
| Thank-you | thank you interview email | 3 | 1,900 | competitor_ranking |

结论：`interview invitation response`、`interview thank-you`、`post-interview follow-up` 是不同 intents，必须拆 URL。

`recruiter` seed 有 **6,510 个 Top-20 keywords**，但大量是 recruiter jobs、vacancies、near me 等污染项。由此写死：

> **Audience noun ≠ SEO intent.** 只有 `communication action + situation + recruiter` 才是 Verbia SEO intent。

### 3.3 Maestro Labs：Communication Situation Library

US 数据：

- **18.8K ranking keywords**
- **3.2K estimated organic traffic**
- **2.6K non-branded traffic**
- Traffic Cost：**$8.5K**（Semrush 估算）

Maestro 验证 Cluster 3，以及“一种沟通任务 = 一个页面”的 information architecture。

#### Decline 必须按对象拆分

| Situation | Maestro URL pattern | Keyword | Volume | KD | Evidence |
|---|---|---|---:|---:|---|
| Decline job offer | `/how-to/how-to-turn-down-a-job-offer` | decline work offer | 880 | 30 | competitor_ranking |
| Decline invitation | `/how-to/how-to-politely-decline-an-invitation` | how to decline invitations | 480 | 34 | competitor_ranking |
| Decline interview | `/how-to/how-to-decline-an-interview` | how do you decline an interview | 170 | 18 | competitor_ranking |

#### Reply/email 按具体任务分页

代表 URL 包括：

- `/how-to/rsvp-email`
- `/how-to/hope-you-are-well-reply`
- `/how-to/confirmation-email`
- `/how-to/how-to-reply-to-an-email-professionally-with-examples-templates`
- `/how-to/reply-to-meeting-invitation-email`
- `/how-to/how-to-write-an-email-requesting-something`
- `/how-to/asking-for-help-email`
- `/how-to/reminder-email`

代表排名：

| Keyword | Maestro position | Volume | KD | Evidence |
|---|---:|---:|---:|---|
| how to reply to an rsvp email | 1 | 170 | 17 | competitor_ranking |
| rsvp reply email | 1 | 90 | 12 | competitor_ranking |
| confirmation email reply sample | 1 | 50 | 24 | competitor_ranking |
| replying to an email professionally | 7 | 260 | 26 | competitor_ranking |
| how to send a nice reminder email | 1 | 260 | 23 | competitor_ranking |
| how to ask for help politely in an email | 2 | 390 | 23 | competitor_ranking |
| request someone to do something email | 1 | 390 | 10 | competitor_ranking |
| how to confirm participation by email | 1 | 210 | 20 | competitor_ranking |

### 3.4 HIX.AI：Productized SEO，但不模仿 land-grab

US 数据：

- **6.1K ranking keywords**
- **9.3K estimated organic traffic**
- **6.5K non-branded traffic**

与 Verbia 的 `reply / response / email / decline` 重合较弱：

| Filter | Top-20 keyword count | 判断 |
|---|---:|---|
| reply | 5 | 弱 |
| response | 2 | 很弱 |
| email | 13 | 有产品页，覆盖有限 |
| decline | 0 | 未形成 situation SEO |

HIX 的相关词大多集中在一个 AI Email Writer URL，说明产品落地页本身可以参与 SEO。值得学习的是 **interactive product landing page**；不值得学习的是 ChatGPT、QuillBot、sentence generator、rewriter 等 broad AI keyword land-grab。

---

## 4. 三个正式 Cluster

## 4.1 Cluster 1 — Email Reply & Response（P0）

**核心 JTBD：** 我收到了一封邮件；我知道自己想表达什么，但不知道怎样自然、专业、合适地回复。

子主题：

- Professional email reply
- AI/email reply generator（产品型入口）
- Generic follow-up
- Follow-up after no response
- Reminder
- Clarification
- Meeting/client/payment follow-up（后续扩展）

精选需求数据：

| Keyword | Volume | KD | CPC | Evidence |
|---|---:|---:|---:|---|
| how to respond to an email professionally | 320 | 30 | $2.88 | semrush_keyword_demand |
| how to politely follow up on an email | 210 | 28 | — | semrush_keyword_demand |
| how to politely follow up on an unanswered email | 210 | 34 | — | semrush_keyword_demand |
| how to follow up on an email politely | 170 | 31 | — | semrush_keyword_demand |
| how to follow up email politely | 140 | 28 | — | semrush_keyword_demand |
| how to follow up request on email politely | 140 | 26 | — | semrush_keyword_demand |
| how to follow up politely in email | 110 | 27 | — | semrush_keyword_demand |
| how to politely ask for clarification in email sample | 110 | 4 | — | semrush_keyword_demand |
| how to politely ask for clarification in email | 90 | 4 | — | semrush_keyword_demand |
| how to ask for clarification in email | 50 | 11 | — | semrush_keyword_demand |
| how to ask for clarification in an email | 40 | 3 | — | semrush_keyword_demand |

注意：`email reply generator`、`ai email reply generator` 等属于重要 commercial/product seeds，但本次可访问的记录中没有可靠单词级 Volume/KD/CPC，因此不得补数字。

## 4.2 Cluster 2 — Career & Workplace Communication（P0）

**核心 JTBD：** 面试官、招聘者、雇主、同事、老板或客户发来消息；用户需要在高风险职业场景中作出合适回应或请求。

内部结构：

- Interview invitation / confirmation
- Interview thank-you
- Post-interview follow-up
- Job offer response / acceptance / decline / negotiation
- Recruiter email / LinkedIn
- Ask for raise
- Ask for payment
- Feedback / criticism
- Workplace requests, reminders, meeting communication

精选需求数据：

| Keyword | Volume | KD | CPC | Evidence |
|---|---:|---:|---:|---|
| how to respond for an interview request | 390 | 17 | $0.09 | semrush_keyword_demand |
| how to respond to a job interview via email | 260 | 17 | $0.24 | semrush_keyword_demand |
| how to respond to an interview invitation email | 110 | 13 | $0.21 | semrush_keyword_demand |
| how to respond to an interview confirmation email | 70 | 7 | $0.00 | semrush_keyword_demand |
| how do you respond to a job offer email | 390 | 16 | $0.26 | semrush_keyword_demand |
| how to respond to job offer email | 260 | 16 | $0.26 | semrush_keyword_demand |
| how to respond to offer letter email | 320 | 19 | $0.04 | semrush_keyword_demand |
| how to respond to job offer | 210 | 13 | $0.10 | semrush_keyword_demand |
| how to respond to a rejection email for a job | 90 | 19 | $0.08 | semrush_keyword_demand |
| how to respond to a low salary offer | 40 | 20 | $0.00 | semrush_keyword_demand |
| linkedin ai message generator | 110 | 5 | $2.24 | semrush_keyword_demand |
| how to reply to recruiter on linkedin | 170 | 18 | $1.74 | semrush_keyword_demand |
| how to reply to linkedin recruiter | 140 | 21 | $0.07 | semrush_keyword_demand |
| how to reply to a recruiter on linkedin | 110 | 22 | $0.07 | semrush_keyword_demand |

聚合数据（用于方向判断，不用于页面流量相加）：

| Dataset | Count | Volume sum / total | Avg KD | Notes |
|---|---:|---:|---:|---|
| Interview group | 1,808 keywords | 22,610 | 22% | broad group，含重复/噪音 |
| Offer group | 1,138 keywords | 11,950 | 19% | broad group，含重复/噪音 |
| Jobs group | 1,630 keywords | 17,690 | 21% | broad group，含重复/噪音 |
| Ask for payment curated set | 26 keywords | 5,480 | 14.0 | 已初筛，强 product fit |
| Ask for raise curated set | 11 keywords | 2,900 | 28.6 | 已初筛 |
| Negative feedback curated set | 18 keywords | 3,460 | 21.9 | 已初筛 |

## 4.3 Cluster 3 — Delicate Communication / What to Say / Communication Situations（P1）

**核心 JTBD：** 用户知道自己的决定或意图，但不知道如何在敏感情境中把话说得既准确又得体。

子主题：

- Decline / Say no
- Apologize
- Follow up / Remind
- Ask / Clarify / Request help
- Negative feedback / criticism
- Meeting cancellation/reschedule/decline
- Customer complaint response（精选子簇，不单独升级为核心 Cluster）

精选需求数据：

| Keyword | Volume | KD | CPC | Evidence |
|---|---:|---:|---:|---|
| how to decline a job offer | 4,400 | 29 | — | semrush_keyword_demand |
| how to reject a job offer | 3,600 | 30 | — | semrush_keyword_demand |
| how to politely decline a job offer | 2,400 | 29 | — | semrush_keyword_demand |
| how to politely decline an invitation | 2,400 | 30 | — | semrush_keyword_demand |
| how to decline politely a job offer | 1,600 | 24 | — | semrush_keyword_demand |
| how to respectfully decline a job offer | 1,300 | 21 | — | semrush_keyword_demand |
| how to say no politely | 1,300 | 28 | — | semrush_keyword_demand |
| how to turn down a job offer | 1,300 | 25 | — | semrush_keyword_demand |
| declining a job offer | 1,000 | 20 | — | semrush_keyword_demand |
| how to refuse the job offer | 880 | 15 | — | semrush_keyword_demand |
| how to apologize | 12,100 | 29 | — | semrush_keyword_demand; broad intent |
| how to apologize to someone | 6,600 | 30 | — | semrush_keyword_demand; broad intent |
| how to apologize without saying sorry | 1,300 | 23 | — | semrush_keyword_demand |
| how to write an apology letter | 1,000 | 16 | — | semrush_keyword_demand |
| how to respond to customer complaints | 140 | 16 | $4.40 | semrush_keyword_demand |
| how to respond to a customer complaint | 50 | 16 | $4.40 | semrush_keyword_demand |
| responding to customer complaints | 50 | 16 | $7.40 | semrush_keyword_demand |
| customer service email response examples | 90 | 25 | $4.54 | semrush_keyword_demand |
| customer service email response samples | 70 | 25 | $4.54 | semrush_keyword_demand |
| customer service email sample response | 50 | 27 | $2.60 | semrush_keyword_demand |

聚合数据：

| Dataset | Count | Volume sum | Avg KD | Notes |
|---|---:|---:|---:|---|
| Reminder curated set | 19 | 11,090 | 23.9 | 已初筛；仍需按 situation 拆分 |
| Decline meeting curated set | 9 | 1,740 | 21.2 | 已初筛 |

`how to apologize professionally` seed 的 Total Volume **263,490 / Avg KD 28%**、`how to politely decline` 的 **166,330 / Avg KD 21%** 都有严重 broad-match 扩展；只作为市场规模信号，不能作为单页流量预测。

---

## 5. 被否定或重新分类的方向

| Direction | 决策 | 原因 / 数据 |
|---|---|---|
| Natural English | 品牌价值主张，不做独立 SEO cluster | `english writing assistant` 20；`ai english writing assistant` 20；直接的 non-native phrases 为 0 或极低；`natural english` intent 污染 |
| Rewriter / Sentence Rewriter | 不正面竞争 | `sentence rewriter` cluster 3,560 keywords / 810,100 total volume / Avg KD 61%；核心词 KD 70–75 左右；JTBD 偏离 |
| AI Reply Assistant 品类词 | 产品类别描述，可做品牌/产品页；不作为主要 demand engine | 直接 category demand 未形成强证据；用户更多按具体任务搜索 |
| Generic Reply Generator | 降级/谨慎 | 宽泛、场景不清、SERP 可能与模板/低质 generator 混杂 |
| Discussion / academic intent | 排除 | `discussion post generator` 等数据虽好，但主体是教育作业/学术诚信风险，不是 Verbia 核心用户 |
| Reddit Reply | 不做核心 acquisition cluster | Reddit 是已完成的产品验证平台，但搜索需求不足且偏离主商业场景 |
| Generic Message Reply | P2/长期 | 16,300 total volume / Avg KD 26%，但大量 condolence、birthday、dating、flirty 等低商业 fit |
| Customer Support templates | 只保留 complaint/angry customer 等高 fit 子场景 | canned responses、ticket closure、helpdesk automation 与 Verbia contextual reply 不完全重合 |
| Gmail archive / CC / troubleshooting | 长期 broad informational backlog | 有流量，但距离产品价值与转化太远；新站暂不做 |

`make this sound better`（Volume 5,400 / KD72 / CPC $0.45）说明 edit/rewrite 需求存在，可支持产品内 follow-up editing，但不应成为早期 SEO 主战场。

---

## 6. Batch 1：首批 15 个页面

排序逻辑：先做 product fit 高、意图明确、已有需求或竞品 URL 验证、能展示 Verbia 差异化的页面。这里的页面是 **Situation/Product Landing Pages**，不是传统博客。

| # | Cluster | Recommended title | Slug | Primary intent | Priority | Evidence |
|---:|---|---|---|---|---|---|
| 1 | C1 | Email Reply Generator — Write a Natural Reply With Context | `/email-reply-generator/` | 用上下文与真实意图生成邮件回复 | P0 | semrush_keyword_demand + product inference; 单词级指标待验证 |
| 2 | C1 | How to Reply to an Email Professionally (Examples & Contextual Generator) | `/how-to-reply-to-an-email-professionally/` | professional reply / format / sample / examples | P0 | semrush_keyword_demand + Fyxer/Maestro competitor_ranking |
| 3 | C1 | How to Follow Up on an Email Politely | `/how-to-follow-up-on-an-email-politely/` | generic email follow-up | P0 | semrush_keyword_demand + Fyxer competitor_ranking |
| 4 | C1 | Follow-Up Email After No Response | `/follow-up-email-after-no-response/` | unanswered email/no response | P0 | semrush_keyword_demand + Fyxer competitor_ranking |
| 5 | C1 | How to Ask for Clarification Politely in an Email | `/ask-for-clarification-in-an-email/` | clarification request by email | P0 | semrush_keyword_demand |
| 6 | C1/C3 | How to Send a Polite Reminder Email | `/polite-reminder-email/` | politely remind by email | P0 | semrush_keyword_demand + Maestro competitor_ranking |
| 7 | C2 | How to Respond to an Interview Invitation Email | `/respond-to-an-interview-invitation-email/` | accept/confirm/schedule interview invitation | P0 | semrush_keyword_demand + Indeed competitor_ranking |
| 8 | C2 | How to Respond to a Job Offer Email | `/respond-to-a-job-offer-email/` | respond/accept/ask time/clarify offer | P0 | semrush_keyword_demand |
| 9 | C2/C3 | How to Politely Decline a Job Offer | `/how-to-politely-decline-a-job-offer/` | decline/reject/turn down job offer | P0 | semrush_keyword_demand + Maestro competitor_ranking |
| 10 | C2 | How to Reply to a Recruiter Email | `/how-to-reply-to-a-recruiter-email/` | recruiter communication by email | P0 | inference_to_validate + Indeed architecture validation |
| 11 | C2 | How to Ask for Payment Politely | `/how-to-ask-for-payment-politely/` | payment request/reminder | P0 | semrush_keyword_demand (curated set) |
| 12 | C2 | How to Ask for a Raise Professionally | `/how-to-ask-for-a-raise/` | raise request, including email wording | P0 | semrush_keyword_demand (curated set) |
| 13 | C3 | How to Politely Decline an Invitation | `/how-to-politely-decline-an-invitation/` | decline invitation | P1-high | semrush_keyword_demand + Maestro competitor_ranking |
| 14 | C3 | How to Apologize Professionally | `/how-to-apologize-professionally/` | professional apology; work/client/email sections | P1-high | semrush_keyword_demand; narrower variants to validate |
| 15 | C2/C3 | How to Respond to Negative Feedback Professionally | `/respond-to-negative-feedback-professionally/` | reply to criticism/negative feedback | P1-high | semrush_keyword_demand (curated set) |

### 6.1 Batch 1 合并与拆分说明

- #2 覆盖 `email reply format`、`email reply sample`、`short email reply sample`、`professional email reply` 等同一 semantic cluster；禁止再建近义 URL。
- #3 与 #4 **必须分开**：generic follow-up 与 no-response follow-up 已被 Fyxer 的 URL 架构和排名证据验证为不同 situation intents。
- #7 只负责收到 interview invitation/request 后的回复与确认；不得混入 thank-you 和 post-interview follow-up。
- #8 可包含 accept、ask for time、clarify terms 等“尚未决定拒绝”的 response variants；明确拒绝放 #9。
- #9 合并 decline/reject/turn down/refuse job offer 的近义表达。
- #10 先以 email 为真实可承接 channel；LinkedIn 产品未上线前，不得让页面暗示 LinkedIn 内直接生成已可用。
- #14 必须以职业/邮件场景为主，避免与泛 relationship apology intent 混杂。

### 6.2 推荐生产顺序（不是仅按表号）

1. #1、#2：建立产品型入口与 Email Reply 权威页。
2. #3、#4、#5、#6：形成高 product-fit 的 email task graph。
3. #7、#8、#9、#10：建立 Career communication 骨架。
4. #11、#12：覆盖高商业/工作意图请求。
5. #13、#14、#15：建立 Delicate Communication 骨架。

---

## 7. Batch 2：经竞品验证的 Situation Expansion

| # | Page title | Slug | Cluster | Evidence | Notes |
|---:|---|---|---|---|---|
| 1 | How to Follow Up With a Client Without Being Pushy | `/follow-up-with-a-client-without-being-pushy/` | C1/C2 | competitor_ranking (Fyxer: 70/KD15) | 强 Verbia demo 场景 |
| 2 | How to Ask for Help Politely in an Email | `/ask-for-help-politely-in-an-email/` | C2/C3 | competitor_ranking (Maestro #2; 390/KD23) | request-help situation |
| 3 | How to Request Something by Email | `/request-something-by-email/` | C2/C3 | competitor_ranking (Maestro #1; representative keyword 390/KD10) | 泛 request 主页面；避免为每个近义词建页 |
| 4 | How to Confirm Participation by Email | `/confirm-participation-by-email/` | C1/C3 | competitor_ranking (Maestro #1; 210/KD20) | 可包含 RSVP/confirmation，但上线前检查 SERP 重合度 |
| 5 | Interview Thank-You Email | `/interview-thank-you-email/` | C2 | competitor_ranking (Indeed) | 与 invitation response 分开 |
| 6 | Follow-Up Email After an Interview | `/follow-up-email-after-interview/` | C2 | competitor_ranking (Indeed) | 与 thank-you/invitation 分开 |
| 7 | How to Follow Up After a Meeting | `/follow-up-email-after-meeting/` | C1/C2 | competitor_ranking (Fyxer) | meeting-specific intent |
| 8 | How to Decline an Interview Politely | `/how-to-decline-an-interview/` | C2/C3 | competitor_ranking (Maestro) | 与 decline job offer 分开 |
| 9 | How to Respond to a Customer Complaint | `/respond-to-a-customer-complaint/` | C2/C3 | semrush_keyword_demand | CPC 显示商业价值；避免 helpdesk/canned-response 偏移 |
| 10 | How to Respond to a Low Salary Offer | `/respond-to-a-low-salary-offer/` | C2 | semrush_keyword_demand | negotiation/context demo；与 generic offer response 内链 |
| 11 | How to Say No Professionally | `/how-to-say-no-professionally/` | C3 | semrush_keyword_demand (direction-level) | 上线前验证与 decline-request 页关系 |
| 12 | How to Decline a Meeting Politely | `/how-to-decline-a-meeting/` | C2/C3 | semrush_keyword_demand (curated set) | 9 keywords / 1,740 sum / Avg KD21.2 |

Batch 2 页面上线前，应检查 `/confirm-participation-by-email/` 与未来 RSVP 页面是否 SERP 高度重叠；若重叠，则合并为一个强 URL。

---

## 8. Batch 3：Middle-Funnel Expansion

以下多数需在发布前复核关键词和 SERP，不附未验证数字。

| Page title | Slug | Cluster | Evidence | Launch gate |
|---|---|---|---|---|
| How to Apologize for a Mistake at Work | `/apologize-for-a-mistake-at-work/` | C3 | inference_to_validate | 与 professional apology SERP 明显不同 |
| How to Apologize to a Client | `/apologize-to-a-client/` | C2/C3 | inference_to_validate | 客户-specific SERP 与主 apology 页不同 |
| How to Apologize for a Late Reply | `/apologize-for-a-late-reply/` | C1/C3 | inference_to_validate | email/reply situation 有独立需求证据 |
| How to Ask for a Deadline Extension | `/ask-for-a-deadline-extension/` | C2/C3 | inference_to_validate | Semrush seed 曾列入研究，但可访问记录无最终数字 |
| How to Cancel a Meeting Politely | `/cancel-a-meeting-politely/` | C2/C3 | inference_to_validate | 与 decline meeting 区分清楚 |
| How to Reschedule a Meeting Politely | `/reschedule-a-meeting-politely/` | C2/C3 | inference_to_validate | 与 cancel/decline 不同 JTBD |
| How to Give Feedback Professionally | `/give-feedback-professionally/` | C2/C3 | inference_to_validate | 与 respond-to-feedback 是发送者/接收者两个 intent |
| How to Reply to a Rejection Email | `/reply-to-a-job-rejection-email/` | C2 | semrush_keyword_demand | 需求已见；发布前扩充 cluster |
| How to Negotiate a Job Offer by Email | `/negotiate-a-job-offer-by-email/` | C2 | inference_to_validate | 产品 fit 高；验证 demand/SERP |
| How to Reply to a Meeting Invitation Email | `/reply-to-a-meeting-invitation-email/` | C1/C2 | competitor_ranking (Maestro architecture) | 与 RSVP/confirmation 查重 |
| How to Reply to an Appreciation Email | `/reply-to-an-appreciation-email/` | C1/C3 | competitor_ranking (HIX weak overlap) | 竞争证据弱，先复核需求 |
| How to Write an Email in English | `/write-an-email-in-english/` | C1 | semrush_keyword_demand | 小流量、高定位 fit；不升级成 Natural English cluster |

---

## 9. Long-Term Backlog

### 9.1 产品支持后才能上线/强化

- `/gmail/` — Gmail Web adapter 上线后。
- `/outlook/` — Outlook Web adapter 上线后。
- `/linkedin/` — LinkedIn adapter 上线后，定位为 `AI LinkedIn Reply & Message Assistant`，但绝不宣传 auto-reply。
- LinkedIn recruiter situation pages — 可先做信息页，但产品 CTA 必须真实说明当前支持平台；更推荐 adapter 上线后集中发布。

### 9.2 Situation Library 长期候选

- Ask for approval by email
- RSVP email / reply to RSVP
- Follow up on payment
- Follow up on job application
- Follow up with recruiter
- Decline a request politely
- Apologize for missing a meeting
- Respond to an angry/frustrated customer
- Ask someone to explain again
- Ask your boss for clarification
- Respond to criticism
- Accept a job offer
- Ask for time to consider a job offer

全部标记为 `inference_to_validate`，除非重新取得 Semrush CSV 或完成实时 SERP 验证。

### 9.3 成熟站点才考虑的 broad informational

- What is CC/BCC in email
- Gmail archive/how to find archived emails
- Why am I not receiving emails
- General email etiquette/glossary
- Generic professional communication tips

这些是可能的流量扩张层，不是目前 acquisition priority。

---

## 10. 推荐站点信息架构

建议使用稳定、语义清晰的目录；不要让 URL 结构迫使 SEO 按 channel 而非 situation 分类。

```text
/
├── email-reply-generator/                 # Productized SEO entry
├── situations/                            # Communication Situation Library hub
│   ├── reply-and-respond/
│   ├── follow-up-and-remind/
│   ├── ask-and-request/
│   ├── decline-and-say-no/
│   └── apologize-and-repair/
├── career/                                # Career & Workplace hub
│   ├── interview/
│   ├── job-offer/
│   ├── recruiter/
│   └── workplace/
├── platforms/                             # Only for actually supported platforms
│   ├── reddit/
│   ├── gmail/
│   ├── outlook/
│   └── linkedin/
└── individual situation URLs             # 可采用根级短 slug；保持一致即可
```

实现选择：

- 若现有站点已有根级 SEO URL，继续使用根级 slug，避免无必要迁移。
- Hub 是导航与语义组织，不应变成空薄页。
- Platform pages 解释产品在具体平台的体验；Situation pages 解决用户任务。两者相互内链，但不可复制正文。

---

## 11. 页面模板：每一页都必须是产品体验

所有核心页面采用：

> **Search answer / examples → contextual interactive Verbia demo → native-language intent → generated natural reply → Add to Chrome**

### 11.1 推荐页面结构

1. **Above the fold**
   - H1 直接回答 situation。
   - 2–4 句简洁 search answer。
   - 一个与该 situation 匹配的例子。
   - 明确 CTA：`Try it with your situation`。

2. **Contextual interactive Verbia demo**
   - 示例/粘贴收到的消息或邮件。
   - 让用户用任意语言描述 intent。
   - 可选择关系、语气、长度；能读取真实 context 时优先读取。
   - 结合 platform style + My Voice 生成。

3. **Generated natural reply**
   - 展示结果与关键选择。
   - 允许 follow-up edits，如 shorter、warmer、more direct。
   - 明确用户 review and sends；never auto-send。

4. **Examples by meaningful variation**
   - 只展示改变意图的 variations，如 accept/decline/ask for time。
   - 不用 20 个只换同义词的模板凑长度。

5. **How to adapt the reply**
   - 解释 context、relationship、desired outcome 如何改变措辞。
   - 突出 Verbia 不只是复制模板。

6. **Product CTA**
   - `Add to Chrome`。
   - 正确说明支持的平台状态。
   - `10 free generations/day`，不得写 `free tool`。

7. **FAQ / related situations / internal links**
   - FAQ 只回答真实相邻问题。
   - 链到父 Hub、兄弟 situation、相关 platform 页。

### 11.2 禁止的模板

- 纯 1,500–2,000 字博客 + 文末 CTA。
- one-keyword-one-page。
- 只替换标题、对象名和 5 个模板的 programmatic thin pages。
- mass publishing。
- 隐藏或弱化产品体验。
- 暗示 auto-send。
- 把免费额度宣传为永久免费工具。

---

## 12. Internal Linking Strategy

### 12.1 Hub → Situation

- `/situations/decline-and-say-no/` 链到 decline job offer、invitation、interview、meeting、request。
- `/situations/follow-up-and-remind/` 链到 generic follow-up、no response、client、meeting、interview、payment。
- `/career/interview/` 链到 invitation response、thank-you、post-interview follow-up、decline interview。

### 12.2 Situation → Situation

仅链接真正的下一步或相邻任务：

- Interview invitation response → interview thank-you → post-interview follow-up。
- Job offer response → low salary response / negotiation → decline job offer。
- Generic follow-up → no response → client follow-up → payment follow-up。

### 12.3 Situation ↔ Product/Platform

- 所有 email situation 页面链到 `/email-reply-generator/`。
- Gmail adapter 上线后，email situation 页链到 `/platforms/gmail/`；Outlook 同理。
- LinkedIn recruiter 页面只在 LinkedIn 支持后强链 `/platforms/linkedin/`。

### 12.4 Anchor text

- 使用描述性、自然、多样的 anchor。
- 不在全站机械重复 exact-match anchor。
- 不为了内链而堆砌不相关链接。

---

## 13. Canonical、Cannibalization 与 URL Governance

### 13.1 新 URL 创建前的判断顺序

1. 用户要完成的 **communication job** 是否不同？
2. 现有页面能否完整满足该 intent，而无需改变页面主答案？
3. SERP/竞品是否显示不同 URL 在排名？
4. 是否只是 channel/audience/同义表达变化？
5. 是否有产品能力真实承接？

### 13.2 合并规则

以下类型默认合并：

- reply/respond（若 SERP 和任务一致）
- format/sample/example/template（作为页面内 sections）
- professional/politely/respectfully（若只是语气 modifier）
- decline/reject/turn down/refuse 同一对象
- email/mail 词形变化

### 13.3 拆分规则

以下默认拆分：

- 不同事件阶段：interview invitation vs thank-you vs post-interview follow-up。
- 不同对象：decline job offer vs invitation vs interview vs meeting。
- 不同触发条件：generic follow-up vs no response。
- 发送者与接收者动作不同：give negative feedback vs respond to negative feedback。
- 用户期望答案结构明显不同。

### 13.4 Canonical 规则

- 每个 indexable situation 只有一个 self-canonical URL。
- 参数、demo state、tone variation、example filters 不创建可索引副本；canonical 指向主 situation URL。
- 不用 canonical 掩盖本应合并的重复页面；重复内容应重定向/合并。
- 旧 slug 迁移时 301 到唯一目标，并同步 internal links 与 sitemap。
- 多语言页面未来使用独立 locale URL + hreflang；不能把不同语言 canonical 到英文页。

---

## 14. 页面生产与 QA 流程

每页必须按以下 gate 通过：

1. **Intent brief**：一句话定义用户此刻要完成什么。
2. **Evidence record**：写明 `evidence_type`；没有数字就不写数字。
3. **Cannibalization check**：与所有现有/规划 URL 比较。
4. **SERP pattern check**：检查结果更偏 how-to、examples、tool 还是混合。
5. **Product demo design**：为该 situation 写真实 context + native-language intent 示例。
6. **Search answer & examples**：先解决问题，再引入工具。
7. **Trust review**：确认 never auto-send、免费额度、平台支持状态准确。
8. **Internal links**：父 Hub、兄弟页、产品页至少各一类（若相关）。
9. **Technical QA**：title、H1、canonical、indexability、schema、sitemap、mobile、performance。
10. **Post-publish review**：2/4/8/12 周检查 query coverage、CTR、demo use 与安装。

不要一次发布 50 页。Batch 1 应分小组发布，以真实 query 和产品转化反馈调整后续页面。

---

## 15. 衡量指标

### 15.1 Search acquisition

- Indexed pages / valid canonical pages
- Non-branded impressions and clicks
- Top 3 / Top 10 / Top 20 query count
- Query coverage per strong URL（是否覆盖 semantic cluster）
- CTR by page/query intent
- Cannibalization signals：多个 URL 对同一 query 交替排名

### 15.2 Product engagement

- SEO page → demo start rate
- Demo completion rate
- Native-language intent input rate
- Generated reply review/edit rate
- Add to Chrome click-through rate
- Extension install attribution（若可可靠追踪）
- First generation after install

### 15.3 Quality / business

- 7-day / 30-day retained users by landing page
- Free allowance → paid conversion by acquisition page
- Bounce/short-session patterns（结合是否已直接得到答案解读）
- User-reported reply usefulness/naturalness
- Unsupported-platform expectation mismatch

### 15.4 决策节奏

- **2 weeks:** indexation/technical issues，不能判断排名成败。
- **4–8 weeks:** impressions、query discovery、internal linking 调整。
- **8–12+ weeks:** 初步比较 page family；决定是否扩 Batch 2。
- 新域名避免用短期无排名结论推动 mass publishing 或频繁换 slug。

---

## 16. Codex / Agent Do & Don't

### Do

- 先从 situation/JTBD 出发，再选关键词和 channel。
- 创建 URL 前搜索本仓库/内容清单，确认没有同 intent 页面。
- 将 reply/respond、format/sample/example 等近义需求聚合到一个强 URL。
- 对不同 communication situation 拆页。
- 标明证据类型及采集日期。
- 数字只引用本文或未来上传的原始 Semrush CSV。
- 页面顶部快速给出答案和可用例子。
- 把 Verbia interactive experience 作为页面主体。
- 清楚表达 native-language intent + context + platform style + My Voice。
- 始终说明 user reviews and sends；never auto-send。
- 正确写 Free plan = 10 generations/day。
- 平台页与产品 roadmap 保持一致。

### Don't

- 不编造 Volume、KD、CPC、排名、流量或 competitor 数据。
- 不把 seed Total Volume 当成单页流量潜力。
- 不一关键词一页面。
- 不批量生成 thin/programmatic pages。
- 不做传统博客农场。
- 不用 audience noun（如 `recruiter`）直接当 SEO intent。
- 不把 `email`、`LinkedIn` 等 channel 当作用户任务本身。
- 不追 broad `AI writer`、`rewriter`、ChatGPT/QuillBot 竞品词 land-grab。
- 不因 Reddit 产品已完成就假设 Reddit 是 SEO 主市场。
- 不在产品支持前宣称支持 Gmail/Outlook/LinkedIn。
- 不把 Verbia 叫作 free tool。
- 不暗示 auto-reply、bulk messaging 或 auto-send。
- 不写 Gmail archive、CC/BCC、troubleshooting 等当前上游内容。

---

## 17. 下一步执行清单

1. 建立 URL registry，录入 Batch 1–3 的 intent owner、slug、status、evidence。
2. 先完成 `/email-reply-generator/` 与 `/how-to-reply-to-an-email-professionally/` 的互补 brief，防止产品词/信息词互抢。
3. 为 Batch 1 的每页写一条真实 context 和一条母语 intent demo。
4. 设计 `/situations/` 与 `/career/` Hub，确保不是空目录页。
5. 在 Gmail Web 上线前完成 CTA truth review；未上线时避免误导。
6. 若仍可导出 Semrush，优先保存 Fyxer reply/follow-up、Maestro reply/email/decline、Indeed interview-email/respond-interview 的完整 CSV。
7. 获得 CSV 后重新计算 Batch 排序，但不得破坏本文的 intent/cannibalization 原则。

---

## 18. Machine-Readable Execution Summary (YAML)

```yaml
schema_version: "1.0"
document:
  name: "Verbia SEO Research and Landing Page Roadmap"
  version: "v2"
  date: "2026-09-11"
  status: "seo_master_single_source_of_truth"
  market: "US-English"
  replaces_prior_version: true
  prior_file_accessible_in_workspace: false

product:
  name: "Verbia"
  positioning_formula:
    - "native-language intent"
    - "conversation context"
    - "platform style"
    - "My Voice"
    - "natural reply"
  user_control:
    review_before_send: true
    auto_send: false
  free_plan:
    generations_per_day: 10
    may_claim_free_tool: false

strategy_model:
  formula:
    - "Fyxer Intent Architecture"
    - "Maestro Communication Situation Library"
    - "HIX Productized SEO"
    - "Verbia Contextual Intent-to-Reply Experience"
  validation_benchmark:
    career_workplace: "Indeed"
  acquisition_sequence:
    - "bottom_funnel_high_product_fit"
    - "middle_funnel"
    - "broad_informational"

evidence_types:
  - id: "semrush_keyword_demand"
    definition: "Keyword demand explicitly observed in today's Semrush research"
  - id: "competitor_ranking"
    definition: "Competitor keyword/rank/URL explicitly observed in Semrush Organic Rankings"
  - id: "inference_to_validate"
    definition: "Product or architecture inference; no metrics may be invented"

clusters:
  - id: "C1"
    name: "Email Reply & Response"
    priority: "P0"
    core_job: "Reply naturally and professionally to an email using context and true intent"
  - id: "C2"
    name: "Career & Workplace Communication"
    priority: "P0"
    core_job: "Handle interview, offer, recruiter, workplace, payment, raise, and feedback communication"
  - id: "C3"
    name: "Delicate Communication / What to Say / Communication Situations"
    priority: "P1"
    core_job: "Express a sensitive decision, request, apology, refusal, or response appropriately"

rules:
  - "same_semantic_intent_one_strong_url"
  - "different_communication_situation_separate_urls"
  - "situation_first_channel_second"
  - "audience_noun_is_not_seo_intent"
  - "product_validation_platform_is_not_seo_acquisition_market"
  - "no_one_keyword_one_page"
  - "no_programmatic_thin_pages"
  - "no_mass_publishing"
  - "no_invented_volume_kd_cpc_rank_or_traffic"
  - "no_auto_send_claims"
  - "no_free_tool_claims"

page_template:
  sequence:
    - "search_answer_and_examples"
    - "contextual_interactive_verbia_demo"
    - "native_language_intent_input"
    - "generated_natural_reply"
    - "user_review_and_send"
    - "add_to_chrome"
  required_product_message:
    - "context-aware"
    - "native-language intent"
    - "platform style"
    - "My Voice"
    - "10 free generations per day"
    - "never auto-send"

batches:
  batch_1:
    goal: "15 high-fit authority/productized situation pages"
    pages:
      - {priority: "P0", cluster: "C1", slug: "/email-reply-generator/", evidence_type: ["semrush_keyword_demand", "inference_to_validate"]}
      - {priority: "P0", cluster: "C1", slug: "/how-to-reply-to-an-email-professionally/", evidence_type: ["semrush_keyword_demand", "competitor_ranking"]}
      - {priority: "P0", cluster: "C1", slug: "/how-to-follow-up-on-an-email-politely/", evidence_type: ["semrush_keyword_demand", "competitor_ranking"]}
      - {priority: "P0", cluster: "C1", slug: "/follow-up-email-after-no-response/", evidence_type: ["semrush_keyword_demand", "competitor_ranking"]}
      - {priority: "P0", cluster: "C1", slug: "/ask-for-clarification-in-an-email/", evidence_type: ["semrush_keyword_demand"]}
      - {priority: "P0", cluster: "C1+C3", slug: "/polite-reminder-email/", evidence_type: ["semrush_keyword_demand", "competitor_ranking"]}
      - {priority: "P0", cluster: "C2", slug: "/respond-to-an-interview-invitation-email/", evidence_type: ["semrush_keyword_demand", "competitor_ranking"]}
      - {priority: "P0", cluster: "C2", slug: "/respond-to-a-job-offer-email/", evidence_type: ["semrush_keyword_demand"]}
      - {priority: "P0", cluster: "C2+C3", slug: "/how-to-politely-decline-a-job-offer/", evidence_type: ["semrush_keyword_demand", "competitor_ranking"]}
      - {priority: "P0", cluster: "C2", slug: "/how-to-reply-to-a-recruiter-email/", evidence_type: ["inference_to_validate", "competitor_ranking"]}
      - {priority: "P0", cluster: "C2", slug: "/how-to-ask-for-payment-politely/", evidence_type: ["semrush_keyword_demand"]}
      - {priority: "P0", cluster: "C2", slug: "/how-to-ask-for-a-raise/", evidence_type: ["semrush_keyword_demand"]}
      - {priority: "P1-high", cluster: "C3", slug: "/how-to-politely-decline-an-invitation/", evidence_type: ["semrush_keyword_demand", "competitor_ranking"]}
      - {priority: "P1-high", cluster: "C3", slug: "/how-to-apologize-professionally/", evidence_type: ["semrush_keyword_demand"]}
      - {priority: "P1-high", cluster: "C2+C3", slug: "/respond-to-negative-feedback-professionally/", evidence_type: ["semrush_keyword_demand"]}
  batch_2:
    focus: "competitor-validated situation expansion"
    required_pages:
      - {slug: "/follow-up-with-a-client-without-being-pushy/", evidence_type: ["competitor_ranking"]}
      - {slug: "/ask-for-help-politely-in-an-email/", evidence_type: ["competitor_ranking"]}
      - {slug: "/request-something-by-email/", evidence_type: ["competitor_ranking"]}
      - {slug: "/confirm-participation-by-email/", evidence_type: ["competitor_ranking"]}
      - {slug: "/interview-thank-you-email/", evidence_type: ["competitor_ranking"]}
      - {slug: "/follow-up-email-after-interview/", evidence_type: ["competitor_ranking"]}
  batch_3:
    focus: "middle-funnel expansion after SERP and cannibalization validation"
    default_evidence_type: "inference_to_validate"
  long_term:
    focus:
      - "supported-platform pages"
      - "validated communication situation expansion"
      - "broad informational only after authority and conversion evidence"

constraints:
  deferred_broad_topics:
    - "Gmail archive"
    - "CC/BCC definitions"
    - "email troubleshooting"
    - "broad AI keywords"
    - "rewriter land-grab"
  rejected_or_reclassified:
    natural_english: "brand_positioning_not_primary_seo_cluster"
    rewriter: "high_difficulty_and_jtbd_mismatch"
    ai_reply_assistant_category: "product_language_not_primary_demand_engine"
    generic_reply_generator: "deprioritized"
    discussion_academic: "excluded"
    reddit_reply: "product_validation_not_primary_acquisition"

roadmap:
  - {platform: "Reddit", status: "completed", seo_role: "product_validation_and_demo_not_core_cluster"}
  - {platform: "Gmail Web", status: "next", seo_role: "primary_email_product_bridge"}
  - {platform: "Outlook Web", status: "planned_after_gmail", seo_role: "email_platform_expansion"}
  - {platform: "LinkedIn", status: "planned_after_outlook", seo_role: "career_professional_extension"}

measurement:
  acquisition:
    - "non_branded_impressions_clicks"
    - "top_3_top_10_top_20_queries"
    - "query_coverage_per_url"
    - "ctr"
    - "cannibalization"
  product:
    - "demo_start_rate"
    - "demo_completion_rate"
    - "generated_reply_rate"
    - "add_to_chrome_ctr"
    - "first_generation_after_install"
  business:
    - "retention_by_landing_page"
    - "free_to_paid_conversion"
```

---

## 19. Final Decision

Verbia 的 SEO moat 不来自内容数量，而来自这条闭环：

> **具体沟通问题的搜索需求 → 一个正确归类的强 URL → 立即可用的答案与例子 → 用户输入真实 context 和母语 intent → Verbia 生成符合平台与 My Voice 的自然回复 → 用户审阅发送 → Add to Chrome。**

未来任何 SEO 新页面、关键词扩展或产品页，都必须能解释它在这条闭环中的位置；无法解释的页面不应进入生产。
