import { randomUUID } from "node:crypto";
import type { Readable, Writable } from "node:stream";
import type { AcpEvent } from "@almond/acp";
import { ClaudeAgentSdkBackend } from "@almond/backend-claude-agent-sdk";
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
