# Verbia — Supabase 登录接入

Verbia 的账号体系：Google / Microsoft 第三方登录 + 邮箱验证码（免密，密码可选），由 Supabase Auth 托管。
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
   密码可选（见 §六.6）。当前取值：

   | 设置 | 值 | 为什么 |
   |---|---|---|
   | Minimum password length | **6** | 产品决定。前端有**三处**校验必须与它一致：`account/verify`（注册设密码）、`account`（登录后设置/修改）、`account/reset`（找回）——每处都含中英文案，改这个数字时三处一起改 |
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
6. **Auth → Providers → Azure（Microsoft 登录）**：开启后即可让 outlook.com / hotmail / live
   与企业 Microsoft 账户登录。**这一步全部免费**（Entra ID 免费层就能完成应用注册），
   也没有 Apple 那种半年密钥轮换、邮件中继域名注册或付费会员。
   在 [Azure Portal](https://portal.azure.com) → **Microsoft Entra ID** → **应用注册** 里做：

   | 步骤 | 取值 |
   |---|---|
   | 新建注册 | 名称随意；**支持的账户类型**选「任何组织目录中的账户和个人 Microsoft 账户」——多租户 + 个人账户，两类账号都能登录 |
   | 重定向 URI | 平台选 **Web**，填 `https://pthfyoejvlcwxboskrjr.supabase.co/auth/v1/callback` |
   | 客户端密码 | 「证书和密码」→ 新建客户端密码 → 记下**值（Value）**，不是「密码 ID」 |
   | 复制 | **应用程序（客户端）ID** 与上面那个密码**值** |

   然后在 Supabase 面板的 Azure 里填 **Application (client) ID** 与 **Secret**；
   **Azure Tenant URL 留空**即可——默认走 `common` 租户，正好对应"多租户 + 个人账户"。

   三点注意：

   - **客户端密码有有效期**（最长 24 个月）。到期前要在 Azure 里新建一个并同步更新到
     Supabase，否则登录直接失败——建议现在就在日历上留提醒。这与 Google 的 client secret
     不同（Google 的不会自己过期）。
   - **必须请求 `email` scope**：Azure 不主动返回邮箱地址，而 Supabase Auth 需要邮箱才能建账号。
     代码里已经固定（`signInWithAzure`，`apps/web/lib/verbia-auth.ts`）。
   - 项目用的是**多租户 + 个人账户**，因此不落在 Supabase 文档提到的"单租户未验证邮箱域"
     风险里，**无需**额外配置 `xms_edov` 可选声明。

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
| `apps/extension/src/auth/supabase.ts` | PKCE client + chrome.storage 会话适配器 + `webSignInUrl`（登录统一在官网进行） |
| `apps/extension/src/options/index.ts` | Account 卡片（登录按钮打开官网 / 身份徽章 / 登出） |
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
- **Auth → Providers → Google**、**Azure** 与 **Email** 的设置不用改 —— 扩展走项目根，官网走自身域名，Supabase 用同一套 Google / Microsoft 应用凭据。

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

- **`NEXT_PUBLIC_CAPTCHA_SITE_KEY` 为空时控件完全不渲染**，请求照旧发出。所以本地、预览等没有 CAPTCHA 的环境不需要配置，也不会被这套代码影响。
- token 是**一次性**的，页面在提交时取新 token，并在每次尝试后（含失败）重置控件——否则第二次提交会拿着已用过的 token 失败。
- 控件已加载但未完成校验时，官网**先本地拦下**并提示「请先完成上方的人机校验」，不会把注定失败的请求发出去。

### 5. 邮件模板：只发 6 位验证码

Supabase 默认的 **Magic Link** 模板只含 `{{ .ConfirmationURL }}`——**一个链接，没有验证码**，而官网的流程是"发码 → 在 `/account/verify` 输入 6 位数字"。到 **Authentication → Email Templates → Magic Link** 改成下面的样子：把原来的按钮位置换成验证码。

```html
<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#f4f5f0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #dce5db;border-radius:16px;box-shadow:0 8px 26px rgba(33,69,49,.06);">
          <tr>
            <td style="padding:36px 36px 8px;text-align:center;">
              <p style="margin:0;font-family:Georgia,serif;font-size:24px;font-weight:bold;color:#0f6e56;">Verbia</p>
              <p style="margin:6px 0 0;font-family:Georgia,serif;font-size:14px;font-style:italic;color:#33604e;">You mean it. Verbia says it.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 36px 8px;">
              <h1 style="margin:0;font-family:Inter,Arial,Helvetica,sans-serif;font-size:20px;line-height:1.3;color:#172019;">Your sign-in code</h1>
              <p style="margin:14px 0 0;font-family:Inter,Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#39483e;">
                Enter this code on the sign-in page to sign in to {{ .Email }}. You can use the same account across the Verbia website and the browser extension.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 36px 6px;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;background:#f2fcf4;border:1px solid #dce5db;border-radius:12px;">
                <tr>
                  <td style="padding:18px 30px 18px 38px;">
                    <p style="margin:0;font-family:'SF Mono',Menlo,Consolas,'Courier New',monospace;font-size:32px;font-weight:bold;letter-spacing:8px;color:#0f6e56;">{{ .Token }}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 36px 8px;">
              <p style="margin:0;font-family:Inter,Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#66736a;text-align:center;">
                This code expires in 10 minutes and can only be used once.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 36px 34px;">
              <p style="margin:0;font-family:Inter,Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#66736a;">
                Didn't request this email? You can safely ignore it — your account won't be changed.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 36px;border-top:1px solid #eef2ee;text-align:center;">
              <p style="margin:0;font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:#718078;">
                Verbia &middot; <a href="https://verbia.henriz.dev" style="color:#0f6e56;text-decoration:none;">verbia.henriz.dev</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

- **Subject** 也改掉默认的 “Confirm Your Email”，写清是登录验证码。
- **产品决定：不发送登录链接，只发验证码。** 因此代码里没有 `?token_hash=` 落地处理，也没有 `verifyEmailLink`。
- **验证页始终提交「邮箱 + 验证码」这一对**：6 位数字本身不携带身份，Supabase 校验的是 `(email, token)`。邮箱输入框**常显**，有记录时预填发起登录用的那个地址（sessionStorage 按浏览器、按标签页分开，只有发起登录的那个标签页里有）。
- 因此**跨设备可用**：手机上发码、想在电脑上登录时，把那封邮件里的**邮箱和验证码一起填上**即可——这是去掉链接后必须补上的能力。
- **`This code expires in …` 要和后台一致**：Supabase 的 **Email OTP Expiration 默认 3600 秒（60 分钟）**。模板写 10 分钟就必须把后台也改成 600，否则文案是错的。
- 新注册用户若收到的是另一封模板（Confirm signup），**同样加上 `{{ .Token }}`**，否则新老用户的体验会不一致。
- **Reset Password 模板**（找回密码用）也要有 `{{ .Token }}`。`/account/reset` 两种进入方式都支持——邮件里的验证码（`verifyOtp({ type: "recovery" })`）和邮件链接（`?code=`）——所以模板给哪种都能走通；两种都给也可以，页面会按 URL 里有没有 `code` 自动选择。
- 模板是**项目级**的，Supabase 不支持按用户语言切换——31 种界面语言的用户会收到同一封邮件。要本地化只能自建邮件通道，目前按单一语言（建议英文或中英并列）处理。
- 改完模板后要**重新发一封**验证新内容；已发出的邮件仍带旧模板。

### 6. 密码：设置、修改、找回

| 入口 | 位置 | 机制 |
|---|---|---|
| 注册时设密码 | `/account/verify` 的「设置密码」步骤（**仅账号创建后 2 分钟内**出现） | `updateUser({ password })` |
| 登录后设置/修改 | `/account` 卡片里的「密码」区块 | 同上，依赖活跃会话 |
| 忘记密码 | `/account/reset`（入口：账号页密码登录模式下的「忘记密码？」） | 发重置邮件 → 验证码或链接 → 再 `updateUser` |

三点注意：

- **前端无法判断账号是否已设过密码**：Supabase 的 user 对象里 `provider: "email"` 同时覆盖"魔法链接用户"和"密码用户"，没有可读的标记。所以文案只能写成「设置或修改」这类通用说法，不能按状态切换。**唯一的例外是下一条。**
- **纯 Google 账号（`identities` 里没有 `email`）用单独一套文案**：这种账号一定没设过密码——**设密码正是产生 email 身份的那个动作**。所以对它写成「备用登录方式 / 可选。设置后也能用邮箱 + 密码登录；Google 登录始终可用」，而不是「设置或修改密码」；区块**照旧显示**，因为对这类账号它是唯一的备用通道。
  - 判定只用 `user.identities`，**绝不能用 `app_metadata.provider`**：后者表示"最近一次怎么进来的"，同一账号会在 Google 与邮箱之间翻转，密码区会忽隐忽现。
  - 反向不成立：**有 email 身份 ≠ 有密码**（只用过验证码的账号也有 email 身份）。
- **业内做法（2026-09-16 调研）**：**Figma** 按注册方式决定——Google 注册的账号不能在站内改邮箱/密码（理由写作 "Managed by Google"），但官方文档给出了替代路径：**走登录页的 Reset password 设置新密码**（也就是说，"忘记密码"就是这类账号的设密码入口）。**Notion** 一律提供，措辞是"设置一个永久密码，**替代临时验证码**"，并允许移除密码（Supabase 客户端没有删除密码的接口，这条我们做不到）。**Linear / Vercel / Slack** 干脆只有 SSO + 邮箱验证码、没有密码。**Clerk** 的 user 对象直接提供 `passwordEnabled` 布尔值，**Supabase 没有这个字段**，因此我们只能用 `identities` 近似。
- **要不要把 Google 账号那块入口隐藏，取决于一条未验证的事实**：纯 Google 账号能否收到验证码 / 重置邮件（自测见第 7 小节）。**收得到** → 可以按 Figma 那样隐藏，并把用户引到「忘记密码？」；**收不到** → 隐藏等于把账号永久锁死在 Google，**绝不能隐藏**。当前的选择是**不隐藏**。
- 若项目开了 **Secure password change**（修改密码要求近期登录），会返回 `reauthentication_needed`，错误映射里已有文案（"出于安全考虑，请重新登录后再修改密码"）。
- 重置流程的两种进入方式：验证码走 `verifyOtp({ type: "recovery" })`，链接走 `?code=` → `exchangeCodeForSession`。链接方式会**跳过验证码输入**——它本身已经带齐了凭据，再要求手输一次没有意义。
- 同一邮箱同时用 Google 与验证码/密码登录时的行为（含必须自测的一条）见 **第 7 小节**。

### 7. 同一邮箱的多种登录方式（身份链接）

同一邮箱既用 Google 登录、又用邮箱验证码登录时，**结果是同一个账号，不会分成两个**。这是 Supabase Auth 的默认行为（自动链接），我们没有开过 Manual Linking（仓库内搜不到该配置）：

> "Supabase Auth automatically links identities with the same email address to a single user."
> —— [Identity Linking](https://supabase.com/docs/guides/auth/auth-identity-linking)

三条配套规则：

- **只对已验证邮箱自动链接**。未验证的邮箱不链接——那是"预占位接管"：攻击者用未验证邮箱抢注，等受害者用 OAuth 登录时被链进攻击者的用户上。
- 链接发生时，同邮箱下**其他未确认的身份会被删除**，所以不会留下半成品账号。
- 因为只有一个 user id，`profiles` 与 `quota_usage` 都是同一份：**换登录方式不重置额度，也刷不出第二个免费账号。**

#### 用户会看到什么

| 现象 | 原因 |
|---|---|
| Google 徽章与头像不再显示 | `providerOf()`（`apps/web/lib/verbia-auth.ts`）读的是 `app_metadata.provider`，用验证码登录后它会变成 `email`。**纯外观**，账号没变 |
| 「设置或修改密码」仍然可用 | 官方 FAQ 明确：给 OAuth 账号加邮箱 / 密码登录就是 `updateUser({ password })`。GoTrue 另有 `email_identity_on_password_test.go`，覆盖的正是"给 OAuth 用户设密码会补一个 email 身份" |
| 套餐与用量都不变 | 同一个 user id |

`services/api/src/app.ts` 的 `createSessionHandoff` 里有一道对应的保险：

```ts
const { data } = await admin.auth.admin.generateLink({ type: "magiclink", email });
if (data.user.id !== auth.userId) throw new Error("Session handoff user mismatch");
```

`generateLink` 是**按邮箱**找人的。正常情况下邮箱唯一、不存在歧义，但一旦出现错配，这条断言会让交接**硬失败**，而不是把别人的会话交给扩展。

#### 一条未确证的点（改文案前先自测）

官方文档只写了**正向**顺序（用户用 OAuth 登录时，Auth 会去找同邮箱的既有用户），**没有写反向**顺序（先 Google、再用邮箱验证码）。2026-09-16 查 GoTrue 源码时拿到的是较旧修订版：`/otp` → `MagicLink`，对"已存在且已确认"的用户是直接发信 + 空 200 响应，没有报错分支——但**当前托管版本是否会给一个从未有过 email 身份的纯 OAuth 账号发信并补上该身份，未从代码或文档确证**。

这里有个陷阱：为防账号枚举，这类接口的成功响应是**模糊的**——**即使一封邮件都没发出，界面也会照常显示「验证码已发送」**。所以界面提示不能作为判断依据，**只能看收件箱**：

1. Dashboard → Authentication → Users → 打开该账号，看 **Identities**（纯 Google 用户此刻只有 `google`）；
2. 退出登录，在 `/account` 用**同一邮箱**请求验证码；
3. **收到邮件** → 用码登录 → 再回 Dashboard：Identities 应为 `google + email`，且 **user id 不变** → 两边都通，代码无需改；
4. **收不到邮件** → 说明这条路径对纯 OAuth 账号不可用，界面文案必须挡住它（不能让 Google 用户以为验证码会到）。

#### 安全边界

自动链接把账号的信任边界从「**Google 账号**」扩成「**Google 账号或收件箱**」。这与「重置密码」是同一个信任假设，不是新增漏洞——但它正是 Supabase 只在邮箱**已验证**时才链接的原因（否则用未验证邮箱就能抢注他人账号）。对本产品是净收益：Google 用户多了一条找回通道。

#### 已知的界面缺口（可选改进）

徽章现在只读 `app_metadata.provider`，所以用验证码登录过的 Google 用户会看到 Google 标记消失，容易误以为"绑定丢了"。`user.identities` 里其实同时有 `google` 与 `email`，可以直接显示「Google · 邮箱」。未做。

