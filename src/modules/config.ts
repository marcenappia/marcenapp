import {
  Home, Wand2, ArrowUpFromLine, Calculator, Scissors, Scale, Users, BookOpen, Plus, Factory,
} from 'lucide-react';

export type ModuleCategory = 'intelligence' | 'portal' | 'studio' | 'finance' | 'production';

export interface ModuleConfig {
  id: string;
  label: string;
  mobileLabel: string;
  icon: any;
  category: ModuleCategory;
  hidden?: boolean;
}

// No celular, manter só as cinco ações mais frequentes. Os demais módulos ficam no menu.
export const MOBILE_NAV_IDS = ['dashboard', 'novo', 'diario', 'studio', 'orcamento'];

export const modules: ModuleConfig[] = [
  { id: 'dashboard', label: 'Início', mobileLabel: 'Início', icon: Home, category: 'portal' },
  { id: 'novo', label: 'Novo projeto', mobileLabel: 'Novo', icon: Plus, category: 'portal', hidden: true },
  { id: 'clientes', label: 'Clientes', mobileLabel: 'Clientes', icon: Users, category: 'portal' },
  { id: 'diario', label: 'Diário de obra', mobileLabel: 'Diário', icon: BookOpen, category: 'portal' },
  { id: 'studio', label: 'Estúdio', mobileLabel: 'Estúdio', icon: Wand2, category: 'studio' },
  { id: 'elevator', label: 'Elevar planta', mobileLabel: 'Planta', icon: ArrowUpFromLine, category: 'studio' },
  { id: 'orcamento', label: 'Orçamento', mobileLabel: 'Orçamento', icon: Calculator, category: 'finance' },
  { id: 'producao', label: 'Produção', mobileLabel: 'Produção', icon: Factory, category: 'production' },
  { id: 'corte', label: 'Plano de corte', mobileLabel: 'Corte', icon: Scissors, category: 'production' },
  { id: 'contrato', label: 'Contratos', mobileLabel: 'Contratos', icon: Scale, category: 'production' },
];

export const CATEGORY_LABELS: Record<ModuleCategory, string> = {
  intelligence: 'IARA',
  portal: 'Gestão da obra',
  studio: 'Projeto e apresentação',
  finance: 'Orçamento',
  production: 'Produção',
};
