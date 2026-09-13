# Verbia SEO 建设工作步骤与执行记录

> 状态：待执行，按用户指令逐步推进  
> 创建日期：2026-09-13  
> 依据文档：[`Verbia_SEO_Research_and_Landing_Page_Roadmap_2026-09-12_v3.md`](./Verbia_SEO_Research_and_Landing_Page_Roadmap_2026-09-12_v3.md)  
> 目标市场：美国 / 英文搜索  
> 执行原则：一次只推进用户指定的步骤或页面；每批完成后停下，等待确认。

## 1. 使用方法

- 本文记录实施状态、决策、检查结果和后续动作；v3 路线图继续作为研究与策略的唯一依据。
- 状态统一使用：`未开始`、`进行中`、`待确认`、`已完成`、`受阻`、`已取消`。
- 未得到下一步指令前，不自行开始后续批次。
- 每次实现后更新本文对应条目、验证结果和变更记录。
- 页面发布由用户自行完成；本工作流只准备代码与上线前检查。

## 2. 当前事实基线

以下事实以当前产品和仓库为准，页面生产时必须覆盖路线图中的旧状态：

| 项目 | 当前事实 | 页面要求 |
|---|---|---|
| 自动模式 | 已支持 Reddit、Gmail 网页版、Outlook 网页版 | 可以如实宣传这三个自动模式场景 |
| 通用模式 | 其他受支持网页编辑器可使用所选文字作为上下文 | 不承诺所有网站或所有富文本编辑器都能直接插入 |
| 浏览器 | 已上架 Google Chrome 和 Microsoft Edge | CTA 使用自动识别商店的“Install now”；不能只写 `Add to Chrome` |
| LinkedIn | 尚无专用自动模式 | LinkedIn 页面只能提供通用模式或信息内容，不能暗示专用适配已上线 |
| 用户控制 | 只生成草稿，由用户审阅并发送 | 所有页面必须避免 auto-send、bulk messaging 等表述 |
| 免费套餐 | 每天 10 次生成 | 可写 `10 free generations per day`，不得称为无限免费工具 |
| 语言 | 用户可用任意语言表达意图，回复也可选择任意语言 | 不把产品限定为英语学习或非英语母语用户工具 |

## 3. 现有页面与 URL 风险基线

当前已有 9 个英文 SEO 落地页：

| 现有 URL | 当前角色 | 与新路线图的关系 |
|---|---|---|
| `/ai-reply-generator/` | 通用产品页 | 保留；为 situation 页提供产品内链 |
| `/ai-email-reply-generator/` | 邮件产品页 | 已确定为 Email Reply Generator 唯一 intent owner；不再创建 `/email-reply-generator/` |
| `/context-aware-reply-generator/` | 上下文能力页 | 保留；为各场景解释上下文能力 |
| `/multilingual-reply-generator/` | 多语言能力页 | 保留；承接 native-language intent 价值 |
| `/ai-browser-writing-assistant/` | 浏览器产品页 | 保留；承接 Chrome/Edge 安装 |
| `/gmail-ai-reply-assistant/` | Gmail 平台页 | Gmail 已支持，可作为邮件场景页的平台内链 |
| `/outlook-ai-reply-assistant/` | Outlook 平台页 | Outlook 已支持，可作为邮件场景页的平台内链 |
| `/reddit-reply-generator/` | Reddit 场景/产品页 | 保留为产品验证与演示，不作为核心获客 Cluster |
| `/ai-reddit-assistant/` | Reddit 平台页 | 与上一页边界后续复核，但不阻塞首批 Email 页面 |

首个生产批次开始前的基础事项：

- [x] `已完成` 确认 `/ai-email-reply-generator/` 为唯一 Email Reply Generator intent owner，不创建 `/email-reply-generator/`。
- [x] `已完成` 建立完整 URL registry，覆盖现有页面、Top 10 与 Batch 2/3。
- [x] `已完成` 检查 sitemap、页脚、首页和现有落地页的内链容纳方式；具体链接在页面上线时加入，避免死链接。

## 4. 分批执行计划

### 阶段 0：生产基础与规则校准

**目标：** 在写第一张页面前固定 URL、模板、产品事实和 QA 标准。

