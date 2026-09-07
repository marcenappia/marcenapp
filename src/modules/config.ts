import { 
  Home, Wand2, ArrowUpFromLine, Calculator, Scissors, Scale, Users, BookOpen, Plus, Factory
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

// Diário é uma etapa operacional de uso frequente no celular: mantê-lo visível na navegação móvel.
export const MOBILE_NAV_IDS = ['dashboard', 'novo', 'diario', 'studio', 'orcamento', 'producao', 'corte'];

export const modules: ModuleConfig[] = [
  { id: 'dashboard', label: 'Início', mobileLabel: 'Início', icon: Home, category: 'portal' },
  { id: 'novo', label: 'Novo Projeto', mobileLabel: 'Novo', icon: Plus, category: 'portal', hidden: true },
  { id: 'clientes', label: 'Clientes', mobileLabel: 'Clientes', icon: Users, category: 'portal' },
  { id: 'diario', label: 'Diário de Obra', mobileLabel: 'Diário', icon: BookOpen, category: 'portal' },
  { id: 'studio', label: 'Estúdio', mobileLabel: 'Studio', icon: Wand2, category: 'studio' },
  { id: 'elevator', label: 'Elevador Planta', mobileLabel: 'Planta', icon: ArrowUpFromLine, category: 'studio' },
  { id: 'orcamento', label: 'Estela Financeiro', mobileLabel: 'Estela', icon: Calculator, category: 'finance' },
  { id: 'producao', label: 'Produção', mobileLabel: 'Produção', icon: Factory, category: 'production' },
  { id: 'corte', label: 'Plano de Corte', mobileLabel: 'Corte', icon: Scissors, category: 'production' },
  { id: 'contrato', label: 'Contratos', mobileLabel: 'Legal', icon: Scale, category: 'production' },
];

export const CATEGORY_LABELS: Record<ModuleCategory, string> = {
  intelligence: 'IARA — Cognição',
  portal: 'Portal — Operacional',
  studio: 'Estúdio — Materialização',
  finance: 'Estela — Financeiro',
  production: 'Produção — Logística'
};