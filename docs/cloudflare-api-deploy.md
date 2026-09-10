# Verbia API 发布与运维流程

本文记录 `verbia-api` 的日常修改、测试、上线、验证和回滚流程。

所有环境变量的用途、默认值和存放位置见 `services/docs/ENVIRONMENT-VARIABLES.md`。

## 当前生产环境

| 项目 | 当前值 |
|---|---|
| 运行平台 | Cloudflare Workers |
| Worker 名称 | `verbia-api` |
| 生产域名 | `https://api.verbia.henriz.dev` |
| 健康检查 | `GET /health` |
| 生成接口 | `POST /v1/replies:generate` |
| 账单 Webhook | `POST /v1/billing/webhook`，验证后同步套餐到 Supabase |
| 反馈接口 | `POST /v1/feedback` |
| 登录交接接口 | `POST /v1/auth/session-handoff` |
| 登录策略 | 必须携带有效的 Supabase Bearer Token |
| 免费额度 | 每位登录用户每天 10 次 |
| 模型路由 | Gemini、Mistral、Cloudflare Workers AI、Groq 自动均衡与故障切换 |
| 部署方式 | Git 集成（Workers Builds）：**push 到 `main` 自动部署**；本地 `pnpm api:deploy` 仅作备用 |

主要文件：

- `services/api/src/app.ts`：HTTP 路由、鉴权、额度和错误处理。
- `services/api/src/provider.ts`：模型适配、均衡选择、超时、冷却和故障切换。
- `services/api/src/worker.ts`：Cloudflare Worker 入口。
- `services/api/src/monitoring.ts`：Sentry 错误上报入口与事件标签。
- `services/api/src/server.ts`：本地 Node.js 开发入口。
- `wrangler.jsonc`：生产域名、模型名、超时、权重和其他非敏感配置。
- `.env.local`：本地开发凭据，不提交 Git。
- `.env.example`：环境变量示例，不包含真实密钥。

## 部署方式：Git 集成（主路径）

生产用 Cloudflare Workers Builds：**push 到 `main` 即自动部署**，日常不跑本地部署命令。
配置在 Cloudflare Dashboard → Workers & Pages → `verbia-api` → Settings → Build：

| 字段 | 值 |
|---|---|
| 构建命令 | `pnpm install --frozen-lockfile && pnpm typecheck && pnpm test` |
| 部署命令 | `pnpm db:check && pnpm exec wrangler deploy --var SENTRY_RELEASE:$WORKERS_CI_COMMIT_SHA` |
| 版本命令 | `pnpm db:check && pnpm exec wrangler versions upload` |
| 根目录 | `/` |

各字段为什么这么填：

- **部署命令**只在生产分支（`main`）执行；**版本命令**只在非生产分支执行（需先开启
  「非生产分支构建」），上传一个不提升为生产的版本并给出预览 URL。两者按分支分工，不是二选一。
- **部署命令里的 `pnpm db:check` 是必需的**：CI 是一条**完全绕过本地检查**的部署路径，而数据库是你
  手动在 SQL Editor 更新的。一旦「代码先合、SQL 后补」，CI 会立刻上线新代码，而网关是在运行时通过
  HTTP 调库里的函数 —— 表现为「起草正常，但用量不记账、免费额度不生效」。
  带上这道检查后，缺对象会让**构建失败、不部署**，你在用户受影响前就能收到通知。
  它只读 `wrangler.jsonc` 里的公开 publishable key，**不需要任何构建期密钥**；连不上 Supabase 时只警告
  不阻断，所以网络抖动不会把 CI 弄红。
- **构建命令里的 `pnpm typecheck && pnpm test`**：否则 CI 只装依赖就直接部署，坏提交照样会上线。
  两项都很轻（秒级）。`pnpm build` 是扩展产物、与 Worker 无关，不必加。
- **`--var SENTRY_RELEASE:$WORKERS_CI_COMMIT_SHA`**：把 Sentry 错误钉到具体 commit
  （`WORKERS_CI_COMMIT_SHA` 由 Workers Builds 自动注入）。
- 根目录 `/`：`wrangler.jsonc` 与 `main`（`services/api/src/worker.ts`）都在仓库根。
- 构建期变量**在运行时不可访问**；运行时变量与 Secret 仍在 Settings → Variables & Secrets / `wrangler secret put`。

构建状态与日志：Dashboard → `verbia-api` → **Builds**。构建失败只让这次部署不发生，不会改变线上版本。

## 日常代码上线

### 1. 修改和本地验证

启动本地 API：

```bash
pnpm api
```

本地地址是 `http://localhost:8787`。如需让开发版扩展调用本地服务，在扩展设置中暂时修改 Backend URL。