- [x] `已完成` 创建 [`SEO_URL_REGISTRY.md`](./SEO_URL_REGISTRY.md)，录入现有页面、Top 10、Batch 2/3 的 intent owner、slug、cluster、证据和状态。
- [x] `已完成` 处理 `/ai-email-reply-generator/` 与 `/email-reply-generator/` 的重合风险：保留前者，不创建后者。
- [x] `已完成` 确认根级短 slug 作为当前 URL 结构，不进行无必要目录迁移。
- [x] `已完成` 定义 [`SEO_PAGE_SPEC_TEMPLATE.md`](./SEO_PAGE_SPEC_TEMPLATE.md)。
- [x] `已完成` 在 [`SEO_PRODUCTION_ARCHITECTURE.md`](./SEO_PRODUCTION_ARCHITECTURE.md) 中定义可复用组件边界和提取时机。
- [x] `已完成` 设计 `/situations/` 与 `/career/` Hub 的信息结构；暂不创建空页面或子 Hub。
- [x] `已完成` 记录当前技术基线：metadata、canonical、schema、sitemap、robots、移动端、性能和埋点。
- [x] `已完成` 完成产品事实校准：Gmail/Outlook 已上线，Chrome/Edge 已上架，LinkedIn 未专用适配。

**完成门槛：已达到。** URL 无未决冲突；模板、组件边界、Hub 架构和事实表已记录；尚未生成 Top 10 页面。

### 阶段 1：Top 10 第一组——最高优先级邮件场景

#### 1A. `/follow-up-email-after-no-response/`

- [x] `已完成` 填写完整 [`Page Specification`](./specs/follow-up-email-after-no-response.md)。
- [x] `已完成` 明确与 generic follow-up 的边界。
- [x] `已完成` 记录 keyword-demand、SERP/competitor 和 inference 三类证据。
- [x] `已完成` 编写真实邮件上下文、母语 intent 和自然回复演示。
- [x] `已完成` 实现页面、metadata、canonical、FAQ schema、现有页面内链和 sitemap。
- [x] `已完成` 完成内容、信任、桌面/移动端、可访问性与技术 QA。

#### 1B. `/how-to-ask-for-payment-politely/`

- [x] `已完成` 填写完整 [`Page Specification`](./specs/how-to-ask-for-payment-politely.md)。
- [x] `已完成` 区分首次付款请求、到期提醒、短期逾期和深度催收的页面范围。
- [x] `已完成` 设计包含发票、金额、到期状态、母语 intent 和自然回复的 contextual demo。
- [x] `已完成` 实现页面、metadata、canonical、FAQ schema、双向内链、页脚入口、sitemap 与完整 QA。

**批次停止点：** 两页完成后汇报差异、验证结果和待决策项，等待用户指令。

### 阶段 2：Top 10 第二组——Offer 与 Confirmation

#### 2A. `/how-to-respond-to-a-job-offer-email/`

- [x] `已完成` 填写完整 [`Page Specification`](./specs/how-to-respond-to-a-job-offer-email.md)。
- [x] `已完成` 覆盖接受、请求考虑时间、澄清条款和初步协商。
- [x] `已完成` 将明确拒绝留给独立 decline 页面。
- [x] `已完成` 实现页面、交互 demo、metadata、FAQ schema、内链、sitemap 与完整 QA。

#### 2B. `/reply-to-email-confirmation/`

- [x] `已完成` 填写完整 [`Page Specification`](./specs/reply-to-email-confirmation.md)。
- [x] `已完成` 将混合 SERP 的 owner 限定为“回应已成立的 confirmation”。
- [x] `已完成` 排除 RSVP、confirm participation 和 interview invitation，避免 cannibalization。
- [x] `已完成` 实现页面、交互 demo、metadata、FAQ schema、内链、sitemap 与完整 QA。

**批次停止点：** 两页完成后检查 query 覆盖和潜在 cannibalization，等待用户指令。

### 阶段 3：Top 10 第三组——Reminder、Recruiter 与 Interview

#### 3A. `/how-to-remind-someone-politely-in-an-email/`

- [x] `已完成` 填写完整 [`Page Specification`](./specs/how-to-remind-someone-politely-in-an-email.md)。
- [x] `已完成` 定义 reminder 与 generic follow-up、no-response 和 payment reminder 的内容边界。
- [x] `已完成` 实现三个时间阶段 demo、metadata、FAQ schema、内链、页脚、sitemap 与完整 QA。

#### 3B. `/how-to-reply-to-a-recruiter-on-linkedin/`

- [ ] `未开始` 复核 LinkedIn 未专用适配时的产品承接与 CTA 真相。
- [ ] `未开始` 避免暗示 LinkedIn 自动模式或 auto-reply。
- [ ] `未开始` 实现页面与完整 QA。

