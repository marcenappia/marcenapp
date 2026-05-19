import { render, screen, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Index from '../pages/Index';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock everything needed for Index page
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ 
    user: { id: 'test-user' }, 
    profile: { name: 'Test User', company: 'Test Co', onboarding_step: 100, onboarding_completed: ['welcome', 'chat', 'studio', 'orcamento', 'corte', 'contrato', 'checklist'] },
    refreshProfile: vi.fn(),
    signOut: vi.fn()
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }))
    }))
  }
}));

describe('Menu Accessibility and Keyboard Navigation', () => {
  beforeEach(() => {
    // Force desktop view for sidebar tests
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
    
    // Desktop sidebar buttons
    const chatBtn = screen.getByLabelText(/IARA Chat/i);
    expect(chatBtn).toBeInTheDocument();
    expect(chatBtn).toHaveClass('focus-visible:ring-2');
    
    const studioBtn = screen.getByLabelText(/Studio 3D/i);
    expect(studioBtn).toBeInTheDocument();
  });

  it('mobile nav should have proper labels', () => {
    // Simulate mobile
    window.innerWidth = 400;
    fireEvent(window, new Event('resize'));
    
    renderIndex();
    
    // Labels shown on mobile labels
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Studio')).toBeInTheDocument();
    expect(screen.getByText('Custo')).toBeInTheDocument();
  });

  it('should support keyboard interaction for menu navigation', async () => {
    renderIndex();
    
    const dashboardBtn = screen.getByLabelText(/Visão Geral/i);
    
    // Focus and click using keyboard
    dashboardBtn.focus();
    expect(document.activeElement).toBe(dashboardBtn);
    
    fireEvent.keyDown(dashboardBtn, { key: 'Enter', code: 'Enter' });
    
    // Header should update to Visão Geral
    expect(screen.getAllByText(/Visão Geral/i).length).toBeGreaterThan(0);
  });
});
