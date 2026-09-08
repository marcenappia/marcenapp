import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Index from '../pages/Index';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => {
  const mock = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    removeChannel: vi.fn(),
    then: vi.fn((cb) => {
       if (cb) return Promise.resolve(cb({ data: [], error: null }));
       return Promise.resolve({ data: [], error: null });
    }),
  };
  mock.single.mockReturnValue(Promise.resolve({ data: null, error: null }));
  return { supabase: mock };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ 
    user: { id: 'u1' }, profile: { name: 'T' }, 
    refreshProfile: vi.fn(), signOut: vi.fn() 
  }),
}));

vi.mock('@/modules/ambientes/components/StudioWorker', () => ({ StudioWorker: () => null }));
vi.mock('@/assets/marcenapp-logo.jpeg', () => ({ default: '' }));
vi.mock('@/modules/iara', () => ({ default: () => <div data-testid="chat">Chat</div> }));
vi.mock('@/modules/jornada/Home', () => ({ default: () => <div data-testid="home">Home</div> }));

describe('Menu Accessibility', () => {
  beforeEach(() => {
    window.innerWidth = 1200;
    localStorage.setItem('marcenapp_onboarding_seen', 'true');
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('nav buttons should have focus indicators', () => {
    render(<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Index /></BrowserRouter>);
    const chatBtn = screen.getAllByLabelText(/Estúdio \+ IARA/i)[0];
    expect(chatBtn).toHaveClass('focus-visible:ring-2');
  });

  it('home (jornada) is the default module and mobile nav has Novo Projeto', () => {
    window.innerWidth = 400;
    render(<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Index /></BrowserRouter>);
    expect(screen.getByTestId('home')).toBeInTheDocument();
    expect(screen.getByLabelText('Novo Projeto')).toBeInTheDocument();
  });
});
