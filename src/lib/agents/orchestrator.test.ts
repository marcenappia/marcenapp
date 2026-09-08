import { describe, expect, it } from 'vitest';
import { agents, getAgent } from './registry';
import { runAgentPlan, runProjectJourney } from './orchestrator';

describe('MARCENAPP agents', () => {
  it('registra os 10 agentes da jornada', () => {
    expect(agents).toHaveLength(10);
    expect(agents.map((a) => a.id)).toEqual([
      'customer', 'project', 'measurement', 'materials', 'render',
      'inventory', 'production', 'budget', 'documents', 'order',
    ]);
  });

  it('respeita dependências e permite execução paralela quando pronta', async () => {
    const result = await runAgentPlan([
      { id: 'customer', agentId: 'customer', type: 'validate', input: { name: 'Cliente' } },
      { id: 'project', agentId: 'project', type: 'prepare', input: { clientId: '1', workName: 'Cozinha' } },
      { id: 'measurement', agentId: 'measurement', type: 'validate', input: { photoUrl: 'photo.jpg' } },
    ]);
    expect(result.status).toBe('completed');
    expect(result.results).toHaveLength(3);
  });

  it('não simula sucesso quando faltam dados', async () => {
    const result = await getAgent('budget').handle({
      id: 'budget-1', type: 'budget.prepare', input: {}, correlationId: 'test-correlation',
    });
    expect(result.status).toBe('needs_input');
  });

  it('executa a jornada completa com uma única correlação', async () => {
    const result = await runProjectJourney({
      name: 'Cliente', clientId: '1', workName: 'Cozinha',
      photoUrl: 'photo.jpg', measurements: { width: 3000 },
      parts: [{ code: 'P1', width: 500, height: 700 }],
      materials: [{ code: 'MDF-18', quantity: 2 }],
      projectId: 'project-1', documentType: 'budget',
    });
    expect(result.status).toBe('completed');
    expect(new Set(result.results.map((r) => r.correlationId)).size).toBe(1);
    expect(result.results).toHaveLength(10);
  });
});
