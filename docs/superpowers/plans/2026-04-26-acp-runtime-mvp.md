# ACP Runtime MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TypeScript MVP that runs ACP commands over stdio using NDJSON and maps them to a testable Agent Runtime abstraction, with a mock backend first and Claude Agent SDK integration behind a backend boundary.

**Architecture:** The project uses a small monorepo-style TypeScript package layout under `packages/`. `@almond/acp` owns protocol types and validation. `@almond/runtime` owns backend-agnostic run orchestration. `@almond/stdio` owns NDJSON transport. `@almond/cli` provides the user-facing command that spawns or runs the stdio transport. Claude Agent SDK integration is isolated in `@almond/backend-claude-agent-sdk` so ACP does not depend on SDK internals.

**Tech Stack:** TypeScript, Node.js >= 20, npm workspaces, Vitest, tsup, Zod, @anthropic-ai/claude-agent-sdk >= 0.2.111.

---

## File Structure

Create this structure:

```text
package.json
package-lock.json
tsconfig.base.json
vitest.config.ts
packages/
  acp/
    package.json
    src/index.ts
    src/types.ts
    src/schemas.ts
    src/parse.ts
    test/schemas.test.ts
  runtime/
    package.json
    src/index.ts
    src/backend.ts
    src/runtime.ts
    src/mock-backend.ts
    test/runtime.test.ts
  stdio/
    package.json
    src/index.ts
    src/ndjson.ts
    src/server.ts
    test/ndjson.test.ts
    test/server.test.ts
  backend-claude-agent-sdk/
    package.json
    src/index.ts
    src/claude-agent-sdk-backend.ts
    test/claude-agent-sdk-backend.test.ts
  cli/
    package.json
    src/index.ts
    src/main.ts
    test/cli.test.ts
```

Responsibilities:

| Package | Responsibility |
|---------|----------------|
| `@almond/acp` | ACP command/event TypeScript types, Zod schemas, parsing helpers |
| `@almond/runtime` | `AgentBackend` interface, runtime orchestration, mock backend for tests |
| `@almond/stdio` | NDJSON framing and stdio server that accepts ACP commands and emits ACP events |
| `@almond/backend-claude-agent-sdk` | Adapter from ACP runtime to Claude Agent SDK; mocked in tests |
| `@almond/cli` | User-facing executable; MVP supports one-shot prompt through runtime |

---

### Task 1: Initialize TypeScript workspace

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `vitest.config.ts`
- Create: `packages/acp/package.json`
- Create: `packages/runtime/package.json`
- Create: `packages/stdio/package.json`
- Create: `packages/backend-claude-agent-sdk/package.json`
- Create: `packages/cli/package.json`

- [ ] **Step 1: Create root package manifest**

Create `package.json`:

```json
{
  "name": "almond",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "npm run build --workspaces",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -b packages/*",
    "lint": "tsc -b packages/* --pretty false"
  },
  "devDependencies": {
    "@types/node": "^20.11.30",
    "tsup": "^8.0.2",
    "typescript": "^5.4.5",
    "vitest": "^1.4.0"
  },
  "dependencies": {
    "zod": "^3.22.4"
  }
}
```

- [ ] **Step 2: Create shared TypeScript config**

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["node"]
  }
}
```

- [ ] **Step 3: Create Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 4: Create package manifests**

Create `packages/acp/package.json`:

```json
{
  "name": "@almond/acp",
  "version": "0.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "typescript": "^5.4.5"
  }
}
```

Create `packages/runtime/package.json`:

```json
{
  "name": "@almond/runtime",
  "version": "0.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@almond/acp": "0.0.0"
  },
  "devDependencies": {
    "typescript": "^5.4.5"
  }
}
```

Create `packages/stdio/package.json`:

```json
{
  "name": "@almond/stdio",
  "version": "0.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@almond/acp": "0.0.0",
    "@almond/runtime": "0.0.0"
  },
  "devDependencies": {
    "typescript": "^5.4.5"
  }
}
```

Create `packages/backend-claude-agent-sdk/package.json`:

```json
{
  "name": "@almond/backend-claude-agent-sdk",
  "version": "0.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@almond/acp": "0.0.0",
    "@almond/runtime": "0.0.0",
    "@anthropic-ai/claude-agent-sdk": "^0.2.111"
  },
  "devDependencies": {
    "typescript": "^5.4.5"
  }
}
```

Create `packages/cli/package.json`:

```json
{
  "name": "@almond/cli",
  "version": "0.0.0",
  "type": "module",
  "bin": {
    "almond": "dist/main.js"
  },
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsup src/main.ts src/index.ts --format esm --dts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@almond/acp": "0.0.0",
    "@almond/runtime": "0.0.0",
    "@almond/stdio": "0.0.0",
    "@almond/backend-claude-agent-sdk": "0.0.0"
  },
  "devDependencies": {
    "typescript": "^5.4.5"
  }
}
```

- [ ] **Step 5: Install dependencies**

Run: `npm install`

Expected: npm creates `package-lock.json` and installs workspace dependencies without errors.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.base.json vitest.config.ts packages/*/package.json
git commit -m "chore: initialize TypeScript workspace"
```

---

### Task 2: Define ACP protocol types and schemas

**Files:**
- Create: `packages/acp/src/types.ts`
- Create: `packages/acp/src/schemas.ts`
- Create: `packages/acp/src/parse.ts`
- Create: `packages/acp/src/index.ts`
- Create: `packages/acp/test/schemas.test.ts`

