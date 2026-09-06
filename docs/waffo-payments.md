# Waffo Pancake 支付维护说明

Verbia Pro 使用 Waffo Pancake 订阅制支付。测试阶段使用测试密钥、测试订单与测试 Webhook 跑通完整授权闭环；正式上线时切换为生产密钥和 `WAFFO_ENVIRONMENT=prod`。

- 月付：USD 9.99，每月续订
- 年付：USD 69.99，每年续订
- Pro 额度：每天 100 次
- 收银台由 Waffo 托管，官网只创建结账会话并在新标签页打开

## 商品

| 商品 | Product ID |
| --- | --- |
| Verbia Pro Monthly | `PROD_4I2xyWHmXqNkh9SLR8XQJ3` |
| Verbia Pro Annual | `PROD_3DZiksLVO99qJnLagyShiN` |

两个商品属于同一个 `Verbia Pro` 产品组，便于后续支持月付与年付切换。

## 服务端流程

`POST /v1/billing/checkout` 要求有效的 Supabase Bearer Token。API 使用 Supabase 用户 ID 作为 Waffo 的 `buyerIdentity`，使用账号邮箱预填收银台，并返回短期有效的 `checkoutUrl`。

`POST /v1/billing/webhook` 使用 SDK 对原始请求体和 `X-Waffo-Signature` 验签。店铺分别按测试和生产环境注册订阅激活、续费、取消、欠费和退款等事件。

账号套餐通过 Waffo 订阅订单实时判断。订单的 `testMode` 必须与 `WAFFO_ENVIRONMENT` 一致；状态为 `active` 或 `canceling` 的对应商品会被识别为 Pro。取消生效、欠费或订阅失效后自动回到免费版。

## 环境变量

公开标识配置在 `wrangler.jsonc`：

- `WAFFO_MERCHANT_ID`
- `WAFFO_STORE_ID`
- `WAFFO_ENVIRONMENT`
- `WAFFO_MONTHLY_PRODUCT_ID`
- `WAFFO_ANNUAL_PRODUCT_ID`

`WAFFO_PRIVATE_KEY` 必须使用 Cloudflare Worker Secret，不能写入 `wrangler.jsonc`、网页环境变量或浏览器代码：

```bash
pnpm exec wrangler secret put WAFFO_PRIVATE_KEY
```

测试阶段使用 `WAFFO_ENVIRONMENT=test`。正式上线时写入生产私钥、把该变量改为 `prod`，并注册生产 Webhook；业务代码无需修改。

## 发布

修改 API 后：

```bash
pnpm typecheck
pnpm test
pnpm api:deploy:dry
pnpm api:deploy
```

修改官网后：

```bash
pnpm web:build
pnpm exec wrangler pages deploy apps/web/out --project-name verbia-web --branch main
```

## 安全要求

- 只在服务端初始化 `@waffo/pancake-ts`。
- Webhook 必须通过 `request.text()` 读取原始请求体。
- 收银台必须在新标签页打开。
- 不记录私钥、Supabase Token 或 Waffo 收银台 Session Token。
