import { render, screen, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Onboarding from '../components/marcenaria/Onboarding';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn(() => ({ update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })) })) } }));
const mockRefreshProfile = vi.fn();
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'test-user' }, profile: { onboarding_step: 0, onboarding_completed: [], reduce_motion: false }, refreshProfile: mockRefreshProfile }) }));

describe('Onboarding Component', () => {
  const mockOnNavigate = vi.fn();
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); vi.useFakeTimers({ shouldAdvanceTime: true }); window.HTMLElement.prototype.getBoundingClientRect = function() { return { width: 100, height: 50, top: 10, left: 20, bottom: 60, right: 120, x: 20, y: 10, toJSON: () => {} }; }; window.HTMLElement.prototype.scrollIntoView = vi.fn(); });
  const renderOnboarding = (activeModule = 'chat') => render(<BrowserRouter><Onboarding onNavigate={mockOnNavigate} activeModule={activeModule} /></BrowserRouter>);
  it('renders and persists progress across steps', async () => {
    renderOnboarding(); expect(screen.getByText(/Vamos começar pelo jeito mais simples/i)).toBeInTheDocument();
    const nextButton = screen.getByRole('button', { name: /Próximo/i });
    await act(async () => { fireEvent.click(nextButton); vi.advanceTimersByTime(500); });
    expect(screen.getByText(/O Diário é seu ponto de partida/i)).toBeInTheDocument();
    const { supabase } = await import('@/integrations/supabase/client'); expect(supabase.from).toHaveBeenCalledWith('profiles');
  });
  it('restores progress from localStorage when not logged in', async () => {
    const useAuthMock = await import('@/hooks/useAuth');
    vi.spyOn(useAuthMock, 'useAuth').mockReturnValue({ user: null, session: null, loading: false, profile: null, profileLoading: false, signOut: vi.fn(async () => undefined), refreshProfile: vi.fn(async () => undefined) });
    localStorage.setItem('marcenapp_onboarding_step', '2'); localStorage.setItem('marcenapp_onboarding_seen', 'false');
    renderOnboarding('chat'); expect(screen.getByText(/Cliente e obra ficam organizados/i)).toBeInTheDocument();
  });
  it('handles spotlight rendering for modules', async () => {
    const div = document.createElement('div'); div.id = 'nav-diario'; document.body.appendChild(div);
    localStorage.setItem('marcenapp_onboarding_step', '1'); renderOnboarding('chat');
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(document.querySelector('[role="presentation"]')).toBeInTheDocument();
  });
});
