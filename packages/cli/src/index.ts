import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";
import type { AcpEvent } from "@almond/acp";
import { ClaudeAgentSdkBackend, createAgentRuntime, MockAgentBackend } from "@almond/core";
import type { AgentRuntime } from "@almond/core";
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
  if (prompt.length > 0) {
    return runPrompt(runtime, prompt, options.stdout, options.stderr);
  }

  if (!options.stdin) {
    options.stderr.write("stdin is required for interactive mode\n");
    return 2;
  }

  return runInteractiveRepl({ runtime, stdin: options.stdin, stdout: options.stdout, stderr: options.stderr });
}

async function runPrompt(
  runtime: AgentRuntime,
  prompt: string,
  stdout: Writable,
  stderr: Writable,
): Promise<number> {
  const runId = `run_${randomUUID()}`;

  for await (const event of runtime.handleCommand({ type: "run.start", runId, prompt })) {
    renderEvent(event, stdout, stderr);
    if (event.type === "run.failed") return 1;
  }

  return 0;
}

interface InteractiveReplOptions {
  runtime: AgentRuntime;
  stdin: Readable;
  stdout: Writable;
  stderr: Writable;
}

async function runInteractiveRepl(options: InteractiveReplOptions): Promise<number> {
  options.stdout.write("Almond interactive mode\n");
  options.stdout.write("Type /exit or /quit to quit.\n\n");

  const rl = createInterface({ input: options.stdin, output: options.stdout, prompt: "almond> " });
  let isClosed = false;
  rl.on("close", () => {
    isClosed = true;
  });
  promptForInput(rl, isClosed);

  try {
    for await (const line of rl) {
      const prompt = line.trim();

      if (prompt.length === 0) {
        promptForInput(rl, isClosed);
        continue;
      }

      if (prompt === "/exit" || prompt === "/quit") {
        return 0;
      }

      const code = await runPrompt(options.runtime, prompt, options.stdout, options.stderr);
      if (code !== 0) {
        options.stderr.write("Run failed. Staying in interactive mode.\n");
      }
      promptForInput(rl, isClosed);
    }

    return 0;
  } finally {
    rl.close();
  }
}

function promptForInput(rl: ReturnType<typeof createInterface>, isClosed: boolean): void {
  if (!isClosed) {
    rl.prompt();
  }
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
