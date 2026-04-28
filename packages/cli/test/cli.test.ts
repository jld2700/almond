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

  it("prints usage and returns 2 when no prompt is provided", async () => {
    const stdout = new MemoryWritable();
    const stderr = new MemoryWritable();

    const code = await runCli({ argv: ["node", "almond"], stdout, stderr, useMockBackend: true });

    expect(code).toBe(2);
    expect(stdout.chunks.join("")).toBe("");
    expect(stderr.chunks.join("")).toBe("Usage: almond <prompt>\nUsage: almond --stdio\n");
  });
});
