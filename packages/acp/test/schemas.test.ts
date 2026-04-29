import { describe, expect, it } from "vitest";
import { parseAcpCommand, parseAcpEvent } from "../src/index.js";

const runStart = {
  type: "run.start",
  runId: "run_1",
  prompt: "hello",
  allowedTools: ["Read", "Glob"],
};

const messageDelta = {
  type: "message.delta",
  runId: "run_1",
  role: "assistant",
  content: "Hello",
};

describe("ACP schemas", () => {
  it("parses run.start commands", () => {
    expect(parseAcpCommand(runStart)).toEqual(runStart);
  });

  it("rejects invalid command payloads", () => {
    expect(() => parseAcpCommand({ type: "run.start", runId: "run_1" })).toThrow(
      /Invalid ACP command/,
    );
  });

  it("parses message.delta events", () => {
    expect(parseAcpEvent(messageDelta)).toEqual(messageDelta);
  });

  it("rejects unknown event types", () => {
    expect(() => parseAcpEvent({ type: "unknown.event", runId: "run_1" })).toThrow(
      /Invalid ACP event/,
    );
  });
});
