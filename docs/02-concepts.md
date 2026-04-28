# 方案概览与架构设计

## 方案概述

Almond 使用自研 ACP 客户端协议层连接多端客户端和 Claude Agent SDK Runtime。客户端只发送 ACP command，只消费 ACP event；Runtime 负责把 ACP 转换为 Claude Agent SDK 调用，并把 SDK message stream 转换回 ACP events。

```text
CLI / Web / VSCode
        │
        ▼
ACP Client Adapter
        │  run.start / approval.respond / run.cancel
        ▼
ACP Runtime Server
        │
        ▼
Claude Agent SDK query()
        │
        ▼
SDK message stream
        │
        ▼
ACP Event Stream
```

## 技术选型

| 组件 | 选型 | 版本 | 选择理由 |
|------|------|------|----------|
| 语言 | TypeScript | Node.js >= 20 | 适配 CLI、Web、VSCode 生态更顺 |
| Agent Runtime | Claude Agent SDK | >= 0.2.111 | 复用 Claude Code 的工具执行、上下文和 Agent loop；Opus 4.7 需要该版本或更高 |
| 协议层 | 自研 ACP | v0 | SDK 不直接提供客户端协议层 |
| 首个客户端 | CLI | v0 | 最快验证协议和 Runtime 闭环 |
| Phase 1 传输 | stdio + NDJSON | v0 | CLI/VSCode 友好，能验证真实协议边界，Web 后续通过 bridge 接入 |
| 对比参考 | Anthropic Managed Agents | Beta | 借鉴 sessions/events/tool confirmation 模型 |

## 多方案对比

| 维度 | Claude Agent SDK + 自研 ACP | Managed Agents | 推荐 |
|------|-----------------------------|----------------|------|
| 运行位置 | 自己的本地或服务端进程 | Anthropic 托管 | MVP 选自研 ACP |
| 文件系统控制 | 高，适合本地项目和 VSCode | 中，运行在托管 session workspace | 自研 ACP |
| 协议基础设施 | 需要自建 | 官方已有 sessions/events | 借鉴 Managed Agents |
| 权限确认 | 通过 SDK permissions/hooks 封装 | tool_confirmation 内建 | MVP 自建，参考其事件模型 |
| MCP/Skills | SDK 支持 Claude Code 配置体系 | Agent 配置直接支持 | 二者都保留扩展空间 |
| 云端托管 | 需要自己部署 | 官方托管 | Phase 3 可评估 Managed Agents Backend |

**推荐方案:** TypeScript + Claude Agent SDK + 自研 ACP Runtime。Managed Agents 不作为 MVP Runtime，但作为协议和产品能力的对比基准。

## 整体架构图

```text
┌─────────────────────────────────────────────────────┐
│                  Client Adapter Layer               │
│        CLI          Web          VSCode Plugin       │
└───────────────────────┬─────────────────────────────┘
                        │ ACP commands/events
┌───────────────────────▼─────────────────────────────┐
│                  ACP Protocol Layer                  │
│  Command schema / Event schema / Session contract    │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│                  Agent Runtime Layer                 │
│        @almond/core / Permission / Session Store      │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│                  Extension Layer                     │
│       MCP Servers / Skills / Slash Commands          │
└─────────────────────────────────────────────────────┘
```

**各模块职责:**

| 模块 | 职责 |
|------|------|
| Client Adapter Layer | 负责多端展示、输入、审批交互和取消操作 |
| ACP Protocol Layer | 定义统一 command/event/session/approval 合同 |
| Agent Runtime Layer | 封装 Claude Agent SDK，管理 run、session、权限和事件转换 |
| Extension Layer | 后续接入 MCP、skills、slash commands、custom subagents、plugins |

## 关键流程

### 启动一次 Agent Run

```text
Client
  │ run.start
  ▼
ACP Runtime
  │ query(prompt, options)
  ▼
Claude Agent SDK
  │ stream messages
  ▼
ACP Runtime
  │ message.delta / tool.requested / run.completed
  ▼
Client
```

### 工具权限确认

```text
Claude Agent SDK
  │ tool use requires confirmation
  ▼
ACP Runtime
  │ approval.requested
  ▼
Client
  │ approval.respond allow/deny
  ▼
ACP Runtime
  │ continue or reject tool execution
  ▼
Claude Agent SDK
```

## 核心概念

### ACP Command

**定义**: 客户端发给 Runtime 的控制消息。

**关系**:
- 被 CLI/Web/VSCode Adapter 产生。
- 被 ACP Runtime Server 消费。

**约束（Invariants）**:
- command 不暴露 Claude Agent SDK 内部类型。
- command 必须携带可追踪的 `runId` 或 `sessionId`。

**设计决策**:

| 决策 | 理由 |
|------|------|
| 自研 command schema | Claude Agent SDK 不提供客户端协议抽象 |
| 与 UI 解耦 | 避免 CLI 形态绑架 Web/VSCode |

**边界情况**:
- 重复 cancel: Runtime 应返回幂等的 cancelled 或已结束状态。
- 未知 session: 返回协议错误事件，不直接抛 SDK 异常给客户端。

### ACP Event

**定义**: Runtime 发给客户端的状态、消息、工具和错误事件。

**关系**:
- 由 Claude Agent SDK message stream 转换而来。
- 被所有客户端统一消费。

**约束（Invariants）**:
- event 必须有稳定 `type`。
- event 必须能按 `runId` 归属到一次执行。
- SDK 原始消息可以作为 debug metadata，但不能成为客户端强依赖。

**设计决策**:

| 决策 | 理由 |
|------|------|
| 使用事件流 | 兼容 CLI streaming、Web SSE/WebSocket、VSCode output channel |
| 参考 Managed Agents events | 其 session/status/tool_confirmation 模型与本项目高度相关 |

**边界情况**:
- SDK stream 中断: 转换为 `run.failed`。
- 工具调用无客户端确认: Runtime 保持 pending，客户端可 cancel。

### AgentBackend

**定义**: ACP Runtime 与具体 Agent 执行后端之间的接口。

**关系**:
- MVP 由 `@almond/core` 装配默认 Claude Agent SDK backend。
- 后续可增加 `ManagedAgentsBackend`。

**约束（Invariants）**:
- 客户端不感知具体 backend。
- backend 输出统一 ACP events。

**设计决策**:

| 决策 | 理由 |
|------|------|
| 抽象 backend 接口 | 为后续 Managed Agents 云端托管模式留扩展点 |
| MVP 只实现一个 backend | 降低第一阶段复杂度 |

## 非功能设计

### 性能与容量

| 指标 | 目标值 |
|------|--------|
| CLI 首 token 延迟 | 取决于 Claude Agent SDK，Runtime 不额外阻塞 |
| 事件转发 | 流式转发，不等待完整响应 |
| 并发 run | MVP 可先单进程多 run，后续引入队列 |

### 安全性

- 权限模型: 默认工具 allowlist，敏感工具通过 approval gate。
- 危险操作: 删除、外部发布、push、发消息等必须可被客户端确认。
- 敏感数据: 不把 API key 写入 prompt、event log 或 memory。

### 高可用与容灾

- MVP 不承诺分布式高可用。
- Runtime 应保存 session/run metadata，为 resume 和故障定位做准备。
- 长期可将 Runtime Server 做成独立服务，通过 WebSocket/SSE 暴露事件流。

### 监控与告警

| 指标 | 说明 |
|------|------|
| run count | 执行次数 |
| run duration | 单次任务耗时 |
| failed runs | 失败率 |
| approval count | 权限确认次数 |
| tool usage | 工具调用分布 |
