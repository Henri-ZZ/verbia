# Verbia SEO Research & Landing Page Roadmap

**研究日期：** 2026-09-11  
**目标市场/数据口径：** Semrush US database  
**主要数据源：** 当日 Semrush 调研记录；`Verbia-SEO-Master_pages_2026-09-11.csv`（83 rows）；此前 Email / Interview / Job Offer / Recruiter / LinkedIn 截图与人工分析。  
**文档用途：** 在 Semrush 试用到期后，继续指导 Codex、SEO agent、content agent 和工程 agent 实施 Verbia 的 SEO acquisition roadmap。

> **证据纪律：** 本文只为当日 Semrush 明确观察到的关键词写精确 Volume / KD / CPC。未出现在 CSV 或当日研究记录中的后续页面，只标记为“推断/待验证”，不得由后续 agent 补造数字。Semrush 指标是时间点快照，不是永久事实。

---

## 1. 项目与产品背景

Verbia 是一个嵌入用户真实沟通平台的 AI Reply & Writing Assistant。它不是单纯的 rewriter、translator、模板库或自动回复机器人。

核心产品链路：

1. 读取当前 conversation context；
2. 用户可以用自己的母语说明 intent；
3. Verbia 结合 platform style、对话上下文和 **My Voice**；
4. 生成自然、贴合用户本人口吻的目标语言回复；
5. **用户审阅后自行发送，Verbia 绝不 auto-send。**

统一价值主张：

> **I know what I want to say. Help me say it the right way.**

可用于品牌文案但不应被误当成主要 SEO 搜索词的表达：

> **Think in your language. Communicate in theirs.**

### 当前产品 roadmap 与 SEO 对齐

| 产品阶段 | 状态 | 产品意义 | SEO 意义 |
|---|---|---|---|
| Reddit | 已完成 | 验证公开 thread、context engine、自然对话回复 | Product Validation Platform；不是核心 SEO acquisition market |
| Gmail Web | 下一步 | 最强、最普遍的专业邮件场景 | 与 Cluster 1 直接对齐，最高优先级 |
| Outlook Web | Gmail 之后 | 工作场所与企业邮件 | 扩展 Email + Workplace 场景；上线前不要暗示已支持 |
| LinkedIn | Outlook 之后 | Recruiter、career、professional messaging | 与 Cluster 2 强对齐；上线前 CTA 用 waitlist/通用 Add to Chrome，不声称原生支持 |

### SEO 目标

- 捕获用户已经在 Google 表达的具体沟通任务，而不是教育市场搜索一个尚未形成的新品类名。
- 把 `search → useful answer → contextual Verbia demo → product install/signup` 做成连续漏斗。
- 优先选择 Product Fit、Conversion Intent、可交付的 platform support 与 SEO 难度共同成立的页面。
- 用少量高质量、明确区分 intent 的 landing pages 建立主题权威，避免批量制造薄内容。

---

## 2. 两个必须分开的市场概念

### Product Validation Platform

适合验证产品交互、context engine、reply quality 或 adapter 技术的平台。平台被产品支持，并不等于用户会通过 Google 搜索 AI reply solution。

**Reddit 属于这一类。** 它的公开 thread 结构非常适合验证 `conversation → native-language intent → natural reply`，但 Semrush 中 `reddit reply` 需求主要是隐藏回复、添加图片、无法回复、通知等 Reddit 功能问题。

### SEO Acquisition Market

用户已经用高相关搜索词主动寻找解决方案，并可自然转化到 Verbia 的市场。

**Email、Career & Workplace、Delicate Communication 属于这一类。**

决策规则：

> `We support this platform` 不能推出 `we should build an SEO cluster for this platform`。

---

## 3. 三个核心 Cluster

## Cluster 1 — Email Reply & Response（P0）

### 搜索意图

- Informational：如何回复邮件、如何专业回复、如何 follow up。
- Commercial / tool-seeking：寻找 email reply generator / AI email reply generator。
- 即时任务意图很强：用户通常手边已经有一封真实邮件，希望马上得到合适回复。

### 已观察关键词数据