- [ ] **Step 1: Write failing schema tests**

Create `packages/acp/test/schemas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseAcpCommand, parseAcpEvent } from "../src/index.js";

const runStart = {
  type: "run.start",
  runId: "run_1",
  prompt: "hello",
  allowedTools: ["Read", "Glob"],
};

const messageDelta = {
  type: "message.delta",
  runId: "run_1",
  role: "assistant",
  content: "Hello",
};

describe("ACP schemas", () => {
  it("parses run.start commands", () => {
    expect(parseAcpCommand(runStart)).toEqual(runStart);
  });

  it("rejects invalid command payloads", () => {
    expect(() => parseAcpCommand({ type: "run.start", runId: "run_1" })).toThrow(
      /Invalid ACP command/,
    );
  });

  it("parses message.delta events", () => {
    expect(parseAcpEvent(messageDelta)).toEqual(messageDelta);
  });

  it("rejects unknown event types", () => {
    expect(() => parseAcpEvent({ type: "unknown.event", runId: "run_1" })).toThrow(
      /Invalid ACP event/,
    );
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- packages/acp/test/schemas.test.ts`

Expected: FAIL because `../src/index.js` does not exist.

- [ ] **Step 3: Define protocol types**

Create `packages/acp/src/types.ts`:

```ts
export type AcpCommand =
  | RunStartCommand
  | RunCancelCommand
  | SessionResumeCommand
  | InputSubmitCommand
  | ApprovalRespondCommand;

export interface RunStartCommand {
  type: "run.start";
  runId: string;
  prompt: string;
  cwd?: string;
  sessionId?: string;
  allowedTools?: string[];
  metadata?: Record<string, unknown>;
}

export interface RunCancelCommand {
  type: "run.cancel";
  runId: string;
}

export interface SessionResumeCommand {
  type: "session.resume";
  runId: string;
  sessionId: string;
  prompt?: string;
}

export interface InputSubmitCommand {
  type: "input.submit";
  runId: string;
  sessionId: string;
  content: string;
}

export interface ApprovalRespondCommand {
  type: "approval.respond";
  runId: string;
  approvalId: string;
  decision: "allow" | "deny";
  message?: string;
}

export type AcpEvent =
  | SessionStartedEvent
  | MessageDeltaEvent
  | MessageCompletedEvent
  | ToolRequestedEvent
  | ToolCompletedEvent
  | ApprovalRequestedEvent
  | RunCompletedEvent
  | RunFailedEvent
  | RunCancelledEvent;

export interface SessionStartedEvent {
  type: "session.started";
  runId: string;
  sessionId: string;
}

export interface MessageDeltaEvent {
  type: "message.delta";
  runId: string;
  role: "assistant";
  content: string;
}

export interface MessageCompletedEvent {
  type: "message.completed";
  runId: string;
  role: "assistant";
  content: string;
}

export interface ToolRequestedEvent {
  type: "tool.requested";
  runId: string;
  toolUseId: string;
  toolName: string;
  toolInput: unknown;
}

export interface ToolCompletedEvent {
  type: "tool.completed";
  runId: string;
  toolUseId: string;
  toolName: string;
  result?: unknown;
  isError?: boolean;
}

export interface ApprovalRequestedEvent {
  type: "approval.requested";
  runId: string;
  approvalId: string;
  toolName: string;
  toolInput: unknown;
  risk?: "low" | "medium" | "high";
  reason?: string;
}

export interface RunCompletedEvent {
  type: "run.completed";
  runId: string;
  sessionId?: string;
  result?: string;
  usage?: AcpUsage;
}

export interface RunFailedEvent {
  type: "run.failed";
  runId: string;
  error: AcpError;
}

export interface RunCancelledEvent {
  type: "run.cancelled";
  runId: string;
  reason?: string;
}

export interface AcpUsage {
  inputTokens?: number;
  outputTokens?: number;
  cacheReadInputTokens?: number;
  cacheCreationInputTokens?: number;
}

export interface AcpError {
  code: "INVALID_COMMAND" | "BACKEND_UNAVAILABLE" | "RUN_NOT_FOUND" | "INTERNAL_ERROR";
  message: string;
  details?: unknown;
}
```

- [ ] **Step 4: Define Zod schemas**

Create `packages/acp/src/schemas.ts`:

