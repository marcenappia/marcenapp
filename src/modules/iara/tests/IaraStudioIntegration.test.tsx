import { renderHook, act } from '@testing-library/react';
import { useIaraChat } from '../hooks/useIaraChat';
import { useStudioStore } from '@/store/useStudioStore';
import { iaraService } from '../services/iaraService';
import { studioService } from '@/modules/ambientes/services/studioService';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Better Supabase Mock
const createSupabaseMock = () => {
  const mock: any = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    then: vi.fn((cb) => Promise.resolve(cb({ data: [], error: null }))),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() })),
    removeChannel: vi.fn(),
  };
  return mock;
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: createSupabaseMock()
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user' } }),
}));

vi.mock('../services/iaraService', () => ({
  iaraService: {
    interpretCommand: vi.fn(),
    calculateSmartBudget: vi.fn(() => "1000.00"),
  }
}));

vi.mock('@/modules/ambientes/services/studioService', () => ({
  studioService: {
    generateVisual: vi.fn(),
  }
}));

describe('IARA-Estúdio Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStudioStore.getState().clearQueue();
  });

  it('IARA should enqueue a command and NOT call studioService directly', async () => {
    const factors = { L: 2, A: 2.5 };
    const decorStyle = 'Minimalista';
    const setShowAuthDialog = vi.fn();
    
    (iaraService.interpretCommand as any).mockResolvedValue({ type: 'RENDER_REQUEST', details: 'test' });
    
    const { result } = renderHook(() => useIaraChat(factors, decorStyle, setShowAuthDialog));

    await act(async () => {
      result.current.setPendingUpload({ base64: 'b64', baseRaw: 'raw', maskRaw: 'mask' });
      result.current.setChatInput('Crie um armário');
    });

    await act(async () => {
      await result.current.handleSend();
    });

    const queue = useStudioStore.getState().commandQueue;
    expect(queue.length).toBe(1);
    expect(queue[0].status).toBe('pending');
    expect(iaraService.interpretCommand).toHaveBeenCalled();
    expect(studioService.generateVisual).not.toHaveBeenCalled();
  });
});
