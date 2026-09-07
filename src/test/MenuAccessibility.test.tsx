import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Index from '../pages/Index';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => {
  const mock: any = {
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
    refreshProfile: vi.fn(), signOut: vi.fn(),
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
    render(<BrowserRouter><Index /></BrowserRouter>);
    const iaraBtn = screen.getAllByLabelText(/Estúdio \+ IARA/i)[0];
    expect(iaraBtn).toHaveClass('focus-visible:ring-2');
  });

  it('home is the default module and exposes the primary create action', () => {
    window.innerWidth = 400;
    render(<BrowserRouter><Index /></BrowserRouter>);
    expect(screen.getByTestId('home')).toBeInTheDocument();
    expect(screen.getByLabelText('Novo projeto')).toBeInTheDocument();
  });
});
