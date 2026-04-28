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

  it("requires stdin for stdio mode", async () => {
    const stdout = new MemoryWritable();
    const stderr = new MemoryWritable();

    const code = await runCli({
      argv: ["node", "almond", "--stdio"],
      stdout,
      stderr,
      useMockBackend: true,
    });

    expect(code).toBe(2);
    expect(stdout.chunks.join("")).toBe("");
    expect(stderr.chunks.join("")).toBe("stdin is required for --stdio mode\n");
  });
});