```ts
import { z } from "zod";

const metadataSchema = z.record(z.unknown());
const usageSchema = z.object({
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  cacheReadInputTokens: z.number().int().nonnegative().optional(),
  cacheCreationInputTokens: z.number().int().nonnegative().optional(),
});
const errorSchema = z.object({
  code: z.enum(["INVALID_COMMAND", "BACKEND_UNAVAILABLE", "RUN_NOT_FOUND", "INTERNAL_ERROR"]),
  message: z.string().min(1),
  details: z.unknown().optional(),
});

export const runStartCommandSchema = z.object({
  type: z.literal("run.start"),
  runId: z.string().min(1),
  prompt: z.string().min(1),
  cwd: z.string().min(1).optional(),
  sessionId: z.string().min(1).optional(),
  allowedTools: z.array(z.string().min(1)).optional(),
  metadata: metadataSchema.optional(),
});

export const runCancelCommandSchema = z.object({
  type: z.literal("run.cancel"),
  runId: z.string().min(1),
});

export const sessionResumeCommandSchema = z.object({
  type: z.literal("session.resume"),
  runId: z.string().min(1),
  sessionId: z.string().min(1),
  prompt: z.string().min(1).optional(),
});

export const inputSubmitCommandSchema = z.object({
  type: z.literal("input.submit"),
  runId: z.string().min(1),
  sessionId: z.string().min(1),
  content: z.string().min(1),
});

export const approvalRespondCommandSchema = z.object({
  type: z.literal("approval.respond"),
  runId: z.string().min(1),
  approvalId: z.string().min(1),
  decision: z.enum(["allow", "deny"]),
  message: z.string().min(1).optional(),
});

export const acpCommandSchema = z.discriminatedUnion("type", [
  runStartCommandSchema,
  runCancelCommandSchema,
  sessionResumeCommandSchema,
  inputSubmitCommandSchema,
  approvalRespondCommandSchema,
]);

export const sessionStartedEventSchema = z.object({
  type: z.literal("session.started"),
  runId: z.string().min(1),
  sessionId: z.string().min(1),
});

export const messageDeltaEventSchema = z.object({
  type: z.literal("message.delta"),
  runId: z.string().min(1),
  role: z.literal("assistant"),
  content: z.string(),
});

export const messageCompletedEventSchema = z.object({
  type: z.literal("message.completed"),
  runId: z.string().min(1),
  role: z.literal("assistant"),
  content: z.string(),
});

export const toolRequestedEventSchema = z.object({
  type: z.literal("tool.requested"),
  runId: z.string().min(1),
  toolUseId: z.string().min(1),
  toolName: z.string().min(1),
  toolInput: z.unknown(),
});

export const toolCompletedEventSchema = z.object({
  type: z.literal("tool.completed"),
  runId: z.string().min(1),
  toolUseId: z.string().min(1),
  toolName: z.string().min(1),
  result: z.unknown().optional(),
  isError: z.boolean().optional(),
});

export const approvalRequestedEventSchema = z.object({
  type: z.literal("approval.requested"),
  runId: z.string().min(1),
  approvalId: z.string().min(1),
  toolName: z.string().min(1),
  toolInput: z.unknown(),
  risk: z.enum(["low", "medium", "high"]).optional(),
  reason: z.string().min(1).optional(),
});

export const runCompletedEventSchema = z.object({
  type: z.literal("run.completed"),
  runId: z.string().min(1),
  sessionId: z.string().min(1).optional(),
  result: z.string().optional(),
  usage: usageSchema.optional(),
});

export const runFailedEventSchema = z.object({
  type: z.literal("run.failed"),
  runId: z.string().min(1),
  error: errorSchema,
});

export const runCancelledEventSchema = z.object({
  type: z.literal("run.cancelled"),
  runId: z.string().min(1),
  reason: z.string().min(1).optional(),
});

export const acpEventSchema = z.discriminatedUnion("type", [
  sessionStartedEventSchema,
  messageDeltaEventSchema,
  messageCompletedEventSchema,
  toolRequestedEventSchema,
  toolCompletedEventSchema,
  approvalRequestedEventSchema,
  runCompletedEventSchema,
  runFailedEventSchema,
  runCancelledEventSchema,
]);
```

- [ ] **Step 5: Add parse helpers**

Create `packages/acp/src/parse.ts`:

```ts
import type { AcpCommand, AcpEvent } from "./types.js";
import { acpCommandSchema, acpEventSchema } from "./schemas.js";

export function parseAcpCommand(value: unknown): AcpCommand {
  const result = acpCommandSchema.safeParse(value);
  if (!result.success) {
    throw new Error(`Invalid ACP command: ${result.error.message}`);
  }
  return result.data as AcpCommand;
}

export function parseAcpEvent(value: unknown): AcpEvent {
  const result = acpEventSchema.safeParse(value);
  if (!result.success) {
    throw new Error(`Invalid ACP event: ${result.error.message}`);
  }
  return result.data as AcpEvent;
}
```

- [ ] **Step 6: Export public API**

Create `packages/acp/src/index.ts`:

```ts
export type * from "./types.js";
export * from "./schemas.js";
export * from "./parse.js";
```

- [ ] **Step 7: Run tests**

Run: `npm test -- packages/acp/test/schemas.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/acp
git commit -m "feat: define ACP protocol schemas"
```

---

### Task 3: Implement runtime core with mock backend

**Files:**
- Create: `packages/runtime/src/backend.ts`
- Create: `packages/runtime/src/runtime.ts`
- Create: `packages/runtime/src/mock-backend.ts`
- Create: `packages/runtime/src/index.ts`
- Create: `packages/runtime/test/runtime.test.ts`

- [ ] **Step 1: Write failing runtime tests**