| Keyword | Volume | KD | CPC | 证据 |
|---|---:|---:|---:|---|
| `how do i reply to an email` | 590 | 29 | $1.16 | 当日 Semrush 调研记录 |
| `reply to email` | 480 | 39 | — | 当日 Semrush 调研记录 |
| `how to reply for an email` | 480 | 32 | — | 当日 Semrush 调研记录 |
| `reply to this email` | 390 | 54 | — | 当日 Semrush 调研记录 |
| `email reply generator` | 210 | 53 | — | 当日 Semrush 调研记录 |
| `ai email reply generator` | 110 | 53 | — | 当日 Semrush 调研记录 |
| `professional email reply` | 110 | 34 | — | 当日 Semrush 调研记录 |
| `how to respond to an email professionally` | 320 | 30 | $2.88 | Pages CSV |
| `how to respond to professional email` | 110 | 34 | $2.52 | Pages CSV |

`—` 表示本次记录没有可靠的精确值，不代表 0。

### 产品契合度与页面策略

- **Product Fit：5/5；Commercial Fit：5/5；Priority：P0。**
- Gmail Web 是下一步 roadmap，SEO demand 与实际产品能力将直接对齐。
- 一个主工具页覆盖 generator intent；多个场景 landing page 覆盖 informational intent。
- 页面必须展示：已有邮件 context + 用户母语 intent + professional/platform style + My Voice → natural reply。
- 不要分别为 `reply/respond`、`email/mail`、轻微语法变体建重复 URL。

---

## Cluster 2 — Career & Workplace Communication（P0）

### 搜索意图

- 回复 interview request / invitation / confirmation。
- 回复、接受、暂缓、谈判或拒绝 job offer。
- 回复 recruiter，尤其是 LinkedIn recruiter。
- 提薪、negative feedback 等高焦虑、高语气敏感的 workplace communication。

### 已观察关键词数据

| Keyword | Volume | KD | CPC | 证据 |
|---|---:|---:|---:|---|
| `how to respond for an interview request` | 390 | 17 | — | 当日 Semrush 调研记录 |
| `how to respond to an interview offer` | 170 | 13 | — | 当日 Semrush 调研记录 |
| `how to respond to an interview invitation email` | 110 | 13 | — | 当日 Semrush 调研记录 |
| `how to respond to a job interview via email` | 260 | 17 | — | 当日 Semrush 调研记录 |
| `how do you respond to a job offer email` | 390 | 16 | — | 当日 Semrush 调研记录 |
| `how to respond to a job offer email` | 390 | 22 | — | 当日 Semrush 调研记录（同日视图曾显示近似变体 260/KD16；实施前应重查 SERP/数据库口径） |
| `how to respond to offer letter email` | 320 | 19 | — | 当日 Semrush 调研记录 |
| `how to respond to email job offer` | 260 | 16 | — | 当日 Semrush 调研记录 |
| `how to reply to recruiter on linkedin` | 170 | 18 | $1.74 | 当日 Semrush 调研记录 |
| `how to reply to linkedin recruiter` | 140 | 21 | — | 当日 Semrush 调研记录 |
| `linkedin ai message generator` | 110 | 5 | $2.24 | 当日 Semrush 调研记录 |
| `how to professionally ask for a raise` | 480 | 30 | $0.49 | Pages CSV |
| `how to ask for a raise via email` | 260 | 17 | $0.89 | Pages CSV |
| `how to tactfully ask for a raise` | 110 | 32 | $0.52 | Pages CSV |
| `how to respond to negative feedback` | 170 | 16 | $0.00 | Pages CSV |

### 产品契合度与页面策略

- **Product Fit：5/5；Commercial Fit：4/5；Priority：P0。**
- `Career & Workplace Communication` 是内部 IA 名称，不是要硬抢的 primary keyword。
- 按具体任务拆页：Interview、Offer、Recruiter、LinkedIn Recruiter、Decline Offer、Raise、Feedback。
- Job offer 的“接受 / 要时间 / 谈判 / 拒绝”可先在一个强页面中做 sections；只有 SERP 和 Search Console 证明意图分离后才拆页。
- LinkedIn 页面现在可以生产内容，但 CTA/产品描述必须符合真实 adapter 状态。

---

## Cluster 3 — Delicate Communication / What to Say（P1，部分页面 P0）

### 搜索意图

用户知道事实和目标，但不知道怎样说得礼貌、坚定、自然、专业或不冒犯。主要动作包括 reminder、follow-up、payment request、decline、clarification，以及后续 apology / disagreement / rescheduling 等。

### 已观察关键词数据

#### Reminder / follow-up