推之前本地先跑一遍（CI 也会跑 `typecheck`/`test`，本地跑是为了更快拿到反馈）：

```bash
pnpm typecheck
pnpm test
pnpm db:check     # 只在改了 docs/supabase-schema.sql 时需要
```

只有改了插件时才需要 `pnpm build`。

### 2. 检查改动范围

```bash
git diff --check
git status --short
git diff
```

重点确认：

- 没有把 `.env.local`、API Key、访问令牌或用户 Token 加入 Git。
- `wrangler.jsonc` 只包含可以公开的配置。
- API 请求和响应结构变化时，扩展与 `packages/shared` 已同步修改。
- 数据库结构变化时：**先在 Supabase SQL Editor 执行 SQL，再合并 / push 到 `main`**。顺序反了会被 CI 部署命令里的 `pnpm db:check` 拦下（见「部署方式：Git 集成」）。
- 账单结构或状态映射变化时，按 `docs/billing-entitlements.md` 检查迁移和历史事件重放。

### 3. 推送与自动部署

```bash
git push origin <branch>    # 非生产分支：CI 触发预览构建（若已开启非生产分支构建）
# 合并 / push 到 main：CI 自动构建并部署到生产
```

在 Dashboard → Workers & Pages → `verbia-api` → **Builds** 看构建日志。构建失败只让这次部署不发生，
不会改变线上版本。成功时可以在这里看到和本地部署一样的信息（`Uploaded verbia-api`、
`Deployed verbia-api triggers`、custom domain、新的 `Current Version ID`）——保存 Version ID，
出现线上问题时可直接回滚。

#### 备用：本地手动部署

CI 不可用或需要紧急发布时使用（同样先做数据库检查）：

```bash
pnpm api:deploy
```

这条命令按固定顺序做两件事：

1. **先校验数据库**（`pnpm db:check`）：确认线上 Supabase 已经有 `docs/supabase-schema.sql`
   声明的全部表和函数。**只要缺对象就中断，不会部署**——这样「代码调用了库里还不存在的
   函数」这种漂移会在部署那一刻暴露，而不是上线后表现为「用量不记账、额度不生效」。
   探针连不上 Supabase 时只警告不阻断（网络抖动不该挡住发布），所以它拦的是漂移，不是连通性。
2. **再部署 Worker**：从 `/tmp` 运行 Wrangler。

第 2 步里的 `--cwd /tmp --config "$PWD/wrangler.jsonc"` 不是随便加的：当前电脑已经通过
Wrangler OAuth 登录，而 `.env.local` 中用于调用 Workers AI 的 `CLOUDFLARE_API_TOKEN`
会被 Wrangler 误认为部署凭据，从 `/tmp` 运行可以避免自动加载项目的 `.env.local`。
这一层已经写进 `api:deploy`，不需要自己拼参数。注意本地手动部署不会注入 `SENTRY_RELEASE`（CI 会），
所以那条版本在 Sentry 上没有 release 标记。

成功输出应包含：

- `Uploaded verbia-api`
- `Deployed verbia-api triggers`
- `api.verbia.henriz.dev (custom domain)`
- 新的 `Current Version ID`

保存这个 Version ID，出现线上问题时可直接回滚。

## 上线后验证

先检查健康状态：

```bash
curl -sS https://api.verbia.henriz.dev/health
```

正常响应应满足：

- `ok` 为 `true`。
- `provider` 为 `auto`。
- `routes` 中包含当前启用的模型提供商。

然后在已登录的扩展中生成一条英文回复，确认：

1. 请求成功返回草稿。
2. 回复语言为 English。
3. 扩展可以插入或复制草稿。
4. Cloudflare 日志中没有连续的鉴权、配额或全部模型失败错误。

未登录请求应返回 `401 UNAUTHENTICATED`，超过每日额度应返回 `429 QUOTA_EXCEEDED`。

查看实时日志：

```bash
pnpm exec wrangler tail --cwd /tmp --config "$PWD/wrangler.jsonc"
```

结束观察时按 `Ctrl+C`。

每次模型尝试的结构化日志字段、Cloudflare Query Builder 看板和推荐统计口径见 `docs/model-observability.md`。

## Sentry 错误监控

Worker 使用 `@sentry/cloudflare` 捕获程序异常、全部模型失败、Supabase JWKS/配额故障、账单 Webhook 入库故障和结账故障。用户输入错误、额度耗尽、无效 Webhook，以及单个模型失败后成功切换不会触发 Sentry 错误事件。

创建 Sentry Cloudflare 项目后，将 DSN 保存为 Worker Secret：

```bash
pnpm exec wrangler secret put SENTRY_DSN --cwd /tmp --config "$PWD/wrangler.jsonc"
```

