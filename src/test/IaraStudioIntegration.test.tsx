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
  const dispatchRender = (images?: { mimeType: string; data: string }[]) => {
    const studioId = useStudioStore.getState().enqueueCommand({ prompt: 'Test', images, metadata: { origin: 'iara', originalPrompt: 'Test', targetModule: 'studio' } });
    const osId = useMarcenappOS.getState().dispatchCommand({ source: 'iara', target: 'studio', action: 'GENERATE_VISUAL', payload: { prompt: 'Test', studioCommandId: studioId, userId: 'u1' } });
    return { studioId, osId };
  };
  it('StudioWorker executes commands from the queue and syncs both stores', async () => {
    vi.mocked(studioService.generateVisual).mockResolvedValue('url1');
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
  it('IARA command without visual context is accepted for text-only rendering', async () => {
    vi.mocked(studioService.generateVisual).mockResolvedValue('url-text-only');
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
  it('rejects an IARA render whose persisted correlation is stale after returning to the same project', async () => {
    vi.mocked(studioService.generateVisual).mockResolvedValue('must-not-run');
    const studioId = useStudioStore.getState().enqueueCommand({ prompt: 'Old A render', metadata: { origin: 'iara', originalPrompt: 'Old A render', targetModule: 'studio' } });
    const osId = useMarcenappOS.getState().dispatchCommand({ source: 'iara', target: 'studio', action: 'GENERATE_VISUAL', payload: { prompt: 'Old A render', studioCommandId: studioId, userId: 'u1', projectId: 'A', environmentId: 'E1', versionId: 'V1', correlationId: 'corr-old-a' } });
    const from = vi.mocked((await import('@/integrations/supabase/client')).supabase.from);
    from.mockImplementation(() => ({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), maybeSingle: vi.fn(() => Promise.resolve({ data: { project_id: 'A', environment_id: 'E1', version_id: 'V1', last_correlation_id: 'corr-new-a', last_execution_generation: null }, error: null })), insert: vi.fn(() => Promise.resolve({ error: null })) }) as never);
    render(<StudioWorker />);
    await renderAct(async () => { await new Promise(r => setTimeout(r, 50)); });
    const osCmd = useMarcenappOS.getState().commandHistory.find(c => c.id === osId);
    expect(osCmd?.status).toBe('cancelled');
    expect(studioService.generateVisual).not.toHaveBeenCalled();
  });
});
