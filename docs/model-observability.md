# Verbia 模型性能日志

## 采集范围

Worker 为每一次实际模型调用写一条结构化 `model_attempt` 日志。一次请求如果先失败再切换备用模型，会产生多条日志，因此可以分别分析首选和 fallback 的耗时。

日志字段：

| 字段 | 含义 |
|---|---|
| `event` | 固定为 `model_attempt` |
| `requestId` | 关联同一次生成请求的随机 UUID |
| `provider` | `gemini`、`mistral`、`cloudflare`、`groq` |
| `model` | 实际配置的模型名称 |
| `attempt` | 本次请求中的第几次模型尝试，从 1 开始 |
| `route` | `baseline` 或 `fallback` |
| `outcome` | 成功或标准化失败类别 |
| `durationMs` | 该模型尝试的完整耗时 |
| `status` | 上游有 HTTP 状态时记录 |
| `inputTokens` | 上游成功返回时记录的输入 Token 数 |
| `outputTokens` | 上游成功返回时记录的输出 Token 数 |
| `country` | Cloudflare 提供的请求国家代码 |
| `colo` | 执行请求的 Cloudflare 数据中心代码 |

`outcome` 可能为：`success`、`timeout`、`rate_limited`、`authentication`、`upstream_4xx`、`upstream_5xx`、`network`、`invalid_response`、`aborted`。

日志不包含用户 ID、邮箱、Bearer Token、页面内容、对话上下文、用户意图、生成草稿或 API Key。

## Cloudflare 看板

进入：

```text
Cloudflare Dashboard
→ Workers & Pages
→ verbia-api
→ Observability
→ Query Builder
```

先添加过滤条件 `event = model_attempt`。建议保存以下查询：

1. **Model latency**：按 `provider`、`model` 分组，显示 Count、Average、P50、P95 和 P99 的 `durationMs`。
2. **Model reliability**：按 `provider`、`outcome` 分组，显示 Count；用成功数除以总数计算成功率。
3. **Fallback rate**：按 `provider`、`route` 分组，查看 fallback 的数量和耗时。
4. **Regional latency**：按 `country`、`provider` 分组，显示 Count、P50 和 P95；样本过少的国家不要单独决策。
5. **Rate limits and timeouts**：过滤 `outcome = rate_limited OR outcome = timeout`，按 provider 显示时间趋势。

当前 `wrangler.jsonc` 对日志使用 `head_sampling_rate: 1`，即全量采集。流量增长后可降低采样率，但调度评估期间应保持全量，以免小样本和低频错误被遗漏。

Workers Logs 的保留时间有限。当前阶段用原生 Query Builder 足够；需要保留数周或数月时，再把同样的字段写入 Workers Analytics Engine 或导出到长期存储。

## 调度评估口径

不要只比较平均耗时。每个模型至少积累 100 次成功请求，最好达到 300–500 次并覆盖多个国家后，再同时比较：

- 成功率
- P50 和 P95
- 429 与超时比例
- fallback 后成功率
- 输入、输出 Token 相近时的耗时
- 各主要国家的结果

在数据达到这个规模之前保持现有权重，避免根据少量偶发请求调整模型顺序。
