# Verbia — Supabase 登录接入

Verbia 的账号体系：Google 第三方登录 + 邮箱 Magic Link（免密），由 Supabase Auth 托管。
扩展在本地通过 PKCE 完成登录；`services/api` 网关校验 Bearer token，把用量归属到账号。
**未登录完全不影响现有功能**（匿名照常起草），登录只提供云端身份，为额度与付费预留。

官网与扩展的双向登录、独立 Session 与共享登录状态（含退出同步）详见 `docs/auth-session-sync.md`。

## 一、已落地的代码侧配置

| 项 | 值 |
|---|---|
| Supabase 项目 ref | `pthfyoejvlcwxboskrjr` |
| API URL | `https://pthfyoejvlcwxboskrjr.supabase.co` |
| 扩展固定 ID（manifest `key` 派生） | `ndkpnijcnjkkgoehfdcpfleoipfhfdnp` |
| 登录回跳落地页（Google + Magic Link 统一） | `https://verbia.henriz.dev/auth-complete`（官网登录完成页，由扩展后台截获 code） |
| Google OAuth Client（**Web application 类型**）Client ID | `524647893236-uoo6f3bb0abl36cae9rq8le2gfs3bpcv.apps.googleusercontent.com` |
| 同上 Client Secret | 在 Google Cloud Console 该 client 里查看（机密，不写进仓库/文档） |

- `.env.local` / `.env.example` 已加 `SUPABASE_URL`、`SUPABASE_PUBLISHABLE_KEY`（publishable key 公开，
  由 `scripts/build.mjs` 在构建时注入扩展产物）；可选 `ENFORCE_QUOTA`、`FREE_DAILY_QUOTA`、`PREMIUM_DAILY_QUOTA`。
- `apps/extension/manifest.json` 已加 `host_permissions` 指向 Supabase 项目。

## 二、还需要你在 Supabase Dashboard 里做的（一次性）

1. **执行建表 SQL**：打开
   `https://supabase.com/dashboard/project/pthfyoejvlcwxboskrjr/sql/new`，
   把 `docs/supabase-schema.sql` 全文粘进去执行。
2. **Auth → Providers → Google**：开启 Google，填入上面表格里的 **Client ID** 与
   **Client Secret**。注意：client 必须是在 Google Cloud Console 创建的 **Web application** 类型
   （Chrome Extension 类型没有 Secret，配不了 Supabase）；Secret 只填进 Supabase 服务端，
   PKCE 流程中扩展端不会接触它。Google 侧 Authorized redirect URIs 填
   `https://pthfyoejvlcwxboskrjr.supabase.co/auth/v1/callback`（不是 chrome-extension 地址）。
3. **Auth → URL Configuration**：
   - **Site URL** 填 `https://verbia.henriz.dev/`，
     否则未匹配的回跳会回落到 Supabase 默认的 `http://localhost:3000`；
   - **Redirect URLs** 添加：
   ```
   https://verbia.henriz.dev/auth-complete
   ```
   该地址服务扩展发起的 **Google 登录与 Magic Link 两条链路**，必须在 Supabase 放行。Chrome 不允许服务端 302 跳进 `chrome-extension://` 页面，因此回跳先落到普通 HTTPS 页面；扩展后台截获 `?code=`、建立扩展 Session，再通过 Worker 的一次性交接 Token 让官网建立独立 Session。页面确认成功后停留在当前页，由用户选择“回到 Dashboard”或“回到首页”。官网登录还需要放行 `https://verbia.henriz.dev/account/callback`。
4. **Auth → Providers → Email**：开启 Email。**2026-09-15 起同时允许 OTP 验证码与密码登录**，
   取代此前「只保留 Magic Link、不设密码」的决策——注册即“验证码登录 + 补设密码”，
   密码可选（见 §七）。当前取值：

   | 设置 | 值 | 为什么 |
   |---|---|---|
   | Minimum password length | **6** | 产品决定；`apps/web/app/account/verify/page.tsx` 的前端校验与文案必须与这个数字一致，改一处就要改三处（后台 + 前端校验 + 中英文案） |
   | Password requirements | 不选 | 字符类别规则把人推向 `Password1!` 这类可预测模式，收益不如长度 |
   | Secure password change | 开 | 要求 24 小时内近期登录；我们的主流程（刚验证完就设密码）不受影响 |
   | Require current password when updating | **必须保持关闭** | 开启后无法给「还没有密码」的账号设第一个密码（Google 用户、刚注册用户） |
   | Prevent use of leaked passwords | 未开 | Supabase 标注仅 Pro 及以上套餐可用 |
   | Email OTP length | **6** | 界面输入框按 6 位设计（`maxLength`、占位符、中英文案都写 6）；改这个数字必须同步改界面，否则用户根本输不进去 |
   | Email OTP expiration | 3600 秒 | 验证码与邮件链接共用同一有效期，链接容易被稍后才打开，留 1 小时更宽容 |