| Keyword | Volume | KD | CPC |
|---|---:|---:|---:|
| `how to nicely remind someone to do something` | 4,400 | 30 | $0.00 |
| `a gentle follow up please` | 2,400 | 20 | $0.00 |
| `how to remind someone politely email` | 880 | 19 | $0.00 |
| `how to send a chaser email politely` | 480 | 23 | $0.00 |
| `how to remind someone politely` | 210 | 9 | $0.00 |
| `gentle follow up email sample after no response` | 170 | 29 | $0.00 |

#### Payment

| Keyword | Volume | KD | CPC |
|---|---:|---:|---:|
| `how to ask for money politely` | 390 | 14 | $0.00 |
| `how to ask for payment professionally in message` | 320 | 9 | $3.68 |
| `how to ask for payment politely` | 320 | 17 | $2.33 |
| `how to kindly ask for payment` | 320 | 10 | $2.33 |
| `how to ask for payment politely sms` | 260 | 11 | $0.00 |
| `how to ask for payment professionally` | 140 | 5 | $0.00 |

#### Negative reviews / business replies

| Keyword | Volume | KD | CPC |
|---|---:|---:|---:|
| `how to respond to negative reviews` | 390 | 17 | $1.68 |
| `how do i respond to a negative review` | 320 | 24 | $1.82 |
| `how to respond to a negative google review` | 210 | 13 | $2.46 |
| `how to respond to negative feedback` | 170 | 16 | $0.00 |

以上三组均来自 Pages CSV。`negative feedback at work` 应归 Cluster 2；customer/Google review 作为 Cluster 3 下的 Business Reply 子方向，不能因为都含 `negative` 而合并为一页。

### 产品契合度与页面策略

- **Product Fit：5/5；整体 Priority：P1；Payment、Reminder 可提升为 P0。**
- 这是最适合展示“母语讲 intent，而不是硬填模板”的 cluster。
- 页面要覆盖不同关系、强度和渠道的 examples，再让用户用自己的真实 context 生成回复。
- Customer & Business Replies 暂不升格为第四个大 Cluster；先作为高商业价值子方向逐步验证。

---

## 4. 被否定或重新分类的方向

| 方向 | 决策 | 原因与后续用途 |
|---|---|---|
| Natural English | 不作为 SEO cluster | 抽象词或语言学习 intent，真正匹配 Verbia 的搜索量弱；保留为 product positioning |
| English / Sentence Rewriter | 不直接竞争 | 市场大但成熟、KD 高，QuillBot/Grammarly 类 intent 偏重改写，不体现 context + reply；只在必要页面解释差异 |
| AI Reply Assistant | 品类词，不是独立 cluster | `ai reply assistant` 直接量低；可用于产品标题与定位 |
| Generic Reply Generator | 不作为主 cluster | 大盘混有 text、message、discussion、review、chat 等不同 intent；应拆成具体场景 |
| Generic Message Reply | P2 / 暂缓 | 搜索需求大量落在 dating、birthday、condolence、flirty text 等低商业匹配场景 |
| Discussion / Discussion Response Generator | 不追核心 SEO | 数字看似漂亮，但 intent 主要是大学 online course discussion-board assignment，存在学术作业市场错位 |
| Reddit Reply | 不作为 acquisition cluster | 搜索以 Reddit 功能帮助为主；Reddit 保留为 Product Validation Platform |
| Cross-language English Communication | 不作为搜索 cluster | 是产品护城河与品牌信息，但用户更常搜索具体任务，而不是新品类名称 |
| Customer Support / canned response | 暂不作为大 cluster | 部分高价值，但大盘被岗位、response time、ticket automation、template intent 污染；保留 customer complaint/review 子方向 |

### 已观察的产品品类词（用于定位/工具页，不等于独立 cluster）

| Keyword | Volume | KD | CPC |
|---|---:|---:|---:|
| `ai response generator` | 4,400 | 58 | $1.06 |
| `ai message generator` | 3,600 | 65 | $0.94 |
| `response generator` | 880 | 39 | $1.18 |
| `ai reply generator` | 720 | 49 | $1.74 |
| `how to respond to this` | 720 | 33 | $0.32 |
| `ai reply` | 590 | 55 | $2.18 |
| `ai reply assistant` | 30 | 17 | $2.49 |
| `reply assist ai` | 50 | 14 | $5.53 |

### Semrush 自动 clustering 的已知误判

