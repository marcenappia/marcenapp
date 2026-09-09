import type { ProjectData } from '@/modules/projetos/types';
import { useMemo, useState } from 'react';
import { calculateBudget, DEFAULT_PRICES, PriceCatalog, CutSavings } from '@/core/pricing';

const STORAGE_KEY = 'marcenapp-pricing-v1';
const SAVINGS_KEY_PREFIX = 'marcenapp-cut-savings-v1:';

function loadPrices(): PriceCatalog {
  if (typeof window === 'undefined') return DEFAULT_PRICES;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_PRICES;
    const parsed = JSON.parse(stored) as PriceCatalog;
    return Object.fromEntries(Object.entries(DEFAULT_PRICES).map(([key, defaults]) => [key, { ...defaults, ...(parsed[key] ?? {}) }]));
  } catch { return DEFAULT_PRICES; }
}

function projectKey(project: ProjectData) {
  return String(project?.id ?? project?.name ?? project?.jornada?.id ?? 'current');
}

function loadSavings(project: ProjectData): CutSavings {
  if (typeof window === 'undefined') return { internal: 0, external: 0, back: 0, total: 0 };
  try {
    const raw = window.localStorage.getItem(`${SAVINGS_KEY_PREFIX}${projectKey(project)}`);
    return raw ? JSON.parse(raw) : { internal: 0, external: 0, back: 0, total: 0 };
  } catch { return { internal: 0, external: 0, back: 0, total: 0 }; }
}

export const useOrcamento = (project: ProjectData) => {
  const [prices, setPrices] = useState<PriceCatalog>(loadPrices);
  const savings = useMemo(() => loadSavings(project), [project]);
  const calc = useMemo(() => calculateBudget(project, prices, savings), [project, prices, savings]);

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
    savings,
    updatePrice,
    resetPrices,
    formatBRL: (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v),
  };
};