5. **邮件发送：配 Resend 自定义 SMTP（上线必需）**。Supabase 默认代发仅限
   **2 封/h 且只发给组织团队成员**，官方定位为开发/测试用；换自定义 SMTP 后邮件
   才由你的发送商投递给真实用户：
   - **Resend 侧**：在 resend.com 添加发件域名（如 `mail.verbia.dev`），按提示完成
     DNS 验证（SPF/DKIM 一并配好），确认发件地址可用；拿一个 **API Key**（`re_…`）。
   - **Supabase 侧**：**Authentication → SMTP Settings**（旧版在 Project Settings →
     Authentication）填入：
     ```text
     SMTP Host:     smtp.resend.com
     SMTP Port:     465（SSL）或 587（TLS）
     SMTP User:     resend
     SMTP Password: <Resend API Key，re_ 开头>
     From email:    noreply@<你的发件域名>
     Sender name:   Verbia
     ```
   - 保存后等 1~2 分钟生效，重新触发一封 Magic Link 先发给自己验证。
   - 自定义 SMTP 生效后仍有**保护性限速（约 30 封/h）**，且 OTP/Magic Link 层默认
     360/h——两者都在 **Authentication → Rate Limits** 页可调。登录链接属低频请求，
     建议单邮箱保留 30~60/h 阈值防滥用轰炸即可，不必拉到无限。

   > 提示：Resend 域名验证会自动配好 SPF/DKIM；发往 QQ/163 等国内邮箱仍可能进
   > 垃圾箱，正式上线前建议用常见邮箱各实测一封。

> 发布到 Chrome Web Store 后，商店版扩展 ID 由商店开发者账号派生，会与本地
> `ndkpnij…` 不同。上架后把商店版 ID 的 redirect 也加进第 3 步即可。

## 三、本地联调

```bash
pnpm build          # 构建 dist/extension（注入 Supabase 配置）
pnpm api            # 网关 127.0.0.1:8787（tsx --env-file=.env.local）
```

- `chrome://extensions` 重新加载扩展 → 设置页出现 **Account** 卡片。
- Google 登录：点按钮打开普通标签页 → Google 授权 → 后台截获 code → 登录完成页显示成功；
  Magic Link：点「Email me a sign-in link」收邮件 → 点邮件链接 → 同样在登录完成页显示成功。页面提供“回到 Dashboard”和“回到首页”两个按钮，“回到 Dashboard”会打开扩展设置页并关闭登录标签
  （两种链路都要求在同一浏览器内发起，PKCE verifier 存在本地）。
- 已登录后生成请求自动带 `Authorization: Bearer <access_token>`；网关通过 Supabase
  项目的 ES256 JWKS 在本地验签并把请求归属到账号，不再为每次鉴权访问 `/auth/v1/user`。
- popup 底部显示登录态（邮箱 + 退出）。

## 四、额度开关（默认关闭，不改变现状）

网关默认**不**做任何限流：匿名与已登录都无限起草。要开启「登录用户每日免费次数」：

```env
ENFORCE_QUOTA=1
FREE_DAILY_QUOTA=10      # 免费版每天 10 次，超出返回 429 QUOTA_EXCEEDED
PREMIUM_DAILY_QUOTA=100  # 付费版每天 100 次；0 表示不限次数
```

- 匿名请求始终放行（与产品决策一致）。
- 已登录请求发起前调用 `check_generation_quota`（只读）判断套餐与剩余额度，超限返回 429；成功产出可用结果后才由 `record_generation_quota` 计数。接口失败或没有可用内容不扣额度。
- 配额数值/周期与付费层级的正式策略，等定价后再调（`profiles.plan` 已预留
  `free | premium` 与 `customer_id`）。

