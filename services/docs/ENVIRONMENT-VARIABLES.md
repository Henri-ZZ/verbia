# Verbia 环境变量说明

本文集中说明 Verbia API、浏览器扩展构建和官网使用的环境变量。新增、删除或改变环境变量含义时，应同步更新本文和对应的 `.env.example`。

## 配置放在哪里

| 位置 | 用途 | 是否提交 Git |
|---|---|---|
| 根目录 `.env.local` | 本地 API、扩展构建、Waffo 管理脚本 | 否 |
| 根目录 `.env.example` | 根目录变量的空白模板和推荐默认值 | 是 |
| `apps/web/.env.local` | Next.js 官网本地构建 | 否 |
| `apps/web/.env.example` | 官网变量模板 | 是 |
| `wrangler.jsonc` 的 `vars` | Worker 线上非敏感配置 | 是 |
| Cloudflare Worker Secrets | Worker 线上密钥和其他敏感值 | 否 |

变量名称并不会自动决定它是否安全。API Key、私钥、管理员密钥、DSN 和 Salt 应配置为 Worker Secret，不应写进 `wrangler.jsonc`。`NEXT_PUBLIC_` 开头的变量会进入网站静态 JavaScript；扩展构建脚本注入的变量也会进入扩展包，因此两处只能使用允许公开的值。

## API 服务基础配置

| 变量 | 必需性 | 默认值 | 作用及缺失时表现 |
|---|---|---:|---|
| `PORT` | 仅本地可选 | `8787` | 本地 Node API 监听端口。Cloudflare Worker 不使用它。 |
| `NODE_ENV` | 自动提供 | 由运行工具决定 | `test` 时阻止本地 HTTP 服务器开始监听。通常无需手动配置。 |

## 模型路由和生成参数

| 变量 | 必需性 | 默认值 | 作用及缺失时表现 |
|---|---|---:|---|
| `LLM_PROVIDER` | API 必需 | `mock` | 模型路由模式。生产使用 `auto`；也可指定 `mock`、`gemini`、`mistral`、`cloudflare` 或 `groq`。`mock` 只用于开发测试。 |
| `LLM_PROVIDER_ORDER` | `auto` 模式可选 | `gemini,mistral,cloudflare,groq` | 自动路由的提供商顺序，也作为同等条件下的稳定顺序。未完整配置的提供商会自动排除。 |
| `LLM_PROVIDER_WEIGHTS` | `auto` 模式可选 | 各提供商权重 `1` | 请求分配权重，例如 `gemini:2,mistral:1` 表示 Gemini 约承担两份流量。它是单个 Worker 实例内的统计均衡。 |
| `LLM_TOTAL_TIMEOUT_MS` | 可选 | `25000` | 一次生成请求允许使用的总时间，包含模型切换。超时后向客户端返回 504。 |
| `LLM_TIMEOUT_MS` | 旧版兼容 | `25000` | 旧的总超时变量。仅在未设置 `LLM_TOTAL_TIMEOUT_MS` 时回退使用；新配置应使用后者。 |
| `LLM_ATTEMPT_TIMEOUT_MS` | 可选 | `9000` | 每个模型单次尝试的最长时间。超时后自动尝试下一个可用模型。 |
| `LLM_COOLDOWN_MS` | 可选 | `30000` | 模型请求失败后进入冷却的时间。冷却期间优先使用其他模型。 |
| `LLM_MAX_OUTPUT_TOKENS` | 可选 | `384` | Gemini、Mistral 和 Groq 的通用最大输出 Token 数。 |
| `LLM_TEMPERATURE` | 可选 | `0.45` | 模型采样温度。数值越低，措辞通常越稳定。 |
| `LLM_MODEL_BASELINE` | Gemini 必需 | 无 | Gemini 模型 ID。当前生产配置为 `gemini-3.5-flash-lite`。 |
| `GEMINI_MODEL` | 可选别名 | 使用 `LLM_MODEL_BASELINE` | 如果设置，会优先于 `LLM_MODEL_BASELINE`。适合逐步迁移到按提供商命名的配置。 |
| `LLM_MODEL_FALLBACK` | 已弃用 | 无 | 兼容旧配置而保留，目前服务端代码不读取。不要在新环境中使用。 |

## 模型提供商凭据

一个提供商只有在它的密钥、模型名以及所需账户信息齐全时，才会加入自动路由。生产环境应至少配置两个提供商，避免单点故障。