1. `how to decline a meeting` 被扩到 `how to tactfully decline an invitation`（720/KD25）和 `how to respectfully decline an invitation`（590/KD21）。后两者更偏普通社交邀请，不能自动算作 meeting/workplace intent。
2. 同组收进 `how to un decline a meeting`（40/KD18），真实 intent 是在 Outlook/Google Calendar/Zoom 中恢复误点的 decline，属于技术帮助页，应删除。
3. `negative feedback` 与 `negative review` 表面相近，但前者常是 workplace interpersonal intent，后者是 business reputation/customer response intent，应拆开。
4. `discussion response generator` 虽低 KD，但不是社区回复，而是 academic assignment intent。

**人工复核规则：** 在决定 URL 前必须检查 SERP 类型、排名页面、修饰词、受众和用户下一步动作。相同词根不等于相同 intent。

---

## 5. Batch 1：第一批 15 个落地页（已确认清单）

状态标签：`Semrush-validated` 表示页面主题或 primary keyword 已被当日数据直接支持；并不表示表内每个 secondary variant 都已穷尽。

| # | Page title | Slug | Primary keyword / intent | Cluster | Priority | 页面类型与 CTA |
|---:|---|---|---|---|---|---|
| 1 | How to Reply to an Email Professionally | `/how-to-reply-to-an-email-professionally/` | `how to respond to an email professionally`；informational → immediate reply | C1 | P0 | SEO landing + contextual email demo；Add to Chrome |
| 2 | Email Reply Generator | `/email-reply-generator/` | `email reply generator`；commercial/tool | C1 | P0 | Interactive tool landing；paste/读取 context + intent；free daily quota；Add to Chrome |
| 3 | How to Follow Up on an Email Politely | `/how-to-follow-up-on-an-email-politely/` | `how to follow up email politely`；informational | C1/C3 | P0 | Guide + examples + follow-up demo；Add to Chrome |
| 4 | How to Reply to an Interview Invitation | `/how-to-reply-to-an-interview-invitation/` | interview invitation reply；informational | C2 | P0 | Scenario landing + availability/tone demo |
| 5 | How to Respond to a Job Offer Email | `/how-to-respond-to-a-job-offer-email/` | `how to respond to a job offer email`；informational | C2 | P0 | Accept/ask time/negotiate/decline sections + context demo |
| 6 | How to Reply to a Recruiter | `/how-to-reply-to-a-recruiter/` | recruiter reply；informational | C2 | P0 | Email/general recruiter scenarios + demo |
| 7 | How to Reply to a Recruiter on LinkedIn | `/how-to-reply-to-a-recruiter-on-linkedin/` | `how to reply to recruiter on linkedin`；informational | C2 | P0 | LinkedIn-style examples；CTA 按真实 adapter 状态 |
| 8 | How to Politely Decline a Job Offer | `/how-to-politely-decline-a-job-offer/` | decline job offer politely；informational | C2 | P0 | Relationship-preserving decline demo |
| 9 | How to Ask for Payment Politely | `/how-to-ask-for-payment-politely/` | `how to ask for payment politely`；informational/high commercial fit | C3 | P0 | SEO landing + overdue/context demo；Add to Chrome |
| 10 | How to Remind Someone Politely | `/how-to-remind-someone-politely/` | `how to remind someone politely`；informational | C3 | P0 | Multi-context examples + reminder demo |
| 11 | How to Follow Up After No Response | `/how-to-follow-up-after-no-response/` | follow-up after no response；informational | C3 | P1 | Timing ladder + email/message variants + demo |
| 12 | How to Ask for a Raise Professionally | `/how-to-ask-for-a-raise-professionally/` | `how to professionally ask for a raise`；informational | C2 | P1 | Meeting/email variants + My Voice demo |
| 13 | How to Respond to Negative Feedback | `/how-to-respond-to-negative-feedback/` | `how to respond to negative feedback`；workplace informational | C2 | P1 | Manager/peer feedback cases + non-defensive reply demo |
| 14 | How to Respond to a Negative Review | `/how-to-respond-to-a-negative-review/` | `how to respond to negative reviews`；informational/commercial | C3 Business | P1 | Business response landing + review context demo |
| 15 | How to Ask for Clarification Politely | `/how-to-ask-for-clarification-politely/` | clarification request；informational | C3 | P1 | Examples + ambiguity/context demo |

所有 Batch 1 页面主题均为当日研究确认的执行清单。第 15 页的方向已确认，但本文现有数据没有可靠的精确 Volume/KD/CPC，故不得补造。

### Batch 1 合并边界

