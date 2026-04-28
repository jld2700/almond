# 快速开始

## Quick Start

启动交互终端：

```bash
almond
```

进入后输入任务，使用 `/exit` 或 `/quit` 退出：

```text
Almond interactive mode
Type /exit or /quit to quit.

almond> Summarize this project
...
almond> /exit
```

执行一次性任务：

```bash
almond "Summarize this project"
```

## Raw ACP stdio mode

```bash
printf '%s\n' '{"type":"run.start","runId":"run_1","prompt":"hello"}' | almond --stdio
```

Expected output is NDJSON events:

```json
{"type":"session.started","runId":"run_1","sessionId":"..."}
{"type":"message.delta","runId":"run_1","role":"assistant","content":"..."}
{"type":"run.completed","runId":"run_1","sessionId":"...","result":"..."}
```

---

## 端到端演示: CLI 发起 Agent Run

### 场景描述

用户在 CLI 输入一个任务。CLI 生成 ACP `run.start`，Runtime 调用 Claude Agent SDK，SDK 返回流式消息，Runtime 转成 ACP events，CLI 展示输出。

### Step 1: 用户输入

```text
almond "Find TODO comments in this project"
```

CLI 生成命令：

```ts
const command = {
  type: "run.start",
  runId: "run_123",
  prompt: "Find TODO comments in this project",
  allowedTools: ["Read", "Glob", "Grep"],
};
```

### Step 2: Runtime 处理

```ts
for await (const sdkMessage of query({ prompt, options })) {
  yield mapSdkMessageToAcpEvent(sdkMessage);
}
```

### Step 3: 客户端输出

```text
Scanning project files...
Found 3 TODO comments:
- src/a.ts:12 ...
- src/b.ts:31 ...
- tests/c.test.ts:8 ...
```

### 完整流程图

```text
用户输入 CLI
    │
    ▼
CLI Adapter
    │ run.start
    ▼
ACP Runtime
    │ startRun(command)
    ▼
@almond/core
    │ query(prompt, options)
    ▼
Claude Agent SDK
    │ SDK message stream
    ▼
Event Mapper
    │ ACP events
    ▼
CLI Adapter
    │ render message/tool/approval events
    ▼
用户看到结果
```

---

## 常见模式

### 监听流式文本

```ts
for await (const event of events) {
  if (event.type === "message.delta") {
    process.stdout.write(event.content);
  }
}
```

### 处理审批请求

```ts
for await (const event of events) {
  if (event.type === "approval.requested") {
    const decision = await askUser(event);
    await runtime.respondApproval({
      type: "approval.respond",
      runId: event.runId,
      approvalId: event.approvalId,
      decision,
    });
  }
}
```

### 取消任务

```ts
await runtime.cancelRun("run_123");
```

---

## 测试

### 单元测试 Mock

```ts
class MockBackend {
  async *startRun() {
    yield { type: "message.delta", runId: "run_1", role: "assistant", content: "Hello" };
    yield { type: "run.completed", runId: "run_1", result: "Hello" };
  }
}
```

### 集成测试

```ts
// 1. 启动 Runtime
// 2. 发送 run.start
// 3. 断言收到 message.delta
// 4. 断言最终收到 run.completed 或 run.failed
```

---

## 开发前置条件

- Node.js >= 20。
- Claude Agent SDK TypeScript 包使用 `@anthropic-ai/claude-agent-sdk`，版本 >= 0.2.111。
- 需要设置 Anthropic API key。
- Phase 1 先实现 ACP over stdio using NDJSON 的 CLI golden path，再扩展 Web/VSCode。
