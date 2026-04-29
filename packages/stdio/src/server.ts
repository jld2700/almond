import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";
import { parseAcpCommand } from "@almond/acp";
import type { AgentRuntime } from "@almond/core";
import { writeNdjson } from "./ndjson.js";

export interface StdioServerOptions {
  input: Readable;
  output: Writable;
  runtime: AgentRuntime;
}

export async function runStdioServer(options: StdioServerOptions): Promise<void> {
  const rl = createInterface({ input: options.input, crlfDelay: Infinity });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;

    let raw;
    try {
      raw = JSON.parse(trimmed);
    } catch (error) {
      await writeInvalidCommand(options.output, "unknown", error);
      continue;
    }

    let command;
    try {
      command = parseAcpCommand(raw);
    } catch (error) {
      await writeInvalidCommand(options.output, extractRunId(raw), error);
      continue;
    }

    for await (const event of options.runtime.handleCommand(command)) {
      await writeNdjson(options.output, event);
    }
  }
}

function extractRunId(raw: unknown): string {
  if (typeof raw !== "object" || raw === null || !("runId" in raw)) return "unknown";
  return typeof raw.runId === "string" && raw.runId.length > 0 ? raw.runId : "unknown";
}

function writeInvalidCommand(output: Writable, runId: string, error: unknown): Promise<void> {
  return writeNdjson(output, {
    type: "run.failed",
    runId,
    error: {
      code: "INVALID_COMMAND",
      message: error instanceof Error ? error.message : String(error),
    },
  });
}
