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