#### 3C. `/how-to-respond-to-an-interview-invitation-email/`

- [ ] `未开始` 限定为收到邀请后的接受、确认与排期。
- [ ] `未开始` 排除 interview thank-you 和 post-interview follow-up。
- [ ] `未开始` 实现页面与完整 QA。

**批次停止点：** 三页完成后复核 Career cluster 骨架，等待用户指令。

### 阶段 4：Top 10 第四组——Generic Follow-up、Decline 与产品入口

#### 4A. `/how-to-follow-up-on-an-email-politely/`

- [ ] `未开始` 作为 generic follow-up intent owner。
- [ ] `未开始` 明确导向 no-response、client、meeting、interview 和 payment 子场景的内链。
- [ ] `未开始` 实现页面与完整 QA。

#### 4B. `/how-to-politely-decline-a-job-offer/`

- [ ] `未开始` 聚合 decline/reject/turn down/refuse 同义需求。
- [ ] `未开始` 与 job-offer response 父级页保持清晰边界。
- [ ] `未开始` 实现页面与完整 QA。

#### 4C. Email Reply Generator 产品入口

- [ ] `未开始` 按阶段 0 决策增强现有 `/ai-email-reply-generator/`，不创建或迁移到近义 URL。
- [ ] `未开始` 让产品页承接全部 email situation 页面，避免与 how-to 页面竞争同一 intent。
- [ ] `未开始` 实现页面与完整 QA。

**批次停止点：** Top 10 完成后不直接进入 Batch 2；先等待真实数据和用户确认。

### 阶段 5：Hub 与全站内链

- [ ] `未开始` 实现 `/situations/` Hub 及必要的高质量子 Hub。
- [ ] `未开始` 实现 `/career/` Hub 及必要的高质量子 Hub。
- [ ] `未开始` 从首页和页脚提供清晰入口。
- [ ] `未开始` 为每个 situation 页补齐父 Hub、兄弟场景、产品页和已支持平台页链接。
- [ ] `未开始` 检查 anchor 自然度，避免全站机械重复 exact-match anchor。
- [ ] `未开始` 更新 sitemap，并确认所有 intended indexable 页均可被发现。

### 阶段 6：Batch 2（仅在用户确认后）

候选顺序沿用 v3 路线图：

1. `/follow-up-with-a-client-without-being-pushy/`
2. `/ask-for-help-politely-in-an-email/`
3. `/request-something-by-email/`
4. `/confirm-participation-by-email/`
5. `/interview-thank-you-email/`
6. `/follow-up-email-after-interview/`
7. `/follow-up-email-after-meeting/`
8. `/how-to-decline-an-interview/`
9. `/respond-to-a-customer-complaint/`
10. `/respond-to-a-low-salary-offer/`
11. `/how-to-say-no-professionally/`
12. `/how-to-decline-a-meeting/`

- [ ] `未开始` 发布前逐页重新执行 intent、SERP 和 cannibalization gate。
- [ ] `未开始` 特别检查 confirmation、RSVP 和 meeting invitation 的重合。

### 阶段 7：Batch 3 与长期扩展（暂不执行）

- [ ] `未开始` 只在 Search Console、产品转化或新 SERP 证据足以支持时选择页面。
- [ ] `未开始` 所有 `inference_to_validate` 页面发布前补足验证。
- [ ] `未开始` LinkedIn 专用平台页必须等待专用适配上线。
- [ ] `未开始` broad informational 内容必须等待站点权威和转化证据，不因搜索量单独启动。

## 5. 单页生产 Gate

每个页面都必须逐项通过，不能用批量模板跳过：

- [ ] Intent brief：一句话说明用户此刻要完成的沟通任务。
- [ ] Evidence record：证据类型和日期清楚，没有可靠数字就不写数字。
- [ ] Cannibalization check：与现有和规划 URL 比较，确认唯一 intent owner。
- [ ] SERP pattern：确认是 how-to、examples、tool 或 mixed。
- [ ] Search answer：首屏附近直接解决问题并给出可用例子。
- [ ] Product demo：包含真实 context、关系、语气和目标。
- [ ] Native-language intent：体现用户可用任意语言表达真实意思。
- [ ] Generated reply：说明 context 如何改变结果，结果自然可编辑。
- [ ] Trust：用户审阅并发送；never auto-send；每天 10 次免费生成。
- [ ] Platform truth：只宣传真实支持的平台与模式。
- [ ] Browser CTA：Chrome/Edge 自动识别，不能只面向 Chrome。
- [ ] Internal links：父 Hub、相邻场景、产品页、相关平台页。
- [ ] Technical SEO：唯一 title/H1、self-canonical、indexability、schema、sitemap。
- [ ] UX QA：响应式、键盘操作、焦点、可读性和性能。
- [ ] Validation：类型检查、生产构建和静态导出通过。

