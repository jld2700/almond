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
