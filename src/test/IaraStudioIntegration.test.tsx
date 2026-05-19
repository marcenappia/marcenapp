import { render, act as renderAct } from '@testing-library/react';
import { StudioWorker } from '../components/StudioWorker';
import { useStudioStore } from '@/store/useStudioStore';
import { studioService } from '../services/studioService';
import { iaraService } from '@/modules/iara/services/iaraService';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Minimal Mocks
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      then: vi.fn((cb) => Promise.resolve(cb({ data: [] }))),
    })),
  }
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

vi.mock('../services/studioService', () => ({
  studioService: { generateVisual: vi.fn() }
}));

describe('IARA-Studio Architecture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStudioStore.getState().clearQueue();
    useStudioStore.setState({ isRendering: false });
  });

  it('StudioWorker executes commands from the queue', async () => {
    (studioService.generateVisual as any).mockResolvedValue('url1');

    renderAct(() => {
      useStudioStore.getState().enqueueCommand({ prompt: 'Test' });
    });

    render(<StudioWorker />);

    await renderAct(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    const queue = useStudioStore.getState().commandQueue;
    expect(queue[0].status).toBe('completed');
    expect(studioService.generateVisual).toHaveBeenCalled();
  });
});
