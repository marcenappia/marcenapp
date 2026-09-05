import { 
  Home, Wand2, ArrowUpFromLine, Calculator, Scissors, Scale, Users, BookOpen, Plus
} from 'lucide-react';

export type ModuleCategory = 'intelligence' | 'portal' | 'studio' | 'finance' | 'production';

export interface ModuleConfig {
  id: string;
  label: string;
  mobileLabel: string;
  icon: any;
  category: ModuleCategory;
  /** Não aparece nos menus (acessado por botão/ação) */
  hidden?: boolean;
}

/** Itens do menu inferior no celular (ordem importa) */
export const MOBILE_NAV_IDS = ['dashboard', 'novo', 'studio', 'orcamento', 'corte'];

export const modules: ModuleConfig[] = [
  // CAMADA 1 — PORTAL (Gestão)
  { id: 'dashboard', label: 'Início', mobileLabel: 'Início', icon: Home, category: 'portal' },
  { id: 'novo', label: 'Novo Projeto', mobileLabel: 'Novo', icon: Plus, category: 'portal', hidden: true },
  { id: 'clientes', label: 'Clientes', mobileLabel: 'Clientes', icon: Users, category: 'portal' },
  { id: 'diario', label: 'Diário de Obra', mobileLabel: 'Diário', icon: BookOpen, category: 'portal' },

  // CAMADA 2 — ESTÚDIO + IARA (Materialização & Cognição unificadas)
  { id: 'studio', label: 'Estúdio + IARA', mobileLabel: 'Studio', icon: Wand2, category: 'studio' },
  { id: 'elevator', label: 'Elevador Planta', mobileLabel: 'Planta', icon: ArrowUpFromLine, category: 'studio' },

  // FINANCEIRO — ESTELA
  { id: 'orcamento', label: 'Estela Financeiro', mobileLabel: 'Estela', icon: Calculator, category: 'finance' },

  // PRODUÇÃO (Operacional)
  { id: 'corte', label: 'Plano de Corte', mobileLabel: 'Corte', icon: Scissors, category: 'production' },
  { id: 'contrato', label: 'Contratos', mobileLabel: 'Legal', icon: Scale, category: 'production' },
];

export const CATEGORY_LABELS: Record<ModuleCategory, string> = {
  intelligence: 'IARA — Cognição',
  portal: 'Portal — Operacional',
  studio: 'Estúdio + IARA — Materialização',
  finance: 'Estela — Financeiro',
  production: 'Produção — Logística'
};