非敏感配置位于 `wrangler.jsonc`：

- `SENTRY_ENVIRONMENT`：部署环境，生产环境为 `production`。
- `SENTRY_TRACES_SAMPLE_RATE`：性能追踪采样率，当前为 `0.1`。
- `SENTRY_RELEASE`：发布版本。CI 部署命令用 `--var SENTRY_RELEASE:$WORKERS_CI_COMMIT_SHA` 注入，把 Sentry 错误钉到具体 commit（见「部署方式：Git 集成」）；本地手动部署不会设置。

Sentry 上报前会移除用户信息、请求头、请求体、查询参数和网络请求 Breadcrumb 数据，不发送 Authorization Token、邮箱、上下文、意图或草稿。

## 修改普通配置

下列非敏感配置直接修改 `wrangler.jsonc`，然后按完整流程重新发布：

- `LLM_PROVIDER_ORDER`：首选和故障切换顺序。
- `LLM_PROVIDER_WEIGHTS`：各模型的相对请求份额。
- 各提供商的模型名称。
- 总超时、单次尝试超时、冷却时间、温度和输出长度。
- `AUTH_REQUIRED`：是否强制登录。
- `ENFORCE_QUOTA`、`FREE_DAILY_QUOTA` 和 `PREMIUM_DAILY_QUOTA`：是否启用额度，以及各账号方案的每日次数（`0` 表示不限次数）。

权重示例：

```json
"LLM_PROVIDER_WEIGHTS": "gemini:2,mistral:1,cloudflare:1,groq:1"
```

这表示 Gemini 大约承担两份请求，其他模型各承担一份。Workers 会运行多个隔离实例，因此这是统计意义上的均衡，不是跨全球实例共享的精确计数。

## 更新模型密钥

密钥不能写进 `wrangler.jsonc`。更新时运行对应命令，并在提示后粘贴新值：

```bash
pnpm exec wrangler secret put GEMINI_API_KEY --cwd /tmp --config "$PWD/wrangler.jsonc"
pnpm exec wrangler secret put MISTRAL_API_KEY --cwd /tmp --config "$PWD/wrangler.jsonc"
pnpm exec wrangler secret put CLOUDFLARE_API_TOKEN --cwd /tmp --config "$PWD/wrangler.jsonc"
pnpm exec wrangler secret put GROQ_API_KEY --cwd /tmp --config "$PWD/wrangler.jsonc"
```

`secret put` 会生成一个使用相同代码的新 Worker 版本。更新后重新执行健康检查和一次登录后的英文生成测试。确认新密钥可用后，再撤销旧密钥。

查看线上已配置的 Secret 名称：

```bash
pnpm exec wrangler secret list --cwd /tmp --config "$PWD/wrangler.jsonc"
```

该命令只显示名称，不显示密钥值。

## 联系与反馈配置

网站、扩展设置页和卸载问卷统一提交到 `POST /v1/feedback`，Worker 再通过受限 RPC 写入 Supabase 的 `public.feedback` 表。上线前先执行 `docs/supabase-schema.sql` 中的 contact feedback 部分，然后添加两个 Worker Secret：

```bash
pnpm exec wrangler secret put SUPABASE_SERVICE_ROLE_KEY --cwd /tmp --config "$PWD/wrangler.jsonc"
pnpm exec wrangler secret put FEEDBACK_HASH_SALT --cwd /tmp --config "$PWD/wrangler.jsonc"
```

`SUPABASE_SERVICE_ROLE_KEY` 只能保存在 Worker Secret 和本地 `.env.local`，不能出现在网站、扩展、普通 Worker 变量或 Git 中。`FEEDBACK_HASH_SALT` 使用随机生成的长字符串，用于把用户 ID 或 IP 转换为不可直接识别的限流标识。表默认不允许 `anon` 或 `authenticated` 角色直接读写；只有 Worker 的 `service_role` 可以调用写入 RPC。

接口允许未登录用户提交，每个假名化提交者每小时最多 5 条。邮箱仅在用户勾选“允许联系”时保存，反馈不会自动包含网页内容、私人消息、意图或生成草稿。

## 数据库变更

Supabase 当前负责登录、用户资料和每日额度。数据库改动按以下顺序进行：

1. 编写可重复执行或有明确迁移边界的 SQL。
2. 先在测试环境验证。
3. 备份受影响的数据或确认可以恢复。
4. 先发布向后兼容的数据库变更。
5. 再发布依赖新结构的 API。
6. 用登录用户验证额度 RPC 和生成接口。

