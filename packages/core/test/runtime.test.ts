import { describe, expect, it } from "vitest";
import { createAgentRuntime, MockAgentBackend } from "../src/index.js";

function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  return (async () => {
    const values: T[] = [];
    for await (const value of iterable) values.push(value);
    return values;
  })();
}

describe("AgentRuntime", () => {
  it("delegates run.start to backend and returns events", async () => {
    const runtime = createAgentRuntime({ backend: new MockAgentBackend() });

    const events = await collect(
      runtime.handleCommand({ type: "run.start", runId: "run_1", prompt: "hello" }),
    );

    expect(events).toEqual([
      { type: "session.started", runId: "run_1", sessionId: "mock-session-run_1" },
      { type: "message.delta", runId: "run_1", role: "assistant", content: "Mock response to: hello" },
      { type: "message.completed", runId: "run_1", role: "assistant", content: "Mock response to: hello" },
      { type: "run.completed", runId: "run_1", sessionId: "mock-session-run_1", result: "Mock response to: hello" },
    ]);
  });

  it("returns run.cancelled for run.cancel", async () => {
    const runtime = createAgentRuntime({ backend: new MockAgentBackend() });

    const events = await collect(runtime.handleCommand({ type: "run.cancel", runId: "run_1" }));

    expect(events).toEqual([{ type: "run.cancelled", runId: "run_1", reason: "cancel requested" }]);
  });
});