- #3 聚焦“已发邮件后的 polite follow-up”；#11 聚焦“对方无回复后的 cadence、第二/第三次 follow-up”。若上线前 SERP 高度重叠，应合并成 #3，并将 #11 作为 section/anchor，而不是强行保留两页。
- #6 是跨渠道/邮件 recruiter；#7 明确 LinkedIn。若 Search Console 显示互相抢词，再做 canonical、重写定位或合并。
- #13 只覆盖 workplace/interpersonal feedback；#14 覆盖 customer/public review。
- #5 可覆盖 offer 的多种 response；#8 专门覆盖 decline intent，必须与 #5 的 decline section互链但避免重复全文。

---

## 6. Batch 2、Batch 3 与长期 backlog

### Batch 2：扩展已验证需求（建议在 Batch 1 初步收录后）

| Page theme / suggested slug | Cluster | Priority | Keyword direction | Evidence status |
|---|---|---|---|---|
| AI Reply Generator — `/ai-reply-generator/` | C1 / category | P1 | `ai reply generator`, `ai reply`, `how to respond to this` | **Semrush-validated**；精确数据见第 4 节 |
| How to Write an Email in English — `/how-to-write-an-email-in-english/` | C1 | P1 | `how to write an email in english`, professional email in English | **Semrush-validated direction**；当日观察 90/KD32 等变体，发布前复核 |
| How to Ask for a Raise via Email — `/how-to-ask-for-a-raise-via-email/` | C2 | P1 | `how to ask for a raise via email` | **Semrush-validated**：260/KD17/$0.89；先评估是否应并入 Batch 1 #12 |
| How to Respond to a Low Salary Offer — `/how-to-respond-to-a-low-salary-offer/` | C2 | P1 | low salary offer response/negotiation | **Semrush-validated direction**；当日观察到相关低难度长尾 |
| How to Respond to a Job Rejection Email — `/how-to-respond-to-a-job-rejection-email/` | C2 | P1 | response to rejection email for a job | **Semrush-validated direction**；当日记录 90/KD19 |
| How to Ask for Payment Professionally in a Message — `/how-to-ask-for-payment-professionally-in-a-message/` | C3 | P1 | message/SMS payment request | **Semrush-validated**：320/KD9/$3.68；先与 Batch 1 #9 做 SERP overlap check |
| How to Respond to a Negative Google Review — `/how-to-respond-to-a-negative-google-review/` | C3 Business | P1 | negative Google review response | **Semrush-validated**：210/KD13/$2.46；与 #14 明确 Google-specific intent |
| How to Respond to Customer Complaints — `/how-to-respond-to-customer-complaints/` | C3 Business | P1 | customer complaint reply | **Semrush-validated**：140/KD16/$4.40；低量高商业价值 |

### Batch 3：相邻场景实验（有逻辑依据，需验证或先做小规模）

| Page theme / suggested slug | Cluster | Priority | Keyword direction | Evidence status |
|---|---|---|---|---|
| How to Apologize Professionally — `/how-to-apologize-professionally/` | C3 | P2 | professional apology, apology email | **推断/待验证** |
| How to Say No Professionally — `/how-to-say-no-professionally/` | C3 | P2 | say no politely/professionally | **推断/待验证** |
| How to Disagree Politely at Work — `/how-to-disagree-politely-at-work/` | C2/C3 | P2 | professional disagreement | **推断/待验证** |
| How to Decline a Meeting Politely — `/how-to-decline-a-meeting-politely/` | C2/C3 | P2 | decline meeting, not social invitation | **待人工 SERP 验证**；Semrush cluster 已知污染 |
| How to Reschedule a Meeting Politely — `/how-to-reschedule-a-meeting-politely/` | C2/C3 | P2 | meeting reschedule message/email | **推断/待验证** |
| How to Ask for a Deadline Extension — `/how-to-ask-for-a-deadline-extension/` | C2/C3 | P2 | deadline extension request | **推断/待验证** |
| How to Give Feedback Professionally — `/how-to-give-feedback-professionally/` | C2 | P2 | give constructive feedback | **推断/待验证** |
| Customer Service Email Response Examples — `/customer-service-email-response-examples/` | C3 Business | P2 | customer service email samples/examples | **Semrush-validated direction**：90/KD25/$4.54 variant observed；避免沦为 canned template library |
| How to Reply to an Angry Customer Email — `/how-to-reply-to-an-angry-customer-email/` | C3 Business | P2 | angry/frustrated customer email reply | **Semrush-validated direction**；观察到精准长尾但量低 |

