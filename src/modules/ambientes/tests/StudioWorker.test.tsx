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
    // Reset rendering state
    useStudioStore.setState({ isRendering: false });
  });

  it('StudioWorker should process commands from the queue sequentially', async () => {
    (studioService.generateVisual as any).mockResolvedValue('http://result.url');

    // Enqueue 2 commands
    renderAct(() => {
      useStudioStore.getState().enqueueCommand({ prompt: 'Cmd 1' });
      useStudioStore.getState().enqueueCommand({ prompt: 'Cmd 2' });
    });

    render(<StudioWorker />);

    // Wait for first command to start processing
    await renderAct(async () => {
      // Small delay to let useEffect run
      await new Promise(r => setTimeout(r, 0));
    });

    // Check status of first command
    let queue = useStudioStore.getState().commandQueue;
    expect(queue[0].status).toBe('processing');
    expect(studioService.generateVisual).toHaveBeenCalledWith('Cmd 1', undefined, undefined, undefined);

    // Complete the first command's mock execution
    // Wait for the async processCommand to finish
    await renderAct(async () => {
      // studioService.generateVisual is already mocked to resolve
    });

    // Verify first command is completed
    queue = useStudioStore.getState().commandQueue;
    expect(queue[0].status).toBe('completed');
    expect(queue[0].resultUrl).toBe('http://result.url');

    // Verify second command starts after first is done
    // The component re-renders because store changes, triggering next command
    await renderAct(async () => {
      await new Promise(r => setTimeout(r, 10)); // Give it time to pick next
    });

    queue = useStudioStore.getState().commandQueue;
    expect(queue[1].status).toBe('processing');
    expect(studioService.generateVisual).toHaveBeenCalledWith('Cmd 2', undefined, undefined, undefined);
  });
});