## 6. 发布后复盘计划

部署由用户完成，并记录实际发布日期。每个批次按以下节奏复盘：

| 时间 | 主要检查 | 不做什么 |
|---|---|---|
| 2 周 | 收录、canonical、抓取与技术错误 | 不用短期排名判断页面失败 |
| 4 周 | impressions、初始 query、CTR、内链发现 | 不频繁改 slug |
| 8 周 | query coverage、页面间抢词、demo 与安装点击 | 不因单一波动批量改页 |
| 12 周 | 页面家族表现、留存和付费转化 | 没有证据不扩大量级 |

## 7. 执行日志

| 日期 | 批次/页面 | 动作 | 结果 | 下一步 |
|---|---|---|---|---|
| 2026-09-13 | 准备阶段 | 阅读 v3 路线图；盘点当前路由、sitemap 和产品状态；创建本执行记录 | 已完成 | 等待用户指定第一步 |
| 2026-09-13 | 阶段 0 | 建立 URL registry、Page Specification 模板、生产架构和技术基线；完成产品事实校准 | 已完成；类型检查和生产构建通过 | 等待用户指示是否进入阶段 1A |
| 2026-09-13 | 阶段 1A · Specification | 完成 no-response follow-up 页的 intent、证据、内容、demo、metadata、内链和 QA 方案 | 待用户确认 | 确认后实现页面 |
| 2026-09-13 | 阶段 1A · Implementation | 实现页面、三种情境切换、FAQ schema、sitemap 与产品页反向内链 | 本地完成；类型检查、构建及桌面/390px 视觉检查通过 | 等待用户审阅页面 |
| 2026-09-13 | 阶段 1B · Specification | 完成 polite payment request 页的 intent、证据、边界、内容、demo、metadata、内链和 QA 方案 | 待用户确认 | 确认后实现页面 |
| 2026-09-13 | 阶段 1B · Implementation | 实现付款请求页、三种付款阶段切换、FAQ schema、sitemap、页脚入口及相邻页面双向内链 | 本地完成；类型检查、生产构建、桌面/390px 视觉与交互检查通过 | 等待用户审阅页面 |
| 2026-09-13 | 阶段 2A/2B · Implementation | 完成 job offer response 与 email confirmation 两页规格；实现共享情境组件、7 个真实场景、FAQ schema、sitemap、页脚及相邻页内链 | 本地完成；类型检查、生产构建、桌面/390px 视觉与交互检查通过 | 等待用户审阅两页 |
| 2026-09-13 | 阶段 3A · Implementation | 完成 polite email reminder 规格与页面；实现截止日前、当天、逾期三个场景及相关 owner 内链 | 本地完成；类型检查、生产构建、320/390px 与桌面视觉和交互检查通过 | 等待用户审阅页面 |

## 8. 决策日志

| 日期 | 决策 | 原因 | 影响范围 |
|---|---|---|---|
| 2026-09-13 | v3 路线图保留为研究依据，执行时以当前产品事实校准旧描述 | Gmail、Outlook、Edge 已在路线图完成后上线 | 所有新页面与 CTA |
| 2026-09-13 | SEO 工作按小批次完成，每批后停止 | 便于逐页审阅，并根据真实数据调整 | Top 10、Batch 2/3 |
| 2026-09-13 | 保留 `/ai-email-reply-generator/`，不创建 `/email-reply-generator/` | 前者已上线并完整承担产品 intent；新建近义 URL 会造成 cannibalization 和迁移成本 | Top 10 #10、所有 email situation 内链 |
| 2026-09-13 | 新 situation 页继续使用根级短 slug | 与现有结构一致，避免无收益的目录迁移 | Top 10 与 Batch 2/3 |
| 2026-09-13 | 复用组件在第一张页面落地时按真实设计实现 | 先固定职责，避免在没有第二处复用前过度抽象 | Top 10 页面代码结构 |

## 9. 当前下一步

`阶段 3A 已本地完成`。等待用户审阅新页面；收到下一阶段指令后直接进入实现。
