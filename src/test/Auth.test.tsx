import { render, screen, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Auth from '../pages/Auth';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

// Mock useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null }),
}));

const renderAuth = () => {
  return render(
    <BrowserRouter>
      <Auth />
    </BrowserRouter>
  );
};

describe('Auth Page - Reset Password Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('shows loading state and triggers countdown on success', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.auth.resetPasswordForEmail as any).mockResolvedValue({ data: {}, error: null });

    renderAuth();

    // Go to reset mode
    fireEvent.click(screen.getByText(/Esqueceu a senha?/i));

    const emailInput = screen.getByPlaceholderText(/E-mail/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    const submitButton = screen.getByRole('button', { name: /Enviar Recuperação/i });
    
    // Wrap in act for state updates
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Check success message and countdown
    const successMsg = await screen.findByText(/E-mail de recuperação enviado!/i);
    expect(successMsg).toBeInTheDocument();
    
    const resendButton = await screen.findByText(/Tente novamente em 30s/i);
    expect(resendButton).toBeDisabled();

    // Fast forward time
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(screen.getByText(/Não recebeu\? Reenviar/i)).toBeInTheDocument();
  });

  it('shows support link when error occurs during reset', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.auth.resetPasswordForEmail as any).mockResolvedValue({ 
      data: null, 
      error: { message: 'Failed to send' } 
    });

    renderAuth();

    fireEvent.click(screen.getByText(/Esqueceu a senha?/i));
    
    const emailInput = screen.getByPlaceholderText(/E-mail/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Enviar Recuperação/i }));
    });

    expect(await screen.findByText(/Failed to send/i)).toBeInTheDocument();
    expect(screen.getByText(/Fale com o suporte/i)).toBeInTheDocument();
  });
});
