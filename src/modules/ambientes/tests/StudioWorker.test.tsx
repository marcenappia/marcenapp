import { render, act as renderAct } from '@testing-library/react';
import { StudioWorker } from '../components/StudioWorker';
import { useStudioStore } from '@/store/useStudioStore';
import { studioService } from '../services/studioService';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ error: null })),
    })),
  }
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user' } }),
}));

vi.mock('../services/studioService', () => ({
  studioService: {
    generateVisual: vi.fn(),
  }
}));

describe('StudioWorker Queue Processing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStudioStore.getState().clearQueue();
    useStudioStore.setState({ isRendering: false });
  });

  it('StudioWorker should process commands from the queue', async () => {
    (studioService.generateVisual as any).mockResolvedValue('http://result.url');

    renderAct(() => {
      useStudioStore.getState().enqueueCommand({ prompt: 'Cmd 1' });
      useStudioStore.getState().enqueueCommand({ prompt: 'Cmd 2' });
    });

    render(<StudioWorker />);

    // Wait for all commands to be processed
    await renderAct(async () => {
      // Need a bit of time for multiple re-renders and effects
      await new Promise(r => setTimeout(r, 200));
    });

    const queue = useStudioStore.getState().commandQueue;
    expect(queue[0].status).toBe('completed');
    expect(queue[1].status).toBe('completed');
    expect(studioService.generateVisual).toHaveBeenCalledTimes(2);
  });
});
