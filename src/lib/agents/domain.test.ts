import { beforeEach, describe, expect, it, vi } from 'vitest';

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

vi.mock('@/core/orchestrator', () => ({ runOrchestrator: vi.fn() }));
import { runOrchestrator } from '@/core/orchestrator';

import { agents, getAgent } from './registry';
import { createDomainIntent, parseCreateProjectInput, resolveDomain, runIaraConversation } from './domain';

const { callAIText } = vi.hoisted(() => ({
  callAIText: vi.fn(async () => JSON.stringify({
    summary: 'Ambiente identificado.',
    findings: { walls: [{ reference: 'parede da direita' }] },
    confidence: 0.9,
    warnings: [],
    assumptions: [],
    evidence: [{ source: 'vision', value: 'parede da direita' }],
  })),
}));
vi.mock('@/services/ai', () => ({ callAIText }));

describe('IARA/YARA domain orchestration', () => {




  it('preserva exatamente os 20 agentes técnicos', () => {
    expect(agents).toHaveLength(20);
    expect(new Set(agents.map((agent) => agent.id)).size).toBe(20);
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

  it('reconhece criação de projeto com linguagem natural', () => {
    expect(createDomainIntent({ message: 'um projeto para mim de uma cozinha de 2,50 m por 1 m de 80 por 60 cm de profundidade na cor branca' })).toEqual({ domain: 'project', action: 'create_project', agent: 'IARA' });
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



});

describe('project text parsing regressions', () => {
  it('parses millimetre dimensions and explicit door count without confusing finish numbers', () => {
    expect(parseCreateProjectInput({ message: 'Crie este projeto 2500x2800x600 na cor branco TX 6 portas de abrir' })).toMatchObject({
      width: 2500,
      height: 2800,
      depth: 600,
      doors: 6,
      doorType: 'abrir',
      external_material: 'branco tx',
      confirmado: true,
    });
  });

  it('parses bare decimal furniture dimensions as metres', () => {
    expect(parseCreateProjectInput({ message: 'Crie um armário 2,50 x 2,80 x 0,60 com 6 portas de abrir' })).toMatchObject({
      width: 2500,
      height: 2800,
      depth: 600,
      doors: 6,
      doorType: 'abrir',
    });
  });
});


describe('current conversation orchestration contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes identity to the current orchestrator and preserves queued render artifacts', async () => {
    vi.mocked(runOrchestrator).mockResolvedValue({
      runId: 'run-render', plan: [{ tool: 'gerarRender', args: { prompt: 'Renderize esta cozinha' } }],
      summary: 'render', status: 'completed', usedFallback: false,
      results: [{ tool: 'gerarRender', result: { ok: true, data: { studioCommandId: 'command-1' } } }],
    });
    const result = await runIaraConversation({
      input: { message: 'Renderize esta cozinha' }, projectId: 'project-1', correlationId: 'corr-1',
      execution: { userId: 'user-1', projectId: 'project-1', lastImageBase: 'reference' },
    });
    expect(result.artifacts).toEqual([{ type: 'render', id: 'command-1', context: {
      projectId: 'project-1', environmentId: undefined, versionId: undefined, correlationId: 'corr-1',
    } }]);
    expect(runOrchestrator).toHaveBeenCalledTimes(1);
    expect(result.run.results[0].result.ok).toBe(true);
  });

  it('does not expose a successful artifact when the tool fails', async () => {
    vi.mocked(runOrchestrator).mockResolvedValue({
      runId: 'run-failed', plan: [], summary: 'failed', status: 'failed', usedFallback: false,
      results: [{ tool: 'gerarRender', result: { ok: false, error: 'provider unavailable' } }],
    });
    const result = await runIaraConversation({ input: { message: 'Renderize esta cozinha' }, execution: { userId: 'user-1' } });
    expect(result.artifacts).toEqual([]);
    expect(result.panel).toBeUndefined();
    expect(result.run.status).toBe('failed');
  });
});
