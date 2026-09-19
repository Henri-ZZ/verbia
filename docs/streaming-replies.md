# Verbia 流式回复机制

## 请求兼容性

`POST /v1/replies:generate` 保留两种返回方式：

- 未声明流式能力的旧插件继续收到完整 JSON。
- 新插件发送 `Accept: application/x-ndjson`，Worker 返回逐行 JSON 事件流。

因此应先部署 API，再发布扩展更新；即使顺序相反，新插件也能识别旧 API 的完整 JSON 并正常展示，只是暂时没有逐字效果。

## 事件协议

每行是一个独立 JSON 对象，以换行符结束：

```text
{"type":"start","requestId":"..."}
{"type":"delta","requestId":"...","text":"Hello "}
{"type":"delta","requestId":"...","text":"there"}
{"type":"done","requestId":"...","result":{...}}
```

流已经开始后发生错误时发送 `error` 事件。此时 HTTP 状态通常已经是 200，客户端必须以流事件而不是状态码判断最终结果。

## 多模型切换

- 首段文字返回前失败：可以自动切换到下一个供应商。
- 已经向用户展示文字后失败：停止当前流，不把另一个模型从头生成的内容拼接到后面。
- 中断时保留已经显示的草稿，用户可以编辑或重新生成。

## 额度与取消

生成前仍先检查额度，只有完整、有效的草稿完成后才记录一次用量。用户取消、超时、上游失败或空结果不会记录成功用量。

回复面板通过 `chrome.runtime.Port` 与扩展后台保持本次生成的双向通道。取消或关闭面板会中止后台 fetch；Worker 的响应流取消后继续向上游传播中止信号。

## 可观测性

每次供应商尝试记录 `model_attempt`；每条流记录 `reply_stream`。重点关注：

- `firstTokenMs`
- `durationMs`
- `outcome`
- `provider`
- `modelRoute`

日志不包含上下文、用户意图或草稿文字。
