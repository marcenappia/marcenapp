import { createAgent } from './factory';
import type { AgentDefinition, AgentId } from './types';

export const agents: AgentDefinition[] = [
  createAgent('customer', 'Agente de Cliente', ['customer.create', 'customer.get']),
  createAgent('project', 'Agente de Projeto', ['project.create', 'project.update', 'project.get'], ['customer']),
  createAgent('vision', 'Agente de Visão e Leitura do Ambiente', ['vision.environment.analyze', 'vision.openings.detect', 'vision.obstacles.detect'], ['project']),
  createAgent('perspective', 'Agente de Perspectiva e Geometria', ['vision.perspective.analyze', 'geometry.vanishing_points', 'geometry.scene_planes'], ['vision']),
  createAgent('measurement', 'Agente de Medidas', ['measurement.analyze', 'measurement.validate'], ['perspective']),
  createAgent('measurement_prediction', 'Agente de Predição de Medidas', ['measurement.predict', 'measurement.calibrate', 'measurement.uncertainty'], ['measurement', 'perspective']),
  createAgent('multiview', 'Agente de Conferência Multivista', ['multiview.reconcile', 'multiview.conflict.detect', 'multiview.consistency.validate'], ['vision', 'perspective', 'measurement_prediction']),
  createAgent('furniture_engineering', 'Agente de Engenharia do Móvel', ['furniture.engineer', 'furniture.clearances.validate', 'furniture.hardware.validate'], ['multiview']),
  createAgent('materials', 'Agente de Materiais', ['materials.normalize', 'materials.map'], ['furniture_engineering']),
  createAgent('cut_optimization', 'Agente de Otimização de Chapa e Corte', ['cut.optimize', 'cut.kerf', 'cut.grain', 'cut.sheet.utilization'], ['materials', 'measurement', 'furniture_engineering']),
  createAgent('cut_audit', 'Agente Auditor de Corte', ['cut.audit', 'cut.coverage.validate', 'cut.overlap.validate', 'cut.dimensions.validate'], ['cut_optimization']),
  createAgent('render', 'Agente de Render Técnico', ['render.scene.prepare', 'render.generate', 'render.from.validated.package'], ['multiview', 'furniture_engineering', 'materials']),
  createAgent('quality', 'Agente de Qualidade', ['quality.validate', 'quality.blockers'], ['measurement', 'materials', 'render', 'cut_audit']),
  createAgent('presentation', 'Agente de Apresentação', ['presentation.prepare', 'presentation.generate'], ['customer', 'project', 'render', 'quality']),
  createAgent('approval', 'Agente de Aprovação', ['approval.request', 'approval.record'], ['customer', 'presentation', 'quality']),
  createAgent('inventory', 'Agente de Estoque', ['inventory.check'], ['materials']),
  createAgent('production', 'Agente de Produção', ['production.cutlist.generate'], ['materials', 'measurement', 'cut_audit']),
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
