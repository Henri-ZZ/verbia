# Verbia 双向登录与共享登录状态

本文说明 Verbia 官网与浏览器扩展之间的登录同步、Session 隔离、安全边界和退出行为。

## 产品行为

Verbia 官网和扩展使用同一个 Supabase 项目，因此账号身份、套餐和用量属于同一个用户。两端各自持有独立 Session（各自的 Refresh Token，互不共用），但**登录状态是共享的**：

```text
同一个 Supabase 用户
├── 官网 Session：保存在 verbia.henriz.dev 的 localStorage
└── 扩展 Session：保存在扩展自己的 chrome.storage.local
```

用户看到的行为固定为：

- 在扩展登录成功，官网自动登录。
- 在官网登录成功，已安装在同一浏览器配置中的扩展自动登录。
- **任一端退出，同一浏览器里的另一端也随之退出。**
- 已经登录的一端不会因为另一端已登录而被反复重建：扩展只在自己没有会话时才接受交接。
- 共享状态的作用范围是**同一个浏览器**。在别的设备（例如手机）上退出官网，不影响本机的扩展，反之亦然。

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
扩展控制面板
  → Supabase Google / Microsoft OAuth 或 Magic Link
  → https://verbia.henriz.dev/auth-complete?code=...
  → 扩展后台截获 code，并使用扩展 PKCE verifier 交换扩展 Session
  → 扩展后台以扩展 Access Token 请求 /v1/auth/session-handoff
  → Worker 返回一次性 tokenHash
  → 后台把 tokenHash 发给官网 bridge
  → bridge 调用 verifyOtp，创建独立官网 Session
  → /auth-complete 显示登录成功
```

`/auth-complete` 不会自动跳转首页。用户可以选择“回到控制面板”或“回到首页”。只有官网独立 Session 创建成功后才显示登录成功；旧的官网 Session 不会让页面提前显示成功。

如果交接失败，扩展自身仍可能已经登录成功，但完成页会显示无法完成同步，避免误报“两端均已登录”。

## 官网登录，自动登录扩展

```text
官网 /account
  → Supabase Google / Microsoft OAuth 或 Magic Link
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

两端都只做**局部**退出（`scope: "local"`）：各自清掉自己的 Session，再通过 bridge 让另一端也退出。**不使用 `global`**——它会撤销该账号在所有设备上的 Session，把用户手机上的登录一起踢掉，而共享状态的作用范围只是同一个浏览器。

```ts
// 官网与扩展各自只清自己
supabase.auth.signOut({ scope: "local" })
```

### 两个方向

| 方向 | 立即通道（页面开着） | 兜底（当时没有页面打开） |
|---|---|---|
| 扩展退出 → 官网 | 后台广播 `WEB_SIGN_OUT` 给已打开的官网标签 | 后台把 `verbia-web-sign-out` 写进 `chrome.storage.local`，官网 bridge 下次加载时兑现 |
| 官网退出 → 扩展 | 页面派发 `verbia:web-signed-out`，bridge 转成 `WEB_SIGNED_OUT` | 不需要兜底：bridge 每次加载都会上报官网当前的登录状态 |

bridge 在 `document_idle` 运行，可能早于页面首次渲染，因此「扩展退出 → 官网」同时用 data 属性（页面挂载时读取）与事件（页面已在运行时）两种方式送达。

「官网退出 → 扩展」之所以不留标记，是因为**官网是否登录可以直接读**（localStorage 里有没有 `verbia-web-auth`）：bridge 每次加载上报一次当前状态，没有记录就没有「过期记录」可言。正在登录中的页面（`/account/callback`、`/account/verify`）例外——那里的「还没有会话」是正常的，不是退出。

### 待办标记为什么不会误杀刚登录的会话

`verbia-web-sign-out` 若被无限期遵守，就会在用户重新登录后把新会话踢掉。保证在于**扩展侧只有一个地方能建成会话**（`establishSessionFromTokenHash`），而待办标记在这里被清除：它在任何时刻存在，都意味着用户当前确实处于退出状态；一旦重新登录，标记已经被清掉。

反方向的标记曾经也有一个，已删除：用户在官网退出后**不刷新页面**就用密码登录，会让那个标记活到下一次刷新，把刚建好的会话踢掉。可读的状态没有这个问题。

### 无痕窗口

扩展的 `chrome.storage` 在无痕与普通配置之间共享，而官网在无痕窗口里的存储是空的。bridge 用 `chrome.extension.inIncognitoContext` 跳过全部同步：否则任何一次无痕访问官网，都会把普通配置里的登录踢掉，而无痕窗口本来就没有可同步的状态。

### 不传播的情况

- 扩展因刷新 Token 失败而**悄悄丢失**会话（`clearSession`）不通知官网：那是本机的技术故障，不是用户主动退出。
- 未来若增加「在所有设备退出」，应作为单独且明确的操作（它会调用 `global`）。

## 安全边界

- bridge 的 Manifest 匹配范围只包含 `https://verbia.henriz.dev/*`。
- 官网发来的消息视为不可信输入；扩展后台一律检查发送标签的 Origin。**登录**额外限定 `/account`、`/account/callback`、`/account/verify` 三个页面（它会产生会话）；**退出**只限 Origin，因为任何页面发出的退出信号最坏也只能让一端退出，无法让任何一端登录。
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
| `apps/extension/src/bridge.ts` | 官网与扩展之间的登录与退出同步桥接（含两个方向的待办标记） |
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
5. 官网退出：官网变为未登录，同一浏览器里的扩展也随之变为未登录。
6. 扩展退出：扩展变为未登录；已打开与未打开的官网标签页都会随之退出。
7. 扩展退出时官网没有任何标签页打开，之后才打开官网：官网自动退出，且不会把扩展重新登录。
8. 扩展退出后在同一浏览器重新登录：两端都登录，且不会因为上一次的待办标记被立即踢出。
9. 在另一台设备（例如手机）退出官网：本机扩展不受影响。
10. 未安装扩展时官网登录：官网正常完成，不出现扩展同步错误。
11. 交接接口不可用时：来源端登录不丢失，目标端不写入半成品 Session。
