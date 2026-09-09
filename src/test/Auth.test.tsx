import { render, screen, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Auth from '../pages/Auth';
import { vi, describe, it, expect, beforeEach } from 'vitest';

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

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null }),
}));

const renderAuth = () => render(
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Auth />
  </BrowserRouter>
);

describe('Auth Page - Reset Password Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it('shows success state and enforces the 30-second cooldown', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({ data: {}, error: null });

    renderAuth();
    fireEvent.click(screen.getByText(/Esqueceu a senha?/i));
    fireEvent.change(screen.getByPlaceholderText(/E-mail/i), { target: { value: 'test@example.com' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Enviar Recuperação/i }));
    });

    expect(await screen.findByText(/E-mail de recuperação enviado!/i)).toBeInTheDocument();
    const resendButton = screen.getByRole('button', { name: /Enviar Recuperação/i });
    expect(resendButton).toBeEnabled();

    for (let i = 0; i < 30; i++) {
      await act(async () => { vi.advanceTimersByTime(1000); });
    }

    expect(screen.getByRole('button', { name: /Enviar Recuperação/i })).toBeEnabled();
  });

  it('shows support link when error occurs during reset', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({
      data: null,
      error: { message: 'Failed to send' } as unknown as import('@supabase/auth-js').AuthError,
    });

    renderAuth();
    fireEvent.click(screen.getByText(/Esqueceu a senha?/i));
    fireEvent.change(screen.getByPlaceholderText(/E-mail/i), { target: { value: 'test@example.com' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Enviar Recuperação/i }));
    });

    expect(await screen.findByText(/Failed to send/i)).toBeInTheDocument();
    expect(screen.getByText(/Fale com o suporte/i)).toBeInTheDocument();
  });
});
