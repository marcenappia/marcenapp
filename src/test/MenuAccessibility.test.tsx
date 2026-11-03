import { fireEvent, render, screen, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Index from '../pages/Index';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => {
  const mock: Record<string, unknown> = {};
  const chain = vi.fn(() => mock);
  const single = vi.fn(() => Promise.resolve({ data: null, error: null }));
  const then = vi.fn((cb?: (value: { data: unknown[]; error: null }) => unknown) => cb ? Promise.resolve(cb({ data: [], error: null })) : Promise.resolve({ data: [], error: null }));
  mock.from = chain; mock.select = chain; mock.update = chain; mock.eq = chain; mock.order = chain; mock.limit = chain; mock.single = single;
  mock.channel = vi.fn(() => ({ on: vi.fn(() => ({ subscribe: vi.fn() })), subscribe: vi.fn() }));
  mock.removeChannel = vi.fn(); mock.then = then;
  return { supabase: mock };
});
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1' }, profile: { name: 'T' }, refreshProfile: vi.fn(), signOut: vi.fn() }) }));
vi.mock('@/modules/ambientes/components/StudioWorker', () => ({ StudioWorker: () => null }));
vi.mock('@/assets/marcenapp-logo.jpeg', () => ({ default: '' }));
vi.mock('@/modules/iara', () => ({ default: () => <div data-testid="chat">Chat</div> }));
vi.mock('@/modules/jornada/Home', () => ({ default: () => <div data-testid="home">Home</div> }));

describe('Menu Accessibility', () => {
  beforeEach(() => { window.innerWidth = 1200; localStorage.setItem('marcenapp_onboarding_seen', 'true'); window.HTMLElement.prototype.scrollIntoView = vi.fn(); });
  it('nav buttons should have focus indicators', async () => { render(<BrowserRouter><Index /></BrowserRouter>); const chatButtons = await screen.findAllByLabelText(/^IARA$/i); expect(chatButtons.length).toBeGreaterThan(0); chatButtons.forEach((button) => expect(button).toHaveClass('focus-visible:outline-none')); expect(chatButtons[0]).toHaveClass('focus-visible:ring-2'); });
  it('home (jornada) is the default module and mobile drawer exposes Diário', async () => { window.innerWidth = 400; render(<BrowserRouter><Index /></BrowserRouter>); expect(await screen.findByTestId('home')).toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: 'Abrir menu de navegação' })); const drawer = await screen.findByRole('dialog', { name: 'Navegação principal' }); expect(within(drawer).getByRole('button', { name: 'Diário de Obra' })).toBeInTheDocument(); });
  it('opens and closes the three-dots marcenaria menu', async () => { window.innerWidth = 1200; render(<BrowserRouter><Index /></BrowserRouter>); const trigger = screen.getByRole('button', { name: 'Abrir menu da marcenaria' }); expect(trigger).toHaveAttribute('aria-expanded', 'false'); fireEvent.click(trigger); expect(await screen.findByRole('menu', { name: 'Menu da marcenaria' })).toBeInTheDocument(); fireEvent.keyDown(window, { key: 'Escape' }); expect(trigger).toHaveAttribute('aria-expanded', 'false'); });
});
