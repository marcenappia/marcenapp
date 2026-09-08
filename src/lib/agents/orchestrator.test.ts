import { describe, expect, it } from 'vitest';
import { agents, getAgent } from './registry';
import { runAgentPlan, runProjectJourney } from './orchestrator';

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
      { id: 'vision', agentId: 'vision', type: 'analyze', input: { photoUrl: 'photo.jpg' } },
      { id: 'perspective', agentId: 'perspective', type: 'analyze', input: { photoUrl: 'photo.jpg' } },
      { id: 'measurement', agentId: 'measurement', type: 'validate', input: { photoUrl: 'photo.jpg' } },
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
    expect(result.status).toBe('completed');
    expect(result.confidence).toBe(0);
    expect(result.warnings?.some((warning) => warning.includes('nenhuma medida foi inventada'))).toBe(true);
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

  it('executa a jornada completa quando o plano candidato passa pela auditoria geométrica', async () => {
    const result = await runProjectJourney({
      name: 'Cliente', clientId: '1', workName: 'Cozinha',
      photoUrl: 'photo.jpg', measurements: { width: 3000 },
      parts: [{ code: 'P1', width: 500, height: 700, quantity: 1 }],
      materials: [{ code: 'MDF-18', quantity: 2 }],
      cutPlan: [{ code: 'CH1', width: 2750, height: 1850, pieces: [
        { code: 'P1', x: 0, y: 0, width: 500, height: 700 },
      ] }],
      projectId: 'project-1', documentType: 'budget',
      scene: { type: 'kitchen' }, renderUrl: 'render.jpg',
      presentationId: 'presentation-1', approved: true, approvalId: 'approval-1',
      budgetId: 'budget-1',
    });
    expect(result.status).toBe('completed');
    expect(new Set(result.results.map((r) => r.correlationId)).size).toBe(1);
    expect(result.results).toHaveLength(20);
  });
});
