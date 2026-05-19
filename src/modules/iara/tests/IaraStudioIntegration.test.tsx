import { renderHook, act } from '@testing-library/react';
import { useIaraChat } from '../hooks/useIaraChat';
import { useStudioStore } from '@/store/useStudioStore';
import { iaraService } from '../services/iaraService';
import { studioService } from '@/modules/ambientes/services/studioService';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mocks
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ order: vi.fn(() => Promise.resolve({ data: [] })) })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
    })),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() })),
    removeChannel: vi.fn(),
  }
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
    // Setup
    const factors = { L: 2, A: 2.5 };
    const decorStyle = 'Minimalista';
    const setShowAuthDialog = vi.fn();
    
    // Mock interpretation as RENDER_REQUEST
    (iaraService.interpretCommand as any).mockResolvedValue({ type: 'RENDER_REQUEST', details: 'test' });
    
    const { result } = renderHook(() => useIaraChat(factors, decorStyle, setShowAuthDialog));

    // Mock an upload context (required for render)
    await act(async () => {
      result.current.setPendingUpload({ base64: 'b64', baseRaw: 'raw', maskRaw: 'mask' });
      result.current.setChatInput('Crie um armário');
    });

    // Send command
    await act(async () => {
      await result.current.handleSend();
    });

    // Assertions
    const queue = useStudioStore.getState().commandQueue;
    expect(queue.length).toBe(1);
    expect(queue[0].prompt).toContain('Crie um armário');
    expect(queue[0].status).toBe('pending');
    
    // CRITICAL: Ensure iaraService was called but studioService WAS NOT
    expect(iaraService.interpretCommand).toHaveBeenCalled();
    expect(studioService.generateVisual).not.toHaveBeenCalled();
  });
});
