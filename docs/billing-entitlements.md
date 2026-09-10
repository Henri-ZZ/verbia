# Verbia 付费状态与套餐同步

## 数据来源

Supabase `profiles.plan` 是 Verbia 运行时判断套餐的唯一来源。生成接口和用量接口不会向 Waffo、Stripe 或其他支付平台查询订阅。

支付平台只负责收款并通过签名 Webhook 把状态同步到 Supabase：

```text
Waffo / 未来的 Stripe
  → 验证 Webhook 签名和所属商店
  → apply_billing_event RPC
  → billing_events 幂等记账
  → billing_subscriptions 更新该支付平台的订阅
  → profiles 汇总所有平台后的当前套餐
  → generate 通过 consume_generation_quota 在同一事务中判断套餐并扣减额度
```

这样新增支付平台时，只需要把其事件映射为统一套餐状态，不需要修改生成链路。

生成热路径只调用一次 `consume_generation_quota`。该 RPC 在数据库内部读取 `profiles.plan`，核对仍然有效的多平台订阅，选择 Free 或 Premium 限额，并原子扣减当天用量；Worker 不再先查套餐再发第二次扣减请求。

## profiles 账单字段

| 字段 | 作用 |
|---|---|
| `plan` | 当前运行时套餐：`free` 或 `premium` |
| `billing_provider` | 最近更新套餐的支付平台，例如 `waffo`、`stripe` |
| `billing_environment` | 支付环境，例如 `test`、`prod` |
| `billing_customer_id` | 支付平台提供稳定客户 ID 时保存；不能用可修改的邮箱代替 |
| `billing_subscription_id` | 支付平台订阅或订单 ID |
| `subscription_status` | `active`、`canceling`、`canceled`、`past_due` 等统一状态 |
| `current_period_end` | 当前已付款周期结束时间 |
| `billing_event_at` | 最后一个实际修改套餐的支付事件时间 |

`billing_subscriptions` 以 `(provider, environment, subscription_id)` 区分每一份订阅。同一用户即使同时拥有 Waffo 和 Stripe 订阅，只要其中一份仍有效，汇总后的 `profiles.plan` 就保持 `premium`；取消一个平台不会错误地取消另一个平台提供的权益。

`billing_events` 只保存处理 Webhook 所需的最小审计字段，不保存卡号、地址、金额或完整原始载荷。`(provider, delivery_id)` 是主键，用于抵御 Webhook 重试。

## Waffo 状态映射

| Waffo 事件 | Verbia 套餐 | 状态 |
|---|---|---|
| `subscription.activated` | Premium | active |
| `subscription.payment_succeeded` | Premium | active |
| `subscription.uncanceled` | Premium | active |
| `subscription.updated` | Premium | active |
| `subscription.canceling` | Premium | canceling，保留到付费周期结束 |
| `subscription.canceled` | Free | canceled |
| `subscription.past_due` | Free | past_due |
| 退款、一次性订单及未知事件 | 不改变套餐 | 只记审计事件 |

事件乱序时，`apply_billing_event` 只允许时间不早于当前订阅状态的事件更新该订阅。重复投递会直接忽略，`profiles.plan` 每次从全部订阅重新汇总。

## 上线与迁移

1. 在 Supabase SQL Editor 重新执行 `docs/supabase-schema.sql`。SQL 使用 `if not exists`，可安全升级已有表。
2. 发布 Worker，使 Waffo Webhook 开始写入 Supabase。
3. 为每个现有订阅补一次初始状态：如果 Waffo 的 Webhook 投递记录支持重新投递，就重投最近一次有效订阅事件；否则根据已核对的 Waffo 订单，在 SQL Editor 手动补 `billing_subscriptions` 并把对应 `profiles.plan` 设为 `premium`。至少要处理当前测试账号，否则历史付费用户在收到下一次续费事件之前仍会保持 `free`。
4. 检查 `billing_events` 和 `billing_subscriptions` 已产生记录，并确认相应 `profiles.plan`、`subscription_status` 和 `current_period_end` 正确。
5. 分别重放同一事件和一个更早事件，确认套餐没有被重复或回退更新。

上线后排查付费状态时，先查看 `profiles`，再通过 `billing_events` 查找最近事件，最后到支付平台确认 Webhook 投递日志。不要在请求链路中临时恢复支付平台实时查询。

手动补历史订阅时可使用下面的模板。所有占位值必须来自已经验证的 Waffo 订单，不能使用结账页里可修改的付款邮箱来确定用户：

```sql
begin;
insert into public.billing_subscriptions (
  provider, environment, subscription_id, user_id, status,
  current_period_end, event_at
) values (
  'waffo', 'prod', '<WAFFO_ORDER_ID>', '<SUPABASE_USER_UUID>', 'active',
  '<CURRENT_PERIOD_END>', now()
)
on conflict (provider, environment, subscription_id) do update
set user_id = excluded.user_id,
    status = excluded.status,
    current_period_end = excluded.current_period_end,
    event_at = excluded.event_at,
    updated_at = now();

update public.profiles
set plan = 'premium',
    billing_provider = 'waffo',
    billing_environment = 'prod',
    billing_subscription_id = '<WAFFO_ORDER_ID>',
    subscription_status = 'active',
    current_period_end = '<CURRENT_PERIOD_END>',
    billing_event_at = now(),
    updated_at = now()
where id = '<SUPABASE_USER_UUID>';
commit;
```
