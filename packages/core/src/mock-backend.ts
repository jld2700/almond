import type {
  AcpEvent,
  ApprovalRespondCommand,
  RunCancelCommand,
  RunStartCommand,
  SessionResumeCommand,
} from "@almond/acp";
import type { AgentBackend } from "./backend.js";

export class MockAgentBackend implements AgentBackend {
  async *startRun(command: RunStartCommand): AsyncIterable<AcpEvent> {
    const sessionId = `mock-session-${command.runId}`;
    const content = `Mock response to: ${command.prompt}`;

    yield { type: "session.started", runId: command.runId, sessionId };
    yield { type: "message.delta", runId: command.runId, role: "assistant", content };
    yield { type: "message.completed", runId: command.runId, role: "assistant", content };
    yield { type: "run.completed", runId: command.runId, sessionId, result: content };
  }

  async *resumeSession(command: SessionResumeCommand): AsyncIterable<AcpEvent> {
    const content = `Resumed session: ${command.sessionId}`;
    yield { type: "session.started", runId: command.runId, sessionId: command.sessionId };
    yield { type: "message.delta", runId: command.runId, role: "assistant", content };
    yield { type: "message.completed", runId: command.runId, role: "assistant", content };
    yield { type: "run.completed", runId: command.runId, sessionId: command.sessionId, result: content };
  }

  async cancelRun(_command: RunCancelCommand): Promise<void> {}

  async respondApproval(_command: ApprovalRespondCommand): Promise<void> {}
}
