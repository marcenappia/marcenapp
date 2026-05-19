import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Index from '../pages/Index';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Advanced Supabase Mock to handle chainable methods
const createMockSupabase = () => {
  const mock = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: vi.fn((cb) => Promise.resolve(cb({ data: [], error: null }))),
  };
  // Ensure eq and order return the same mock object for chaining
  mock.eq.mockReturnValue(mock);
  mock.order.mockReturnValue(mock);
  mock.limit.mockReturnValue(mock);
  mock.select.mockReturnValue(mock);
  return mock;
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: createMockSupabase()
}));

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ 
    user: { id: 'test-user' }, 
    profile: { 
      name: 'Test User', 
      company: 'Test Co', 
      onboarding_step: 100, 
      onboarding_completed: ['welcome', 'chat', 'studio', 'orcamento', 'corte', 'contrato', 'checklist'] 
    },
    refreshProfile: vi.fn(),
    signOut: vi.fn()
  }),
}));

// Mock modules that might cause issues in JSDOM
vi.mock('@/modules/ambientes/components/StudioWorker', () => ({
  StudioWorker: () => null
}));

describe('Menu Accessibility and Keyboard Navigation', () => {
  beforeEach(() => {
    window.innerWidth = 1200;
    vi.clearAllMocks();
    localStorage.setItem('marcenapp_onboarding_seen', 'true');
  });

  const renderIndex = () => {
    return render(
      <BrowserRouter>
        <Index />
      </BrowserRouter>
    );
  };

  it('nav buttons should have proper ARIA labels and focus indicators', () => {
    renderIndex();
    
    // Check desktop buttons by aria-label
    const chatBtn = screen.getByLabelText(/IARA Chat/i);
    expect(chatBtn).toBeInTheDocument();
    expect(chatBtn).toHaveClass('focus-visible:ring-2');
  });

  it('mobile nav should have proper labels', () => {
    window.innerWidth = 400;
    fireEvent(window, new Event('resize'));
    
    renderIndex();
    
    // In Index.tsx, mobile nav buttons also have aria-label
    const mobileChatBtn = screen.getAllByLabelText(/IARA Chat/i)[1]; // Second one is mobile
    expect(mobileChatBtn).toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
  });

  it('should support keyboard interaction for menu navigation', async () => {
    renderIndex();
    
    const dashboardBtn = screen.getByLabelText(/Visão Geral/i);
    dashboardBtn.focus();
    expect(document.activeElement).toBe(dashboardBtn);
    
    fireEvent.click(dashboardBtn);
    
    expect(screen.getAllByText(/Visão Geral/i).length).toBeGreaterThan(0);
  });
});
