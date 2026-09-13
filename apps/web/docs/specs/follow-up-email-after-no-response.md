# Page Specification: Follow-Up Email After No Response

## 1. 页面身份

| 字段 | 内容 |
|---|---|
| Page name | Follow-Up Email After No Response |
| Status | ready for user review |
| Intent owner | `/follow-up-email-after-no-response/` |
| Target market/language | United States / English |
| Cluster | C1 — Email Reply & Response |
| Planned publish batch | Top 10 · Stage 1A · #1 |

## 2. Intent 与证据

**Intent brief（一句话）：** 用户已经发出一封需要对方回应的邮件，但尚未收到回复；现在需要写一封礼貌、清楚、有下一步且不过度施压的跟进邮件。

**Primary keyword：** `how to write a follow up email after no response`

**Search intent：** mixed（how-to + examples；产品工具作为第二层承接）

**Secondary semantic cluster：** `follow up email after no response`、`how to politely follow up on an unanswered email`、`follow-up email after no response example`、`polite follow-up email after no response`。这些属于同一个 no-response communication job，不创建独立 URL，也不相加搜索量。

| Query/evidence | Volume | KD | CPC | Evidence type | Source/date | 用途 |
|---|---:|---:|---:|---|---|---|
| how to write a follow up email after no response | US 720 / Global 1.4K | 17 | $6.72 | semrush_keyword_demand | v3 roadmap / 2026-09-12 | Primary keyword、生产优先级、mixed commercial value |
| follow up email after no response | 1,300 | 35 | — | competitor_ranking | Fyxer ranking record in v3 / 2026-09-12 | Secondary cluster；证明独立 URL 架构 |
| how to politely follow up on an unanswered email | 210 | 34 | — | semrush_keyword_demand | v3 roadmap / 2026-09-12 | Polite/unanswered wording覆盖 |
| how to politely follow up on an unanswered email | 210 | 22 | — | competitor_ranking | Fyxer ranking record in v3 / 2026-09-12 | 竞争页面证据；不与 demand KD 混用 |
| LiveAgent #1, Page AS17/RD45; Indeed #2, AS30/RD20; lower-authority pages and Reddit also visible | — | — | — | competitor_ranking | SERP validation in v3 / 2026-09-12 | 说明 SERP 接受 how-to/example 页面且存在切入空间 |
| 用户需要真实措辞而非只看规则 | — | — | — | inference_to_validate | v3 Reddit/SERP interpretation / 2026-09-12 | 决定采用真实 context + intent + reply 演示 |

说明：两条 KD 来自不同证据记录，保留原值与来源，不自行统一或推算。

## 3. URL Governance

| 字段 | 内容 |
|---|---|
| Final slug | `/follow-up-email-after-no-response/` |
| Intent owner | Follow-up triggered specifically by no response to a previous email |
| Self-canonical | `https://verbia.henriz.dev/follow-up-email-after-no-response/` |
| Closest existing/planned URLs | `/how-to-follow-up-on-an-email-politely/`、`/how-to-remind-someone-politely-in-an-email/`、`/follow-up-with-a-client-without-being-pushy/`、`/follow-up-email-after-interview/`、`/how-to-ask-for-payment-politely/` |
| Why this deserves a separate URL | 触发条件是上一封邮件未获回复；Fyxer 使用独立 URL，且 v3 SERP 证据确认该 query family 可由专页排名 |
| Included variants | 第一次轻提醒、带截止日期的跟进、第二次跟进、允许对方给出新时间、简短 follow-up |
| Explicitly excluded intents | 普通状态跟进、会议后总结、面试后跟进、客户专属跟进、付款提醒、求职申请跟进 |
| Redirects required | none |

**Cannibalization conclusion：** 可以独立建页。未来 `/how-to-follow-up-on-an-email-politely/` 负责不以“未回复”为必要条件的 generic follow-up；本页 H1、examples、FAQ 和内链始终围绕 unanswered email。Reminder 页围绕已经约定的动作或期限，不把“无回复”作为核心意图。

## 4. SERP Pattern

| 项目 | 记录 |
|---|---|
| Dominant result type | Mixed：how-to guidance、examples/templates、职业建议和真实讨论 |
| Common answer structure | 何时跟进、邮件结构、可复制示例、不同语气/场景、常见错误 |
| Weakness in current results | 静态模板往往不知道上一封邮件的请求、关系、截止日期和用户真正希望得到的下一步 |
| Evidence date | 2026-09-12，引用 v3 已保存的 Semrush/SERP 记录；本阶段不恢复无边界研究 |
| What Verbia adds | 结合上一封邮件 context、用户任意语言表达的 intent、关系与语气，生成可审阅的自然跟进草稿 |

## 5. Metadata

