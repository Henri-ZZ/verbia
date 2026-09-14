# Page Specification: AI Email Reply Generator

## 页面身份

| 字段 | 内容 |
|---|---|
| Status | ready_local enhancement |
| Intent owner | `/ai-email-reply-generator/` |
| Target market/language | United States / English |
| Cluster | C1 — Email Reply Product |
| Work stage | Top 10 · Stage 4C · #10 |

## Intent 与边界

本页承接“使用 AI 基于邮件上下文生成回复”的产品意图，是 Email Reply Generator 唯一 owner。保留现有 URL 和 self-canonical，不创建 `/email-reply-generator/`。

- 本页解释产品能力、工作方式、支持平台与免费额度。
- 各 how-to 页面承接具体沟通任务及示例，本页不扩写成多个相互竞争的 how-to 教程。
- 自动模式仅支持 Gmail 与 Outlook web；用户可以用任意语言描述意图并独立选择输出语言。

## 4C 增强

- 新增完整 Email Situations 目录，链接当前所有邮件场景 owner。
- 将产品能力链接独立成组，连接 Gmail、Outlook、多语言和上下文页面。
- CTA 明确每天 10 次免费生成、Chrome/Edge 与用户自行发送。
- 新增 4B 后保持产品页、job offer response 与 decline 页的清晰关系。

## QA

- [x] 唯一 title、description、H1、canonical 和 FAQ schema。
- [x] 所有 intended situation URL 可从产品页发现。
- [x] 不存在 `/email-reply-generator/` 页面或 sitemap 条目。
- [x] typecheck、production build、diff check 与 320px 至桌面视觉 QA。

部署后记录 publish date 和 Search Console；analytics identifier：`ai_email_reply_generator`。

