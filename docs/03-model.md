# 模块与接口设计

## 模块划分

| 模块 | 职责 | 依赖 |
|------|------|------|
| `@almond/acp` | ACP 类型、schema、协议常量 | 无 |
| `@almond/core` | Run/session 管理、backend 抽象、默认 Claude Agent SDK backend、mock backend | `@almond/acp`, Claude Agent SDK |
| `@almond/stdio` | ACP over stdio using NDJSON 传输 | `@almond/acp`, `@almond/core` |
| `@almond/cli` | CLI 客户端适配 | `@almond/acp`, `@almond/core`, `@almond/stdio` |
| `@almond/server` | 可选 Runtime Server，提供 Web/VSCode 连接 | `@almond/core` |

---

## 数据模型

### AcpCommand

客户端发给 Runtime 的命令。

```ts
type AcpCommand =
  | RunStartCommand
  | RunCancelCommand
  | SessionResumeCommand
  | InputSubmitCommand
  | ApprovalRespondCommand;
```

### RunStartCommand

```ts
interface RunStartCommand {
  type: "run.start";
  runId: string;
  prompt: string;
  cwd?: string;
  sessionId?: string;
  allowedTools?: string[];
  metadata?: Record<string, unknown>;
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | `"run.start"` | 是 | 命令类型 |
| `runId` | `string` | 是 | 客户端生成或 Runtime 分配的执行 ID |
| `prompt` | `string` | 是 | 用户输入 |
| `cwd` | `string` | 否 | 工作目录 |
| `sessionId` | `string` | 否 | 恢复已有上下文 |
| `allowedTools` | `string[]` | 否 | 工具 allowlist |
| `metadata` | `Record<string, unknown>` | 否 | 客户端附加信息 |

### ApprovalRespondCommand

```ts
interface ApprovalRespondCommand {
  type: "approval.respond";
  runId: string;
  approvalId: string;
  decision: "allow" | "deny";
  message?: string;
}
```

### AcpEvent

Runtime 发给客户端的事件。

```ts
type AcpEvent =
  | SessionStartedEvent
  | MessageDeltaEvent
  | MessageCompletedEvent
  | ToolRequestedEvent
  | ToolCompletedEvent
  | ApprovalRequestedEvent
  | RunCompletedEvent
  | RunFailedEvent
  | RunCancelledEvent;
```

### MessageDeltaEvent

```ts
interface MessageDeltaEvent {
  type: "message.delta";
  runId: string;
  content: string;
  role: "assistant";
}
```

### ApprovalRequestedEvent

```ts
interface ApprovalRequestedEvent {
  type: "approval.requested";
  runId: string;
  approvalId: string;
  toolName: string;
  toolInput: unknown;
  risk?: "low" | "medium" | "high";
  reason?: string;
}
```

### RunCompletedEvent

```ts
interface RunCompletedEvent {
  type: "run.completed";
  runId: string;
  sessionId?: string;
  result?: string;
  usage?: AcpUsage;
}
```

---

## 接口定义

### AgentBackend

```ts
interface AgentBackend {
  startRun(command: RunStartCommand): AsyncIterable<AcpEvent>;
  resumeSession(command: SessionResumeCommand): AsyncIterable<AcpEvent>;
  cancelRun(command: RunCancelCommand): Promise<void>;
  respondApproval(command: ApprovalRespondCommand): Promise<void>;
}
```

#### startRun

```ts
startRun(command: RunStartCommand): AsyncIterable<AcpEvent>
```

启动一次 Agent 执行并返回事件流。

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `command` | `RunStartCommand` | 启动命令 |

**返回值**

| 类型 | 说明 |
|------|------|
| `AsyncIterable<AcpEvent>` | Runtime 事件流 |

**错误码**

| 错误 | 条件 |
|------|------|
| `INVALID_COMMAND` | command schema 不合法 |
| `BACKEND_UNAVAILABLE` | Claude Agent SDK 初始化失败 |
| `RUN_NOT_FOUND` | cancel 或 approval 指向不存在的 run |

---

## 消息/事件定义

## Phase 1 传输格式

Phase 1 使用 ACP over stdio using NDJSON。

**stdin:** 每行一个 `AcpCommand` JSON。

```json
{"type":"run.start","runId":"run_1","prompt":"hello"}
```

**stdout:** 每行一个 `AcpEvent` JSON。

```json
{"type":"message.delta","runId":"run_1","role":"assistant","content":"Hello"}
{"type":"run.completed","runId":"run_1","result":"Hello"}
```

**stderr:** 仅用于 human-readable runtime log，不承载 ACP event。

### MVP Command Set

| 类型 | 说明 |
|------|------|
| `run.start` | 启动一次 Agent run |
| `run.cancel` | 取消执行 |
| `session.resume` | 恢复已有 session |
| `input.submit` | 向已有 session 追加输入 |
| `approval.respond` | 响应工具审批 |

### MVP Event Set

| 类型 | 说明 |
|------|------|
| `session.started` | session 初始化完成 |
| `message.delta` | assistant 流式文本片段 |
| `message.completed` | assistant 消息完成 |
| `tool.requested` | Runtime 观察到工具请求 |
| `tool.completed` | 工具执行完成 |
| `approval.requested` | 等待客户端审批 |
| `run.completed` | run 正常结束 |
| `run.failed` | run 失败 |
| `run.cancelled` | run 被取消 |
