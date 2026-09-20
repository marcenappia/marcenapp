import type { PendingSlot } from "../intent/types";
import type { Result } from "../types";

export type ToolCall = {
  tool: string;
  args: Record<string, unknown>;
};

export type ExecutionResult = {
  tool: string;
  result: Result<unknown>;
};

export type ConversationState =
  | { status: "idle" }
  | { status: "planning" }
  | { status: "needs_input"; pendingSlot: PendingSlot }
  | { status: "executing"; plan: ToolCall[] }
  | { status: "completed"; results: ExecutionResult[] }
  | { status: "failed"; error: string };

export type ConversationEvent =
  | { type: "user_message_received" }
  | {
      type: "intent_resolved";
      missingSlots: PendingSlot["missing"];
      tool: string;
      args: Record<string, unknown>;
    }
  | { type: "slot_filled"; plan: ToolCall[] }
  | { type: "execution_finished"; results: ExecutionResult[] }
  | { type: "reset" };

export function transition(
  current: ConversationState,
  event: ConversationEvent,
): ConversationState {
  switch (event.type) {
    case "user_message_received":
      return { status: "planning" };
    case "intent_resolved":
      return event.missingSlots.length
        ? {
            status: "needs_input",
            pendingSlot: {
              tool: event.tool,
              args: event.args,
              missing: event.missingSlots,
            },
          }
        : {
            status: "executing",
            plan: [{ tool: event.tool, args: event.args }],
          };
    case "slot_filled":
      return { status: "executing", plan: event.plan };
    case "execution_finished": {
      const failed = event.results.some(({ result }) => !result.ok);
      return failed
        ? { status: "failed", error: "A execução não foi concluída." }
        : { status: "completed", results: event.results };
    }
    case "reset":
      return { status: "idle" };
  }
}

export function fillPendingSlot(
  pendingSlot: PendingSlot,
  field: string,
  value: unknown,
): PendingSlot {
  return {
    ...pendingSlot,
    args: { ...pendingSlot.args, [field]: value },
    missing: pendingSlot.missing.filter((slot) => slot.field !== field),
  };
}

export const isReadyToExecute = (pendingSlot: PendingSlot) =>
  pendingSlot.missing.length === 0;
