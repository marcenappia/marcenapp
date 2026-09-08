import "@testing-library/jest-dom";
import { vi } from "vitest";

// Ambiente mínimo determinístico para testes que importam o cliente Supabase no bootstrap.
// Em produção, os valores reais continuam vindo das variáveis VITE_*.
vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
