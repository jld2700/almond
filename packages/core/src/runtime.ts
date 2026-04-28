import type { AcpCommand, AcpEvent } from "@almond/acp";
import type { AgentBackend } from "./backend.js";

export interface AgentRuntimeOptions {
  backend: AgentBackend;
}

export interface AgentRuntime {
  handleCommand(command: AcpCommand): AsyncIterable<AcpEvent>;
}

export function createAgentRuntime(options: AgentRuntimeOptions): AgentRuntime {
  return new DefaultAgentRuntime(options.backend);
}

class DefaultAgentRuntime implements AgentRuntime {
  constructor(private readonly backend: AgentBackend) {}

  async *handleCommand(command: AcpCommand): AsyncIterable<AcpEvent> {
    try {
      switch (command.type) {
        case "run.start":
          yield* this.backend.startRun(command);
          return;
        case "session.resume":
          yield* this.backend.resumeSession(command);
          return;
        case "run.cancel":
          await this.backend.cancelRun(command);
          yield { type: "run.cancelled", runId: command.runId, reason: "cancel requested" };
          return;
        case "approval.respond":
          await this.backend.respondApproval(command);
          return;
        case "input.submit":
          yield {
            type: "run.failed",
            runId: command.runId,
            error: {
              code: "INTERNAL_ERROR",
              message: "input.submit is not implemented in the MVP runtime",
            },
          };
          return;
      }
    } catch (error) {
      yield {
        type: "run.failed",
        runId: command.runId,
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
}