| 字段 | 草案 |
|---|---|
| SEO title | Follow-Up Email After No Response: Examples | Verbia |
| Meta description | Learn how to write a polite follow-up email after no response, see examples for different situations, and turn your intent into a natural draft. |
| H1 | How to write a follow-up email after no response |
| Open Graph title | Write a Polite Follow-Up Email After No Response |
| Open Graph description | Use clear examples and conversation context to follow up without sounding pushy. |
| Canonical | `/follow-up-email-after-no-response` |
| Robots | index, follow |
| Schema | FAQPage only；FAQ 必须在页面可见，暂不添加 HowTo schema |

## 6. 首屏 Search Answer

**2–4 句直接答案：**

> A good follow-up email after no response should briefly reference your earlier message, restate the action or answer you need, and make the next step easy. Keep the tone neutral: the recipient may be busy, away, or waiting on someone else. If timing matters, include a clear date and offer a simple way to update you if they need more time.

**可立即使用的短例子：**

> Hi Maya, I wanted to follow up on the proposal I sent on Tuesday. Could you let me know whether we can move forward by Thursday? If you need more time, a quick update on the expected timing would help me plan the next steps. Thanks, Alex

**Primary CTA：** `Create a follow-up with Verbia`，调用现有 `InstallLink`，自动识别 Chrome/Edge。

**Secondary CTA：** `See examples`，跳到页面内 meaningful variations。

**Trust line：** `Verbia prepares the draft. You review and send it yourself.`

首屏不先讲产品定义；先给答案和一个能直接使用的示例。

## 7. Contextual Verbia Demo

**演示标题：** `The same follow-up changes when the context changes.`

**上一封邮件/可见上下文：**

> Subject: Revised launch plan  
> Hi Jordan, I’ve attached the revised launch plan with the changes from Monday’s review. Could you approve the final timeline by Tuesday so the design team can begin on Wednesday?

界面显示：`Sent Thursday · No reply after 4 business days`

**关系与阶段：** 同事或跨团队负责人；第一次跟进；原审批日期已经过去，但项目仍可调整。

**用户希望达到的结果：** 在周五前得到批准；如果对方还不能决定，希望获得预计答复日期；保持合作语气。

**Native-language intent：**

> “礼貌提醒一下我上周发的方案。我周五前需要知道时间线能不能批准；如果他还没决定，请告诉我大概什么时候能回复。不要显得催得太紧。”

**Tone / length / platform style：** Professional、concise、email；输出语言 English。

**Generated natural reply：**

> Hi Jordan, I’m following up on the revised launch plan I sent last Thursday. Could you let me know by Friday whether the timeline is approved? If you need more time, an estimated decision date would help me plan the design kickoff. Thanks.

**为什么这个回复与上下文匹配：** 它引用了具体文档和发送时间，重申批准事项，把已错过的原日期改成新的明确日期，同时允许对方提供预计时间，避免把沉默解释成拒绝。

**可用 follow-up edits：** `Make it warmer`、`Make it shorter`、`Be more direct`。

**交互范围：** 首版使用三个可访问的情境切换按钮展示真实 context、intent 和 reply 如何一起变化。页面不提供不能真正生成结果的假输入框；用户自己的邮件通过安装 Verbia 在 Gmail/Outlook 中处理。

## 8. 页面 Sections

1. **Hero / direct answer** — H1、三句答案、短例子、Install CTA、trust line。
2. **A simple structure that works** — Reference previous email → restate the ask → give a next step/date → allow an update → close politely。
3. **Contextual Verbia demo** — 上一封邮件、母语 intent、生成回复和三个调整动作。
4. **Examples by meaningful variation** — 第一次轻提醒、带真实截止日期、第二次无回复。
5. **When to send the follow-up** — 以工作日和原邮件紧迫度为判断条件，避免编造统一等待天数。
6. **What to avoid** — guilt、假紧急、重复整封邮件、模糊的 “just checking in”、无下一步。
7. **Use it in Gmail or Outlook** — 说明自动模式使用可见邮件 context，用户审阅并点击 Send。
8. **Related situations** — 只渲染已上线目标；规划页上线后再加入 sibling links。
9. **FAQ** — 回答时间、语气、第二次跟进、标题、是否自动发送。
10. **Final CTA** — Install now；每天 10 次免费生成；Chrome/Edge 自动识别。

## 9. Meaningful Variations

| Variation | 为什么会改变回复 | 示例范围 |
|---|---|---|
| Gentle first follow-up | 对方可能只是忙，避免施压 | 引用上一封邮件 + 简单询问是否有机会查看 |
| Deadline-dependent follow-up | 用户的下一步确实依赖回复 | 说明真实日期和影响 + 允许对方提供新的预计时间 |
| Second follow-up | 已经提醒过一次，需要更短、更明确 | 简述此前两次联系 + 明确需要答复或应联系的替代人选 |

不单列“更礼貌”“更专业”等只改形容词的近义模板。

## 10. Internal Links

