import { describe, expect, it } from "vitest";
import { ClaudeAgentSdkBackend } from "../src/index.js";

async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const values: T[] = [];
  for await (const value of iterable) values.push(value);
  return values;
}

describe("ClaudeAgentSdkBackend", () => {
  it("maps text-like SDK messages to ACP events", async () => {
    const backend = new ClaudeAgentSdkBackend({
      query: async function* () {
        yield { type: "system", subtype: "init", session_id: "session_1" };
        yield { type: "assistant", message: { content: [{ type: "text", text: "Hello" }] } };
        yield { type: "result", result: "Hello" };
      },
    });

    const events = await collect(
      backend.startRun({ type: "run.start", runId: "run_1", prompt: "hello" }),
    );

    expect(events).toEqual([
      { type: "session.started", runId: "run_1", sessionId: "session_1" },
      { type: "message.delta", runId: "run_1", role: "assistant", content: "Hello" },
      { type: "message.completed", runId: "run_1", role: "assistant", content: "Hello" },
      { type: "run.completed", runId: "run_1", sessionId: "session_1", result: "Hello" },
    ]);
  });

  it("passes run.start options to the query function", async () => {
    const calls: unknown[] = [];
    const backend = new ClaudeAgentSdkBackend({
      query: async function* (input) {
        calls.push(input);
        yield { type: "result", result: "done" };
      },
    });

    await collect(
      backend.startRun({
        type: "run.start",
        runId: "run_1",
        prompt: "hello",
        cwd: "/tmp/project",
        sessionId: "session_1",
        allowedTools: ["Read", "Glob"],
      }),
    );

    expect(calls).toEqual([
      {
        prompt: "hello",
        options: {
          cwd: "/tmp/project",
          resume: "session_1",
          allowedTools: ["Read", "Glob"],
        },
      },
    ]);
  });

  it("maps query errors to BACKEND_UNAVAILABLE run.failed events", async () => {
    const backend = new ClaudeAgentSdkBackend({
      query: async function* () {
        throw new Error("SDK unavailable");
      },
    });

    const events = await collect(
      backend.startRun({ type: "run.start", runId: "run_1", prompt: "hello" }),
    );

    expect(events).toEqual([
      {
        type: "run.failed",
        runId: "run_1",
        error: { code: "BACKEND_UNAVAILABLE", message: "SDK unavailable" },
      },
    ]);
  });

  it("resumes sessions with the fallback prompt", async () => {
    const calls: unknown[] = [];
    const backend = new ClaudeAgentSdkBackend({
      query: async function* (input) {
        calls.push(input);
        yield { type: "system", subtype: "init", session_id: "session_1" };
        yield { type: "result" };
      },
    });

    const events = await collect(
      backend.resumeSession({ type: "session.resume", runId: "run_1", sessionId: "session_1" }),
    );

    expect(calls).toEqual([
      {
        prompt: "Continue the session.",
        options: {
          cwd: undefined,
          resume: "session_1",
          allowedTools: undefined,
        },
      },
    ]);
    expect(events).toEqual([
      { type: "session.started", runId: "run_1", sessionId: "session_1" },
      { type: "run.completed", runId: "run_1", sessionId: "session_1", result: "" },
    ]);
  });
});
