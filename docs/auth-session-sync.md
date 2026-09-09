# Verbia 双向登录与独立 Session 机制

本文说明 Verbia 官网与浏览器扩展之间的登录同步、Session 隔离、安全边界和退出行为。

## 产品行为

Verbia 官网和扩展使用同一个 Supabase 项目，因此账号身份、套餐和用量属于同一个用户。两端各自持有独立 Session：

```text
同一个 Supabase 用户
├── 官网 Session：保存在 verbia.henriz.dev 的 localStorage
└── 扩展 Session：保存在扩展自己的 chrome.storage.local
```

用户看到的行为固定为：

- 在扩展登录成功，官网自动登录。
- 在官网登录成功，已安装在同一浏览器配置中的扩展自动登录。
- 官网退出只退出官网。
- 扩展退出只退出扩展。
- 打开一个已经登录的页面不会反复强制另一端登录；只有一次新的登录完成时才触发同步。

两端不能直接共用 Refresh Token。Supabase Refresh Token 会轮换，共用同一套 Session 可能让两个客户端竞争刷新并导致 Session 被撤销。因此同步过程使用一次性交接 Token，让目标端创建自己的新 Session。

## 公共组件

| 组件 | 职责 |
|---|---|
| Supabase Auth | 验证 Google、Magic Link、Access Token 和一次性交接 Token，签发两端独立 Session |
| Verbia Worker | 验证来源端当前用户，通过管理员权限生成一次性交接 Token |
| 官网 | 保存官网 Session，并在新官网登录完成时请求同步扩展 |
| 扩展后台 | 保存扩展 Session，调用 Worker，并处理来自 bridge 的同步请求 |
| `bridge.js` | 只运行在 `https://verbia.henriz.dev/*`，在网页和扩展后台之间传递登录完成信号 |

## 一次性交接接口

```http
POST /v1/auth/session-handoff
Authorization: Bearer <来源端 Access Token>
```

Worker 的处理顺序：

1. 使用 Supabase 项目的 ES256 JWKS 在 Worker 内验证 Access Token 的签名、签发方、受众和有效期。
2. 只采用验证结果中的用户 ID 和邮箱，不接受客户端指定目标邮箱或用户 ID。
3. 使用 `SUPABASE_SERVICE_ROLE_KEY` 调用 Supabase Admin `generateLink`，生成 Magic Link 类型的一次性 Token。
4. 确认生成结果的用户 ID 与来源 Token 的用户 ID 完全一致。
5. 只返回 `tokenHash`，不返回 Action URL，也不发送邮件。
6. 同一用户每分钟最多请求 5 次；异常会上报 Sentry，但不记录 Token。

目标端调用 Supabase `verifyOtp({ token_hash, type: "email" })`。验证成功后 Supabase 为目标端签发新的 Access Token 和 Refresh Token；一次性交接 Token 随即失效。

## 扩展登录，自动登录官网

```text
扩展 Dashboard
  → Supabase Google OAuth 或 Magic Link
  → https://verbia.henriz.dev/auth-complete?code=...
  → 扩展后台截获 code，并使用扩展 PKCE verifier 交换扩展 Session
  → 扩展后台以扩展 Access Token 请求 /v1/auth/session-handoff
  → Worker 返回一次性 tokenHash
  → 后台把 tokenHash 发给官网 bridge
  → bridge 调用 verifyOtp，创建独立官网 Session
  → /auth-complete 显示登录成功
```

`/auth-complete` 不会自动跳转首页。用户可以选择“回到 Dashboard”或“回到首页”。只有官网独立 Session 创建成功后才显示登录成功；旧的官网 Session 不会让页面提前显示成功。

如果交接失败，扩展自身仍可能已经登录成功，但完成页会显示无法完成同步，避免误报“两端均已登录”。

## 官网登录，自动登录扩展

```text
官网 /account
  → Supabase Google OAuth 或 Magic Link
  → /account/callback?code=...
  → 官网使用自己的 PKCE verifier 交换官网 Session
  → 页面发出一次“同步扩展”事件
  → bridge 从官网存储读取 Access Token，并发送给扩展后台
  → 扩展后台校验消息来自官网 /account/callback
  → 后台以官网 Access Token 请求 /v1/auth/session-handoff
  → Worker 返回一次性 tokenHash
  → 扩展调用 verifyOtp，创建独立扩展 Session
  → 官网进入 /account
```