Create `packages/runtime/test/runtime.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createAgentRuntime, MockAgentBackend } from "../src/index.js";

function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  return (async () => {
    const values: T[] = [];
    for await (const value of iterable) values.push(value);
    return values;
  })();
}

describe("AgentRuntime", () => {
  it("delegates run.start to backend and returns events", async () => {
    const runtime = createAgentRuntime({ backend: new MockAgentBackend() });

    const events = await collect(
      runtime.handleCommand({ type: "run.start", runId: "run_1", prompt: "hello" }),
    );

    expect(events).toEqual([
      { type: "session.started", runId: "run_1", sessionId: "mock-session-run_1" },
      { type: "message.delta", runId: "run_1", role: "assistant", content: "Mock response to: hello" },
      { type: "message.completed", runId: "run_1", role: "assistant", content: "Mock response to: hello" },
      { type: "run.completed", runId: "run_1", sessionId: "mock-session-run_1", result: "Mock response to: hello" },
    ]);
  });

  it("returns run.cancelled for run.cancel", async () => {
    const runtime = createAgentRuntime({ backend: new MockAgentBackend() });

    const events = await collect(runtime.handleCommand({ type: "run.cancel", runId: "run_1" }));

    expect(events).toEqual([{ type: "run.cancelled", runId: "run_1", reason: "cancel requested" }]);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- packages/runtime/test/runtime.test.ts`

Expected: FAIL because runtime files do not exist.

- [ ] **Step 3: Define backend interface**

Create `packages/runtime/src/backend.ts`:

```ts
import type {
  AcpEvent,
  ApprovalRespondCommand,
  RunCancelCommand,
  RunStartCommand,
  SessionResumeCommand,
} from "@almond/acp";

export interface AgentBackend {
  startRun(command: RunStartCommand): AsyncIterable<AcpEvent>;
  resumeSession(command: SessionResumeCommand): AsyncIterable<AcpEvent>;
  cancelRun(command: RunCancelCommand): Promise<void>;
  respondApproval(command: ApprovalRespondCommand): Promise<void>;
}
```

- [ ] **Step 4: Implement runtime command router**

Create `packages/runtime/src/runtime.ts`:

```ts
import type { AcpCommand, AcpEvent } from "@almond/acp";
import type { AgentBackend } from "./backend.js";

export interface AgentRuntimeOptions {
  backend: AgentBackend;
}

export interface AgentRuntime {
  handleCommand(command: AcpCommand): AsyncIterable<AcpEvent>;
}

export function createAgentRuntime(options: AgentRuntimeOptions): AgentRuntime {
  return new DefaultAgentRuntime(options.backend);
}

class DefaultAgentRuntime implements AgentRuntime {
  constructor(private readonly backend: AgentBackend) {}

  async *handleCommand(command: AcpCommand): AsyncIterable<AcpEvent> {
    try {
      switch (command.type) {
        case "run.start":
          yield* this.backend.startRun(command);
          return;
        case "session.resume":
          yield* this.backend.resumeSession(command);
          return;
        case "run.cancel":
          await this.backend.cancelRun(command);
          yield { type: "run.cancelled", runId: command.runId, reason: "cancel requested" };
          return;
        case "approval.respond":
          await this.backend.respondApproval(command);
          return;
        case "input.submit":
          yield {
            type: "run.failed",
            runId: command.runId,
            error: {
              code: "INTERNAL_ERROR",
              message: "input.submit is not implemented in the MVP runtime",
            },
          };
          return;
      }
    } catch (error) {
      yield {
        type: "run.failed",
        runId: command.runId,
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
}
```

- [ ] **Step 5: Implement mock backend**

Create `packages/runtime/src/mock-backend.ts`:

```ts
import type {
  AcpEvent,
  ApprovalRespondCommand,
  RunCancelCommand,
  RunStartCommand,
  SessionResumeCommand,
} from "@almond/acp";
import type { AgentBackend } from "./backend.js";

export class MockAgentBackend implements AgentBackend {
  async *startRun(command: RunStartCommand): AsyncIterable<AcpEvent> {
    const sessionId = `mock-session-${command.runId}`;
    const content = `Mock response to: ${command.prompt}`;

    yield { type: "session.started", runId: command.runId, sessionId };
    yield { type: "message.delta", runId: command.runId, role: "assistant", content };
    yield { type: "message.completed", runId: command.runId, role: "assistant", content };
    yield { type: "run.completed", runId: command.runId, sessionId, result: content };
  }

  async *resumeSession(command: SessionResumeCommand): AsyncIterable<AcpEvent> {
    const content = `Resumed session: ${command.sessionId}`;
    yield { type: "session.started", runId: command.runId, sessionId: command.sessionId };
    yield { type: "message.delta", runId: command.runId, role: "assistant", content };
    yield { type: "message.completed", runId: command.runId, role: "assistant", content };
    yield { type: "run.completed", runId: command.runId, sessionId: command.sessionId, result: content };
  }

  async cancelRun(_command: RunCancelCommand): Promise<void> {}

  async respondApproval(_command: ApprovalRespondCommand): Promise<void> {}
}
```

- [ ] **Step 6: Export runtime API**

Create `packages/runtime/src/index.ts`:

```ts
export type * from "./backend.js";
export * from "./runtime.js";
export * from "./mock-backend.js";
```

- [ ] **Step 7: Run tests**

Run: `npm test -- packages/runtime/test/runtime.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/runtime
git commit -m "feat: add runtime command router"
```

---

### Task 4: Implement NDJSON stdio transport

**Files:**
- Create: `packages/stdio/src/ndjson.ts`
- Create: `packages/stdio/src/server.ts`
- Create: `packages/stdio/src/index.ts`
- Create: `packages/stdio/test/ndjson.test.ts`
- Create: `packages/stdio/test/server.test.ts`

- [ ] **Step 1: Write failing NDJSON tests**

Create `packages/stdio/test/ndjson.test.ts`:

