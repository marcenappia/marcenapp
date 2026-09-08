export type AgentId =
  | 'customer'
  | 'project'
  | 'vision'
  | 'perspective'
  | 'measurement'
  | 'measurement_prediction'
  | 'multiview'
  | 'furniture_engineering'
  | 'materials'
  | 'cut_optimization'
  | 'cut_audit'
  | 'render'
  | 'quality'
  | 'presentation'
  | 'approval'
  | 'inventory'
  | 'production'
  | 'budget'
  | 'documents'
  | 'order';

export type Evidence = {
  source: string;
  value?: unknown;
  note?: string;
};

export type AgentTask = {
  id: string;
  type: string;
  input: Record<string, unknown>;
  correlationId: string;
  context?: {
    originalInput: Record<string, unknown>;
    dependencyResults: AgentResult[];
    evidence: Evidence[];
  };
};

export type AgentResult = {
  agentId: AgentId;
  taskId: string;
  correlationId: string;
  status: 'completed' | 'needs_input' | 'failed';
  data?: Record<string, unknown>;
  confidence?: number;
  evidence?: Evidence[];
  warnings?: string[];
  blockers?: string[];
  assumptions?: string[];
  error?: string;
};

export type AgentDefinition = {
  id: AgentId;
  name: string;
  capabilities: string[];
  dependencies?: AgentId[];
  handle: (task: AgentTask) => Promise<AgentResult>;
};
