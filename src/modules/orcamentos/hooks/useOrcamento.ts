import { useMemo } from 'react';
import { calculatePricing } from '@/core/pricing';
import type { PricingProject } from '@/core/pricing';

export const useOrcamento = (project: PricingProject) => {
  const calc = useMemo(() => {
    const result = calculatePricing(project);
    return {
      total: result.total,
      mat: result.materials,
      labor: result.labor,
      profit: result.profit,
      waste: result.waste,
      hardware: result.hardware,
      sheetsInt: result.sheetsInternal,
      sheetsExt: result.sheetsExternal,
      sheetsBack: result.sheetsBack,
      parts: result.parts,
    };
  }, [project]);

  return {
    calc,
    formatBRL: (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value),
  };
};
