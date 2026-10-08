import { describe, expect, it, vi, beforeEach } from 'vitest';

const enqueueCommand = vi.fn((_command: unknown) => 'studio-new');
// Keep the mock observable to TypeScript even when Vitest infers an empty tuple from calls.
const dispatchCommand = vi.fn(() => 'os-new');
const project = { id: '11111111-1111-4111-8111-111111111111', nome: 'Cozinha', width: 2400, height: 2200, depth: 600, doors: 0, drawers: 0, modules: 1 };

vi.mock('@/services/ai', () => ({ callAIContractClause: vi.fn(), callAIText: vi.fn(async () => '{"confidence":0}') }));
vi.mock('@/modules/iara/services/planService', () => ({ analyzeFloorPlanAndQueueRender: vi.fn() }));
vi.mock('@/modules/iara/services/photoDestination', () => ({ attachIaraEnvironmentPhoto: vi.fn(async () => ({ environmentId: '22222222-2222-4222-8222-222222222222' })) }));
vi.mock('@/integrations/supabase/client', () => {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  Object.assign(chain, {
    select: vi.fn(self), eq: vi.fn(self), not: vi.fn(self), ilike: vi.fn(self), order: vi.fn(self), limit: vi.fn(self), in: vi.fn(self),
    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    single: vi.fn(async () => ({ data: project, error: null })),
    insert: vi.fn(self),
    then: (resolve: (value: unknown) => void) => resolve({ data: [], error: null }),
  });
  const environmentChain: Record<string, unknown> = {};
  const environmentSelf = () => environmentChain;
  Object.assign(environmentChain, {
    select: vi.fn(environmentSelf), eq: vi.fn(environmentSelf), order: vi.fn(environmentSelf), limit: vi.fn(environmentSelf),
    then: (resolve: (value: unknown) => void) => resolve({
      data: [{ metadata: { storage_path: 'user-a/project-a/ambiente.jpg' }, created_at: '2026-10-05T18:00:00Z' }],
      error: null,
    }),
  });
  const storage = {
    from: vi.fn(() => ({
      createSignedUrl: vi.fn(async () => ({ data: { signedUrl: 'https://signed.example/ambiente.jpg' }, error: null })),
    })),
  };
  return {
    supabase: {
      from: vi.fn((table: string) => table === 'project_environments' ? environmentChain : chain),
      storage,
    },
  };
});
vi.mock('@/store/useStudioStore', () => ({ useStudioStore: { getState: () => ({ enqueueCommand }) } }));
vi.mock('@/store/useMarcenappOS', () => ({ useMarcenappOS: { getState: () => ({ dispatchCommand }) } }));

describe('createProjeto with a reference photo', () => {
  beforeEach(() => { enqueueCommand.mockClear(); dispatchCommand.mockClear(); });

  it('queues the initial render for the new project without the previous project version', async () => {
    const { executeToolCall } = await import('@/core/toolRegistry');
    const result = await executeToolCall('createProjeto', { nome: 'Cozinha', width: 2400, height: 2200, depth: 600, confirmado: true }, {
      userId: 'user-a', projectId: 'old-project', environmentId: 'old-env', versionId: 'old-version', correlationId: 'corr-1', generation: 2, lastImageBase: 'base64-photo',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect((result.data as { renderStatus?: string }).renderStatus).toBe('queued');
    const firstDispatch = dispatchCommand.mock.calls[0];
    expect(firstDispatch).toBeDefined();
    const dispatchArgs = firstDispatch as unknown as [{ payload: Record<string, unknown> }];
    const payload = dispatchArgs[0].payload;
    expect(payload.projectId).toBe(project.id);
    expect(payload.environmentId).toBe('22222222-2222-4222-8222-222222222222');
    expect(payload).not.toHaveProperty('versionId');
  });
});


describe('gerarRender with a persisted environment photo', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    })));
  });

  it('recovers the durable environment image when chat has no image row', async () => {
    const { executeToolCall } = await import('@/core/toolRegistry');
    const result = await executeToolCall('gerarRender', { prompt: 'Renderize o móvel no ambiente atual.' }, {
      userId: 'user-a',
      projectId: 'project-a',
      environmentId: 'environment-a',
      correlationId: 'corr-persisted',
      generation: 1,
    });
    expect(result.ok).toBe(true);
    expect(enqueueCommand).toHaveBeenCalledTimes(1);
    const command = enqueueCommand.mock.calls[0]?.[0] as { images?: Array<{ data: string }> };
    expect(command.images?.length).toBe(1);
    expect(command.images?.[0]?.data).toBeTruthy();
    expect(dispatchCommand).toHaveBeenCalledTimes(1);
  });
});
