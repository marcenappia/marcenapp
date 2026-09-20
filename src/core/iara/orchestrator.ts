import type { ExecutionContext, Result } from "./types";
import type { ConversationContext, PendingSlot } from "./intent/types";
import { resolveIntent, type ResolverChainConfig } from "./intent/resolverChain";
import {
  transition,
  fillPendingSlot,
  isReadyToExecute,
  type ConversationState,
} from "./conversation/stateMachine";
import {
  executePlan,
  type ToolCall,
} from "./tools/registry";
import type { TraceSink } from "./observability/tracing";
import { traceEvent } from "./observability/tracing";

export interface RunIaraTurnParams {
  text: string;
  images?: { mimeType: string; data: string }[];
  conversation: ConversationContext;
  execution: ExecutionContext;
}

export interface IaraOrchestratorDeps {
  resolverChain: ResolverChainConfig;
  traceSink: TraceSink;
}

export interface IaraTurnResult {
  state: ConversationState;
  results: Array<{ tool: string; result: Result<unknown> }>;
  userFacingMessage: string;
}

function fill(pendingSlot: PendingSlot, text: string): PendingSlot {
  const slot = pendingSlot.missing[0];
  if (!slot) return pendingSlot;

  const number = Number(text.replace(",", "."));
  if (!Number.isFinite(number)) return pendingSlot;

  return fillPendingSlot(pendingSlot, slot.field, number);
}

export async function runIaraTurn(
  params: RunIaraTurnParams,
  current: ConversationState,
  deps: IaraOrchestratorDeps,
): Promise<IaraTurnResult> {
  await deps.traceSink.record(
    traceEvent(params.execution.correlationId, "turn.started", {
      text: params.text,
    }),
  );

  if (current.status === "needs_input") {
    const next = fill(current.pendingSlot, params.text);

    if (!isReadyToExecute(next)) {
      return {
        state: { status: "needs_input", pendingSlot: next },
        results: [],
        userFacingMessage:
          next.missing[0]?.label ?? "Preciso de mais uma informação.",
      };
    }

    const plan: ToolCall[] = [
      { tool: next.tool, args: { ...next.args, confirmado: true } },
    ];
    const state = transition(current, { type: "slot_filled", plan });
    return finish(plan, state, params.execution, deps);
  }

  const resolved = await resolveIntent(
    {
      text: params.text,
      images: params.images,
      context: params.conversation,
      correlationId: params.execution.correlationId,
    },
    deps.resolverChain,
  );

  await deps.traceSink.record(
    traceEvent(params.execution.correlationId, "intent.resolved", {
      intent: resolved.intent,
      source: resolved.source,
      confidence: resolved.confidence,
    }),
  );

  const toolByIntent: Record<string, string> = {
    create_cliente: "createCliente",
    create_projeto: "createProjeto",
    gerar_render: "gerarRender",
    calcular_orcamento: "calcularOrcamento",
    gerar_contrato: "gerarContrato",
    operational_intelligence: "operationalIntelligence",
    smart_action: "iaraSmartAction",
  };
  const tool = toolByIntent[resolved.intent];

  if (!tool) {
    const message = resolved.summary ?? "Não entendi o pedido.";
    return {
      state: { status: "failed", error: message },
      results: [],
      userFacingMessage: message,
    };
  }

  const next = transition(current, {
    type: "intent_resolved",
    tool,
    args: resolved.entities,
    missingSlots: resolved.missingSlots,
  });

  if (next.status === "needs_input") {
    return {
      state: next,
      results: [],
      userFacingMessage:
        next.pendingSlot.missing[0]?.label ?? "Preciso de uma informação.",
    };
  }

  return finish(next.plan, next, params.execution, deps);
}

async function finish(
  plan: ToolCall[],
  state: ConversationState,
  context: ExecutionContext,
  deps: IaraOrchestratorDeps,
): Promise<IaraTurnResult> {
  await deps.traceSink.record(
    traceEvent(context.correlationId, "plan.executing", { plan }),
  );

  const results = await executePlan(plan, context);
  const final = transition(state, {
    type: "execution_finished",
    results,
  });

  await deps.traceSink.record(
    traceEvent(context.correlationId, "turn.finished", {
      status: final.status,
    }),
  );

  return {
    state: final,
    results,
    userFacingMessage:
      final.status === "completed"
        ? "Pronto."
        : "Não foi possível concluir esta etapa.",
  };
}
