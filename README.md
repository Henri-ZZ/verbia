# Verbia

**You mean it. Verbia says it.**（官方中文：你的想法，Verbia 帮你表达。）

Verbia 是一个跨语言、理解当前对话上下文的回复助手：你只说意思，它负责把意思变成自然的目标语言草稿。品牌与文案规范见 [docs/BRAND.md](docs/BRAND.md)。

用户可以直接用自己熟悉的语言表达想法，Verbia 会结合当前回复位置附近的必要上下文，生成自然、忠实、符合平台语气的目标语言草稿。

Verbia 有一条不可突破的产品边界：**只生成、预览、复制和插入草稿，绝不替用户发送或提交内容。**

## 当前项目包含什么

这是一个轻量的 monorepo，即多个相关项目放在同一个代码仓库中：

```text
verbia/
├── apps/extension/       Chrome 插件前端
├── services/api/         AI 生成后端服务
├── packages/shared/      前后端共享的数据结构与校验规则
├── tests/                自动化测试
├── dist/extension/       构建后的可加载插件
└── artifacts/            打包后的插件 ZIP
```

运行时，插件和后端是两个独立的程序：Chrome 加载 `dist/extension`；后端通过 `pnpm api` 单独启动；插件在用户点击 Generate 后请求后端；后端负责调用 Gemini，插件中不保存 Gemini API Key。

## 当前已经实现的功能

- Chrome Manifest V3 插件工程。
- Reddit 帖子、目标评论和最多三层祖先评论的上下文提取。
- Universal Mode：在其他网页使用用户选中的文本，或者不带上下文生成。
- 文字和浏览器语音 Intent 输入。
- 输出语言、语气和长度控制。
- 生成前查看和移除上下文。
- 草稿预览、编辑、重新生成、复制和插入。
- 目标输入框已有内容时，要求用户选择追加或替换。
- Mock Provider 和可配置的 Gemini Provider。
- 请求校验、超时、取消、错误处理和本地设置。

## 本地运行

需要 Node.js 20 或更高版本，以及当前稳定版 Chrome。

第一次运行时，在项目根目录执行：

```bash
pnpm install
pnpm test
pnpm build
```

然后启动后端：

```bash
pnpm api
```

默认后端地址是 `http://localhost:8787`。`pnpm api` 会读取项目根目录的 `.env.local`；如果其中配置了 `LLM_PROVIDER=gemini`、有效模型 ID 和 API Key，就会调用真实 Gemini。

如果只想测试插件流程而不调用 Gemini，可以执行：

```bash
pnpm api:mock
```

## 在 Chrome 中加载插件

1. 打开 `chrome://extensions`。
2. 打开右上角的“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择本项目中的 `dist/extension` 目录。
5. 将 Verbia 固定到 Chrome 工具栏。

每次修改插件代码后，重新执行 `pnpm build`，然后在 `chrome://extensions` 中点击 Verbia 卡片上的刷新按钮。

## 使用方法

1. 在 Reddit 中打开一个回复框，Verbia 会自动出现在原输入框下方。
2. 点击 Chrome 工具栏中的 Verbia 图标，可以打开设置侧边栏。
3. 在其他网站先点击输入框，再使用快捷键：Windows/Linux 为 `Ctrl+Shift+Y`，macOS 为 `Command+Shift+Y`。
4. 检查内嵌 Verbia 面板显示的上下文。
5. 用中文或其他熟悉的语言写下想表达的意思。
6. 选择输出语言、语气和长度，然后点击 Generate。
7. 检查并编辑生成的草稿。
8. 点击 Insert 将草稿放入网页输入框，或者点击 Copy 手动复制。
9. 最终发送必须由用户自己在目标网站完成。

## 使用真实 Gemini

后端通过环境变量决定使用 Mock Provider 还是真实 Gemini。`pnpm api` 默认读取项目根目录的 `.env.local`，其内容可以参考 `.env.example`：

