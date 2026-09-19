import { describe, it, expect, vi, beforeEach } from 'vitest';
import { persistIaraContext } from '@/modules/iara/services/iaraContext';

const update = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }));
const insert = vi.fn(() => Promise.resolve({ error: null }));
const select = vi.fn(() => ({
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(() => Promise.resolve({ data: { id: 'ctx-1' }, error: null })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(() => ({ select, update, insert })) },
}));

describe('IARA execution context persistence', () => {
  beforeEach(() => vi.clearAllMocks());

  it('persists the execution generation used by the render command', async () => {
    await persistIaraContext('u1', {
      clientId: null,
      clientName: null,
      projectId: 'p1',
      projectName: null,
      environmentId: 'e1',
      environmentName: null,
      versionId: 'v1',
      versionNumber: 1,
    }, 'corr-1', 7);

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      last_correlation_id: 'corr-1',
      last_execution_generation: 7,
    }));
  });
});