| 变量 | 敏感 | 作用 |
|---|---|---|
| `GEMINI_API_KEY` | 是 | 调用 Google Gemini API。与 `GEMINI_MODEL` 或 `LLM_MODEL_BASELINE` 配套。 |
| `MISTRAL_API_KEY` | 是 | 调用 Mistral Chat Completions API。 |
| `MISTRAL_MODEL` | 否 | Mistral 模型 ID，当前推荐值为 `ministral-8b-2512`。 |
| `CLOUDFLARE_ACCOUNT_ID` | 否 | Cloudflare 账户 ID，用于拼接 Workers AI API 地址。 |
| `CLOUDFLARE_API_TOKEN` | 是 | 调用 Cloudflare Workers AI 的 Token；需要对应账户的 AI 推理权限。 |
| `CLOUDFLARE_MODEL` | 否 | Workers AI 模型 ID，必须包含完整的 `@cf/...` 名称。 |
| `CLOUDFLARE_MAX_OUTPUT_TOKENS` | 否 | Workers AI 单独使用的最大输出 Token 数，默认至少为 `768`，以容纳部分模型内部使用的推理 Token。 |
| `GROQ_API_KEY` | 是 | 调用 Groq OpenAI 兼容接口。 |
| `GROQ_MODEL` | 否 | Groq 模型 ID。 |
| `GROQ_REASONING_EFFORT` | 否 | 传给 Groq 模型的推理强度。当前语言处理任务使用 `none`，减少延迟和 Token 消耗。 |

## Supabase、登录和额度

| 变量 | 敏感 | 必需性 | 作用及缺失时表现 |
|---|---|---|---|
| `SUPABASE_URL` | 否 | 登录、额度、反馈必需 | Supabase 项目 URL。API、扩展使用同一个项目。 |
| `SUPABASE_PUBLISHABLE_KEY` | 否 | 登录和额度必需 | Supabase 可公开密钥。API 用它验证用户 Bearer Token，扩展构建时也会注入。它受 RLS 约束，不是管理员密钥。 |
| `SUPABASE_ANON_KEY` | 否 | 旧版兼容 | `SUPABASE_PUBLISHABLE_KEY` 的旧名称。只有未设置 publishable key 时才回退使用。新配置优先使用 publishable key。 |
| `SUPABASE_SERVICE_ROLE_KEY` | **是，高权限** | 反馈和双向登录必需 | Worker 调用受限的 `submit_feedback` RPC，并生成登录交接用的一次性 Token。可以填写新版 `sb_secret_...` Secret Key 或旧版 `service_role` JWT；Supabase 会赋予 `service_role` 权限并绕过 RLS。缺失时反馈及登录交接接口返回 503。只能放在 Worker Secret 或本地 `.env.local`。变量名为兼容现有配置而保留。 |
| `FEEDBACK_HASH_SALT` | **是** | 反馈功能必需 | 与用户 ID 或 IP 一起生成假名化限流哈希，避免保存原始 IP。缺失时反馈接口返回 503。上线后应保持稳定。 |
| `AUTH_REQUIRED` | 否 | 可选 | 设为 `1` 时，生成接口要求有效登录；其他值允许匿名生成。生产当前为 `1`。 |
| `AUTH_CACHE_TTL_MS` | 否 | 可选，默认 `60000` | 有效 Supabase Token 在 Worker 内存中的验证缓存时间，减少每次请求的登录验证延迟。无效 Token 固定短暂缓存约 5 秒。 |
| `ENFORCE_QUOTA` | 否 | 可选 | 设为 `1` 时，为已登录用户调用 Supabase RPC 扣减每日额度；未登录请求是否允许仍由 `AUTH_REQUIRED` 决定。 |
| `FREE_DAILY_QUOTA` | 否 | 可选，默认 `10` | 免费用户每日生成次数。`0` 或负数表示不限量。 |
| `PREMIUM_DAILY_QUOTA` | 否 | 可选，默认 `0` | Premium 用户每日生成次数。`0` 或负数表示不限量；当前生产配置为 `100`。 |

## Waffo Pancake 订阅

以下变量共同决定付款功能是否可用。除 `WAFFO_ENVIRONMENT` 外，任一必要项缺失都会让创建结账接口返回“付款暂不可用”，套餐查询则按免费用户处理。

| 变量 | 敏感 | 作用 |
|---|---|---|
| `WAFFO_MERCHANT_ID` | 通常可公开，但按服务端配置管理 | Waffo 商户 ID，用于初始化 SDK。 |
| `WAFFO_STORE_ID` | 通常可公开，但按服务端配置管理 | Verbia 商店 ID；查询订阅和校验 Webhook 时用于防止跨商店事件。 |
| `WAFFO_ENVIRONMENT` | 否 | `test` 使用测试环境；其他值均按 `prod` 处理。查询套餐时只认可与当前环境一致的订单。 |
| `WAFFO_MONTHLY_PRODUCT_ID` | 通常可公开 | Verbia Pro 月付商品 ID。 |
| `WAFFO_ANNUAL_PRODUCT_ID` | 通常可公开 | Verbia Pro 年付商品 ID。 |
| `WAFFO_PRIVATE_KEY` | **是，高权限** | Waffo SDK 签名、创建结账、查询订阅和验证 Webhook。只能放在 Worker Secret 或本地 `.env.local`。 |
| `FREE_PLAN_CACHE_TTL_MS` | 否 | 查询结果为免费套餐时的内存缓存时间，默认 `60000`。较短可让新付款更快生效，但会增加 Waffo 查询。 |
| `PREMIUM_PLAN_CACHE_TTL_MS` | 否 | 查询结果为 Premium 时的内存缓存时间，默认 `300000`。有效 Webhook 会清除此用户的缓存。 |

