import { render, screen, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Onboarding from '../components/marcenaria/Onboarding';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('Onboarding Component', () => {
  const mockOnNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    
    // Mock getBoundingClientRect
    window.HTMLElement.prototype.getBoundingClientRect = function() {
      return {
        width: 100,
        height: 50,
        top: 10,
        left: 20,
        bottom: 60,
        right: 120,
        x: 20,
        y: 10,
        toJSON: () => {}
      };
    };
    
    // Mock scrollIntoView
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  const renderOnboarding = (activeModule = 'chat') => {
    return render(
      <BrowserRouter>
        <Onboarding onNavigate={mockOnNavigate} activeModule={activeModule} />
      </BrowserRouter>
    );
  };

  it('renders the first step when no onboarding seen before', () => {
    renderOnboarding();
    expect(screen.getByText(/Bem-vindo ao MarcenApp!/i)).toBeInTheDocument();
  });

  it('navigates through steps and saves progress', async () => {
    renderOnboarding();
    
    const nextButton = screen.getByRole('button', { name: /Próximo/i });
    
    await act(async () => {
      fireEvent.click(nextButton);
    });

    // Second step is IARA Chat
    expect(screen.getByText(/IARA Chat/i)).toBeInTheDocument();
    expect(mockOnNavigate).not.toHaveBeenCalled(); // Already in chat (default)

    // Check persistence
    expect(localStorage.getItem('marcenapp_onboarding_step')).toBe('1');
    expect(localStorage.getItem('marcenapp_onboarding_completed')).toContain('chat');
  });

  it('auto-navigates to the correct module during steps', async () => {
    // Start at step 2 (Studio 3D)
    localStorage.setItem('marcenapp_onboarding_step', '2');
    renderOnboarding('chat'); // Current module is chat

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByText(/Studio 3D/i)).toBeInTheDocument();
    expect(mockOnNavigate).toHaveBeenCalledWith('studio');
  });

  it('toggles reduce motion mode', async () => {
    renderOnboarding();
    
    const toggleButton = screen.getByText(/Modo reduzir movimento/i);
    
    await act(async () => {
      fireEvent.click(toggleButton);
    });

    expect(localStorage.getItem('marcenapp_reduce_motion')).toBe('true');
  });

  it('renders checklist in the last step', async () => {
    localStorage.setItem('marcenapp_onboarding_step', '6'); // Index of checklist step
    renderOnboarding();

    expect(screen.getByText(/Sua Jornada 4.0/i)).toBeInTheDocument();
    expect(screen.getByText(/IARA Chat/i)).toBeInTheDocument();
    expect(screen.getByText(/Contratos/i)).toBeInTheDocument();
  });
});
