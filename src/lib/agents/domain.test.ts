import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/production/versionFreeze', () => ({
  freezeProductionPackage: vi.fn(async ({ projectId, versionId, technicalPackage }) => ({
    ok: true as const,
    freeze: {
      freezeId: 'freeze-domain-test-1',
      projectId,
      versionId: versionId || 'approved-version-domain-test',
      approvalId: 'approval-domain-test-1',
      snapshotHash: 'domain-test-hash',
      snapshot: { technicalPackage },
      createdAt: '2026-09-15T00:00:00.000Z',
    },
  })),
}));

import { agents, getAgent } from './registry';
import { createDomainIntent, domainAgents, domainAgentRegistry, parseCreateProjectInput, resolveDomain, runDomainPlan } from './domain';
import { runProjectJourney } from './orchestrator';

const baseInput = {
  name: 'Cliente', clientId: 'client-1', workName: 'Cozinha', projectId: 'project-1', userId: 'user-1', versionId: 'version-1',
  photoUrl: 'photo.jpg', measurements: { width: 3000 },
  parts: [{ code: 'P1', width: 500, height: 700, quantity: 1, material: 'MDF-18' }],
  materials: [{ code: 'MDF-18', quantity: 2 }],
  sheetTemplates: [{ id: 'CH1', width: 2750, height: 1850, material: 'MDF-18' }],
  cutPlan: [{ code: 'CH1', width: 2750, height: 1850, material: 'MDF-18', pieces: [{ code: 'P1', x: 0, y: 0, width: 500, height: 700 }] }],
  scene: { type: 'kitchen' }, renderUrl: 'render.jpg', presentationId: 'presentation-1', approved: true,
  approvalId: 'approval-1', budgetId: 'budget-1', documentType: 'budget',
};

