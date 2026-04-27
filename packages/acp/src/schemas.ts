import { z } from "zod";

const metadataSchema = z.record(z.string(), z.unknown());
const usageSchema = z.object({
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  cacheReadInputTokens: z.number().int().nonnegative().optional(),
  cacheCreationInputTokens: z.number().int().nonnegative().optional(),
});
const errorSchema = z.object({
  code: z.enum(["INVALID_COMMAND", "BACKEND_UNAVAILABLE", "RUN_NOT_FOUND", "INTERNAL_ERROR"]),
  message: z.string().min(1),
  details: z.unknown().optional(),
});

export const runStartCommandSchema = z.object({
  type: z.literal("run.start"),
  runId: z.string().min(1),
  prompt: z.string().min(1),
  cwd: z.string().min(1).optional(),
  sessionId: z.string().min(1).optional(),
  allowedTools: z.array(z.string().min(1)).optional(),
  metadata: metadataSchema.optional(),
});

export const runCancelCommandSchema = z.object({
  type: z.literal("run.cancel"),
  runId: z.string().min(1),
});

export const sessionResumeCommandSchema = z.object({
  type: z.literal("session.resume"),
  runId: z.string().min(1),
  sessionId: z.string().min(1),
  prompt: z.string().min(1).optional(),
});

export const inputSubmitCommandSchema = z.object({
  type: z.literal("input.submit"),
  runId: z.string().min(1),
  sessionId: z.string().min(1),
  content: z.string().min(1),
});

export const approvalRespondCommandSchema = z.object({
  type: z.literal("approval.respond"),
  runId: z.string().min(1),
  approvalId: z.string().min(1),
  decision: z.enum(["allow", "deny"]),
  message: z.string().min(1).optional(),
});

export const acpCommandSchema = z.discriminatedUnion("type", [
  runStartCommandSchema,
  runCancelCommandSchema,
  sessionResumeCommandSchema,
  inputSubmitCommandSchema,
  approvalRespondCommandSchema,
]);

export const sessionStartedEventSchema = z.object({
  type: z.literal("session.started"),
  runId: z.string().min(1),
  sessionId: z.string().min(1),
});

export const messageDeltaEventSchema = z.object({
  type: z.literal("message.delta"),
  runId: z.string().min(1),
  role: z.literal("assistant"),
  content: z.string(),
});

export const messageCompletedEventSchema = z.object({
  type: z.literal("message.completed"),
  runId: z.string().min(1),
  role: z.literal("assistant"),
  content: z.string(),
});

export const toolRequestedEventSchema = z.object({
  type: z.literal("tool.requested"),
  runId: z.string().min(1),
  toolUseId: z.string().min(1),
  toolName: z.string().min(1),
  toolInput: z.unknown(),
});

export const toolCompletedEventSchema = z.object({
  type: z.literal("tool.completed"),
  runId: z.string().min(1),
  toolUseId: z.string().min(1),
  toolName: z.string().min(1),
  result: z.unknown().optional(),
  isError: z.boolean().optional(),
});

export const approvalRequestedEventSchema = z.object({
  type: z.literal("approval.requested"),
  runId: z.string().min(1),
  approvalId: z.string().min(1),
  toolName: z.string().min(1),
  toolInput: z.unknown(),
  risk: z.enum(["low", "medium", "high"]).optional(),
  reason: z.string().min(1).optional(),
});

export const runCompletedEventSchema = z.object({
  type: z.literal("run.completed"),
  runId: z.string().min(1),
  sessionId: z.string().min(1).optional(),
  result: z.string().optional(),
  usage: usageSchema.optional(),
});

export const runFailedEventSchema = z.object({
  type: z.literal("run.failed"),
  runId: z.string().min(1),
  error: errorSchema,
});

export const runCancelledEventSchema = z.object({
  type: z.literal("run.cancelled"),
  runId: z.string().min(1),
  reason: z.string().min(1).optional(),
});

export const acpEventSchema = z.discriminatedUnion("type", [
  sessionStartedEventSchema,
  messageDeltaEventSchema,
  messageCompletedEventSchema,
  toolRequestedEventSchema,
  toolCompletedEventSchema,
  approvalRequestedEventSchema,
  runCompletedEventSchema,
  runFailedEventSchema,
  runCancelledEventSchema,
]);
