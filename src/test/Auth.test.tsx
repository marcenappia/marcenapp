import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Auth from '../pages/Auth';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

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

const renderAuth = () => render(<MemoryRouter initialEntries={['/forgot-password']}><Auth /></MemoryRouter>);

describe('Auth Page - Reset Password Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.stubEnv('VITE_SUPPORT_WHATSAPP_LINK', 'https://example.com/support');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows success state and countdown after a successful reset request', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.auth.resetPasswordForEmail as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {}, error: null });

    renderAuth();
    fireEvent.change(screen.getByPlaceholderText(/E-mail/i), { target: { value: 'test@example.com' } });

    const submitButton = screen.getByRole('button', { name: /Enviar Recuperação/i });
    expect(submitButton).toBeEnabled();
    await act(async () => {
      fireEvent.click(submitButton);
      await Promise.resolve();
    });

    expect(screen.getByText(/Se o e-mail estiver cadastrado, enviaremos a recuperação\. Verifique também o spam\./i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Aguarde/i })).toBeDisabled();

    await act(async () => {
      await vi.runAllTimersAsync();
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
    fireEvent.change(screen.getByPlaceholderText(/E-mail/i), { target: { value: 'test@example.com' } });

    const submitButton = screen.getByRole('button', { name: /Enviar Recuperação/i });
    expect(submitButton).toBeEnabled();
    await act(async () => {
      fireEvent.click(submitButton);
      await Promise.resolve();
    });

    expect(screen.getByText(/Failed to send/i)).toBeInTheDocument();
    expect(screen.getByText(/Fale com o suporte/i)).toBeInTheDocument();
  });
});