```ts
import { Readable, Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { readNdjson, writeNdjson } from "../src/index.js";

class MemoryWritable extends Writable {
  chunks: string[] = [];

  _write(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.chunks.push(chunk.toString("utf8"));
    callback();
  }
}

describe("NDJSON transport", () => {
  it("reads one JSON object per line", async () => {
    const input = Readable.from(['{"type":"run.start","runId":"run_1","prompt":"hello"}\n']);
    const values = [];
    for await (const value of readNdjson(input)) values.push(value);
    expect(values).toEqual([{ type: "run.start", runId: "run_1", prompt: "hello" }]);
  });

  it("writes one JSON object per line", async () => {
    const output = new MemoryWritable();
    await writeNdjson(output, { type: "run.completed", runId: "run_1" });
    expect(output.chunks.join("")).toBe('{"type":"run.completed","runId":"run_1"}\n');
  });
});
```

- [ ] **Step 2: Write failing stdio server test**

Create `packages/stdio/test/server.test.ts`:

```ts
import { Readable, Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { MockAgentBackend, createAgentRuntime } from "@almond/runtime";
import { runStdioServer } from "../src/index.js";

class MemoryWritable extends Writable {
  chunks: string[] = [];

  _write(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.chunks.push(chunk.toString("utf8"));
    callback();
  }
}

describe("stdio server", () => {
  it("maps command lines to event lines", async () => {
    const input = Readable.from(['{"type":"run.start","runId":"run_1","prompt":"hello"}\n']);
    const output = new MemoryWritable();
    const runtime = createAgentRuntime({ backend: new MockAgentBackend() });

    await runStdioServer({ input, output, runtime });

    const lines = output.chunks.join("").trim().split("\n").map((line) => JSON.parse(line));
    expect(lines.map((line) => line.type)).toEqual([
      "session.started",
      "message.delta",
      "message.completed",
      "run.completed",
    ]);
  });
});
```

- [ ] **Step 3: Run tests to verify failure**

Run: `npm test -- packages/stdio/test/ndjson.test.ts packages/stdio/test/server.test.ts`

Expected: FAIL because stdio files do not exist.

- [ ] **Step 4: Implement NDJSON helpers**

Create `packages/stdio/src/ndjson.ts`:

```ts
import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";

export async function* readNdjson(input: Readable): AsyncIterable<unknown> {
  const rl = createInterface({ input, crlfDelay: Infinity });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    yield JSON.parse(trimmed);
  }
}

export function writeNdjson(output: Writable, value: unknown): Promise<void> {
  const line = `${JSON.stringify(value)}\n`;
  return new Promise((resolve, reject) => {
    output.write(line, "utf8", (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
```

- [ ] **Step 5: Implement stdio server**

Create `packages/stdio/src/server.ts`:

```ts
import type { Readable, Writable } from "node:stream";
import { parseAcpCommand } from "@almond/acp";
import type { AgentRuntime } from "@almond/runtime";
import { readNdjson, writeNdjson } from "./ndjson.js";

export interface StdioServerOptions {
  input: Readable;
  output: Writable;
  runtime: AgentRuntime;
}

export async function runStdioServer(options: StdioServerOptions): Promise<void> {
  for await (const raw of readNdjson(options.input)) {
    let command;
    try {
      command = parseAcpCommand(raw);
    } catch (error) {
      const runId = typeof raw === "object" && raw !== null && "runId" in raw ? String(raw.runId) : "unknown";
      await writeNdjson(options.output, {
        type: "run.failed",
        runId,
        error: {
          code: "INVALID_COMMAND",
          message: error instanceof Error ? error.message : String(error),
        },
      });
      continue;
    }

    for await (const event of options.runtime.handleCommand(command)) {
      await writeNdjson(options.output, event);
    }
  }
}
```

- [ ] **Step 6: Export stdio API**

Create `packages/stdio/src/index.ts`:

```ts
export * from "./ndjson.js";
export * from "./server.js";
```

- [ ] **Step 7: Run tests**

Run: `npm test -- packages/stdio/test/ndjson.test.ts packages/stdio/test/server.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/stdio
git commit -m "feat: add ACP stdio transport"
```

---

### Task 5: Add Claude Agent SDK backend boundary

**Files:**
- Create: `packages/backend-claude-agent-sdk/src/claude-agent-sdk-backend.ts`
- Create: `packages/backend-claude-agent-sdk/src/index.ts`
- Create: `packages/backend-claude-agent-sdk/test/claude-agent-sdk-backend.test.ts`

- [ ] **Step 1: Write failing adapter test with injected query function**

Create `packages/backend-claude-agent-sdk/test/claude-agent-sdk-backend.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ClaudeAgentSdkBackend } from "../src/index.js";

async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const values: T[] = [];
  for await (const value of iterable) values.push(value);
  return values;
}

describe("ClaudeAgentSdkBackend", () => {
  it("maps text-like SDK messages to ACP events", async () => {
    const backend = new ClaudeAgentSdkBackend({
      query: async function* () {
        yield { type: "system", subtype: "init", session_id: "session_1" };
        yield { type: "assistant", message: { content: [{ type: "text", text: "Hello" }] } };
        yield { type: "result", result: "Hello" };
      },
    });

    const events = await collect(
      backend.startRun({ type: "run.start", runId: "run_1", prompt: "hello" }),
    );

    expect(events).toEqual([
      { type: "session.started", runId: "run_1", sessionId: "session_1" },
      { type: "message.delta", runId: "run_1", role: "assistant", content: "Hello" },
      { type: "message.completed", runId: "run_1", role: "assistant", content: "Hello" },
      { type: "run.completed", runId: "run_1", sessionId: "session_1", result: "Hello" },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm test -- packages/backend-claude-agent-sdk/test/claude-agent-sdk-backend.test.ts`