### 4.1 数据库必须比 Worker 新（重要）

额度写入发生在**数据库里的函数**，不在 Worker 里：`check_generation_quota` 与
`record_generation_quota` 由 `docs/supabase-schema.sql` 第 2 节定义。所以升级 Worker 时如果只部署代码、
没重跑第 2 节，会出现一种很难察觉的故障：

- 起草**照常成功**（网关对基础设施故障一律放行，不阻塞用户）；
- 但 **`quota_usage` 一行都不写**，官网/插件用量永远显示 0；
- 并且**免费用户的每日上限实际没有生效**。

**「需要重跑」的改动只有一种**：`docs/supabase-schema.sql` 这个文件本身变了——
建表 / 加字段 / 新建或改函数 / 索引 / RLS 策略 / grant-revoke。
改 Worker 代码、插件代码、文案、官网都**不需要**碰数据库。

**自检：一条命令，只读。**

```bash
pnpm db:check
```

它解析这份 SQL 里声明的每个表和函数，逐个探测线上项目：
`[db-check] database matches the schema.` 表示一致；不一致会列出缺失对象并以非 0 退出。
探针只带 publishable（anon）key，而这份 schema 已把 anon 从所有函数上 revoke，
所以探针不可能真的执行到任何东西；反过来，如果某个函数**能**在 anon 下执行，它会报警提示授权过宽。

也可以在 `wrangler tail` 里看每次起草的日志：`"quota":"ok"` 表示已记账，
`"skipped"` 表示 `ENFORCE_QUOTA` 未开启或 Supabase 变量缺失，
`"unavailable"` 表示写入失败（日志同时会打印具体原因）。

## 五、文件索引

| 文件 | 内容 |
|---|---|
| `docs/supabase-schema.sql` | profiles / quota_usage / 账单表 / 原子套餐与额度 RPC / RLS |
| `packages/shared/src/ui-strings.ts` | account.* 文案，31 种语言与 EN 逐键对称 |
| `packages/shared/src/messages.ts` | `GET_AUTH_STATE` / `SIGN_OUT` 消息 |
| `apps/extension/src/auth/supabase.ts` | PKCE client + chrome.storage 会话适配器 + `signInWithGoogle`（标签授权 + 等 session 落盘） |
| `apps/extension/src/options/index.ts` | Account 登录卡片（Google / 邮箱 Magic Link / 登出） |
| `apps/extension/src/popup/index.ts` | popup 底部登录态 |
| `apps/extension/src/background/index.ts` | generate 注入 Bearer、静默刷新、GET_AUTH_STATE、**回跳 code 捕获监听** |
| `services/api/src/server.ts` | Bearer 校验 + 可选配额 gate |
| `scripts/build.mjs` | 构建时注入 SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY |

## 六、官网账号面板（web 与扩展共用账号）

`apps/web`（Next.js 营销站）也接入了**同一个 Supabase 项目**——`profiles` /
`quota_usage` / `auth.users` 共享，**账号是同一份**。两边各自维护本地登录状态：

- 扩展：`chrome.storage.local` 的 session（包内 `auth/supabase.ts`）。
- 官网：`localStorage` 中的 `verbia-web-auth` session（`apps/web/lib/verbia-auth.ts`）。

所以同一用户在两边都能登录、看到同一份每日额度。**登录状态是两端共享的**：任一端退出，同一浏览器里的另一端也随之退出（详见 `docs/auth-session-sync.md`）。

### 1. Supabase Dashboard 需要做的一次性配置

- **Auth → URL Configuration → Redirect URLs** 里增加 web 的回跳路径：
  ```
  http://localhost:3000/account/callback
  https://verbia.henriz.dev/account/callback
  ```
  （与第三节里的扩展回跳 `https://...supabase.co/` 互不冲突；这是同一个项目里同时允许多个落地地址。）
- **Auth → Providers → Google** 与 **Email** 的设置不用改 —— 扩展走项目根，官网走自身域名，Supabase 用同一个 Google OAuth client。

### 2. 配置文件

`apps/web/.env.local`（与根 `.env.local` 同源，已被 `.gitignore` 忽略）：

