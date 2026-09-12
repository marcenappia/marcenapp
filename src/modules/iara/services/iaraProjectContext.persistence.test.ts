import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc },
}));

import { saveIaraProjectContext } from './iaraProjectContext';

describe('IARA project context persistence', () => {
  beforeEach(() => rpc.mockReset());

  it('sends only each execution delta so concurrent database merges can preserve both writes', async () => {
    rpc
      .mockResolvedValueOnce({ data: { project_id: 'project-a', summary: 'A', decisions: [{ action: 'render-a' }], artifacts: [], last_correlation_id: 'a' }, error: null })
      .mockResolvedValueOnce({ data: { project_id: 'project-a', summary: 'A2', decisions: [{ action: 'budget-b' }], artifacts: [], last_correlation_id: 'b' }, error: null });

    await Promise.all([
      saveIaraProjectContext('user-1', 'project-a', {
        summary: 'A',
        decisions: [{ action: 'render-a', domain: 'project', agent: 'IARA', at: '2026-09-12T08:00:00Z' }],
        artifacts: [],
        lastCorrelationId: 'a',
      }),
      saveIaraProjectContext('user-1', 'project-a', {
        summary: 'A2',
        decisions: [{ action: 'budget-b', domain: 'business', agent: 'ESTELA', at: '2026-09-12T08:00:01Z' }],
        artifacts: [],
        lastCorrelationId: 'b',
      }),
    ]);

    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc.mock.calls[0][0]).toBe('merge_iara_project_context');
    expect(rpc.mock.calls[1][0]).toBe('merge_iara_project_context');
    expect(rpc.mock.calls[0][1].p_decisions).toHaveLength(1);
    expect(rpc.mock.calls[1][1].p_decisions).toHaveLength(1);
    expect(rpc.mock.calls[0][1].p_project_id).toBe('project-a');
    expect(rpc.mock.calls[1][1].p_project_id).toBe('project-a');
  });
});
