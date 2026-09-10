import { Home, Wand2, Calculator, Package, Scale, Users, BookOpen, Plus, ArrowUpFromLine, Sparkles, type LucideProps } from 'lucide-react';

export type ModuleCategory = 'intelligence' | 'portal' | 'studio' | 'finance' | 'production';

export interface ModuleConfig {
  id: string;
  label: string;
  mobileLabel: string;
  icon: React.ComponentType<LucideProps>;
  category: ModuleCategory;
  /** Não aparece nos menus (acessado por botão/ação) */
  hidden?: boolean;
}

export const MOBILE_NAV_IDS = ['dashboard', 'novo', 'studio', 'orcamento', 'diario', 'corte'];

export const modules: ModuleConfig[] = [
  { id: 'dashboard', label: 'Início', mobileLabel: 'Início', icon: Home, category: 'portal' },
  { id: 'inteligencia', label: 'Inteligência Operacional', mobileLabel: 'IARA', icon: Sparkles, category: 'intelligence' },
  { id: 'novo', label: 'Novo Projeto', mobileLabel: 'Novo', icon: Plus, category: 'portal', hidden: true },
  { id: 'clientes', label: 'Clientes', mobileLabel: 'Clientes', icon: Users, category: 'portal' },
  { id: 'diario', label: 'Diário de Obra', mobileLabel: 'Diário', icon: BookOpen, category: 'portal' },
  { id: 'studio', label: 'Estúdio + IARA', mobileLabel: 'Studio', icon: Wand2, category: 'studio' },
  { id: 'elevator', label: 'Elevador Planta', mobileLabel: 'Planta', icon: ArrowUpFromLine, category: 'studio' },
  { id: 'orcamento', label: 'Estela Financeiro', mobileLabel: 'Estela', icon: Calculator, category: 'finance' },
  { id: 'corte', label: 'Plano de Corte', mobileLabel: 'Corte', icon: Package, category: 'production' },
  { id: 'contrato', label: 'Contratos', mobileLabel: 'Legal', icon: Scale, category: 'production' },
  { id: 'admin-billing', label: 'Administração de Créditos', mobileLabel: 'Créditos', icon: Scale, category: 'portal', hidden: true },
];

export const CATEGORY_LABELS: Record<ModuleCategory, string> = {
  intelligence: 'IARA — Cognição',
  portal: 'Portal — Operacional',
  studio: 'Estúdio + IARA — Materialização',
  finance: 'Estela — Financeiro',
  production: 'Produção — Logística'
};
