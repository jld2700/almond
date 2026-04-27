import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";

export async function* readNdjson(input: Readable): AsyncIterable<unknown> {
  const rl = createInterface({ input, crlfDelay: Infinity });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    yield JSON.parse(trimmed);
  }
}

export function writeNdjson(output: Writable, value: unknown): Promise<void> {
  const line = `${JSON.stringify(value)}\n`;
  return new Promise((resolve, reject) => {
    output.write(line, "utf8", (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
