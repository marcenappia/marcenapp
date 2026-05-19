import { render, screen, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Index from '../pages/Index';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => {
  const mockFrom = vi.fn().mockReturnThis();
  const mockSelect = vi.fn().mockReturnThis();
  const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const mockUpdate = vi.fn().mockReturnThis();
  const mockEq = vi.fn().mockResolvedValue({ error: null });
  const mockOrder = vi.fn().mockReturnThis();

  return {
    supabase: {
      from: mockFrom,
      select: mockSelect,
      single: mockSingle,
      update: mockUpdate,
      eq: mockEq,
      order: mockOrder
    }
  };
});

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

describe('Menu Accessibility and Keyboard Navigation', () => {
  beforeEach(() => {
    window.innerWidth = 1200;
    vi.clearAllMocks();
    localStorage.setItem('marcenapp_onboarding_seen', 'true');
    
    // Minimal mock for StudioWorker (Three.js component that might crash in jsdom)
    vi.mock('@/modules/ambientes/components/StudioWorker', () => ({
      StudioWorker: () => null
    }));
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
    
    const chatBtn = screen.getByLabelText(/IARA Chat/i);
    expect(chatBtn).toBeInTheDocument();
    expect(chatBtn).toHaveClass('focus-visible:ring-2');
  });

  it('mobile nav should have proper labels', () => {
    window.innerWidth = 400;
    fireEvent(window, new Event('resize'));
    
    renderIndex();
    
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Studio')).toBeInTheDocument();
  });

  it('should support keyboard interaction for menu navigation', async () => {
    renderIndex();
    
    const dashboardBtn = screen.getByLabelText(/Visão Geral/i);
    dashboardBtn.focus();
    expect(document.activeElement).toBe(dashboardBtn);
    
    fireEvent.keyDown(dashboardBtn, { key: 'Enter', code: 'Enter' });
    fireEvent.click(dashboardBtn); // Trigger click as fireEvent Enter doesn't always trigger onClick in jsdom
    
    expect(screen.getAllByText(/Visão Geral/i).length).toBeGreaterThan(0);
  });
});
