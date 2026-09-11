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

const renderAuth = () => render(<BrowserRouter><Auth /></BrowserRouter>);

describe('Auth Page - Reset Password Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.stubEnv('VITE_SUPPORT_WHATSAPP_LINK', 'https://example.com/support');
  });

  it('shows success state and countdown after a successful reset request', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.auth.resetPasswordForEmail as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {}, error: null });

    renderAuth();
    fireEvent.click(screen.getByText(/Esqueceu a senha?/i));
    fireEvent.change(screen.getByPlaceholderText(/E-mail/i), { target: { value: 'test@example.com' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Enviar Recuperação/i }));
    });

    expect(await screen.findByText(/E-mail de recuperação enviado\. Verifique também o spam\./i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Aguarde 30s/i })).toBeDisabled();

    await act(async () => {
      vi.advanceTimersByTime(30000);
    });

    expect(screen.getByRole('button', { name: /Enviar Recuperação/i })).toBeEnabled();
  });

  it('shows support link when an error occurs during reset', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.auth.resetPasswordForEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: { message: 'Failed to send' },
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