```text
LLM_PROVIDER=gemini
LLM_MODEL_BASELINE=<经过验证的 Gemini Flash-Lite 模型 ID>
GEMINI_API_KEY=<你的开发 API Key>
LLM_TIMEOUT_MS=12000
LLM_MAX_OUTPUT_TOKENS=384
LLM_TEMPERATURE=0.45
PORT=8787
```

注意事项：

- 项目不会写死某个具体模型版本。
- 不要把真实 API Key 写进代码、Manifest 或插件设置中。
- `.env` 已被 Git 忽略，不会进入构建产物。
- 正式环境应该由后端部署平台的 Secret Manager 注入 API Key。
- 修改环境变量后需要重新启动后端。

Gemini Provider 使用 Google 官方的 `generateContent` 结构化输出接口：[Gemini API 文档](https://ai.google.dev/api/generate-content)。

## 常用命令

```bash
# 构建 Chrome 插件
pnpm build

# 监听代码变化并自动重新构建
pnpm dev

# 启动本地后端
pnpm api

# 强制使用 Mock Provider 启动后端
pnpm api:mock

# 运行自动化测试
pnpm test

# 检查 TypeScript 类型
pnpm typecheck

# 构建并生成插件 ZIP
pnpm package
```

打包后的文件位于 `artifacts/verbia-v0.1.0.zip`。

## 数据和隐私原则

- 只有用户主动打开 Verbia 时，插件才定位当前编辑器和相关上下文。
- Reddit 模式只读取当前回复所需的帖子、目标评论和有限祖先评论。
- Universal Mode 只使用用户主动选中的文本，不扫描整个网页。
- 只有用户点击 Generate 后，上下文和 Intent 才会发送给后端。
- 生成结果先显示在 Verbia 中，不会自动覆盖网页输入框。
- 只有用户点击 Insert 后，草稿才会写入网页编辑器。
- Verbia 不查找、不点击，也不模拟网站的发送或提交按钮。
- 语言、语气等偏好保存在 `chrome.storage.local`。
- 临时请求状态保存在 `chrome.storage.session`。
- 默认不持久化页面上下文、Intent、语音转写、草稿或原始录音。
- 不在日志中记录正文或 API Key。

完整说明见 [PRIVACY.md](PRIVACY.md)。

## 测试

运行自动化测试：

```bash
pnpm test
```

当前自动化测试覆盖前后端数据结构、错误输入、Prompt 隔离、Reddit 评论链提取以及基础编辑器插入。

真实 Reddit、权限、语音、SPA 页面切换和故障场景还需要进行浏览器人工测试。详细步骤见 [测试指南](docs/TESTING.md)。

## 当前限制

- Reddit 的 DOM 经常变化，上线前必须在真实 Reddit 页面进行完整测试。
- 上下文识别不确定时会显示低置信度或退化为无上下文模式。
- Universal Mode 支持基础的 `textarea`、文本输入框和普通 `contenteditable`；复杂富文本编辑器可能只能使用 Copy。
- 浏览器语音识别的支持情况取决于 Chrome 版本及系统环境。
- 当前开发版 Manifest 只允许访问本地后端；发布前需要换成生产 HTTPS API 地址。
- 目前没有用户账户、登录、订阅、计费和数据库。
- Chrome Web Store 图标、截图、公开隐私政策地址、发布者信息和支持邮箱尚未完成。
- 真实 Gemini 模型仍需通过回复质量基准测试后确定。

## 推荐的生产部署方式

- Chrome 插件：Chrome Web Store。
- 后端服务：Google Cloud Run。
- Gemini API Key：Google Secret Manager。
- 未来产品官网：Cloudflare Pages、Vercel 或 Firebase Hosting。
- 未来用户登录：Firebase Authentication。
- 未来用户套餐和额度数据：Firestore。

推荐域名结构：

```text
verbia.app          产品介绍官网
api.verbia.app      后端 API
app.verbia.app      未来的用户中心
```

## 相关文档

- [产品需求文档](Project-Verbia-MVP-PRD.md)
- [人工测试指南](docs/TESTING.md)
- [隐私政策草稿](PRIVACY.md)
- [Chrome Web Store 发布清单](CHROMEWEBSTORE.md)
