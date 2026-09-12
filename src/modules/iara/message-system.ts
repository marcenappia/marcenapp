export type IaraMessageRole = 'user' | 'iara' | 'system';
export type IaraMessageStatus = 'processing' | 'success' | 'error';

export type IaraMessageAction = {
  id: string;
  label: string;
  kind: 'smart-action' | 'artifact' | 'navigation';
  domain?: 'project' | 'production' | 'business' | 'execution';
  intent?: string;
  artifactType?: string;
};

export type IaraMessageArtifact = {
  type: string;
  id?: string;
  title?: string;
};

export type IaraMessage = {
  id: string;
  role: IaraMessageRole;
  text?: string;
  images?: string[];
  files?: string[];
  actions?: IaraMessageAction[];
  artifacts?: IaraMessageArtifact[];
  domain?: 'project' | 'production' | 'business' | 'execution';
  tool?: string;
  correlationId?: string;
  projectId?: string;
  status?: IaraMessageStatus;
  progress?: number;
  error?: string;
};

export type IaraSmartAction = {
  id: string;
  label: string;
  description: string;
  domain: 'project' | 'production' | 'business' | 'execution';
  intent: string;
};

export const IARA_SMART_ACTIONS: IaraSmartAction[] = [
  { id: 'project.analyze', label: 'Analisar ambiente', description: 'Leitura e inteligência do projeto', domain: 'project', intent: 'analisar ambiente' },
  { id: 'project.create', label: 'Criar projeto', description: 'Criar o projeto com as informações disponíveis', domain: 'project', intent: 'criar projeto' },
  { id: 'project.measurements', label: 'Conferir medidas', description: 'Validar medidas do projeto', domain: 'project', intent: 'conferir medidas' },
  { id: 'project.render', label: 'Gerar render', description: 'Preparar e gerar render técnico', domain: 'project', intent: 'gerar render' },
  { id: 'project.review', label: 'Revisar projeto', description: 'Revisão de qualidade do projeto', domain: 'project', intent: 'revisar projeto' },
  { id: 'production.materials', label: 'Materiais', description: 'Materiais e componentes do projeto', domain: 'production', intent: 'listar materiais' },
  { id: 'production.hardware', label: 'Ferragens', description: 'Ferragens necessárias', domain: 'production', intent: 'listar ferragens' },
  { id: 'production.cut', label: 'Plano de corte', description: 'Otimização e auditoria de corte', domain: 'production', intent: 'gerar plano de corte' },
  { id: 'production.inventory', label: 'Consultar estoque', description: 'Verificar disponibilidade', domain: 'production', intent: 'consultar estoque' },
  { id: 'production.production', label: 'Produção', description: 'Preparar dados para produção', domain: 'production', intent: 'preparar produção' },
  { id: 'business.budget', label: 'Orçamento', description: 'Calcular orçamento', domain: 'business', intent: 'gerar orçamento' },
  { id: 'business.documents', label: 'Documentos', description: 'Gerar documentos do projeto', domain: 'business', intent: 'gerar documentos' },
  { id: 'business.order', label: 'Pedido', description: 'Consultar e preparar pedido', domain: 'business', intent: 'preparar pedido' },
  { id: 'execution.assembly', label: 'Montagem', description: 'Preparar execução e montagem', domain: 'execution', intent: 'montagem' },
  { id: 'execution.installation', label: 'Instalação', description: 'Preparar instalação', domain: 'execution', intent: 'instalação' },
  { id: 'execution.checklist', label: 'Checklist', description: 'Checklist de execução', domain: 'execution', intent: 'checklist de execução' },
  { id: 'execution.delivery', label: 'Entrega', description: 'Organizar entrega', domain: 'execution', intent: 'entrega' },
];

export function createSmartActionInput(action: IaraSmartAction, projectId?: string): Record<string, unknown> {
  return { domain: action.domain, intent: action.intent, ...(projectId ? { projectId } : {}) };
}
