import type { AcpCommand, AcpEvent } from "./types.js";
import { acpCommandSchema, acpEventSchema } from "./schemas.js";

export function parseAcpCommand(value: unknown): AcpCommand {
  const result = acpCommandSchema.safeParse(value);
  if (!result.success) {
    throw new Error(`Invalid ACP command: ${result.error.message}`);
  }
  return result.data as AcpCommand;
}

export function parseAcpEvent(value: unknown): AcpEvent {
  const result = acpEventSchema.safeParse(value);
  if (!result.success) {
    throw new Error(`Invalid ACP event: ${result.error.message}`);
  }
  return result.data as AcpEvent;
}
