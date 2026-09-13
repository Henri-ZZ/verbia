# Verbia SEO Page Specification 模板

> 每个 Top 10 和后续页面必须复制并填写本模板。缺失字段不得靠批量模板猜测。

## 1. 页面身份

| 字段 | 内容 |
|---|---|
| Page name |  |
| Status | draft / review / ready / live |
| Owner |  |
| Target market/language | US / English |
| Cluster | C1 / C2 / C3 |
| Planned publish batch |  |

## 2. Intent 与证据

**Intent brief（一句话）：**

**Primary keyword：**

**Search intent：** how-to / examples / tool / mixed

**Secondary semantic cluster：**

| Query/evidence | Volume | KD | CPC | Evidence type | Source/date | 用途 |
|---|---:|---:|---:|---|---|---|
|  |  |  |  | semrush_keyword_demand / competitor_ranking / inference_to_validate |  |  |

禁止把近义词 Volume 机械相加。没有明确证据的数字留空。

## 3. URL Governance

| 字段 | 内容 |
|---|---|
| Final slug |  |
| Intent owner |  |
| Self-canonical |  |
| Closest existing/planned URLs |  |
| Why this deserves a separate URL |  |
| Included variants |  |
| Explicitly excluded intents |  |
| Redirects required | none / details |

**Cannibalization conclusion：**

## 4. SERP Pattern

| 项目 | 记录 |
|---|---|
| Dominant result type | how-to / examples / tool / mixed |
| Common answer structure |  |
| Weakness in current results |  |
| Evidence date |  |
| What Verbia adds | context + native-language intent + platform style + My Voice |

## 5. Metadata

| 字段 | 草案 |
|---|---|
| SEO title |  |
| Meta description |  |
| H1 |  |
| Open Graph title |  |
| Open Graph description |  |
| Canonical |  |
| Robots | index, follow |
| Schema | FAQPage / none / other justified type |

Schema 必须与页面可见内容一致。FAQPage 只在页面确有 FAQ 时使用。

## 6. 首屏 Search Answer

**2–4 句直接答案：**

**可立即使用的短例子：**

**Primary CTA：** Try it with your situation / Install now

**Trust line：** User reviews and sends. Verbia never auto-sends.

## 7. Contextual Verbia Demo

**收到的消息/可见上下文：**

**关系与阶段：**

**用户希望达到的结果：**

**Native-language intent：**

**Tone / length / platform style：**

**Generated natural reply：**

**为什么这个回复与上下文匹配：**

**可用 follow-up edits：** shorter / warmer / more direct / custom

## 8. 页面 Sections

按页面真实需要增删，不能为了长度填充：

1. Search answer and one useful example
2. Contextual interactive Verbia demo
3. Meaningful variations
4. How context, relationship and desired outcome change the reply
5. User review and send boundary
6. Product CTA and free allowance
7. FAQ
8. Related situations and product/platform links

## 9. Meaningful Variations

| Variation | 为什么会改变回复 | 示例范围 |
|---|---|---|
|  |  |  |

## 10. Internal Links

| Link type | Target | Suggested natural anchor | Why relevant |
|---|---|---|---|
| Parent Hub |  |  |  |
| Sibling situation |  |  |  |
| Product page |  |  |  |
| Supported platform |  |  |  |

## 11. Product Truth Review

- [ ] Gmail/Outlook/Reddit 自动模式表述与当前能力一致。
- [ ] LinkedIn 等未专用适配的平台没有被描述为自动模式。
- [ ] 用户审阅并自行发送；没有 auto-send 暗示。
- [ ] Free plan 写为每天 10 次生成，没有 `free tool` 或无限免费暗示。
- [ ] 安装 CTA 自动识别 Chrome/Edge，不只写 Add to Chrome。
- [ ] 输入和输出语言没有被限定为英语。
- [ ] 隐私或数据处理表述与当前政策及实现一致。

## 12. QA

### Content

- [ ] H1 与 intent 一致，首屏先回答问题。
- [ ] 示例自然、具体，不是同义句堆砌。
- [ ] 页面与相邻 owner 的边界清楚。
- [ ] 没有编造指标、排名、用户评价或能力。

### Technical SEO

- [ ] 唯一 title、description、H1。
- [ ] self-canonical 正确。
- [ ] 页面允许索引且出现在 sitemap。
- [ ] schema 与可见内容一致并可解析。
- [ ] 内链可抓取，无参数副本。

### UX / Accessibility / Performance

- [ ] 320px 至桌面宽度布局可用，无横向溢出。
- [ ] 键盘可访问交互控件，焦点清晰。
- [ ] heading 层级、landmark 和 accessible name 正确。
- [ ] 图片尺寸明确；有意义图片具备 alt，装饰图 alt 为空。
- [ ] 首屏不引入不必要的客户端 JavaScript 或大依赖。
- [ ] 交互 demo 在无 JavaScript 时仍保留可索引的答案与示例。

### Build

- [ ] `pnpm web:typecheck`
- [ ] `pnpm web:build`
- [ ] `git diff --check`

## 13. 发布与复盘

| 项目 | 内容 |
|---|---|
| Publish date |  |
| Search Console inspection |  |
| Analytics page identifier |  |
| 2-week review |  |
| 4-week review |  |
| 8-week review |  |
| 12-week review |  |

## 14. 决策与变更记录

| 日期 | 变更 | 原因 | 证据 |
|---|---|---|---|
|  |  |  |  |
