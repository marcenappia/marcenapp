// Compatibility facade only. Canonical orchestration lives in @/lib/agents/orchestrator.
export {
  planWithLLM,
  runOrchestrator,
  runAgentPlan,
  runProjectJourney,
} from '@/lib/agents/orchestrator';
export type {
  ToolCall,
  OrchestratorPlan,
  OrchestratorRun,
  AgentPlanStep,
  AgentPlanResult,
} from '@/lib/agents/orchestrator';
