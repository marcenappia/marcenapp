import { 
  Home, Wand2, Calculator, Package, Scale, Users, BookOpen, Plus, ArrowUpFromLine
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type ModuleCategory = 'intelligence' | 'portal' | 'studio' | 'finance' | 'production';

export interface ModuleConfig {
  id: string;
  label: string;
  mobileLabel: string;
  icon: LucideIcon;
  category: ModuleCategory;
  hidden?: boolean;
}

// No celular, manter só as cinco ações mais frequentes. Os demais módulos ficam no menu.
export const MOBILE_NAV_IDS = ['dashboard', 'novo', 'diario', 'studio', 'orcamento'];

export const modules: ModuleConfig[] = [
  { id: 'dashboard', label: 'Início', mobileLabel: 'Início', icon: Home, category: 'portal' },
  { id: 'novo', label: 'Novo projeto', mobileLabel: 'Novo', icon: Plus, category: 'portal' },
  { id: 'clientes', label: 'Clientes', mobileLabel: 'Clientes', icon: Users, category: 'portal' },
  { id: 'diario', label: 'Diário de Obra', mobileLabel: 'Diário', icon: BookOpen, category: 'portal' },

  // CAMADA 2 — ESTÚDIO + IARA (Materialização & Cognição unificadas)
  { id: 'studio', label: 'Estúdio + IARA', mobileLabel: 'Studio', icon: Wand2, category: 'studio' },
  { id: 'elevator', label: 'Elevador Planta', mobileLabel: 'Planta', icon: ArrowUpFromLine, category: 'studio' },

  // FINANCEIRO — ESTELA
  { id: 'orcamento', label: 'Estela Financeiro', mobileLabel: 'Estela', icon: Calculator, category: 'finance' },

  // PRODUÇÃO (Operacional)
  { id: 'corte', label: 'Plano de Corte', mobileLabel: 'Corte', icon: Package, category: 'production' },
  { id: 'contrato', label: 'Contratos', mobileLabel: 'Legal', icon: Scale, category: 'production' },
];

export const CATEGORY_LABELS: Record<ModuleCategory, string> = {
  intelligence: 'IARA',
  portal: 'Gestão da obra',
  studio: 'Projeto e apresentação',
  finance: 'Orçamento',
  production: 'Produção',
};