### 长期 backlog：由数据和产品能力触发，而不是按日历自动生产

| 主题 | 触发条件 | 当前状态 |
|---|---|---|
| Gmail-specific reply pages | Gmail Web 已上线，能展示真实 native demo；Search Console 出现 Gmail queries | 待产品上线/验证；不要提前宣称支持 |
| Outlook reply / workplace email pages | Outlook Web 已上线；Gmail 内容证明转化模型 | 待产品上线/验证 |
| LinkedIn reply tool / professional messaging hub | LinkedIn adapter 已上线，且 recruiter pages 有 impressions/conversions | 关键词方向部分已验证，产品依赖未完成 |
| Refund / pricing / delay / policy customer replies | Customer complaint/review 页面带来商业用户与转化 | 推断/待验证 |
| SMS / text payment reminder | Payment 主页面已建立权威且 SERP 显示渠道意图独立 | 部分关键词已由 CSV 验证；是否独立 URL 待 SERP |
| Programmatic scenario pages | 模板可保持独特内容、真实 demo 且 Search Console 有长尾需求 | 不得在没有需求/独特价值时批量生成 |

---

## 7. 推荐站点信息架构

```text
/
├── /email-reply-generator/                 # core interactive tool page
├── /email/                                 # C1 hub（可在至少 4 个子页上线后创建）
│   ├── /how-to-reply-to-an-email-professionally/
│   ├── /how-to-follow-up-on-an-email-politely/
│   └── /how-to-follow-up-after-no-response/
├── /career-communication/                  # C2 hub，导航/集合页，不强押此词
│   ├── /how-to-reply-to-an-interview-invitation/
│   ├── /how-to-respond-to-a-job-offer-email/
│   ├── /how-to-reply-to-a-recruiter/
│   ├── /how-to-reply-to-a-recruiter-on-linkedin/
│   ├── /how-to-politely-decline-a-job-offer/
│   ├── /how-to-ask-for-a-raise-professionally/
│   └── /how-to-respond-to-negative-feedback/
└── /what-to-say/                            # C3 hub
    ├── /how-to-ask-for-payment-politely/
    ├── /how-to-remind-someone-politely/
    ├── /how-to-ask-for-clarification-politely/
    └── /how-to-respond-to-a-negative-review/
```

实际 URL 可保持根级短 slug；上图表达的是逻辑归属，不要求物理嵌套。若项目已有 URL 规范，应保持一致，不为改 IA 破坏现有 URL。

### 内部链接结构

- Homepage → 三个 hub + `Email Reply Generator`。
- Hub → 所有子页面；子页面顶部 breadcrumb/语义返回 hub。
- 每个子页面 → 本 cluster 2–4 个相邻 intent 页面，不做全站关键词堆砌链接。
- 所有 informational 页面 → 一个最匹配的 contextual demo/tool CTA。
- Career graph：Interview → Recruiter → Job Offer → Decline/Negotiation → Raise。
- Delicate graph：Reminder ↔ Follow-up ↔ No Response；Payment ↔ Reminder；Feedback ↔ Clarification；Negative Review ↔ Customer Complaint。
- 跨 cluster 只在任务自然相邻时链接，例如 Email Professional ↔ Interview Invitation。
- Anchor text 多样、自然，避免所有链接都用 exact-match primary keyword。

---

## 8. 标准页面模板

每个页面不是传统博客，也不是只有输入框的薄工具页。推荐结构：

1. **Search-intent answer above the fold**：一句话回答 + 适用场景。
2. **Quick examples**：3–5 个真正不同的语境/关系/语气，不做同一句机械改写。
3. **Decision guidance**：什么时候用哪种表达，什么会显得 rude、vague、overly formal。
4. **Contextual Verbia demo**：
   - 显示收到的 message/email 或简化 context；
   - 用户用母语写 intent；
   - 选择或继承 platform style / My Voice；
   - 展示 natural reply；
   - 清楚说明用户会先 review，绝不 auto-send。
5. **Situation variants**：email/message/LinkedIn、boss/client/recruiter 等；只放与该 intent 相关的变体。
6. **Mistakes to avoid**：提高信息价值，避免模板页同质化。
7. **FAQ**：只回答 SERP/PAA/Search Console 支持的问题，不凭空堆 FAQ。
8. **CTA**：`Try Verbia` / `Add to Chrome` / `Use your free daily allowance`；随产品可用状态调整。
9. **Related guides**：2–4 个内部链接。

