import { createAgent } from './factory';
import { createSpatialAgent } from './spatialAgent';
import { createProductionAgent } from './productionAgent';
import type { AgentDefinition, AgentId } from './types';

export const agents: AgentDefinition[] = [
  createAgent('customer', 'Agente de Cliente', ['customer.create', 'customer.get']),
  createAgent('project', 'Agente de Projeto', ['project.create', 'project.update', 'project.get'], ['customer']),
  createSpatialAgent('vision', 'Agente de Visão e Leitura do Ambiente', ['vision.environment.analyze', 'vision.openings.detect', 'vision.obstacles.detect']),
  createSpatialAgent('perspective', 'Agente de Perspectiva e Geometria', ['vision.perspective.analyze', 'geometry.vanishing_points', 'geometry.scene_planes'], ['vision']),
  createSpatialAgent('measurement', 'Agente de Medidas', ['measurement.analyze', 'measurement.validate'], ['perspective']),
  createSpatialAgent('measurement_prediction', 'Agente de Predição de Medidas', ['measurement.predict', 'measurement.calibrate', 'measurement.uncertainty'], ['measurement', 'perspective']),
  createSpatialAgent('multiview', 'Agente de Conferência Multivista', ['multiview.reconcile', 'multiview.conflict.detect', 'multiview.consistency.validate'], ['vision', 'perspective', 'measurement_prediction']),
  createSpatialAgent('furniture_engineering', 'Agente de Engenharia do Móvel', ['furniture.engineer', 'furniture.clearances.validate', 'furniture.hardware.validate'], ['multiview', 'approval']),
  createAgent('materials', 'Agente de Materiais', ['materials.normalize', 'materials.map'], ['furniture_engineering', 'approval']),
  createAgent('cut_optimization', 'Agente de Otimização de Chapa e Corte', ['cut.optimize', 'cut.kerf', 'cut.grain', 'cut.sheet.utilization'], ['materials', 'measurement', 'furniture_engineering', 'approval']),
  createAgent('cut_audit', 'Agente Auditor de Corte', ['cut.audit', 'cut.coverage.validate', 'cut.overlap.validate', 'cut.dimensions.validate'], ['cut_optimization']),
  createSpatialAgent('render', 'Agente de Render Técnico', ['render.scene.prepare', 'render.generate', 'render.from.validated.package'], ['multiview']),
  createAgent('quality', 'Agente de Qualidade', ['quality.validate', 'quality.blockers'], ['measurement', 'render']),
  createAgent('presentation', 'Agente de Apresentação', ['presentation.prepare', 'presentation.generate'], ['customer', 'project', 'render', 'quality']),
  createAgent('approval', 'Agente de Aprovação', ['approval.request', 'approval.record'], ['customer', 'presentation', 'quality']),
  createAgent('inventory', 'Agente de Estoque', ['inventory.check'], ['materials', 'approval']),
  createProductionAgent(['materials', 'measurement', 'cut_audit', 'approval', 'budget', 'order']),
  createAgent('budget', 'Agente de Orçamento', ['estimate.materials', 'estimate.calculate', 'estimate.generate', 'cortecloud.quote.prepare'], ['materials', 'inventory', 'cut_audit', 'approval']),
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
