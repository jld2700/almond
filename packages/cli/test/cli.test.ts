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

describe("CLI", () => {
  it("prints assistant deltas for a one-shot prompt", async () => {
    const stdout = new MemoryWritable();
    const stderr = new MemoryWritable();

    const code = await runCli({ argv: ["node", "almond", "hello"], stdout, stderr, useMockBackend: true });

    expect(code).toBe(0);
    expect(stdout.chunks.join("")).toContain("Mock response to: hello");
    expect(stderr.chunks.join("")).toBe("");
  });

  it("starts an interactive REPL when no prompt is provided", async () => {
    const stdin = Readable.from(["hello\n/exit\n"]);
    const stdout = new MemoryWritable();
    const stderr = new MemoryWritable();

    const code = await runCli({
      argv: ["node", "almond"],
      stdin,
      stdout,
      stderr,
      useMockBackend: true,
    });

    const output = stdout.chunks.join("");
    expect(code).toBe(0);
    expect(output).toContain("Almond interactive mode");
    expect(output).toContain("almond>");
    expect(output).toContain("Mock response to: hello");
    expect(stderr.chunks.join("")).toBe("");
  });

  it("ignores empty REPL lines", async () => {
    const stdin = Readable.from(["\n/exit\n"]);
    const stdout = new MemoryWritable();
    const stderr = new MemoryWritable();

    const code = await runCli({
      argv: ["node", "almond"],
      stdin,
      stdout,
      stderr,
      useMockBackend: true,
    });

    expect(code).toBe(0);
    expect(stdout.chunks.join("")).not.toContain("Mock response to:");
    expect(stderr.chunks.join("")).toBe("");
  });

  it("exits interactive REPL on EOF", async () => {
    const stdin = Readable.from([]);
    const stdout = new MemoryWritable();
    const stderr = new MemoryWritable();

    const code = await runCli({
      argv: ["node", "almond"],
      stdin,
      stdout,
      stderr,
      useMockBackend: true,
    });

    expect(code).toBe(0);
    expect(stdout.chunks.join("")).toContain("Almond interactive mode");
    expect(stderr.chunks.join("")).toBe("");
  });

  it("returns 2 when interactive mode has no stdin", async () => {
    const stdout = new MemoryWritable();
    const stderr = new MemoryWritable();

    const code = await runCli({ argv: ["node", "almond"], stdout, stderr, useMockBackend: true });

    expect(code).toBe(2);
    expect(stdout.chunks.join("")).toBe("");
    expect(stderr.chunks.join("")).toBe("stdin is required for interactive mode\n");
  });
});