| Link type | Target | Suggested natural anchor | Why relevant | 首发是否渲染 |
|---|---|---|---|---|
| Parent Hub | `/situations/` | Explore more communication situations | 建立 situation library 关系 | Hub 上线后再渲染 |
| Sibling situation | `/how-to-follow-up-on-an-email-politely/` | How to follow up on an email politely | 适合并非因未回复触发的普通跟进 | 该页上线后再渲染 |
| Sibling situation | `/how-to-ask-for-payment-politely/` | Ask for payment without sounding harsh | 付款是独立且相关的 follow-up 任务 | 该页上线后再渲染 |
| Product page | `/ai-email-reply-generator/` | Generate a reply from the email context | Email Reply Generator 唯一产品入口 | 是 |
| Platform | `/gmail-ai-reply-assistant/` | Use Verbia in Gmail | Gmail 自动模式已上线 | 是 |
| Platform | `/outlook-ai-reply-assistant/` | Use Verbia in Outlook on the web | Outlook 自动模式已上线 | 是 |
| Capability | `/multilingual-reply-generator/` | Write the intent in any language | 支撑 native-language intent 差异点 | 是 |

首发不输出指向未创建页面的链接。

## 11. FAQ 草案

1. **How long should I wait before following up on an email?** 取决于原请求、已约定日期和紧急程度；普通邮件通常给出合理工作时间，期限已过则可及时跟进。避免把一个天数写成普遍规则。
2. **How do I follow up without sounding pushy?** 假设善意、引用具体事项、说明真实需要、给出容易回答的下一步，并允许对方更新预计时间。
3. **What should I say in a second follow-up email?** 更短且更明确，提到此前联系，说明需要的决定或替代联系人，不使用内疚或指责语言。
4. **Should I change the subject line?** 同一事项通常保留原线程以保存 context；只有主题或收件人发生实质变化时才考虑新主题。
5. **Can Verbia use the previous email as context?** Gmail 和 Outlook 网页版自动模式可在可用时读取相关可见邮件文字；用户在生成前检查 context。
6. **Will Verbia send the follow-up automatically?** 不会。Verbia 只准备可编辑草稿，用户审阅并自行点击发送。

## 12. Product Truth Review

- [x] Gmail/Outlook 自动模式表述与当前能力一致。
- [x] 没有把 LinkedIn 或其他未适配平台描述为自动模式。
- [x] 明确用户审阅并自行发送，没有 auto-send 暗示。
- [x] Free plan 写为每天 10 次生成，没有 `free tool` 或无限免费暗示。
- [x] 安装 CTA 使用现有 Chrome/Edge 自动识别组件。
- [x] 输入和输出语言没有被限定为英语。
- [x] 数据处理表述仅复用当前页面已有的可见 context 边界；实现时需与隐私政策终审。

## 13. 实现与 QA 计划

### Content

- [x] H1 与 no-response intent 一致，首屏先回答问题。
- [x] 三个 examples 分别改变触发条件或目标，不做同义句堆砌。
- [x] 与 generic follow-up、reminder、payment、interview follow-up 保持边界。
- [x] 不新增研究文档之外的搜索指标或排名主张。

### Technical SEO

- [x] 配置唯一 title、description、H1 和 self-canonical。
- [x] 页面默认 index/follow 并加入 sitemap。
- [x] FAQPage JSON-LD 与可见 FAQ 使用同一数据。
- [x] 内链只指向真实存在的页面。

### UX / Accessibility / Performance

- [x] 390px 移动端与桌面端视觉检查通过；CSS 从 320px 起采用单列布局，无已知横向溢出。
- [x] 情境切换使用语义化 button、`aria-pressed` 和可见焦点状态。
- [x] 无 JavaScript 时仍由服务端输出默认 context、intent、reply 和主要答案。
- [x] 每页一个 H1，section heading 层级连续。
- [x] 不增加第三方依赖；仅情境切换使用小型 Client Component。
- [x] 交互不依赖动画，按钮 transition 在 `prefers-reduced-motion` 下关闭。

### Build

- [x] `pnpm web:typecheck`
- [x] `pnpm web:build`
- [x] `git diff --check`

## 14. 发布与复盘

| 项目 | 内容 |
|---|---|
| Publish date | 待用户部署后记录 |
| Search Console inspection | 待发布 |
| Analytics page identifier | `follow_up_email_after_no_response`（实现时确认事件命名） |
| 2-week review | 待发布 |
| 4-week review | 待发布 |
| 8-week review | 待发布 |
| 12-week review | 待发布 |

## 15. 决策与变更记录

| 日期 | 变更 | 原因 | 证据 |
|---|---|---|---|
| 2026-09-13 | 将 primary intent 限定为 unanswered email | 与 generic follow-up 是两个 communication jobs | v3 Fyxer architecture + SERP validation |
| 2026-09-13 | 首版采用真实情境切换，不提供假生成输入框 | 保持产品化体验，同时不误导用户网页已提供真实生成服务 | 当前网站能力与 trust boundary |
| 2026-09-13 | 首发只链接已上线页面 | 防止死链接和空 Hub | Stage 0 architecture |
| 2026-09-13 | 完成页面实现、产品页反向内链与 sitemap | 让新页面可抓取且不是孤立 URL | 本地构建与视觉检查 |
