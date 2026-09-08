export type AgentId =
  | 'project'
  | 'measurement'
  | 'materials'
  | 'budget'
  | 'inventory'
  | 'production'
  | 'render'
  | 'customer'
  | 'order'
  | 'documents';

export type AgentTask = {
  id: string;
  type: string;
  input: Record<string, unknown>;
  correlationId: string;
};

export type AgentResult = {
  agentId: AgentId;
  taskId: string;
  correlationId: string;
  status: 'completed' | 'needs_input' | 'failed';
  data?: Record<string, unknown>;
  error?: string;
};

export type AgentDefinition = {
  id: AgentId;
  name: string;
  capabilities: string[];
  dependencies?: AgentId[];
  handle: (task: AgentTask) => Promise<AgentResult>;
};
