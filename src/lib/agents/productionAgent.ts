import type { AgentDefinition, AgentResult, AgentTask } from './types';
import { validateProductionPackage } from '@/lib/production/packageValidation';
import { buildWorkshopPacket } from '@/lib/production/workshopPacket';
import { freezeProductionPackage } from '@/lib/production/versionFreeze';
import { supabase } from '@/integrations/supabase/client';

function asRecords(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object')) : [];
}

export function createProductionAgent(dependencies: AgentDefinition['id'][] = ['materials', 'measurement', 'cut_audit']): AgentDefinition {
  return {
    id: 'production',
    name: 'Agente de Produção',
    capabilities: ['production.cutlist.generate', 'production.workshop.packet', 'production.traceability'],
    dependencies,
    async handle(task: AgentTask): Promise<AgentResult> {
      const parts = asRecords(task.input.parts);
      const cutPlan = asRecords(task.input.cutPlan);
      const bom = asRecords(task.input.bom);
      if (!parts.length || !cutPlan.length) {
        return { agentId: 'production', taskId: task.id, correlationId: task.correlationId, status: 'needs_input', data: { productionReady: false }, blockers: ['Produção bloqueada: peças e plano de corte validados são obrigatórios.'] };
      }

      const projectId = typeof task.input.projectId === 'string' ? task.input.projectId : '';
      const userId = typeof task.input.userId === 'string' ? task.input.userId : (await supabase.auth.getUser()).data.user?.id ?? '';
      if (!projectId || !userId) {
        return { agentId: 'production', taskId: task.id, correlationId: task.correlationId, status: 'needs_input', data: { productionReady: false }, blockers: ['Produção bloqueada: projeto e sessão do usuário são obrigatórios.'] };
      }

      const validation = validateProductionPackage(parts, cutPlan, bom);
      if (!validation.valid) {
        return { agentId: 'production', taskId: task.id, correlationId: task.correlationId, status: 'needs_input', data: { productionReady: false, validation }, blockers: validation.blockers };
      }

      const workshopPacket = buildWorkshopPacket({
        projectId,
        environmentId: typeof task.input.environmentId === 'string' ? task.input.environmentId : undefined,
        versionId: typeof task.input.versionId === 'string' ? task.input.versionId : undefined,
        correlationId: task.correlationId,
        furnitureId: typeof task.input.furnitureId === 'string' ? task.input.furnitureId : undefined,
        furnitureName: typeof task.input.furnitureName === 'string' ? task.input.furnitureName : typeof task.input.workName === 'string' ? task.input.workName : undefined,
        parts,
        cutPlan,
        bom,
        modules: asRecords(task.input.modules),
      });

      const freeze = await freezeProductionPackage({
        projectId,
        userId,
        versionId: typeof task.input.versionId === 'string' ? task.input.versionId : undefined,
        environmentId: typeof task.input.environmentId === 'string' ? task.input.environmentId : undefined,
        correlationId: task.correlationId,
        technicalPackage: {
          validation,
          parts,
          cutPlan,
          bom,
          modules: asRecords(task.input.modules),
          workshopPacket,
        },
      });
      if (!freeze.ok) {
        return { agentId: 'production', taskId: task.id, correlationId: task.correlationId, status: 'needs_input', data: { productionReady: false, validation, workshopPacket }, blockers: [freeze.error] };
      }

      const frozenPackage = freeze.freeze.snapshot.technicalPackage && typeof freeze.freeze.snapshot.technicalPackage === 'object'
        ? freeze.freeze.snapshot.technicalPackage as Record<string, unknown>
        : {};

      return {
        agentId: 'production',
        taskId: task.id,
        correlationId: task.correlationId,
        status: 'completed',
        data: {
          stage: 'production',
          productionReady: true,
          cutListReady: true,
          validation: frozenPackage.validation ?? validation,
          workshopPacket: frozenPackage.workshopPacket ?? workshopPacket,
          cutPlan: frozenPackage.cutPlan ?? cutPlan,
          bom: frozenPackage.bom ?? bom,
          parts: frozenPackage.parts ?? parts,
          modules: frozenPackage.modules ?? asRecords(task.input.modules),
          freezeId: freeze.freeze.freezeId,
          frozenVersionId: freeze.freeze.versionId,
          approvalId: freeze.freeze.approvalId,
          productionSnapshotHash: freeze.freeze.snapshotHash,
          productionFrozenAt: freeze.freeze.createdAt,
        },
      };
    },
  };
}
