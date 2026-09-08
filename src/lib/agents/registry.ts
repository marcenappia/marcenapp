import { createAgent } from './factory';
import type { AgentDefinition, AgentId } from './types';

export const agents: AgentDefinition[] = [
  createAgent('customer', 'Agente de Cliente', ['customer.create', 'customer.get']),
  createAgent('project', 'Agente de Projeto', ['project.create', 'project.update', 'project.get'], ['customer']),
  createAgent('measurement', 'Agente de Medidas', ['measurement.analyze', 'measurement.validate'], ['project']),
  createAgent('materials', 'Agente de Materiais', ['materials.normalize', 'materials.map'], ['project', 'measurement']),
  createAgent('render', 'Agente de Render', ['render.scene.prepare', 'render.generate'], ['project', 'measurement']),
  createAgent('quality', 'Agente de Qualidade', ['quality.validate', 'quality.blockers'], ['measurement', 'materials', 'render']),
  createAgent('presentation', 'Agente de Apresentação', ['presentation.prepare', 'presentation.generate'], ['customer', 'project', 'render', 'quality']),
  createAgent('approval', 'Agente de Aprovação', ['approval.request', 'approval.record'], ['customer', 'presentation', 'quality']),
  createAgent('inventory', 'Agente de Estoque', ['inventory.check'], ['materials']),
  createAgent('production', 'Agente de Produção', ['production.cutlist.generate'], ['materials', 'measurement']),
  createAgent('budget', 'Agente de Orçamento', ['estimate.materials', 'estimate.calculate', 'estimate.generate', 'cortecloud.quote.prepare'], ['materials', 'inventory', 'production', 'approval']),
  createAgent('documents', 'Agente de Documentos', ['document.generate'], ['budget', 'customer']),
  createAgent('order', 'Agente de Pedido', ['order.get', 'order.update'], ['project', 'customer', 'budget', 'approval']),
];

export const agentRegistry: Record<AgentId, AgentDefinition> = Object.fromEntries(
  agents.map((agent) => [agent.id, agent]),
) as Record<AgentId, AgentDefinition>;

export function getAgent(id: AgentId): AgentDefinition {
  const agent = agentRegistry[id];
  if (!agent) throw new Error(`Agente não registrado: ${id}`);
  return agent;
}