Expected: FAIL because backend files do not exist.

- [ ] **Step 3: Implement backend with injectable query**

Create `packages/backend-claude-agent-sdk/src/claude-agent-sdk-backend.ts`:

```ts
import type {
  AcpEvent,
  ApprovalRespondCommand,
  RunCancelCommand,
  RunStartCommand,
  SessionResumeCommand,
} from "@almond/acp";
import type { AgentBackend } from "@almond/runtime";
import { query as defaultQuery } from "@anthropic-ai/claude-agent-sdk";

type QueryInput = {
  prompt: string;
  options?: Record<string, unknown>;
};

type QueryFunction = (input: QueryInput) => AsyncIterable<unknown>;

export interface ClaudeAgentSdkBackendOptions {
  query?: QueryFunction;
}

export class ClaudeAgentSdkBackend implements AgentBackend {
  private readonly query: QueryFunction;
  private readonly cancelledRunIds = new Set<string>();

  constructor(options: ClaudeAgentSdkBackendOptions = {}) {
    this.query = options.query ?? ((input) => defaultQuery(input as never) as AsyncIterable<unknown>);
  }

  async *startRun(command: RunStartCommand): AsyncIterable<AcpEvent> {
    const state = { sessionId: command.sessionId, finalText: "" };

    try {
      for await (const message of this.query({
        prompt: command.prompt,
        options: {
          cwd: command.cwd,
          resume: command.sessionId,
          allowedTools: command.allowedTools,
        },
      })) {
        if (this.cancelledRunIds.has(command.runId)) {
          yield { type: "run.cancelled", runId: command.runId, reason: "cancel requested" };
          return;
        }

        for (const event of mapSdkMessageToAcpEvents(command.runId, message, state)) {
          yield event;
        }
      }
    } catch (error) {
      yield {
        type: "run.failed",
        runId: command.runId,
        error: {
          code: "BACKEND_UNAVAILABLE",
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  async *resumeSession(command: SessionResumeCommand): AsyncIterable<AcpEvent> {
    yield* this.startRun({
      type: "run.start",
      runId: command.runId,
      prompt: command.prompt ?? "Continue the session.",
      sessionId: command.sessionId,
    });
  }

  async cancelRun(command: RunCancelCommand): Promise<void> {
    this.cancelledRunIds.add(command.runId);
  }

  async respondApproval(_command: ApprovalRespondCommand): Promise<void> {
    throw new Error("approval.respond is not implemented for ClaudeAgentSdkBackend MVP");
  }
}

interface MappingState {
  sessionId?: string;
  finalText: string;
}

function mapSdkMessageToAcpEvents(runId: string, message: unknown, state: MappingState): AcpEvent[] {
  if (!isRecord(message)) return [];

  if (message.type === "system" && message.subtype === "init" && typeof message.session_id === "string") {
    state.sessionId = message.session_id;
    return [{ type: "session.started", runId, sessionId: message.session_id }];
  }

  if (message.type === "assistant" && isRecord(message.message)) {
    const text = extractText(message.message.content);
    if (text.length > 0) {
      state.finalText += text;
      return [
        { type: "message.delta", runId, role: "assistant", content: text },
        { type: "message.completed", runId, role: "assistant", content: state.finalText },
      ];
    }
  }

  if (message.type === "result") {
    const result = typeof message.result === "string" ? message.result : state.finalText;
    return [{ type: "run.completed", runId, sessionId: state.sessionId, result }];
  }

  return [];
}

function extractText(content: unknown): string {
  if (!Array.isArray(content)) return "";
  return content
    .map((block) => {
      if (isRecord(block) && block.type === "text" && typeof block.text === "string") {
        return block.text;
      }
      return "";
    })
    .join("");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
```

- [ ] **Step 4: Export backend API**

Create `packages/backend-claude-agent-sdk/src/index.ts`:

```ts
export * from "./claude-agent-sdk-backend.js";
```

- [ ] **Step 5: Run adapter test**

Run: `npm test -- packages/backend-claude-agent-sdk/test/claude-agent-sdk-backend.test.ts`

Expected: PASS.

- [ ] **Step 6: Run typecheck**

Run: `npm run typecheck`

Expected: PASS. If the Claude Agent SDK TypeScript signature differs, adjust only the `defaultQuery` wrapper in `claude-agent-sdk-backend.ts`; do not leak SDK types into `@almond/acp`.

- [ ] **Step 7: Commit**

```bash
git add packages/backend-claude-agent-sdk
git commit -m "feat: add Claude Agent SDK backend adapter"
```

---

### Task 6: Implement CLI one-shot command over ACP stdio path

**Files:**
- Create: `packages/cli/src/main.ts`
- Create: `packages/cli/src/index.ts`
- Create: `packages/cli/test/cli.test.ts`

- [ ] **Step 1: Write failing CLI test**

Create `packages/cli/test/cli.test.ts`:

```ts
import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { runCli } from "../src/index.js";

class MemoryWritable extends Writable {
  chunks: string[] = [];

  _write(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.chunks.push(chunk.toString("utf8"));
    callback();
  }
}

describe("CLI", () => {
  it("prints assistant deltas for a one-shot prompt", async () => {
    const stdout = new MemoryWritable();
    const stderr = new MemoryWritable();

    const code = await runCli({ argv: ["node", "almond", "hello"], stdout, stderr, useMockBackend: true });

    expect(code).toBe(0);
    expect(stdout.chunks.join("")).toContain("Mock response to: hello");
    expect(stderr.chunks.join("")).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm test -- packages/cli/test/cli.test.ts`

Expected: FAIL because CLI files do not exist.

- [ ] **Step 3: Implement CLI API**

Create `packages/cli/src/index.ts`:

```ts
import type { Writable } from "node:stream";
import { randomUUID } from "node:crypto";
import { ClaudeAgentSdkBackend } from "@almond/backend-claude-agent-sdk";
import type { AcpEvent } from "@almond/acp";
import { createAgentRuntime, MockAgentBackend } from "@almond/runtime";

export interface RunCliOptions {
  argv: string[];
  stdout: Writable;
  stderr: Writable;
  useMockBackend?: boolean;
}

export async function runCli(options: RunCliOptions): Promise<number> {
  const prompt = options.argv.slice(2).join(" ").trim();
  if (prompt.length === 0) {
    options.stderr.write("Usage: almond <prompt>\n");
    return 2;
  }

  const backend = options.useMockBackend ? new MockAgentBackend() : new ClaudeAgentSdkBackend();
  const runtime = createAgentRuntime({ backend });
  const runId = `run_${randomUUID()}`;

  for await (const event of runtime.handleCommand({ type: "run.start", runId, prompt })) {
    renderEvent(event, options.stdout, options.stderr);
    if (event.type === "run.failed") return 1;
  }

  return 0;
}

function renderEvent(event: AcpEvent, stdout: Writable, stderr: Writable): void {
  switch (event.type) {
    case "message.delta":
      stdout.write(event.content);
      return;
    case "run.completed":
      stdout.write("\n");
      return;
    case "run.failed":
      stderr.write(`${event.error.code}: ${event.error.message}\n`);
      return;
    case "approval.requested":
      stderr.write(`Approval required for ${event.toolName}; interactive approval is not implemented in CLI MVP.\n`);
      return;
    default:
      return;
  }
}
```

- [ ] **Step 4: Implement CLI executable**

Create `packages/cli/src/main.ts`:

```ts
#!/usr/bin/env node
import { runCli } from "./index.js";

const code = await runCli({ argv: process.argv, stdout: process.stdout, stderr: process.stderr });
process.exitCode = code;
```

- [ ] **Step 5: Run CLI test**

Run: `npm test -- packages/cli/test/cli.test.ts`

Expected: PASS.

- [ ] **Step 6: Run full tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 7: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 8: Build packages**

Run: `npm run build`

Expected: all packages build `dist/` output.

- [ ] **Step 9: Commit**

```bash
git add packages/cli
git commit -m "feat: add Almond CLI one-shot command"
```

---

### Task 7: Add stdio executable mode for raw ACP commands

**Files:**
- Modify: `packages/cli/src/index.ts`
- Modify: `packages/cli/src/main.ts`
- Create: `packages/cli/test/stdio-mode.test.ts`

- [ ] **Step 1: Write failing stdio mode test**

Create `packages/cli/test/stdio-mode.test.ts`:

```ts
import { Readable, Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { runCli } from "../src/index.js";

class MemoryWritable extends Writable {
  chunks: string[] = [];

  _write(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.chunks.push(chunk.toString("utf8"));
    callback();
  }
}

describe("CLI stdio mode", () => {
  it("accepts ACP commands on stdin and writes ACP events to stdout", async () => {
    const stdin = Readable.from(['{"type":"run.start","runId":"run_1","prompt":"hello"}\n']);
    const stdout = new MemoryWritable();
    const stderr = new MemoryWritable();

    const code = await runCli({
      argv: ["node", "almond", "--stdio"],
      stdin,
      stdout,
      stderr,
      useMockBackend: true,
    });

    expect(code).toBe(0);
    const events = stdout.chunks.join("").trim().split("\n").map((line) => JSON.parse(line));
    expect(events.map((event) => event.type)).toEqual([
      "session.started",
      "message.delta",
      "message.completed",
      "run.completed",
    ]);
    expect(stderr.chunks.join("")).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm test -- packages/cli/test/stdio-mode.test.ts`

Expected: FAIL because `runCli` does not accept `stdin` or `--stdio`.

- [ ] **Step 3: Update CLI to support stdio mode**

Replace `packages/cli/src/index.ts` with:

```ts
import type { Readable, Writable } from "node:stream";
import { randomUUID } from "node:crypto";
import { ClaudeAgentSdkBackend } from "@almond/backend-claude-agent-sdk";
import type { AcpEvent } from "@almond/acp";
import { createAgentRuntime, MockAgentBackend } from "@almond/runtime";
import { runStdioServer } from "@almond/stdio";

export interface RunCliOptions {
  argv: string[];
  stdout: Writable;
  stderr: Writable;
  stdin?: Readable;
  useMockBackend?: boolean;
}

export async function runCli(options: RunCliOptions): Promise<number> {
  const backend = options.useMockBackend ? new MockAgentBackend() : new ClaudeAgentSdkBackend();
  const runtime = createAgentRuntime({ backend });

  if (options.argv.includes("--stdio")) {
    if (!options.stdin) {
      options.stderr.write("stdin is required for --stdio mode\n");
      return 2;
    }
    await runStdioServer({ input: options.stdin, output: options.stdout, runtime });
    return 0;
  }

  const prompt = options.argv.slice(2).join(" ").trim();
  if (prompt.length === 0) {
    options.stderr.write("Usage: almond <prompt>\nUsage: almond --stdio\n");
    return 2;
  }

  const runId = `run_${randomUUID()}`;

  for await (const event of runtime.handleCommand({ type: "run.start", runId, prompt })) {
    renderEvent(event, options.stdout, options.stderr);
    if (event.type === "run.failed") return 1;
  }

  return 0;
}

function renderEvent(event: AcpEvent, stdout: Writable, stderr: Writable): void {
  switch (event.type) {
    case "message.delta":
      stdout.write(event.content);
      return;
    case "run.completed":
      stdout.write("\n");
      return;
    case "run.failed":
      stderr.write(`${event.error.code}: ${event.error.message}\n`);
      return;
    case "approval.requested":
      stderr.write(`Approval required for ${event.toolName}; interactive approval is not implemented in CLI MVP.\n`);
      return;
    default:
      return;
  }
}
```

- [ ] **Step 4: Update executable to pass stdin**

Replace `packages/cli/src/main.ts` with:

```ts
#!/usr/bin/env node
import { runCli } from "./index.js";

const code = await runCli({
  argv: process.argv,
  stdin: process.stdin,
  stdout: process.stdout,
  stderr: process.stderr,
});
process.exitCode = code;
```

- [ ] **Step 5: Run stdio mode test**

Run: `npm test -- packages/cli/test/stdio-mode.test.ts`

Expected: PASS.

- [ ] **Step 6: Run full tests and build**

Run: `npm test && npm run typecheck && npm run build`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/cli
git commit -m "feat: add raw ACP stdio mode"
```

---

### Task 8: Update docs for Phase 1 executable behavior

**Files:**
- Modify: `docs/03-model.md`
- Modify: `docs/04-roadmap.md`
- Modify: `docs/05-getting-started.md`

- [ ] **Step 1: Update model docs with stdio envelope**

In `docs/03-model.md`, add this section after `## 消息/事件定义`:

```md
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
```

- [ ] **Step 2: Update roadmap Phase 1 delivery status wording**

In `docs/04-roadmap.md`, replace this line:

```md
| CLI adapter | 支持 prompt 输入、流式输出、审批响应、取消 |
```

with:

```md
| CLI adapter | 支持 one-shot prompt 和 `--stdio` 原始 ACP 模式；审批响应在后续任务补齐 |
```

Replace this acceptance item:

```md
- [ ] 用户 allow/deny 后 Runtime 能继续或拒绝执行。
```

with:

```md
- [ ] Runtime 能发出 `approval.requested`；CLI 交互式 allow/deny 在 Phase 1.1 补齐。
```

- [ ] **Step 3: Update getting started with stdio mode**

In `docs/05-getting-started.md`, add this section after the first Quick Start code block:

```md
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
```

- [ ] **Step 4: Run docs grep for stale claims**

Run: `grep -R "用户 allow/deny 后 Runtime 能继续" -n docs || true`

Expected: no output.

Run: `grep -R "stdio" -n docs/01-overview.md docs/02-concepts.md docs/03-model.md docs/04-roadmap.md docs/05-getting-started.md`

Expected: output includes Phase 1 stdio references in all relevant docs.

- [ ] **Step 5: Commit**

```bash
git add docs
git commit -m "docs: document ACP stdio MVP behavior"
```

---

## Final Verification

- [ ] Run: `npm test`
  - Expected: all tests pass.
- [ ] Run: `npm run typecheck`
  - Expected: TypeScript typecheck passes.
- [ ] Run: `npm run build`
  - Expected: all packages build.
- [ ] Run a mock CLI command after build:
  - Command: `node packages/cli/dist/main.js hello`
  - Expected stdout contains `Mock response to: hello` only if mock mode is wired for local testing; otherwise document that real mode requires `ANTHROPIC_API_KEY`.
- [ ] Run raw stdio mode with mock backend in a test or local dev harness:
  - Command: `printf '%s\n' '{"type":"run.start","runId":"run_1","prompt":"hello"}' | node packages/cli/dist/main.js --stdio`
  - Expected stdout is NDJSON ACP events.

---

## Plan Self-Review

**Spec coverage:**
- ACP command/event schema: Task 2.
- Runtime backend boundary: Task 3.
- ACP over stdio NDJSON: Task 4 and Task 7.
- Claude Agent SDK backend isolation: Task 5.
- CLI golden path: Task 6.
- Docs update: Task 8.

**Intentional MVP exclusions:**
- Interactive approval continuation is not completed in this plan; Task 8 documents it as Phase 1.1.
- Web/VSCode adapters are Phase 2.
- Managed Agents backend is Phase 3 spike.

**Placeholder scan:** No unresolved placeholder language remains in implementation steps. The only deferred items are explicitly marked as MVP exclusions.

**Type consistency:** `runId`, `sessionId`, `approvalId`, `toolUseId`, `AcpCommand`, `AcpEvent`, and `AgentBackend` names are consistent across tasks.
