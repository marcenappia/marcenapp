import { useMemo } from 'react';
import type { ProjectData } from '@/modules/projetos/types';

interface MaterialPrice {
  price: number;
  area?: number;
}

const prices: Record<string, MaterialPrice> = {
  mdf15_white: { price: 260.00, area: 5.08 },
  mdf18_white: { price: 290.00, area: 5.08 },
  mdf18_wood: { price: 495.00, area: 5.08 },
  mdf6_white: { price: 220.00, area: 5.08 },
  slide: { price: 28.00 },
  hinge: { price: 7.50 },
  handle_external: { price: 15.00 },
  handle_profile: { price: 45.00 },
  handle_cava: { price: 0.00 },
  hardware_setup: { price: 180.00 },
};

export const useOrcamento = (project: Partial<ProjectData>) => {
  const calc = useMemo(() => {
    const safeProject: Partial<ProjectData> = project ?? {};
    const width = Number(safeProject.width) || 0;
    const height = Number(safeProject.height) || 0;
    const depth = Number(safeProject.depth) || 0;
    const drawers = Number(safeProject.drawers) || 0;
    const doors = Number(safeProject.doors) || 0;
    const laborRate = Number(safeProject.laborRate) || 0;
    const profitMargin = Number(safeProject.profitMargin) || 0;

    const intMat = prices[safeProject.internalMaterial] || prices.mdf15_white;
    const extMat = prices[safeProject.externalMaterial] || prices.mdf18_white;
    const backMat = prices[safeProject.backMaterial] || prices.mdf6_white;

    const frontalArea = width * height;
    const sideArea = (height * depth) * 2;
    const topArea = width * depth;
    const totalFaceArea = frontalArea + sideArea + topArea;

    const sheetsInt = Math.max(1, Math.ceil((totalFaceArea * 0.85) / (intMat.area ?? 5.08)));
    const sheetsExt = Math.max(1, Math.ceil((totalFaceArea * 1.25) / (extMat.area ?? 5.08)));
    const sheetsBack = Math.max(1, Math.ceil((width * height * 0.55) / (backMat.area ?? 5.08)));

    const costInt = sheetsInt * intMat.price;
    const costExt = sheetsExt * extMat.price;
    const costBack = sheetsBack * backMat.price;

    const handleCost = safeProject.handleType === 'external'
      ? (drawers + doors) * prices.handle_external.price
      : (drawers + doors) * prices.handle_profile.price;

    const hardwareCost = (drawers * prices.slide.price) + (doors * 2 * prices.hinge.price) + handleCost + prices.hardware_setup.price;
    const totalMat = costInt + costExt + costBack + hardwareCost;

    const labor = totalMat * (laborRate / 100);
    const subtotal = totalMat + labor;
    const profit = subtotal * (profitMargin / 100);
    const total = subtotal + profit;

    return {
      total,
      mat: totalMat,
      labor,
      profit,
      sheetsInt,
      sheetsExt,
      sheetsBack,
      totalFaceArea,
    };
  }, [project]);

  return {
    calc,
    formatBRL: (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v),
  };
};
