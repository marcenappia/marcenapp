import { useMemo, useState } from 'react';
import { calculateBudget, DEFAULT_PRICES, PriceCatalog } from '@/core/pricing';

const STORAGE_KEY = 'marcenapp-pricing-v1';

function loadPrices(): PriceCatalog {
  if (typeof window === 'undefined') return DEFAULT_PRICES;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_PRICES;
    const parsed = JSON.parse(stored) as PriceCatalog;
    return Object.fromEntries(Object.entries(DEFAULT_PRICES).map(([key, defaults]) => [
      key,
      { ...defaults, ...(parsed[key] ?? {}) },
    ]));
  } catch {
    return DEFAULT_PRICES;
  }
}

export const useOrcamento = (project: any) => {
  const [prices, setPrices] = useState<PriceCatalog>(loadPrices);
  const calc = useMemo(() => calculateBudget(project, prices), [project, prices]);

  const updatePrice = (material: string, field: keyof PriceCatalog[string], value: number) => {
    setPrices(current => {
      const next = { ...current, [material]: { ...current[material], [field]: value } };
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* storage opcional */ }
      return next;
    });
  };

  const resetPrices = () => {
    setPrices(DEFAULT_PRICES);
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* storage opcional */ }
  };

  return {
    calc,
    prices,
    updatePrice,
    resetPrices,
    formatBRL: (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v),
  };
};