```env
NEXT_PUBLIC_SUPABASE_URL=https://pthfyoejvlcwxboskrjr.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<与根 .env.local 的 SUPABASE_PUBLISHABLE_KEY 同一对>
NEXT_PUBLIC_VERBIA_API=https://api.verbia.henriz.dev
# 仅当 Supabase 开启了 CAPTCHA 保护时需要（见第 4 节）
NEXT_PUBLIC_CAPTCHA_PROVIDER=turnstile
NEXT_PUBLIC_CAPTCHA_SITE_KEY=
```

模板见根 `.env.example` 的 Website 段。

### 3. 本地联调与发布

```bash
pnpm --filter @verbia/web dev    # 本地跑 Next dev，看 /account 页面
pnpm --filter @verbia/web build  # 静态导出到 apps/web/out，部署到 verbia.henriz.dev
```

`/account` 页面会根据用户浏览器语言或 `?locale=` 在中英文之间切换，文案与扩展的 account.* 保持口径一致。

### 4. CAPTCHA（默认 Cloudflare Turnstile）

Supabase 的 **Authentication → Attack Protection** 一旦开启 CAPTCHA 保护，**所有发起登录的请求都必须带 token**，否则服务端直接拒绝（界面显示「人机校验未通过」）。这套保护有**两把钥匙分放两处**，最容易只装一半：

| 一半 | 放哪里 | 谁用 |
|---|---|---|
| **secret** | Supabase 面板（`••••••`，可 Reveal） | 服务端验证 token |
| **site key** | **提供方自己的后台** | 官网渲染控件 |

**Supabase 面板里没有 site key 输入框**——它只存 secret。所以 site key 只能去提供方后台取，且两者必须同属**同一个站点/账号**（拿 A 站点的 secret 配 B 站点的 sitekey，控件会渲染但每次都校验失败）。

**为什么默认 Turnstile：**

| | 免费档上限 |
|---|---|
| **Cloudflare Turnstile** | 挑战/验证请求**不限量**（免费档限制在 20 个 widget、每 widget 10 个 hostname） |
| **hCaptcha** | Basic 免费档 **每月 10,000 次请求**，超出需 Pro（约 $99–139/月） |

每次登录尝试算 1 次请求（发码、重发、密码登录各算一次）。另外 Turnstile 的 `appearance: "interaction-only"` 让通过静默校验的用户**看不到控件**，而且 API 已经在 Cloudflare 上，少一个后台。

官网侧要做的事：

1. 在提供方后台建站点，把 **`verbia.henriz.dev` 加进 hostname/Domains 列表**（Turnstile 可加 `localhost`，本地调试比 hCaptcha 友好），否则控件不签发 token。
2. 复制 **sitekey** → `apps/web/.env.local` 的 `NEXT_PUBLIC_CAPTCHA_SITE_KEY`；复制 **secret** → Supabase 面板的 Captcha secret；把 Supabase 的 provider 下拉切到 **Turnstile by Cloudflare**。
3. `NEXT_PUBLIC_CAPTCHA_PROVIDER` 必须与 Supabase 的下拉一致（`turnstile` 默认，可选 `hcaptcha`）。这两个键都是**构建期注入**的，改完必须**重新构建部署官网**。
4. 本地 `localhost` 若跑不了控件（hCaptcha 必须 Ngrok 或改 hosts；Turnstile 可把 localhost 加进 hostname 列表），也可以本地先不开 CAPTCHA——site key 为空时控件完全不渲染。

覆盖范围（`apps/web/components/captcha.tsx`）：

| 入口 | 需要 token |
|---|---|
| 账号页「给我发送登录验证码」 | ✅ `signInWithOtp` |
| 账号页「密码登录」 | ✅ `signInWithPassword` |
| 验证页「重新发送验证码」 | ✅ 又一次 `signInWithOtp`，需新 token |
| 验证页「输入验证码」 | ❌ 验证既有挑战，不发起新请求 |
| 「使用 Google 登录」 | ❌ 跳转流程，不受影响 |

两条行为约定：

- **`NEXT_PUBLIC_HCAPTCHA_SITE_KEY` 为空时控件完全不渲染**，请求照旧发出。所以本地、预览等没有 CAPTCHA 的环境不需要配置，也不会被这套代码影响。
- token 是**一次性**的，页面在提交时取新 token，并在每次尝试后（含失败）重置控件——否则第二次提交会拿着已用过的 token 失败。
- 控件已加载但未完成校验时，官网**先本地拦下**并提示「请先完成上方的人机校验」，不会把注定失败的请求发出去。
