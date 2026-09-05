# Verbia — Supabase 登录接入

Verbia 的账号体系：Google 第三方登录 + 邮箱 Magic Link（免密），由 Supabase Auth 托管。
扩展在本地通过 PKCE 完成登录；`services/api` 网关校验 Bearer token，把用量归属到账号。
**未登录完全不影响现有功能**（匿名照常起草），登录只提供云端身份，为额度与付费预留。

## 一、已落地的代码侧配置

| 项 | 值 |
|---|---|
| Supabase 项目 ref | `pthfyoejvlcwxboskrjr` |
| API URL | `https://pthfyoejvlcwxboskrjr.supabase.co` |
| 扩展固定 ID（manifest `key` 派生） | `ndkpnijcnjkkgoehfdcpfleoipfhfdnp` |
| 登录回跳落地页（Google + Magic Link 统一） | `https://pthfyoejvlcwxboskrjr.supabase.co/`（项目根，加载瞬间即被扩展后台截获） |
| Google OAuth Client（**Web application 类型**）Client ID | `524647893236-uoo6f3bb0abl36cae9rq8le2gfs3bpcv.apps.googleusercontent.com` |
| 同上 Client Secret | 在 Google Cloud Console 该 client 里查看（机密，不写进仓库/文档） |

- `.env.local` / `.env.example` 已加 `SUPABASE_URL`、`SUPABASE_PUBLISHABLE_KEY`（publishable key 公开，
  由 `scripts/build.mjs` 在构建时注入扩展产物）；可选 `ENFORCE_QUOTA`、`FREE_DAILY_QUOTA`。
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
   - **Site URL** 填 `https://pthfyoejvlcwxboskrjr.supabase.co/`（同落地页），
     否则未匹配的回跳会回落到 Supabase 默认的 `http://localhost:3000`；
   - **Redirect URLs** 添加：
   ```
   https://pthfyoejvlcwxboskrjr.supabase.co/
   ```
   这条项目根地址服务 **Google 登录与 Magic Link 两条链路**，必须在 Supabase 放行，
   否则登录失败。背景：Chrome 不允许服务端 302 跳进 `chrome-extension://` 页面
   （会报 `ERR_BLOCKED_BY_CLIENT`），而 `chrome.identity.launchWebAuthFlow` 在本机不可用
   （弹窗无法建立）。因此所有回跳统一落到**项目根**（普通 https，永不拦截），由扩展
   **后台的常驻监听**（`background` 的 `tabs.onUpdated`）在标签落地瞬间截获 `?code=`、
   换 session 并自动关闭该标签——Google 打开的是扩展自己的授权标签，Magic Link 则是
   用户从邮件点开的标签（浏览器必须先装着扩展且由它发起的链接，verifier 才在本地）。
   （早期加过 `chrome-extension://…/**`、`https://…chromiumapp.org/**` 的现已不需要，
   可删可留。）
4. **Auth → Providers → Email**：开启 Email 并**只保留 Magic Link**（关闭 password
   登录——产品决策：账号只允许 Google 或邮箱免密链接，不设密码）。
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
- Google 登录：点按钮闪开一个普通标签页 → Google 授权 → 后台截获 code、登录成功、标签自动关闭；
  Magic Link：点「Email me a sign-in link」收邮件 → 点邮件链接 → 同样自动完成登录并关闭该标签
  （两种链路都要求在同一浏览器内发起，PKCE verifier 存在本地）。
- 已登录后生成请求自动带 `Authorization: Bearer <access_token>`；网关用
  `/auth/v1/user` 校验并把请求归属到账号（日志可见 `user <uuid>`）。
- popup 底部显示登录态（邮箱 + 退出）。

## 四、额度开关（默认关闭，不改变现状）

网关默认**不**做任何限流：匿名与已登录都无限起草。要开启「登录用户每日免费次数」：

```env
ENFORCE_QUOTA=1
FREE_DAILY_QUOTA=30      # 每天 30 次，超出返回 429 QUOTA_EXCEEDED
```

- 匿名请求始终放行（与产品决策一致）。
- 已登录请求每起草一次调用 `consume_quota` RPC 并 +1；超限 429。
- 配额数值/周期与付费层级的正式策略，等定价后再调（`profiles.plan` 已预留
  `free | premium` 与 `customer_id`）。

## 五、文件索引

| 文件 | 内容 |
|---|---|
| `docs/supabase-schema.sql` | profiles / quota_usage / 触发器 / consume_quota RPC / RLS |
| `packages/shared/src/ui-strings.ts` | account.* 双语文案（en/zh 对称） |
| `packages/shared/src/messages.ts` | `GET_AUTH_STATE` / `SIGN_OUT` 消息 |
| `apps/extension/src/auth/supabase.ts` | PKCE client + chrome.storage 会话适配器 + `signInWithGoogle`（标签授权 + 等 session 落盘） |
| `apps/extension/src/options/index.ts` | Account 登录卡片（Google / 邮箱 Magic Link / 登出） |
| `apps/extension/src/popup/index.ts` | popup 底部登录态 |
| `apps/extension/src/background/index.ts` | generate 注入 Bearer、静默刷新、GET_AUTH_STATE、**回跳 code 捕获监听** |
| `services/api/src/server.ts` | Bearer 校验 + 可选配额 gate |
| `scripts/build.mjs` | 构建时注入 SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY |
