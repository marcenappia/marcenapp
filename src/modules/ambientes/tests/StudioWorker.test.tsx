import { render, act as renderAct } from '@testing-library/react';
import { StudioWorker } from '../components/StudioWorker';
import { useStudioStore } from '@/store/useStudioStore';
import { studioService } from '../services/studioService';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mocks
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

  it('StudioWorker should process commands from the queue sequentially', async () => {
    // Use a deferred promise to control when the first command completes
    let resolveFirstCommand: (val: string) => void;
    const firstCommandPromise = new Promise<string>((resolve) => {
      resolveFirstCommand = resolve;
    });
    
    (studioService.generateVisual as any)
      .mockReturnValueOnce(firstCommandPromise)
      .mockResolvedValueOnce('http://result2.url');

    // Enqueue 2 commands
    renderAct(() => {
      useStudioStore.getState().enqueueCommand({ prompt: 'Cmd 1' });
      useStudioStore.getState().enqueueCommand({ prompt: 'Cmd 2' });
    });

    render(<StudioWorker />);

    // Wait for first command to be picked up
    await renderAct(async () => {
      await new Promise(r => setTimeout(r, 10));
    });

    // Verify it is processing the first one
    let queue = useStudioStore.getState().commandQueue;
    expect(queue[0].status).toBe('processing');
    expect(queue[1].status).toBe('pending');
    expect(studioService.generateVisual).toHaveBeenCalledWith('Cmd 1', undefined, undefined, undefined);

    // Resolve the first command
    await renderAct(async () => {
      resolveFirstCommand!('http://result1.url');
      await firstCommandPromise;
    });

    // Verify first is completed
    queue = useStudioStore.getState().commandQueue;
    expect(queue[0].status).toBe('completed');
    expect(queue[0].resultUrl).toBe('http://result1.url');

    // Wait for second command to be picked up
    await renderAct(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    queue = useStudioStore.getState().commandQueue;
    expect(queue[1].status).toBe('processing');
    expect(studioService.generateVisual).toHaveBeenCalledWith('Cmd 2', undefined, undefined, undefined);
  });
});
