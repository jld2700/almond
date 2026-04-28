import { Readable, Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { MockAgentBackend, createAgentRuntime } from "@almond/core";
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

  it("returns run.failed for invalid commands with runId", async () => {
    const input = Readable.from(['{"type":"run.start","runId":"run_bad"}\n']);
    const output = new MemoryWritable();
    const runtime = createAgentRuntime({ backend: new MockAgentBackend() });

    await runStdioServer({ input, output, runtime });

    const lines = output.chunks.join("").trim().split("\n").map((line) => JSON.parse(line));
    expect(lines).toEqual([
      {
        type: "run.failed",
        runId: "run_bad",
        error: expect.objectContaining({ code: "INVALID_COMMAND" }),
      },
    ]);
    expect(lines[0].error.message).toContain("Invalid ACP command");
  });

  it("returns run.failed with unknown runId for invalid commands without runId", async () => {
    const input = Readable.from(['{"type":"run.start"}\n']);
    const output = new MemoryWritable();
    const runtime = createAgentRuntime({ backend: new MockAgentBackend() });

    await runStdioServer({ input, output, runtime });

    const lines = output.chunks.join("").trim().split("\n").map((line) => JSON.parse(line));
    expect(lines).toEqual([
      {
        type: "run.failed",
        runId: "unknown",
        error: expect.objectContaining({ code: "INVALID_COMMAND" }),
      },
    ]);
    expect(lines[0].error.message).toContain("Invalid ACP command");
  });

  it("returns run.failed with unknown runId for malformed JSON", async () => {
    const input = Readable.from(['{"type":"run.start","runId":"run_bad"\n']);
    const output = new MemoryWritable();
    const runtime = createAgentRuntime({ backend: new MockAgentBackend() });

    await runStdioServer({ input, output, runtime });

    const lines = output.chunks.join("").trim().split("\n").map((line) => JSON.parse(line));
    expect(lines).toEqual([
      {
        type: "run.failed",
        runId: "unknown",
        error: expect.objectContaining({ code: "INVALID_COMMAND" }),
      },
    ]);
  });

  it("returns run.failed with unknown runId for invalid commands with empty runId", async () => {
    const input = Readable.from(['{"type":"run.start","runId":"","prompt":"hello"}\n']);
    const output = new MemoryWritable();
    const runtime = createAgentRuntime({ backend: new MockAgentBackend() });

    await runStdioServer({ input, output, runtime });

    const lines = output.chunks.join("").trim().split("\n").map((line) => JSON.parse(line));
    expect(lines).toEqual([
      {
        type: "run.failed",
        runId: "unknown",
        error: expect.objectContaining({ code: "INVALID_COMMAND" }),
      },
    ]);
    expect(lines[0].error.message).toContain("Invalid ACP command");
  });
});
