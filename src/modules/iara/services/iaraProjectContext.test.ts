import { describe, expect, it } from 'vitest';
import { mergeIaraProjectContext } from './iaraProjectContext';

describe('IARA project context', () => {
  it('recovers and extends the same project context without duplicating artifacts', () => {
    const previous = {
      projectId: 'project-a',
      summary: 'Projeto A',
      decisions: [{ action: 'render', domain: 'project', agent: 'IARA', at: '2026-09-12T01:00:00Z' }],
      artifacts: [{ type: 'render', id: 'render-1' }],
      lastCorrelationId: 'corr-1',
    };

    const next = mergeIaraProjectContext(previous, {
      summary: 'Projeto A atualizado',
      decisions: [{ action: 'budget', domain: 'business', agent: 'ESTELA', at: '2026-09-12T01:05:00Z' }],
      artifacts: [{ type: 'render', id: 'render-1' }, { type: 'budget', id: 'budget-1' }],
      lastCorrelationId: 'corr-2',
    });

    expect(next.summary).toBe('Projeto A atualizado');
    expect(next.decisions).toHaveLength(2);
    expect(next.artifacts).toEqual([
      { type: 'render', id: 'render-1' },
      { type: 'budget', id: 'budget-1' },
    ]);
    expect(next.lastCorrelationId).toBe('corr-2');
  });

  it('does not mix context when a different project has no prior state', () => {
    const next = mergeIaraProjectContext(null, {
      summary: 'Projeto B',
      decisions: [{ action: 'create_project', domain: 'project', agent: 'IARA', at: '2026-09-12T01:10:00Z' }],
      artifacts: [{ type: 'project', id: 'project-b' }],
      lastCorrelationId: 'corr-b',
    });

    expect(next.decisions).toEqual([
      { action: 'create_project', domain: 'project', agent: 'IARA', at: '2026-09-12T01:10:00Z' },
    ]);
    expect(next.artifacts).toEqual([{ type: 'project', id: 'project-b' }]);
    expect(next.decisions).not.toContainEqual(expect.objectContaining({ action: 'render' }));
  });

  it('keeps the context bounded', () => {
    const decisions = Array.from({ length: 55 }, (_, index) => ({ action: `action-${index}`, domain: 'project', agent: 'IARA', at: `2026-09-12T01:${String(index).padStart(2, '0')}:00Z` }));
    const next = mergeIaraProjectContext(null, { decisions, artifacts: [] });
    expect(next.decisions).toHaveLength(50);
    expect(next.decisions[0].action).toBe('action-5');
  });
});