> **数据库是独立部署**：`wrangler deploy` 只上传 JavaScript，永远不会执行这份 SQL。
> 网关是通过 HTTP 调用库里的函数（`/rest/v1/rpc/<name>`）的，所以**代码改了名字、
> 库里没有这个函数**，就只会在运行时 404 —— 而网关对基础设施故障一律放行，
> 于是表现为「一切正常，但用量不再记账、额度不再生效」。每次改完
> `docs/supabase-schema.sql` 都要在 SQL Editor 里整份重跑（语句全部幂等），
> 然后用 `pnpm db:check` 确认线上已经对齐。
>
> 顺序上：**SQL 必须在合并 / push 到 `main` 之前执行完** —— CI 是 push 即部署，
> 而部署命令里的 `pnpm db:check` 会在库还没对齐时让构建失败（宁可失败，也不要静默漂移）。

基础结构记录在 `docs/supabase-schema.sql`。不要把 `service_role` Key 放入扩展、`.env.example` 或普通 Worker 变量。

## 回滚

CI 部署产生的版本同样出现在 Dashboard → `verbia-api` → Deployments 里，可以直接在那里选一个旧版本回滚。

命令行列出历史部署：

```bash
pnpm exec wrangler deployments list --cwd /tmp --config "$PWD/wrangler.jsonc"
```

回滚到已知正常的版本：

```bash
pnpm exec wrangler rollback VERSION_ID --cwd /tmp --config "$PWD/wrangler.jsonc"
```

回滚后必须重新检查 `/health`，并用已登录扩展生成一条英文回复。数据库变更不会随着 Worker 回滚；涉及数据库时必须单独准备反向迁移或兼容方案。

## 常见故障

### `Authentication error 10000`

Wrangler 使用了 `.env.local` 中权限有限的 Workers AI Token，而不是 OAuth 登录。使用本文带 `--cwd /tmp --config "$PWD/wrangler.jsonc"` 的命令。

### 域名刚发布时 TLS 握手失败

首次绑定自定义域名时，Cloudflare 需要签发边缘证书。确认部署输出已经包含 custom domain，等待片刻后重试 `/health`。如果长时间不恢复，再检查 DNS、CAA 和 Cloudflare Custom Domains 状态。

### `/health` 返回 503

通常表示没有任何完整配置的模型提供商。检查模型名称和 Secret 名称是否匹配，并使用 `wrangler secret list` 确认四个 Secret 存在。

### 生成返回 401

检查扩展是否已登录、Supabase 会话是否过期，以及请求是否携带 `Authorization: Bearer ...`。

### 生成返回 429

可能是用户当日额度已用完，也可能是上游模型限流。查看响应中的 `code`：`QUOTA_EXCEEDED` 是用户额度（次数见 `FREE_DAILY_QUOTA` / `PREMIUM_DAILY_QUOTA`），`RATE_LIMITED` 是模型提供商限流。

### 所有模型都失败

使用 `wrangler tail` 查看每个提供商的错误。依次检查 Secret、模型名称、提供商账户额度和网络状态。不要把完整请求正文、Bearer Token 或 API Key 复制到工单和日志中。

### 用量一直是 0、`quota_usage` 里没有数据

先跑 `pnpm db:check`。典型原因是**数据库比 Worker 旧**：网关在调一个库里还没有的函数，
404 被当作可容忍的基础设施故障放行，于是起草照常成功、但没有记账
（同时免费用户的每日上限也不生效）。把 `docs/supabase-schema.sql` 整份在 SQL Editor
重跑一次即可。也可以在 `wrangler tail` 里确认每次起草的 `"quota"` 字段：
`ok` 已记账 / `skipped` 未开 `ENFORCE_QUOTA` / `unavailable` 写入失败。

## 每次发布检查表

- [ ] 本地 `pnpm typecheck`、`pnpm test` 通过（CI 也会跑一遍，本地跑只是为了更快反馈）。
- [ ] 改了插件时 `pnpm build` 通过。
- [ ] 改了 `docs/supabase-schema.sql` 时：**已在 SQL Editor 执行完整文件**，且 `pnpm db:check` 通过。
- [ ] CI 的部署命令仍包含 `pnpm db:check`（Dashboard → Settings → Build；平台重置配置或新建项目后要复查这条）。
- [ ] Diff 中没有密钥和无关文件。
- [ ] CI 构建（Dashboard → Builds）成功，输出包含新 Version ID 与 custom domain。
- [ ] `/health` 返回正常。
- [ ] 已登录扩展完成一条英文生成测试，且该次请求在日志里的 `"quota"` 为 `ok`。
- [ ] 401 登录保护正常。
- [ ] 无持续错误日志。
- [ ] 已记录可回滚的上一版本 ID。
- [ ] 仅在走备用手动部署时：`pnpm api:deploy:dry` 打包通过。
