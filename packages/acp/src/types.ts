export type AcpCommand =
  | RunStartCommand
  | RunCancelCommand
  | SessionResumeCommand
  | InputSubmitCommand
  | ApprovalRespondCommand;

export interface RunStartCommand {
  type: "run.start";
  runId: string;
  prompt: string;
  cwd?: string;
  sessionId?: string;
  allowedTools?: string[];
  metadata?: Record<string, unknown>;
}

export interface RunCancelCommand {
  type: "run.cancel";
  runId: string;
}

export interface SessionResumeCommand {
  type: "session.resume";
  runId: string;
  sessionId: string;
  prompt?: string;
}

export interface InputSubmitCommand {
  type: "input.submit";
  runId: string;
  sessionId: string;
  content: string;
}

export interface ApprovalRespondCommand {
  type: "approval.respond";
  runId: string;
  approvalId: string;
  decision: "allow" | "deny";
  message?: string;
}

export type AcpEvent =
  | SessionStartedEvent
  | MessageDeltaEvent
  | MessageCompletedEvent
  | ToolRequestedEvent
  | ToolCompletedEvent
  | ApprovalRequestedEvent
  | RunCompletedEvent
  | RunFailedEvent
  | RunCancelledEvent;

export interface SessionStartedEvent {
  type: "session.started";
  runId: string;
  sessionId: string;
}

export interface MessageDeltaEvent {
  type: "message.delta";
  runId: string;
  role: "assistant";
  content: string;
}

export interface MessageCompletedEvent {
  type: "message.completed";
  runId: string;
  role: "assistant";
  content: string;
}

export interface ToolRequestedEvent {
  type: "tool.requested";
  runId: string;
  toolUseId: string;
  toolName: string;
  toolInput: unknown;
}

export interface ToolCompletedEvent {
  type: "tool.completed";
  runId: string;
  toolUseId: string;
  toolName: string;
  result?: unknown;
  isError?: boolean;
}

export interface ApprovalRequestedEvent {
  type: "approval.requested";
  runId: string;
  approvalId: string;
  toolName: string;
  toolInput: unknown;
  risk?: "low" | "medium" | "high";
  reason?: string;
}

export interface RunCompletedEvent {
  type: "run.completed";
  runId: string;
  sessionId?: string;
  result?: string;
  usage?: AcpUsage;
}

export interface RunFailedEvent {
  type: "run.failed";
  runId: string;
  error: AcpError;
}

export interface RunCancelledEvent {
  type: "run.cancelled";
  runId: string;
  reason?: string;
}

export interface AcpUsage {
  inputTokens?: number;
  outputTokens?: number;
  cacheReadInputTokens?: number;
  cacheCreationInputTokens?: number;
}

export interface AcpError {
  code: "INVALID_COMMAND" | "BACKEND_UNAVAILABLE" | "RUN_NOT_FOUND" | "INTERNAL_ERROR";
  message: string;
  details?: unknown;
}
