import type {
  AcpEvent,
  ApprovalRespondCommand,
  RunCancelCommand,
  RunStartCommand,
  SessionResumeCommand,
} from "@almond/acp";

export interface AgentBackend {
  startRun(command: RunStartCommand): AsyncIterable<AcpEvent>;
  resumeSession(command: SessionResumeCommand): AsyncIterable<AcpEvent>;
  cancelRun(command: RunCancelCommand): Promise<void>;
  respondApproval(command: ApprovalRespondCommand): Promise<void>;
}
