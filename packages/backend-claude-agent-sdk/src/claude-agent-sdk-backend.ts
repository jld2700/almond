import type {
  AcpEvent,
  ApprovalRespondCommand,
  RunCancelCommand,
  RunStartCommand,
  SessionResumeCommand,
} from "@almond/acp";
import type { AgentBackend } from "@almond/runtime";
import { query as defaultQuery } from "@anthropic-ai/claude-agent-sdk";

type QueryInput = {
  prompt: string;
  options?: Record<string, unknown>;
};

type QueryFunction = (input: QueryInput) => AsyncIterable<unknown>;

export interface ClaudeAgentSdkBackendOptions {
  query?: QueryFunction;
}

export class ClaudeAgentSdkBackend implements AgentBackend {
  private readonly query: QueryFunction;
  private readonly cancelledRunIds = new Set<string>();

  constructor(options: ClaudeAgentSdkBackendOptions = {}) {
    this.query = options.query ?? ((input) => defaultQuery(input as never) as AsyncIterable<unknown>);
  }

  async *startRun(command: RunStartCommand): AsyncIterable<AcpEvent> {
    const state: MappingState = { sessionId: command.sessionId, finalText: "" };

    try {
      for await (const message of this.query({
        prompt: command.prompt,
        options: {
          cwd: command.cwd,
          resume: command.sessionId,
          allowedTools: command.allowedTools,
        },
      })) {
        if (this.cancelledRunIds.has(command.runId)) {
          yield { type: "run.cancelled", runId: command.runId, reason: "cancel requested" };
          return;
        }

        for (const event of mapSdkMessageToAcpEvents(command.runId, message, state)) {
          yield event;
        }
      }
    } catch (error) {
      yield {
        type: "run.failed",
        runId: command.runId,
        error: {
          code: "BACKEND_UNAVAILABLE",
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  async *resumeSession(command: SessionResumeCommand): AsyncIterable<AcpEvent> {
    yield* this.startRun({
      type: "run.start",
      runId: command.runId,
      prompt: command.prompt ?? "Continue the session.",
      sessionId: command.sessionId,
    });
  }

  async cancelRun(command: RunCancelCommand): Promise<void> {
    this.cancelledRunIds.add(command.runId);
  }

  async respondApproval(_command: ApprovalRespondCommand): Promise<void> {
    throw new Error("approval.respond is not implemented for ClaudeAgentSdkBackend MVP");
  }
}

interface MappingState {
  sessionId?: string;
  finalText: string;
}

function mapSdkMessageToAcpEvents(runId: string, message: unknown, state: MappingState): AcpEvent[] {
  if (!isRecord(message)) return [];

  if (message.type === "system" && message.subtype === "init" && typeof message.session_id === "string") {
    state.sessionId = message.session_id;
    return [{ type: "session.started", runId, sessionId: message.session_id }];
  }

  if (message.type === "assistant" && isRecord(message.message)) {
    const text = extractText(message.message.content);
    if (text.length > 0) {
      state.finalText += text;
      return [
        { type: "message.delta", runId, role: "assistant", content: text },
        { type: "message.completed", runId, role: "assistant", content: state.finalText },
      ];
    }
  }

  if (message.type === "result") {
    const result = typeof message.result === "string" ? message.result : state.finalText;
    return [{ type: "run.completed", runId, sessionId: state.sessionId, result }];
  }

  return [];
}

function extractText(content: unknown): string {
  if (!Array.isArray(content)) return "";
  return content
    .map((block) => {
      if (isRecord(block) && block.type === "text" && typeof block.text === "string") {
        return block.text;
      }
      return "";
    })
    .join("");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
