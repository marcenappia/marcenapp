import { render, screen, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Onboarding from '../components/marcenaria/Onboarding';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }))
    }))
  }
}));

// Mock useAuth
const mockRefreshProfile = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ 
    user: { id: 'test-user' }, 
    profile: { onboarding_step: 0, onboarding_completed: [], reduce_motion: false },
    refreshProfile: mockRefreshProfile
  }),
}));

describe('Onboarding Component', () => {
  const mockOnNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    
    window.HTMLElement.prototype.getBoundingClientRect = function() {
      return { width: 100, height: 50, top: 10, left: 20, bottom: 60, right: 120, x: 20, y: 10, toJSON: () => {} };
    };
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  const renderOnboarding = (activeModule = 'chat') => {
    return render(
      <BrowserRouter>
        <Onboarding onNavigate={mockOnNavigate} activeModule={activeModule} />
      </BrowserRouter>
    );
  };

  it('renders and persists progress across steps', async () => {
    renderOnboarding();
    
    // First step
    expect(screen.getByText(/Bem-vindo ao MarcenApp!/i)).toBeInTheDocument();

    const nextButton = screen.getByRole('button', { name: /Próximo/i });
    
    // Move to step 1
    await act(async () => {
      fireEvent.click(nextButton);
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByText(/IARA Chat/i)).toBeInTheDocument();
    
    // Verify persistence calls (mocked)
    const { supabase } = await import('@/integrations/supabase/client');
    expect(supabase.from).toHaveBeenCalledWith('profiles');
  });

  it('restores progress from localStorage when not logged in', async () => {
    // Override useAuth for this test
    const useAuthMock = await import('@/hooks/useAuth');
    vi.spyOn(useAuthMock, 'useAuth').mockReturnValue({ 
      user: null, 
      profile: null,
      refreshProfile: vi.fn()
    } as any);

    localStorage.setItem('marcenapp_onboarding_step', '2');
    localStorage.setItem('marcenapp_onboarding_seen', 'false');
    
    renderOnboarding('chat');

    expect(screen.getByText(/Studio 3D/i)).toBeInTheDocument();
  });

  it('handles spotlight rendering for modules', async () => {
    // Add dummy target element
    const div = document.createElement('div');
    div.id = 'nav-studio';
    document.body.appendChild(div);

    localStorage.setItem('marcenapp_onboarding_step', '2'); // Studio 3D step
    renderOnboarding('chat');

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // Check spotlight style exists
    const spotlight = document.querySelector('[role="presentation"]');
    expect(spotlight).toBeInTheDocument();
  });
});

