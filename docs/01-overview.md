# Almond Agent

## 业务背景

Almond 是一个通用 AI Agent 项目。核心定位是基于 Claude Agent SDK 构建 Agent Runtime，并通过自研 ACP 客户端协议层适配 CLI、Web、VSCode 插件等多端入口。

**相关链接:**
- Claude Agent SDK Overview: https://code.claude.com/docs/en/agent-sdk/overview

## 目标与非目标

### 目标

| 类型 | 目标 | 衡量标准 |
|------|------|----------|
| 产品目标 | 提供统一 Agent 客户端协议层 | CLI/Web/VSCode 不直接依赖 Claude Agent SDK |
| 架构目标 | Runtime 与客户端解耦 | 新增客户端只需实现 ACP adapter |
| MVP 目标 | 跑通 TypeScript Runtime + CLI | 支持流式输出、权限确认、会话恢复 |

### 非目标

- MVP 不实现多 Agent 协作协议。
- MVP 不优先做完整 Web 工作台。
- MVP 不直接绑定 Anthropic Managed Agents 作为唯一 Runtime。
- MVP 不做复杂插件市场或企业管理后台。

## 现有架构与问题

当前项目目录尚未初始化代码。已确认的设计方向是从零构建 TypeScript 项目，以协议层优先，而不是先绑定某个 UI 形态。

**现状分析:**
- 代码状态: 空项目。
- 关键问题: 需要先定义 ACP 协议边界，避免后续 CLI/Web/VSCode 各自耦合 Claude Agent SDK。

## 约束条件

| 约束类型 | 具体约束 |
|----------|----------|
| 技术栈 | Runtime 使用 TypeScript |
| Agent 底座 | MVP 基于 Claude Agent SDK |
| 协议方向 | ACP 定位为客户端协议层，不是多 Agent 通信协议 |
| 参考模型 | 后续方案对比需要参考 Anthropic Managed Agents |
| 多端适配 | CLI、Web、VSCode 都应通过 ACP 访问 Runtime |
| Phase 1 传输 | ACP over stdio using NDJSON |
