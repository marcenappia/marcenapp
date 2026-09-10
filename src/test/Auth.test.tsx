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
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.stubEnv('VITE_SUPPORT_WHATSAPP_LINK', 'https://example.com/support');
  });

  it('shows loading state and triggers countdown on success', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.auth.resetPasswordForEmail as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {}, error: null });

    renderAuth();

    fireEvent.click(screen.getByText(/Esqueceu a senha?/i));

    const emailInput = screen.getByPlaceholderText(/E-mail/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    const submitButton = screen.getByRole('button', { name: /Enviar Recuperação/i });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    const successMsg = await screen.findByText(/E-mail de recuperação enviado!/i);
    expect(successMsg).toBeInTheDocument();

    const resendButton = await screen.findByText(/Tente novamente em 30s/i);
    expect(resendButton).toBeDisabled();

    for (let i = 0; i < 30; i++) {
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
    }

    const resendEnabled = await screen.findByText(/Não recebeu\? Reenviar/i);
    expect(resendEnabled).not.toBeDisabled();
  });

  it('shows support link when error occurs during reset', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.auth.resetPasswordForEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
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
