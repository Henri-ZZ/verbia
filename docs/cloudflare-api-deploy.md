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
| 反馈接口 | `POST /v1/feedback` |
| 登录策略 | 必须携带有效的 Supabase Bearer Token |
| 免费额度 | 每位登录用户每天 10 次 |
| 模型路由 | Gemini、Mistral、Cloudflare Workers AI、Groq 自动均衡与故障切换 |

主要文件：

- `services/api/src/app.ts`：HTTP 路由、鉴权、额度和错误处理。
- `services/api/src/provider.ts`：模型适配、均衡选择、超时、冷却和故障切换。
- `services/api/src/worker.ts`：Cloudflare Worker 入口。
- `services/api/src/monitoring.ts`：Sentry 错误上报入口与事件标签。
- `services/api/src/server.ts`：本地 Node.js 开发入口。
- `wrangler.jsonc`：生产域名、模型名、超时、权重和其他非敏感配置。
- `.env.local`：本地开发凭据，不提交 Git。
- `.env.example`：环境变量示例，不包含真实密钥。

## 日常代码上线

### 1. 修改和本地验证

启动本地 API：

```bash
pnpm api
```

本地地址是 `http://localhost:8787`。如需让开发版扩展调用本地服务，在扩展设置中暂时修改 Backend URL。

提交上线前依次运行：

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm api:deploy:dry
```

四项全部通过后再发布。`api:deploy:dry` 只生成 Worker 上传包，不修改线上版本。

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
- 数据库结构变化时，先准备向后兼容的 SQL，再发布依赖它的 API。

### 3. 正式发布

当前电脑已经通过 Wrangler OAuth 登录。由于 `.env.local` 中用于调用 Workers AI 的 `CLOUDFLARE_API_TOKEN` 会被 Wrangler 误认为部署凭据，发布时让 Wrangler 从 `/tmp` 运行，避免自动加载项目的 `.env.local`：

```bash
pnpm exec wrangler deploy --cwd /tmp --config "$PWD/wrangler.jsonc"
```

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

## Sentry 错误监控

Worker 使用 `@sentry/cloudflare` 捕获程序异常、全部模型失败、Supabase 鉴权/配额故障、Waffo 套餐查询故障和结账故障。用户输入错误、额度耗尽、无效 Webhook，以及单个模型失败后成功切换不会触发 Sentry 错误事件。

创建 Sentry Cloudflare 项目后，将 DSN 保存为 Worker Secret：

```bash
pnpm exec wrangler secret put SENTRY_DSN --cwd /tmp --config "$PWD/wrangler.jsonc"
```

非敏感配置位于 `wrangler.jsonc`：

- `SENTRY_ENVIRONMENT`：部署环境，生产环境为 `production`。
- `SENTRY_TRACES_SAMPLE_RATE`：性能追踪采样率，当前为 `0.1`。
- `SENTRY_RELEASE`：可选发布版本，建议在自动部署流程中注入。

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

基础结构记录在 `docs/supabase-schema.sql`。不要把 `service_role` Key 放入扩展、`.env.example` 或普通 Worker 变量。

## 回滚

列出历史部署：

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

可能是用户每日 30 次额度已用完，也可能是上游模型限流。查看响应中的 `code`：`QUOTA_EXCEEDED` 是用户额度，`RATE_LIMITED` 是模型提供商限流。

### 所有模型都失败

使用 `wrangler tail` 查看每个提供商的错误。依次检查 Secret、模型名称、提供商账户额度和网络状态。不要把完整请求正文、Bearer Token 或 API Key 复制到工单和日志中。

## 每次发布检查表

- [ ] 类型检查通过。
- [ ] 全部测试通过。
- [ ] 扩展构建通过。
- [ ] Wrangler dry-run 打包通过。
- [ ] Diff 中没有密钥和无关文件。
- [ ] 正式部署输出包含新 Version ID 和 custom domain。
- [ ] `/health` 返回正常。
- [ ] 已登录扩展完成一条英文生成测试。
- [ ] 401 登录保护正常。
- [ ] 无持续错误日志。
- [ ] 已记录可回滚的上一版本 ID。
