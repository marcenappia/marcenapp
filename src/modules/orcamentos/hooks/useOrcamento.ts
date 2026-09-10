import { useMemo } from 'react';
import type { ProjectData } from '@/modules/projetos/types';

type Price = { price: number; area?: number };

export const useOrcamento = (project: ProjectData) => {
  const prices: Record<string, Price> = {
    mdf15_white: { price: 260, area: 5.08 }, mdf18_white: { price: 290, area: 5.08 }, mdf18_wood: { price: 495, area: 5.08 },
    slide: { price: 28 }, hinge: { price: 7.5 }, handle_external: { price: 15 }, handle_profile: { price: 45 }, handle_cava: { price: 0 },
  };
  const calc = useMemo(() => {
    const frontalArea = project.height * project.width;
    const intMat = prices[project.internalMaterial] || prices.mdf15_white;
    const extMat = prices[project.externalMaterial] || prices.mdf18_white;
    const sheetsInt = Math.ceil((frontalArea * 2.5 * 1.15) / (intMat.area ?? 1) * 10) / 10;
    const sheetsExt = Math.ceil((frontalArea * 1.2 * 1.15) / (extMat.area ?? 1) * 10) / 10;
    const costInt = sheetsInt * intMat.price; const costExt = sheetsExt * extMat.price;
    const handleCost = project.handleType === 'external' ? (project.drawers + project.doors) * prices.handle_external.price : 0;
    const costHard = (project.drawers * prices.slide.price) + (project.doors * 2 * prices.hinge.price) + handleCost + 200;
    const totalMat = costInt + costExt + costHard; const labor = totalMat * (project.laborRate / 100); const subtotal = totalMat + labor + (totalMat * 0.1); const profit = subtotal * (project.profitMargin / 100);
    return { total: subtotal + profit, mat: totalMat, labor, profit, sheetsInt, sheetsExt };
  }, [project]);
  return { calc, formatBRL: (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) };
};
