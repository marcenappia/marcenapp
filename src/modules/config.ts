import { 
  Home, Wand2, ArrowUpFromLine, Calculator, Scissors, Scale, MessageSquare, Users, BookOpen
} from 'lucide-react';

export type ModuleCategory = 'intelligence' | 'portal' | 'studio' | 'finance' | 'production';

export interface ModuleConfig {
  id: string;
  label: string;
  mobileLabel: string;
  icon: any;
  category: ModuleCategory;
}

export const modules: ModuleConfig[] = [
  // CAMADA 2 — IARA (Inteligência)
  { id: 'chat', label: 'IARA Chat', mobileLabel: 'IARA', icon: MessageSquare, category: 'intelligence' },
  
  // CAMADA 1 — PORTAL (Gestão)
  { id: 'dashboard', label: 'Visão Geral', mobileLabel: 'Início', icon: Home, category: 'portal' },
  { id: 'clientes', label: 'Clientes', mobileLabel: 'Clientes', icon: Users, category: 'portal' },
  { id: 'diario', label: 'Diário de Obra', mobileLabel: 'Diário', icon: BookOpen, category: 'portal' },
  
  // CAMADA 3 — ESTÚDIO (Materialização)
  { id: 'studio', label: 'Studio 3D', mobileLabel: 'Studio', icon: Wand2, category: 'studio' },
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
  studio: 'Estúdio — Materialização',
  finance: 'Estela — Financeiro',
  production: 'Produção — Logística'
};
