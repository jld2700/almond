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
