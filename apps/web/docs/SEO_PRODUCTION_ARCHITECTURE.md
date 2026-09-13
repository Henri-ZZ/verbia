# Verbia SEO 页面生产架构

> 状态：阶段 0 基线  
> 日期：2026-09-13  
> 作用：约束后续页面实现方式，不替代 Page Specification 或 URL Registry。

## 1. 最终架构决策

1. 保持 Next.js App Router 与静态导出，不引入 CMS、后端渲染或新的 UI 框架。
2. 继续使用根级 situation slug，避免为了目录形式迁移已有或新页面。
3. `/situations/` 与 `/career/` 作为内容充实的 Hub；子 Hub 按页面规模和真实导航价值后建。
4. 保留 `/ai-email-reply-generator/` 作为 Email Reply Generator 唯一产品入口，不创建 `/email-reply-generator/`。
5. Situation 页以 Server Component 和静态 HTML 为主；只有真实交互 demo 才使用小型 Client Component。
6. 公共页面模块通过数据 props 复用结构，但每页内容、例子、边界和 section 组合必须独立编写。

## 2. 页面职责

| 页面类型 | 解决的问题 | 主要 CTA | 不承担的职责 |
|---|---|---|---|
| Product | Verbia 是什么、如何生成回复 | Install now / Try Verbia | 不覆盖每个具体 communication job |
| Situation | 这个具体场景现在应该怎么回复 | Try it with your situation | 不泛讲整个产品或其他场景 |
| Platform | Verbia 在已支持平台怎样工作 | Install now | 不复制 situation 正文 |
| Capability | Context、多语言等能力如何改变结果 | Explore/Install | 不抢具体场景关键词 |
| Hub | 帮用户找到正确场景并建立主题关系 | 进入具体 situation | 不做空链接目录或复制子页 |

## 3. 推荐组件边界

后续在第一张页面实现时，按实际重复出现的结构提取，避免先造过度抽象组件。

| 组件 | 渲染方式 | 职责 | 关键约束 |
|---|---|---|---|
| `SituationHero` | Server | H1、直接答案、短例子、CTA、trust line | 首屏先回答搜索问题 |
| `ContextualReplyDemo` | Server-first；需要输入时再包 Client | 收到的消息、母语 intent、设置、生成回复 | 静态内容可索引；交互渐进增强 |
| `ReplyVariations` | Server | 展示会改变内容的关系/阶段/目标 variations | 禁止同义句凑数 |
| `AdaptationGuide` | Server | 解释 context、relationship、desired outcome | 与 demo 建立直接联系 |
| `ProductTruthCallout` | Server | review/send、免费额度、平台状态 | 使用统一事实来源 |
| `RelatedSituationLinks` | Server | Hub、兄弟页、产品和平台内链 | 描述性 anchor，不机械 exact-match |
| `SeoFaq` | Server | 可见 FAQ 与 JSON-LD 共用同一数据 | schema 不得与正文脱节 |
| `InstallLink` | Client | 识别 Chrome/Edge 商店 | 复用现有组件，不新写 CTA 检测逻辑 |

第一张页面落地前，再依据最终设计决定组件 API。只有第二处真实复用出现时才继续抽象，防止所有页面变成换词模板。

## 4. 内容数据与代码组织

建议结构：

```text
apps/web/
├── app/
│   ├── follow-up-email-after-no-response/page.tsx
│   ├── how-to-ask-for-payment-politely/page.tsx
│   ├── situations/page.tsx
│   └── career/page.tsx
├── components/
│   └── seo/
│       ├── situation-hero.tsx
│       ├── contextual-reply-demo.tsx
│       ├── reply-variations.tsx
│       ├── related-situation-links.tsx
│       └── seo-faq.tsx
└── lib/
    └── seo/
        ├── product-facts.ts
        └── structured-data.ts
```

- Page Specification 保存在 `docs/specs/`，文件名与 slug 对应。
- 页面主要内容直接靠近路由，便于审核独特性和 intent 边界。
- `product-facts.ts` 只保存稳定、跨页复用的产品事实，不保存大段营销文案。
- JSON-LD 从页面可见的同一份 FAQ/页面数据生成。

## 5. Hub 信息架构

### `/situations/`