测试环境与生产环境的密钥、Store 和 Product ID 必须属于同一个 Waffo 环境。仅修改 `WAFFO_ENVIRONMENT` 不会把测试商品自动转换为生产商品。

## Sentry 监控

| 变量 | 敏感 | 默认值 | 作用 |
|---|---|---:|---|
| `SENTRY_DSN` | 是，建议作为 Secret | 无 | Sentry 项目接收地址。缺失时完全关闭 Worker 的 Sentry 集成，不影响 API 运行。 |
| `SENTRY_ENVIRONMENT` | 否 | Worker 为 `production` | 区分 Sentry 中的本地、测试和生产事件。 |
| `SENTRY_RELEASE` | 否 | 无 | 可选版本标识，例如 Git commit SHA，用于把错误对应到具体发布版本。 |
| `SENTRY_TRACES_SAMPLE_RATE` | 否 | `0.1` | 性能追踪采样率，范围会限制在 `0` 到 `1`。`0.1` 表示约采样 10%。 |

当前 Sentry 配置关闭默认个人信息上报，并会删除请求头、请求体、查询参数和网络请求 Breadcrumb 数据。

## 浏览器扩展构建变量

这些值由 `scripts/build.mjs` 在构建时替换进扩展 JavaScript。凡是注入扩展的值，用户都可以从安装包中读取。

| 变量 | 来源 | 作用 |
|---|---|---|
| `SUPABASE_URL` | 根目录 `.env.local` | 扩展登录使用的 Supabase 项目 URL。 |
| `SUPABASE_PUBLISHABLE_KEY` | 根目录 `.env.local` | 扩展登录使用的公开 Key；可回退到 `SUPABASE_ANON_KEY`。 |
| `VERBIA_WEB_ORIGIN` | 根目录 `.env.local`，默认 `https://verbia.henriz.dev` | 登录完成页、账号页等官网地址的 Origin。不要包含路径，末尾斜杠会被移除。 |
| `VERBIA_BACKEND_URL` | 构建进程环境；发布构建默认 `https://api.verbia.henriz.dev` | 发布版扩展固定使用的 API 地址。开发构建通常留空，让设置页选择后端。 |
| `VERBIA_RELEASE` | 由构建脚本根据 `--release` 生成 | `1` 表示商店发布构建：隐藏开发者后端设置并固定生产 API；无需写入 `.env.local`。 |

## Next.js 官网变量

官网使用静态导出，因此这些变量在构建时写入浏览器端代码。不能使用 service role、私钥或其他服务器 Secret。

| 变量 | 必需性 | 默认值 | 作用 |
|---|---|---:|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 账号功能必需 | 无 | 官网登录使用的 Supabase 项目 URL，应与扩展的 `SUPABASE_URL` 相同。 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 账号功能必需 | 无 | 官网登录使用的公开 Key，应与扩展使用的 publishable key 相同。 |
| `NEXT_PUBLIC_VERBIA_API` | 可选 | `https://api.verbia.henriz.dev` | 官网查询套餐、用量、创建结账和提交反馈时调用的 API 根地址。 |

## 本地与生产配置对照

| 类型 | 本地开发 | Cloudflare 生产环境 |
|---|---|---|
| 非敏感 API 配置 | 根目录 `.env.local` | `wrangler.jsonc` → `vars` |
| API 密钥、私钥、管理员密钥 | 根目录 `.env.local` | Worker Secrets |
| 官网公开配置 | `apps/web/.env.local` | Cloudflare Pages 构建环境变量 |
| 扩展公开配置 | 根目录 `.env.local`，构建时注入 | 在发布扩展前使用根目录配置构建 |

查看已经配置的 Worker Secret 名称不会泄露值：

```bash
pnpm exec wrangler secret list --cwd /tmp --config "$PWD/wrangler.jsonc"
```

新增或更新 Secret：

```bash
pnpm exec wrangler secret put VARIABLE_NAME --cwd /tmp --config "$PWD/wrangler.jsonc"
```

## 当前生产环境检查清单

### Worker Secrets

- `GEMINI_API_KEY`
- `MISTRAL_API_KEY`
- `CLOUDFLARE_API_TOKEN`
- `GROQ_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FEEDBACK_HASH_SALT`
- `WAFFO_PRIVATE_KEY`
- `SENTRY_DSN`

### `wrangler.jsonc` 非敏感变量

- 模型路由、模型名、超时、权重和输出设置
- `CLOUDFLARE_ACCOUNT_ID`
- Supabase URL 与 Publishable Key
- 登录、额度和缓存配置
- Waffo Merchant、Store、环境和 Product ID
- Sentry 环境与采样率

### Cloudflare Pages 构建变量

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_VERBIA_API`（不设置时使用生产默认值）

不要把以下值放进 Pages、扩展源码或 `wrangler.jsonc`：`SUPABASE_SERVICE_ROLE_KEY`、`FEEDBACK_HASH_SALT`、`WAFFO_PRIVATE_KEY`、任何模型 API Key、`CLOUDFLARE_API_TOKEN` 和 `SENTRY_DSN`。
