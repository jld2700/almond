# 实施计划

## 已确认事项

- 项目定位: 通用 AI Agent。
- Agent 底座: 基于 Claude Agent SDK。
- 协议定位: ACP 是客户端协议层，用于适配 CLI、Web、VSCode 插件等客户端。
- MVP 范围: 先做交互统一和权限统一。
- 开发语言: TypeScript。
- 架构方向: 协议优先，而不是 CLI 优先或平台优先。
- Managed Agents: 后续对比和设计时必须参考，但不作为 MVP 默认 Runtime。
- Phase 1 传输层: ACP over stdio using NDJSON。

## 备忘记录

- Claude Agent SDK 不直接支持 ACP 客户端协议层，需要在 SDK 外自研协议适配层。
- SDK 可提供 Runtime 积木: `query()`、streaming messages、sessions/resume、permissions/hooks、tools、MCP、subagents、skills、slash commands、plugins。
- Managed Agents 的 `agents / sessions / events / tool_confirmation` 模型适合作为 ACP 事件与会话设计参考。
- `@almond/core` 作为核心运行时，内聚 command router、backend interface、默认 Claude Agent SDK backend 和 mock backend。

## Phase 1: ACP + Runtime MVP

跑通一个最小闭环，让 CLI 通过 ACP 驱动 Claude Agent SDK。

**交付物**

| 组件 | 描述 |
|------|------|
| ACP schema | command/event/session/approval 类型定义 |
| `@almond/core` | Core runtime：run 管理、session 管理、事件转换、backend interface、默认 Claude Agent SDK backend、mock backend |
| CLI adapter | 支持交互终端、one-shot prompt 和 `--stdio` 原始 ACP 模式；审批响应在后续任务补齐 |
| 基础测试 | schema 校验、事件转换、CLI golden path |

**验收标准**

- [ ] CLI 可以发起一次 `run.start`。
- [ ] Runtime 可以调用 Claude Agent SDK。
- [ ] CLI 能收到 `message.delta` 流式输出。
- [ ] Runtime 能把工具调用转成 `tool.requested/tool.completed`。
- [ ] 敏感工具调用能触发 `approval.requested`。
- [ ] Runtime 能发出 `approval.requested`；CLI 交互式 allow/deny 在 Phase 1.1 补齐。
- [ ] 能拿到并保存 session id。
- [ ] 能通过 `session.resume` 恢复上下文。

---

## Phase 2: 多端适配与上下文统一

让 Web 和 VSCode 复用同一 ACP Runtime。

**交付物**

| 组件 | 描述 |
|------|------|
| Runtime Server | 提供 SSE/WebSocket 或 stdio bridge |
| Web adapter | 消费 ACP event stream，发送 command |
| VSCode adapter | 在插件侧连接 Runtime Server |
| Context config | cwd、项目配置、工具 allowlist、记忆配置统一入口 |
| Observability | run log、tool log、approval log |

**验收标准**

- [ ] Web 可以通过 ACP 发起 run 并展示流式输出。
- [ ] VSCode 可以通过 ACP 发起 run 并展示流式输出。
- [ ] CLI/Web/VSCode 的 approval 行为一致。
- [ ] Runtime 记录 run、tool、approval 基础日志。
- [ ] 客户端切换不影响 session 恢复。

---

## Phase 3: 扩展能力与 Managed Agents 对比

补齐 MCP、skills、plugins，并评估云端托管 Runtime。

**交付物**

| 组件 | 描述 |
|------|------|
| MCP config | 接入 MCP servers 配置 |
| Skills support | 支持 Claude Code skills 或项目 skills |
| Slash commands | 支持常用命令入口 |
| Managed Agents Spike | 验证 Managed Agents 的能力边界与可借鉴设计 |
| Backend comparison report | 对比本地 `@almond/core` Runtime 与 Managed Agents |

**验收标准**

- [ ] Runtime 可加载 MCP 配置。
- [ ] Runtime 可暴露 skills/slash commands 能力。
- [ ] 完成 Managed Agents 与自研 ACP Runtime 的对比。
- [ ] 明确是否将 Managed Agents Backend 纳入后续版本。

---

## 依赖关系

```text
Phase 1: ACP + Runtime MVP
    │
    └── 无代码依赖，依赖协议设计确认

Phase 2: 多端适配与上下文统一
    │
    └── 依赖 Phase 1 的稳定 ACP schema

Phase 3: 扩展能力与 Managed Agents 对比
    │
    └── 依赖 Phase 1/2 的 backend 抽象和事件模型
```

## 风险与 TODO

### 风险识别

| 风险 | 影响 | 预案 |
|------|------|------|
| ACP schema 过早复杂化 | MVP 交付变慢 | Phase 1 只保留 run/message/tool/approval/session |
| CLI 形态绑架协议 | Web/VSCode 后续适配困难 | 协议层不暴露 CLI UI 概念 |
| SDK 权限机制与自研 approval 不完全匹配 | 审批流需要适配 | 用 Runtime approval gate 包一层，必要时通过 hooks 实现 |
| Managed Agents 能力变化 | 对比结论过期 | 只作为参考模型，真正采用前重新核对官方文档 |
| 空项目缺少工程约束 | 初始结构容易发散 | 先写 docs，再生成最小 TypeScript package |

### 待确认事项

- [x] ACP 传输层 Phase 1 使用 stdio + NDJSON。
- [ ] Runtime 是本地进程优先，还是 server daemon 优先。
- [ ] CLI 是否作为唯一 Phase 1 客户端。
- [ ] 第一版工具权限策略如何分级。
- [ ] session metadata 存储在文件、SQLite，还是内存 MVP。

### 后续优化方向

- Managed Agents Backend。
- 多 Agent 协作协议。
- 可视化 run trace。
- Agent profile / skill profile 管理。
- 权限策略模板。
- 长任务恢复与断线重连。