未安装扩展、扩展未获准在官网运行或处于未启用扩展的隐身窗口时，官网登录照常成功，只跳过扩展同步。

为了尊重用户主动退出，bridge 不会在每次访问官网时同步已有 Session。同步只由 `/account/callback` 的一次新登录触发。

## 退出机制

官网调用：

```ts
supabase.auth.signOut({ scope: "local" })
```

然后只删除官网的 `verbia-web-auth`。扩展 Session 不受影响。

扩展也调用 `scope: "local"`，然后只删除扩展的 `verbia-auth-token`。官网 Session 不受影响。

不要把任一端改成默认的全局退出；全局退出会撤销该用户的其他 Session，破坏“两边只退出自己”的产品约定。如果以后增加“退出所有设备”，应作为单独且明确的操作。

## 安全边界

- bridge 的 Manifest 匹配范围只包含 `https://verbia.henriz.dev/*`。
- 官网发来的消息视为不可信输入；扩展后台检查发送标签的 Origin 和回调路径。
- Worker 必须以项目 JWKS 对来源 Access Token 完整验签，不能相信 localStorage 或扩展消息里声明的用户资料。
- 一次性交接 Token 不写入 URL、localStorage、日志、Sentry 或数据库业务表。
- `SUPABASE_SERVICE_ROLE_KEY` 只存在于 Worker Secret，不进入官网或扩展包。
- 交接接口返回 `Cache-Control: no-store`。
- 扩展和官网只保存各自的 Supabase Session，不保存对方的 Refresh Token。

需要防范官网 XSS：内容脚本能够读取官网 localStorage，因此官网上的第三方脚本也可能接触官网 Session。保持严格 CSP、减少第三方脚本，并避免把任何远程脚本加入登录回调页。

## 相关文件

| 文件 | 内容 |
|---|---|
| `services/api/src/app.ts` | `/v1/auth/session-handoff`、来源 Token 验证、一次性 Token 生成与限流 |
| `apps/extension/src/background/index.ts` | 两个方向的 Worker 调用和来源校验 |
| `apps/extension/src/auth/supabase.ts` | 扩展 Session 存储、刷新、局部退出、`verifyOtp` |
| `apps/extension/src/bridge.ts` | 官网与扩展之间的登录同步桥接 |
| `apps/web/lib/verbia-auth.ts` | 官网 Session、局部退出和同步事件 |
| `apps/web/app/account/callback/page.tsx` | 官网新登录完成后触发扩展同步 |
| `apps/web/app/auth-complete/page.tsx` | 扩展新登录后等待官网独立 Session 并展示结果 |

## 上线要求

- Worker 必须配置 `SUPABASE_URL`、`SUPABASE_PUBLISHABLE_KEY` 和 `SUPABASE_SERVICE_ROLE_KEY`。
- Supabase Redirect URLs 必须包含：
  - `https://verbia.henriz.dev/account/callback`
  - `https://verbia.henriz.dev/auth-complete`
- 扩展 Manifest 必须保留 `https://verbia.henriz.dev/*` 和 Supabase 项目的 Host Permission。
- 上线顺序：先发布 Worker，再发布官网，最后发布扩展。旧扩展不认识新交接消息，但不影响自身登录；新扩展依赖新 Worker 接口完成双向同步。

## 验收用例

1. 两端都退出，在扩展用 Google 登录：扩展和官网都登录，两个存储中的 Refresh Token 不同。
2. 两端都退出，在扩展用 Magic Link 登录：结果同上。
3. 两端都退出，在官网用 Google 登录：官网和扩展都登录，两个 Refresh Token 不同。
4. 两端都退出，在官网用 Magic Link 登录：结果同上。
5. 官网退出：官网变为未登录，扩展仍保持登录并可正常刷新 Token。
6. 扩展退出：扩展变为未登录，官网仍保持登录并可正常刷新 Token。
7. 扩展退出后刷新一个仍登录的官网页面：扩展不会被自动重新登录。
8. 未安装扩展时官网登录：官网正常完成，不出现扩展同步错误。
9. 交接接口不可用时：来源端登录不丢失，目标端不写入半成品 Session。
