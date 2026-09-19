import { render, act as renderAct } from '@testing-library/react';
import { StudioWorker } from '@/modules/ambientes/components/StudioWorker';
import { useStudioStore } from '@/store/useStudioStore';
import { useMarcenappOS } from '@/store/useMarcenappOS';
import { studioService } from '@/modules/ambientes/services/studioService';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(() => ({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), maybeSingle: vi.fn(() => Promise.resolve({ data: { project_id: null, environment_id: null, version_id: null, last_correlation_id: null, last_execution_generation: null }, error: null })), insert: vi.fn(() => Promise.resolve({ error: null })) })) }
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/modules/ambientes/services/studioService', () => ({ studioService: { generateVisual: vi.fn() } }));

describe('IARA-Studio Architecture', () => {
  beforeEach(() => { vi.clearAllMocks(); useStudioStore.getState().clearQueue(); useStudioStore.setState({ isRendering: false }); useMarcenappOS.getState().clearHistory(); });
  const dispatchRender = (images?: { mimeType: string; data: string }[], correlationId = 'corr-test') => {
    const studioId = useStudioStore.getState().enqueueCommand({ prompt: 'Test', images, metadata: { origin: 'iara', originalPrompt: 'Test', targetModule: 'studio' } });
    const osId = useMarcenappOS.getState().dispatchCommand({ source: 'iara', target: 'studio', action: 'GENERATE_VISUAL', payload: { prompt: 'Test', studioCommandId: studioId, userId: 'u1', projectId: 'A', environmentId: 'E1', versionId: 'V1', correlationId, generation: 1 } });
    return { studioId, osId };
  };

  it('StudioWorker executes commands from the queue and syncs both stores', async () => {
    vi.mocked(studioService.generateVisual).mockResolvedValue('url1');
    const from = vi.mocked((await import('@/integrations/supabase/client')).supabase.from);
    from.mockImplementation(() => ({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), maybeSingle: vi.fn(() => Promise.resolve({ data: { project_id: 'A', environment_id: 'E1', version_id: 'V1', last_correlation_id: 'corr-test', last_execution_generation: 1 }, error: null })), insert: vi.fn(() => Promise.resolve({ error: null })) }) as never);
    let ids: { studioId: string; osId: string } = { studioId: '', osId: '' };
    renderAct(() => { ids = dispatchRender([{ mimeType: 'image/png', data: 'abc' }]); });
    render(<StudioWorker />);
    await renderAct(async () => { await new Promise(r => setTimeout(r, 100)); });
    const studioCmd = useStudioStore.getState().commandQueue.find(c => c.id === ids.studioId);
    const osCmd = useMarcenappOS.getState().commandHistory.find(c => c.id === ids.osId);
    expect(studioCmd?.status).toBe('completed');
    expect(osCmd?.status).toBe('completed');
    expect(osCmd?.result?.resultUrl).toBe('url1');
    expect(studioService.generateVisual).toHaveBeenCalledTimes(1);
    expect(vi.mocked(studioService.generateVisual).mock.calls[0]?.[1]).toEqual([{ mimeType: 'image/png', data: 'abc' }]);
  });

  it('IARA render executes while the user remains in the conversation module', async () => {
    vi.mocked(studioService.generateVisual).mockResolvedValue('url-from-chat');
    const from = vi.mocked((await import('@/integrations/supabase/client')).supabase.from);
    from.mockImplementation(() => ({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), maybeSingle: vi.fn(() => Promise.resolve({ data: { project_id: 'A', environment_id: 'E1', version_id: 'V1', last_correlation_id: 'corr-chat', last_execution_generation: 1 }, error: null })), insert: vi.fn(() => Promise.resolve({ error: null })) }) as never);

    let ids: { studioId: string; osId: string } = { studioId: '', osId: '' };
    renderAct(() => {
      ids = dispatchRender([{ mimeType: 'image/png', data: 'abc' }], 'corr-chat');
    });
    window.history.pushState({}, '', '?module=chat');
    render(<StudioWorker />);
    await renderAct(async () => { await new Promise(r => setTimeout(r, 100)); });

    const studioCmd = useStudioStore.getState().commandQueue.find(c => c.id === ids.studioId);
    const osCmd = useMarcenappOS.getState().commandHistory.find(c => c.id === ids.osId);
    expect(studioCmd?.status).toBe('completed');
    expect(osCmd?.status).toBe('completed');
    expect(osCmd?.result?.resultUrl).toBe('url-from-chat');
    expect(studioService.generateVisual).toHaveBeenCalledTimes(1);
  });

  it('StudioWorker completes the render without writing a duplicate chat message', async () => {
    vi.mocked(studioService.generateVisual).mockResolvedValue('data:image/png;base64,rendered');
    const from = vi.mocked((await import('@/integrations/supabase/client')).supabase.from);
    const inserts: Array<Record<string, unknown>> = [];
    from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(() => Promise.resolve({ data: { project_id: 'A', environment_id: 'E1', version_id: 'V1', last_correlation_id: 'corr-chat', last_execution_generation: 1 }, error: null })),
      insert: vi.fn((row: Record<string, unknown>) => { inserts.push(row); return Promise.resolve({ error: null }); }),
    }) as never);

    let ids: { studioId: string; osId: string } = { studioId: '', osId: '' };
    renderAct(() => { ids = dispatchRender([{ mimeType: 'image/png', data: 'abc' }], 'corr-chat'); });
    render(<StudioWorker />);
    await renderAct(async () => { await new Promise(r => setTimeout(r, 100)); });

    expect(inserts.some(row => row.sender === 'iara')).toBe(false);
    expect(inserts.some(row => row.image_url === 'data:image/png;base64,rendered')).toBe(true);
    expect(useMarcenappOS.getState().commandHistory.find(c => c.id === ids.osId)?.status).toBe('completed');
  });

  it('IARA command without visual context is accepted for text-only rendering', async () => {
    vi.mocked(studioService.generateVisual).mockResolvedValue('url-text-only');
    const from = vi.mocked((await import('@/integrations/supabase/client')).supabase.from);
    from.mockImplementation(() => ({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), maybeSingle: vi.fn(() => Promise.resolve({ data: { project_id: 'A', environment_id: 'E1', version_id: 'V1', last_correlation_id: 'corr-test', last_execution_generation: 1 }, error: null })), insert: vi.fn(() => Promise.resolve({ error: null })) }) as never);
    let ids: { studioId: string; osId: string } = { studioId: '', osId: '' };
    renderAct(() => { ids = dispatchRender(undefined); });
    render(<StudioWorker />);
    await renderAct(async () => { await new Promise(r => setTimeout(r, 50)); });
    const osCmd = useMarcenappOS.getState().commandHistory.find(c => c.id === ids.osId);
    expect(osCmd?.status).toBe('completed');
    expect(osCmd?.result?.resultUrl).toBe('url-text-only');
    expect(studioService.generateVisual).toHaveBeenCalledTimes(1);
    expect(vi.mocked(studioService.generateVisual).mock.calls[0]?.[1]).toBeUndefined();
  });

  it('rejects an IARA render whose generation is missing', async () => {
    const from = vi.mocked((await import('@/integrations/supabase/client')).supabase.from);
    from.mockImplementation(() => ({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), maybeSingle: vi.fn(() => Promise.resolve({ data: { project_id: 'A', environment_id: 'E1', version_id: 'V1', last_correlation_id: 'corr-missing', last_execution_generation: 1 }, error: null })), insert: vi.fn(() => Promise.resolve({ error: null })) }) as never);
    const studioId = useStudioStore.getState().enqueueCommand({ prompt: 'Missing generation', metadata: { origin: 'iara', originalPrompt: 'Missing generation', targetModule: 'studio' } });
    const osId = useMarcenappOS.getState().dispatchCommand({ source: 'iara', target: 'studio', action: 'GENERATE_VISUAL', payload: { prompt: 'Missing generation', studioCommandId: studioId, userId: 'u1', projectId: 'A', environmentId: 'E1', versionId: 'V1', correlationId: 'corr-missing' } });
    render(<StudioWorker />);
    await renderAct(async () => { await new Promise(r => setTimeout(r, 50)); });
    const osCmd = useMarcenappOS.getState().commandHistory.find(c => c.id === osId);
    expect(osCmd?.status).toBe('cancelled');
    expect(studioService.generateVisual).not.toHaveBeenCalled();
  });

  it('keeps an IARA render bound to its project when another project is newer', async () => {
    vi.mocked(studioService.generateVisual).mockResolvedValue('url-project-a');
    const from = vi.mocked((await import('@/integrations/supabase/client')).supabase.from);
    from.mockImplementation((table?: string) => {
      let selectedProject: string | null = null;
      const builder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation((column: string, value: unknown) => {
          if (column === 'project_id') selectedProject = String(value);
          return builder;
        }),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(() => Promise.resolve({
          data: table === 'project_iara_contexts'
            ? selectedProject === 'A'
              ? { project_id: 'A', environment_id: 'E1', version_id: 'V1', last_correlation_id: 'corr-a', last_execution_generation: 2 }
              : { project_id: 'B', environment_id: 'E2', version_id: 'V2', last_correlation_id: 'corr-b', last_execution_generation: 9 }
            : null,
          error: null,
        })),
        insert: vi.fn(() => Promise.resolve({ error: null })),
      };
      return builder as never;
    });

    let ids: { studioId: string; osId: string } = { studioId: '', osId: '' };
    renderAct(() => {
      ids = dispatchRender(undefined, 'corr-a');
      useMarcenappOS.setState(state => ({
        commandHistory: state.commandHistory.map(command => command.id === ids.osId
          ? { ...command, payload: { ...command.payload, projectId: 'A', environmentId: 'E1', versionId: 'V1', generation: 2 } }
          : command),
      }));
    });
    render(<StudioWorker />);
    await renderAct(async () => { await new Promise(r => setTimeout(r, 100)); });

    const osCmd = useMarcenappOS.getState().commandHistory.find(c => c.id === ids.osId);
    expect(osCmd?.status).toBe('completed');
    expect(osCmd?.result?.resultUrl).toBe('url-project-a');
    expect(studioService.generateVisual).toHaveBeenCalledTimes(1);
  });

  it('rejects an IARA render whose persisted correlation is stale after returning to the same project', async () => {
    vi.mocked(studioService.generateVisual).mockResolvedValue('must-not-run');
    const studioId = useStudioStore.getState().enqueueCommand({ prompt: 'Old A render', metadata: { origin: 'iara', originalPrompt: 'Old A render', targetModule: 'studio' } });
    const osId = useMarcenappOS.getState().dispatchCommand({ source: 'iara', target: 'studio', action: 'GENERATE_VISUAL', payload: { prompt: 'Old A render', studioCommandId: studioId, userId: 'u1', projectId: 'A', environmentId: 'E1', versionId: 'V1', correlationId: 'corr-old-a', generation: 1 } });
    const from = vi.mocked((await import('@/integrations/supabase/client')).supabase.from);
    from.mockImplementation(() => ({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), maybeSingle: vi.fn(() => Promise.resolve({ data: { project_id: 'A', environment_id: 'E1', version_id: 'V1', last_correlation_id: 'corr-new-a', last_execution_generation: 3 }, error: null })), insert: vi.fn(() => Promise.resolve({ error: null })) }) as never);
    render(<StudioWorker />);
    await renderAct(async () => { await new Promise(r => setTimeout(r, 50)); });
    const osCmd = useMarcenappOS.getState().commandHistory.find(c => c.id === osId);
    expect(osCmd?.status).toBe('cancelled');
    expect(studioService.generateVisual).not.toHaveBeenCalled();
  });
});