- 清楚说明按沟通任务选择页面，而非按关键词列表选择。
- 首期分组：Follow up & remind、Ask & request、Reply & respond、Decline & say no。
- 每组提供简短判断规则和已上线页面，不展示无内容的死链接。
- 连接 `/ai-reply-generator/`、`/ai-email-reply-generator/` 和相关平台页。

### `/career/`

- 按事件阶段组织：Interview、Job offer、Recruiter、Workplace/payment。
- 明确 invitation response、thank-you、post-interview follow-up 是不同任务。
- LinkedIn recruiter 页面必须标明当前没有专用自动模式。
- 连接 Gmail/Outlook 已支持平台页和相应 situation 页。

## 6. Technical SEO 基线

| 项目 | 当前状态 | 后续规则 |
|---|---|---|
| Framework | Next.js 15 App Router、React 19、TypeScript | 保持静态优先 |
| Output | `output: "export"` | 所有 public SEO 页必须能静态导出 |
| Metadata base | `https://verbia.henriz.dev` | 页面使用相对 canonical 即可生成绝对 URL |
| Canonical | 现有 SEO 页均有 self-canonical | 新页必须显式配置 |
| Open Graph/Twitter | 现有 SEO 页普遍具备 | 新页按 specification 填写，后续统一分享图 |
| Schema | 首页 SoftwareApplication；SEO 页主要为 FAQPage | 只为可见内容添加，避免滥用 HowTo/Product schema |
| Sitemap | 手工数组维护 | 每次新增 indexable 页面同步更新；Hub 也需加入 |
| Robots | 全站 allow；部分功能页单页 noindex | SEO 页默认 index/follow |
| Locale | Top 10 暂只做英文 | 不创建空中文副本；未来独立 locale URL + hreflang |
| Analytics | GA4 已 lazy-load | 后续定义 SEO demo、CTA 事件；不阻塞静态内容 |
| Fonts | `next/font` | 继续保留，避免额外字体请求 |
| Images | 静态导出、当前 unoptimized | 图标明确宽高；大图另做体积与加载优先级检查 |
| Browser targets | 最近两个 Chrome/Firefox/Safari/Edge | 核心阅读体验不依赖实验性特性 |

2026-09-13 验证基线：类型检查通过；生产构建生成 31 个静态路由；公共 First Load JS 为 102 kB；SEO 落地页 First Load JS 为 111 kB；构建后的布局 CSS 内联约 68.7 KiB/页。后续批次应以此为对照，出现明显增长时说明原因。

## 7. 性能与可访问性预算

- 首屏答案、例子和核心结构直接输出为 HTML。
- 页面默认不增加第三方运行时依赖。
- 非交互 sections 不使用 Client Component。
- 交互 demo 延迟加载非关键逻辑，并保留静态示例作为基础体验。
- 每张图片声明尺寸，首屏 LCP 资源才设置高优先级。
- 移动端从 320px 起无横向滚动；触控目标、焦点状态与键盘顺序可用。
- 每页只有一个 H1；section heading 构成连续层级。
- 装饰图使用空 `alt`，信息图提供表达用途的替代文本。
- 动效遵循 `prefers-reduced-motion`，不让动画阻塞阅读或交互。

## 8. 内链实施规则

每张 situation 页至少包含：

1. 一个父 Hub 链接。
2. 一个真正相邻的 situation 链接；尚未上线时不渲染死链接。
3. `/ai-email-reply-generator/` 或 `/ai-reply-generator/` 产品链接。
4. 与场景匹配的 Gmail/Outlook 等已支持平台链接。

首页和页脚在第一批页面形成后再扩展入口，避免导航提前指向未上线页面。

## 9. 每批验证

```text
pnpm web:typecheck
pnpm web:build
git diff --check
```

另外人工检查：

- 生成的 HTML 中 canonical、title、description、schema 和内链正确。
- sitemap 包含新增 URL，功能页 noindex 状态未被误改。
- Chrome/Edge CTA 使用现有自动识别逻辑。
- 桌面与移动端进行视觉检查。

## 10. 当前未在阶段 0 实施的内容

- 不创建 Top 10 页面。
- 不创建 Hub 页面。
- 不修改现有页面视觉设计。
- 不部署 Cloudflare Pages。
- 不开始 Batch 2/3。

这些工作分别由后续批次在用户指令下执行。
