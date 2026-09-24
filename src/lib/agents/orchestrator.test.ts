import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/production/versionFreeze', () => ({
  freezeProductionPackage: vi.fn(async ({ projectId, versionId, technicalPackage }) => ({
    ok: true as const,
    freeze: {
      freezeId: 'freeze-test-1',
      projectId,
      versionId: versionId || 'approved-version-test',
      approvalId: 'approval-test-1',
      snapshotHash: 'test-hash',
      snapshot: { technicalPackage },
      createdAt: '2026-09-15T00:00:00.000Z',
    },
  })),
}));

import { agents, getAgent } from './registry';
import { runAgentPlan, runProjectJourney } from './orchestrator';

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

describe('MARCENAPP agents', () => {
  it('registra todos os especialistas da jornada comercial', () => {
    expect(agents).toHaveLength(20);
    expect(agents.map((a) => a.id)).toEqual([
      'customer', 'project', 'vision', 'perspective', 'measurement', 'measurement_prediction',
      'multiview', 'furniture_engineering', 'materials', 'cut_optimization', 'cut_audit',
      'render', 'quality', 'presentation', 'approval', 'inventory', 'production', 'budget',
      'documents', 'order',
    ]);
  });

  it('respeita dependências e compartilha resultados entre especialistas', async () => {
    const result = await runAgentPlan([
      { id: 'customer', agentId: 'customer', type: 'validate', input: { name: 'Cliente' } },
      { id: 'project', agentId: 'project', type: 'prepare', input: { clientId: '1', workName: 'Cozinha' } },
      { id: 'vision', agentId: 'vision', type: 'analyze', input: { photoUrl: 'photo.jpg', images: [{ mimeType: 'image/jpeg', data: 'base64-image' }] } },
      { id: 'perspective', agentId: 'perspective', type: 'analyze', input: { photoUrl: 'photo.jpg', images: [{ mimeType: 'image/jpeg', data: 'base64-image' }] } },
      { id: 'measurement', agentId: 'measurement', type: 'validate', input: { photoUrl: 'photo.jpg', images: [{ mimeType: 'image/jpeg', data: 'base64-image' }] } },
    ]);
    expect(result.status).toBe('completed');
    expect(result.results).toHaveLength(5);
    const perspective = result.results.find((r) => r.agentId === 'perspective');
    expect(perspective?.correlationId).toBe(result.correlationId);
  });

  it('não simula análise visual real nem inventa medidas', async () => {
    const result = await getAgent('vision').handle({
      id: 'vision-1', type: 'vision.environment.analyze', input: { photoUrl: 'photo.jpg' }, correlationId: 'test-correlation',
    });
    expect(result.status).toBe('needs_input');
    expect(result.confidence).toBe(0);
    expect(result.warnings?.some((warning) => warning.includes('nenhuma medida foi inventada'))).toBe(true);
    expect(result.blockers?.some((blocker) => blocker.includes('URL'))).toBe(true);
  });

  it('não simula sucesso quando faltam dados', async () => {
    const result = await getAgent('budget').handle({
      id: 'budget-1', type: 'budget.prepare', input: {}, correlationId: 'test-correlation',
    });
    expect(result.status).toBe('needs_input');
  });

  it('bloqueia orçamento sem aprovação', async () => {
    const result = await getAgent('budget').handle({
      id: 'budget-2', type: 'budget.prepare',
      input: { materials: [{ code: 'MDF-18', quantity: 2 }] }, correlationId: 'test-correlation',
    });
    expect(result.status).toBe('needs_input');
  });

  it('bloqueia conferência multivista sem imagem', async () => {
    const result = await getAgent('multiview').handle({
      id: 'multiview-1', type: 'multiview.reconcile', input: {}, correlationId: 'test-correlation',
    });
    expect(result.status).toBe('needs_input');
  });

  it('bloqueia produção sem versão aprovada', async () => {
    const result = await getAgent('production').handle({
      id: 'production-1', type: 'production.prepare', correlationId: 'test-correlation',
      input: {
        projectId: 'project-1', userId: 'user-test',
        parts: [{ code: 'P1', width: 500, height: 700, quantity: 1, material: 'MDF-18' }],
        cutPlan: [{ code: 'CH1', width: 2750, height: 1850, material: 'MDF-18', pieces: [{ code: 'P1', x: 0, y: 0, width: 500, height: 700 }] }],
      },
    });
    expect(result.status).toBe('needs_input');
    expect(result.blockers?.some((blocker) => blocker.includes('versão aprovada'))).toBe(true);
  });

  it('audita e bloqueia sobreposição de peças', async () => {
    const result = await getAgent('cut_audit').handle({
      id: 'cut-audit-1', type: 'cut.audit', correlationId: 'test-correlation',
      input: {
        parts: [{ code: 'P1', width: 500, height: 700, quantity: 2 }],
        cutPlan: [{ code: 'CH1', width: 2750, height: 1850, pieces: [
          { code: 'P1', x: 0, y: 0, width: 500, height: 700 },
          { code: 'P1', x: 400, y: 0, width: 500, height: 700 },
        ] }],
      },
    });
    expect(result.status).toBe('needs_input');
    expect(result.blockers?.some((blocker) => blocker.includes('Sobreposição'))).toBe(true);
  });

  it('aguarda a decisão do cliente e não libera a fabricação sem aprovação', async () => {
    const result = await runProjectJourney({
      name: 'Cliente', clientId: '1', workName: 'Cozinha',
      photoUrl: 'photo.jpg', images: [{ mimeType: 'image/jpeg', data: 'base64-image' }], measurements: { width: 3000 },
      parts: [{ code: 'P1', width: 500, height: 700, quantity: 1, material: 'MDF-18' }],
      materials: [{ code: 'MDF-18', quantity: 2 }],
      sheetTemplates: [{ id: 'CH1', width: 2750, height: 1850, material: 'MDF-18' }],
      cutPlan: [{ code: 'CH1', width: 2750, height: 1850, material: 'MDF-18', pieces: [
        { code: 'P1', x: 0, y: 0, width: 500, height: 700 },
      ] }],
      projectId: 'project-1', versionId: 'review-version-test', userId: 'user-test', documentType: 'budget',
      scene: { type: 'kitchen' }, renderUrl: 'render.jpg', presentationId: 'presentation-1', budgetId: 'budget-1',
    });
    expect(result.status).toBe('needs_input');
    expect(result.results.find((r) => r.agentId === 'approval')?.data?.clientDecision).toBe('pending');
    expect(result.results.some((r) => r.agentId === 'furniture_engineering')).toBe(false);
    expect(result.results.some((r) => r.agentId === 'production')).toBe(false);
  });

  it('retorna para revisão quando o cliente solicita alteração', async () => {
    const result = await runProjectJourney({
      name: 'Cliente', clientId: '1', workName: 'Cozinha',
      photoUrl: 'photo.jpg', measurements: { width: 3000 },
      parts: [{ code: 'P1', width: 500, height: 700, quantity: 1, material: 'MDF-18' }],
      sheetTemplates: [{ id: 'CH1', width: 2750, height: 1850, material: 'MDF-18' }],
      projectId: 'project-1', versionId: 'review-version-test', userId: 'user-test',
      scene: { type: 'kitchen' }, renderUrl: 'render.jpg', presentationId: 'presentation-1',
      clientDecision: 'changes_requested',
    });
    expect(result.status).toBe('needs_input');
    const approval = result.results.find((r) => r.agentId === 'approval');
    expect(approval?.data?.clientDecision).toBe('changes_requested');
    expect(approval?.data?.productionGate).toBe('closed');
    expect(result.results.some((r) => r.agentId === 'furniture_engineering')).toBe(false);
  });

  it('executa a jornada completa quando o cliente aprovou a versão', async () => {
    const result = await runProjectJourney({
      name: 'Cliente', clientId: '1', workName: 'Cozinha',
      photoUrl: 'photo.jpg', measurements: { width: 3000 },
      parts: [{ code: 'P1', width: 500, height: 700, quantity: 1, material: 'MDF-18' }],
      materials: [{ code: 'MDF-18', quantity: 2 }],
      sheetTemplates: [{ id: 'CH1', width: 2750, height: 1850, material: 'MDF-18' }],
      cutPlan: [{ code: 'CH1', width: 2750, height: 1850, material: 'MDF-18', pieces: [
        { code: 'P1', x: 0, y: 0, width: 500, height: 700 },
      ] }],
      projectId: 'project-1', versionId: 'approved-version-test', userId: 'user-test', documentType: 'budget',
      scene: { type: 'kitchen' }, renderUrl: 'render.jpg',
      presentationId: 'presentation-1', approved: true, approvalId: 'approval-1', budgetId: 'budget-1',
    });
    expect(result.status).toBe('completed');
    expect(new Set(result.results.map((r) => r.correlationId)).size).toBe(1);
    expect(result.results).toHaveLength(20);
    const approval = result.results.find((r) => r.agentId === 'approval');
    expect(approval?.data?.productionGate).toBe('open');
    const production = result.results.find((r) => r.agentId === 'production');
    expect(production?.data?.productionReady).toBe(true);
    expect(production?.data?.freezeId).toBe('freeze-test-1');
    expect(production?.data?.frozenVersionId).toBe('approved-version-test');
  });
});
