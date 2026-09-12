import { Home, Wand2, Calculator, Package, Scale, Users, BookOpen, Plus, ArrowUpFromLine, Sparkles, CreditCard, type LucideProps } from 'lucide-react';

export type ModuleCategory = 'intelligence' | 'portal' | 'studio' | 'finance' | 'production';
export interface ModuleConfig { id: string; label: string; mobileLabel: string; icon: React.ComponentType<LucideProps>; category: ModuleCategory; hidden?: boolean; }
export const MOBILE_NAV_IDS = ['studio', 'diario', 'dashboard'];
export const modules: ModuleConfig[] = [
  { id: 'dashboard', label: 'Início', mobileLabel: 'Início', icon: Home, category: 'portal' },
  { id: 'inteligencia', label: 'Inteligência Operacional', mobileLabel: 'IARA', icon: Sparkles, category: 'intelligence' },
  { id: 'novo', label: 'Novo Projeto', mobileLabel: 'Novo', icon: Plus, category: 'portal', hidden: true },
  { id: 'clientes', label: 'Clientes', mobileLabel: 'Clientes', icon: Users, category: 'portal' },
  { id: 'diario', label: 'Diário de Obra', mobileLabel: 'Diário', icon: BookOpen, category: 'portal' },
  { id: 'billing', label: 'Créditos e Planos', mobileLabel: 'Créditos', icon: CreditCard, category: 'portal' },
  { id: 'studio', label: 'Estúdio', mobileLabel: 'IARA', icon: Wand2, category: 'studio' },
  // A elevação continua acessível por rota, mas deixa de competir com a IARA como módulo principal.
  { id: 'elevator', label: 'Elevação de planta', mobileLabel: 'Elevação', icon: ArrowUpFromLine, category: 'studio', hidden: true },
  { id: 'orcamento', label: 'Orçamento', mobileLabel: 'Orçamento', icon: Calculator, category: 'finance' },
  { id: 'corte', label: 'Lista de Corte', mobileLabel: 'Corte', icon: Package, category: 'production' },
  { id: 'contrato', label: 'Contratos', mobileLabel: 'Contratos', icon: Scale, category: 'production' },
  { id: 'admin-billing', label: 'Administração de Créditos', mobileLabel: 'Admin', icon: Scale, category: 'portal', hidden: true },
];
export const CATEGORY_LABELS: Record<ModuleCategory, string> = { intelligence: 'Inteligência', portal: 'Projeto', studio: 'Visualização', finance: 'Orçamento', production: 'Produção' };