describe('IARA/YARA domain orchestration', () => {
  it('encaminha projeto para Inteligência do Projeto e usa agentes existentes', async () => {
    const response = await runDomainPlan({ input: { ...baseInput, intent: 'analisar o projeto e as medidas' }, correlationId: 'iara-project' });
    expect(response.orchestrator).toBe('IARA');
    expect(response.domain).toBe('project');
    expect(response.domainAgent).toBe('IARA');
    expect(response.plan.results.some((result) => result.agentId === 'furniture_engineering')).toBe(true);
  });

  it('encaminha materiais/corte para BENTO', async () => {
    const response = await runDomainPlan({ input: { ...baseInput, intent: 'calcular MDF e corte' }, correlationId: 'iara-bento' });
    expect(response.domain).toBe('production');
    expect(response.domainAgent).toBe('BENTO');
    expect(response.plan.results.some((result) => result.agentId === 'materials')).toBe(true);
    expect(response.plan.results.some((result) => result.agentId === 'cut_audit')).toBe(true);
  });

  it('encaminha orçamento/documentação/pedido para ESTELA', async () => {
    const response = await runDomainPlan({ input: { ...baseInput, intent: 'calcular orçamento e preparar documentos' }, correlationId: 'iara-estela' });
    expect(response.domain).toBe('business');
    expect(response.domainAgent).toBe('ESTELA');
    expect(response.plan.results.some((result) => result.agentId === 'budget')).toBe(true);
  });

  it('reconhece JUCA sem inventar especialista técnico de montagem', async () => {
    const response = await runDomainPlan({ input: { projectId: 'project-1', intent: 'montagem e instalação' }, correlationId: 'iara-juca' });
    expect(response.domain).toBe('execution');
    expect(response.domainAgent).toBe('JUCA');
    expect(domainAgentRegistry.execution.technicalAgents).toEqual([]);
    expect(response.plan.status).toBe('completed');
  });

  it('preserva exatamente os 20 agentes técnicos', () => {
    expect(agents).toHaveLength(20);
    expect(new Set(agents.map((agent) => agent.id)).size).toBe(20);
  });

  it('não duplica agentes técnicos no mapa de domínio', () => {
    const mapped = domainAgents.flatMap((domain) => domain.technicalAgents);
    expect(new Set(mapped).size).toBe(mapped.length);
    expect(mapped).toHaveLength(20);
  });

  it('resolve domínios explícitos e por intenção', () => {
    expect(resolveDomain({ input: { domain: 'production' } })).toBe('production');
    expect(resolveDomain({ input: { message: 'quanto devo cobrar neste móvel?' } })).toBe('business');
    expect(resolveDomain({ input: { message: 'preciso instalar e entregar' } })).toBe('execution');
    expect(resolveDomain({ input: { message: 'analise as fotos da cozinha' } })).toBe('project');
  });

  it('mapeia ações rápidas para o domínio sem expor especialista técnico', () => {
    expect(createDomainIntent({ domain: 'project', action: 'project.render' }, 'gerar render')).toEqual({ domain: 'project', action: 'render', agent: 'IARA' });
    expect(createDomainIntent({ domain: 'production', action: 'production.hardware' }, 'listar ferragens')).toEqual({ domain: 'production', action: 'hardware', agent: 'BENTO' });
    expect(createDomainIntent({ domain: 'business', action: 'business.budget' }, 'gerar orçamento')).toEqual({ domain: 'business', action: 'budget', agent: 'ESTELA' });
    expect(createDomainIntent({ domain: 'execution', action: 'execution.delivery' }, 'entrega')).toEqual({ domain: 'execution', action: 'delivery', agent: 'JUCA' });
  });

  it('reconhece criação de projeto somente por texto e normaliza metros para milímetros', () => {
    expect(createDomainIntent({ message: 'Crie um armário de 2,40m x 2,20m x 0,60m com 4 portas e 3 gavetas' })).toEqual({ domain: 'project', action: 'create_project', agent: 'IARA' });
    expect(parseCreateProjectInput({ message: 'Crie um armário de 2,40m x 2,20m x 0,60m com 4 portas e 3 gavetas' })).toMatchObject({
      width: 2400,
      height: 2200,
      depth: 600,
      confirmado: true,
    });
  });

  it('não cria projeto sem as três dimensões explícitas', () => {
    expect(parseCreateProjectInput({ message: 'Crie um armário de 2,40m de largura' })).toBeUndefined();
  });

  it('preserva as dependências registradas dos especialistas', () => {
    expect(getAgent('materials').dependencies).toEqual(['furniture_engineering', 'approval']);
    expect(getAgent('cut_audit').dependencies).toEqual(['cut_optimization']);
    expect(getAgent('budget').dependencies).toEqual(['materials', 'inventory', 'cut_audit', 'approval']);
  });

  it('propaga correlationId, evidências e bloqueadores pelo contrato existente', async () => {
    const response = await runDomainPlan({ input: { ...baseInput, intent: 'calcular MDF e corte' }, correlationId: 'trace-domain' });
    expect(response.plan.correlationId).toBe('trace-domain');
    expect(response.plan.results.every((result) => result.correlationId === 'trace-domain')).toBe(true);
    expect(response.plan.results.some((result) => result.warnings !== undefined)).toBe(true);
  });

  it('mantém o contrato de artefato/painel preparado para a UI contextual', async () => {
    const response = await runDomainPlan({ input: { ...baseInput, intent: 'gerar render', artifactId: 'render-1' }, correlationId: 'ui-contract' });
    expect(response.artifacts).toEqual([{ type: 'render', id: 'render-1', context: { projectId: 'project-1', environmentId: undefined, versionId: undefined, correlationId: 'ui-contract' } }]);
    expect(response.panel).toEqual({ type: 'render' });
    expect(response.projectId).toBe('project-1');
  });

  it('não altera o comportamento da jornada técnica existente', async () => {
    const result = await runProjectJourney(baseInput);
    expect(result.status).toBe('completed');
    expect(result.results).toHaveLength(20);
    expect(new Set(result.results.map((result) => result.correlationId)).size).toBe(1);
  });
});
