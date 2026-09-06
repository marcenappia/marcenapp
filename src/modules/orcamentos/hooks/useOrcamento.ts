import { useMemo } from 'react';
import { calculateBudget, DEFAULT_PRICES } from '@/core/pricing';

export const useOrcamento = (project: any) => {
  const calc = useMemo(() => calculateBudget(project), [project]);

  return {
    calc,
    prices: DEFAULT_PRICES,
    formatBRL: (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v),
  };
};