建议页面文案示例：

> **Need to ask for payment right now?**  
> Tell Verbia what happened and what you want to say—in your own language. Verbia uses the conversation context, platform style, and My Voice to draft a natural, professional reply for you to review before sending.

### 产品表述约束

- 正确：`Free plan`、`free daily quota`、`free daily allowance`、`Try Verbia free`（仅在实际条款允许时）。
- 错误：`free tool`、`completely free`、`unlimited free`，除非产品事实后来明确改变。
- 正确：`draft`, `generate`, `help you reply`, `review before sending`。
- 错误：`automatically sends`, `auto-replies for you`, `hands-free sending`。
- 任何平台支持声明必须与当前已发布产品能力一致。

---

## 9. SEO 内容生产顺序

1. 建立测量基线：indexation、Search Console、analytics、CTA events、extension install/signup attribution。
2. 先发布 Batch 1 P0：#1–#10；建议再细分为两轮，每轮 4–5 页，便于观察 crawl、ranking 与 conversion。
3. 优先保证 `/email-reply-generator/` 与 Gmail roadmap 的产品体验真实可用。
4. 发布 Batch 1 P1：#11–#15，并在发布前执行 cannibalization review。
5. 根据 impressions、query overlap、engagement、demo starts、install/signup 决定 Batch 2；不要只看 sessions。
6. Batch 3 先做 2–3 页实验；没有 impressions 或 Product Fit 不成立时停止扩张。
7. 每 4–8 周复核：query mapping、SERP intent、内容陈旧、平台能力和 CTA 准确性。

### 页面优先级评分逻辑

不要机械相乘 Semrush 数字。使用以下定性/半定量维度：

- Search demand evidence
- Keyword difficulty / SERP attainability
- Product Fit
- Conversion Intent
- Roadmap/platform readiness
- Ability to demonstrate context + intent + My Voice
- Cannibalization risk
- Content differentiation potential

Product Fit 或平台真实性不成立时，即使 Volume 大也应降级。

---

## 10. Future Agent Do / Don't

### Do

- 先读本文，再读目标页面现有代码、品牌语气和真实产品能力。
- 每个 URL 建立 keyword map：一个 primary intent + 同义 secondary variants + 明确排除 intent。
- 发布前抽查 SERP，尤其是页面方向被标成“推断/待验证”时。
- 合并 `reply/respond`、单复数、介词差异等同一 intent 变体。
- 写 search-intent content，并嵌入 contextual Verbia demo 与产品 CTA。
- 在 copy 中突出 `native-language intent + conversation context + platform style + My Voice → natural reply`。
- 明示 reply 由用户 review 后发送。
- 给数据写来源和日期；缺数据写 `unknown` / `not validated`。
- 用 Search Console 真实 query 决定拆页、合页与更新。

### Don't

- 不要把 15 页写成 15 篇套壳传统博客。
- 不要伪造 Volume、KD、CPC、用户数、支持平台或产品能力。
- 不要看到 Semrush 自动 page/cluster 就直接生成 URL。
- 不要为每个同义关键词做独立页，不要制造 keyword cannibalization。
- 不要把 Verbia 宣传成 free tool；它是有 Free plan/free daily quota 的 freemium 产品。
- 不要声称 auto-send，或设计成未经用户审阅就发送。
- 不要把 Reddit 产品支持误读成 Reddit SEO acquisition opportunity。
- 不要追 academic discussion-board 作业 intent、generic rewriter 红海或无关技术帮助 intent。
- 不要在 Outlook/LinkedIn adapter 上线前写成“works natively in Outlook/LinkedIn”。
- 不要只按 traffic 排优先级；产品契合与转化必须进入决策。

---

## 11. Agent-readable execution summary

```yaml
document:
  name: Verbia_SEO_Research_and_Landing_Page_Roadmap_2026-09-11
  research_date: 2026-09-11
  market: US
  source_of_truth:
    - today's Semrush research conversation
    - Verbia-SEO-Master_pages_2026-09-11.csv
  numeric_policy: "Only use exact Volume/KD/CPC when explicitly recorded; otherwise null and mark inferred_or_pending_validation."

product:
  category: "AI Reply & Writing Assistant"
  core_value_pipeline:
    - native_language_intent
    - conversation_context
    - platform_style
    - my_voice
    - natural_reply
  sending_policy: "user_reviews_and_sends; never_auto_send"
  pricing_copy:
    allowed: ["Free plan", "free daily quota", "free daily allowance", "Try Verbia free when factually accurate"]
    forbidden: ["free tool", "completely free", "unlimited free unless factually true"]
  roadmap:
    reddit: completed_product_validation_platform
    gmail_web: next
    outlook_web: after_gmail
    linkedin: after_outlook

market_distinction:
  product_validation_platform: [reddit]
  seo_acquisition_clusters: [email_reply_response, career_workplace, delicate_communication]

clusters:
  - id: C1
    name: Email Reply & Response
    priority: P0
    status: validated
    platform_alignment: gmail_web
  - id: C2
    name: Career & Workplace Communication
    priority: P0
    status: validated
    subtopics: [interview, job_offer, recruiter, linkedin_recruiter, raise, workplace_feedback]
  - id: C3
    name: Delicate Communication / What to Say
    priority: P1
    status: validated
    elevated_p0_subtopics: [payment_request, polite_reminder]
    subtopics: [follow_up, no_response, clarification, negative_review, customer_complaint]

rejected_or_reclassified:
  natural_english: positioning_not_cluster
  english_sentence_rewriter: do_not_compete_directly
  ai_reply_assistant: product_category_not_cluster
  generic_reply_generator: split_by_specific_scenario
  generic_message_reply: P2_low_commercial_fit
  discussion_response: reject_academic_assignment_intent
  reddit_reply: validation_platform_not_acquisition_cluster
  customer_support_canned_response: polluted_intent_keep_selected_business_subtopics

batch_1:
  - {order: 1, slug: /how-to-reply-to-an-email-professionally/, cluster: C1, priority: P0}
  - {order: 2, slug: /email-reply-generator/, cluster: C1, priority: P0}
  - {order: 3, slug: /how-to-follow-up-on-an-email-politely/, cluster: C1_C3, priority: P0}
  - {order: 4, slug: /how-to-reply-to-an-interview-invitation/, cluster: C2, priority: P0}
  - {order: 5, slug: /how-to-respond-to-a-job-offer-email/, cluster: C2, priority: P0}
  - {order: 6, slug: /how-to-reply-to-a-recruiter/, cluster: C2, priority: P0}
  - {order: 7, slug: /how-to-reply-to-a-recruiter-on-linkedin/, cluster: C2, priority: P0}
  - {order: 8, slug: /how-to-politely-decline-a-job-offer/, cluster: C2, priority: P0}
  - {order: 9, slug: /how-to-ask-for-payment-politely/, cluster: C3, priority: P0}
  - {order: 10, slug: /how-to-remind-someone-politely/, cluster: C3, priority: P0}
  - {order: 11, slug: /how-to-follow-up-after-no-response/, cluster: C3, priority: P1}
  - {order: 12, slug: /how-to-ask-for-a-raise-professionally/, cluster: C2, priority: P1}
  - {order: 13, slug: /how-to-respond-to-negative-feedback/, cluster: C2, priority: P1}
  - {order: 14, slug: /how-to-respond-to-a-negative-review/, cluster: C3_business, priority: P1}
  - {order: 15, slug: /how-to-ask-for-clarification-politely/, cluster: C3, priority: P1}

implementation_constraints:
  page_model: "search_intent_content + contextual_Verbia_demo + Add_to_Chrome_or_product_CTA"
  avoid_traditional_blog_only: true
  avoid_keyword_cannibalization: true
  merge_synonymous_queries: true
  verify_serp_before_new_url: true
  platform_claims_must_match_release_status: true
  no_fabricated_metrics: true
  no_auto_send_claims: true

next_action:
  - audit_existing_site_and_URLs
  - map_batch_1_keywords_to_one_URL_each
  - implement_batch_1_P0_in_two_small_waves
  - add_measurement_for_demo_start_and_install_signup
  - review_Search_Console_before_batch_2
```

---

## 12. 最终执行原则

Verbia 的 SEO 不应围绕“我们给这个新品类取了什么名字”，而应围绕用户已经表达的具体任务：

> **How do I reply? What should I say? How can I say it professionally without losing my real intent?**

每个页面都要先把这个问题回答好，再让用户看到 Verbia 比静态模板多出的关键一步：它理解真实 conversation context，接受用户的母语 intent，遵循平台风格和 My Voice，生成供用户审阅的自然回复。
