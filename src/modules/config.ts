import { House, MessageSquareText, FolderPlus, NotebookPen, CreditCard, Calculator, Scissors, FileSignature, ArrowUpFromLine, UsersRound, type LucideProps } from 'lucide-react';

export type ModuleCategory = 'intelligence' | 'portal' | 'studio' | 'finance' | 'production';
export interface ModuleConfig { id: string; label: string; mobileLabel: string; icon: React.ComponentType<LucideProps>; category: ModuleCategory; hidden?: boolean; }
export const MOBILE_NAV_IDS = ['dashboard', 'diario', 'studio'];
export const modules: ModuleConfig[] = [
  { id: 'dashboard', label: 'Início', mobileLabel: 'Início', icon: House, category: 'portal' },
  { id: 'inteligencia', label: 'Inteligência Operacional', mobileLabel: 'IARA', icon: MessageSquareText, category: 'intelligence', hidden: true },
  { id: 'novo', label: 'Novo Projeto', mobileLabel: 'Novo', icon: FolderPlus, category: 'portal', hidden: true },
  { id: 'clientes', label: 'Clientes', mobileLabel: 'Clientes', icon: UsersRound, category: 'portal' },
  { id: 'diario', label: 'Diário de Obra', mobileLabel: 'Diário', icon: NotebookPen, category: 'portal' },
  { id: 'billing', label: 'Créditos e Planos', mobileLabel: 'Créditos', icon: CreditCard, category: 'portal' },
  { id: 'studio', label: 'IARA', mobileLabel: 'IARA', icon: MessageSquareText, category: 'studio' },
  { id: 'elevator', label: 'Elevação de planta', mobileLabel: 'Elevação', icon: ArrowUpFromLine, category: 'studio', hidden: true },
  { id: 'orcamento', label: 'Orçamento', mobileLabel: 'Orçamento', icon: Calculator, category: 'finance' },
  { id: 'corte', label: 'Lista de Corte', mobileLabel: 'Corte', icon: Scissors, category: 'production' },
  { id: 'contrato', label: 'Contratos', mobileLabel: 'Contratos', icon: FileSignature, category: 'production' },
  { id: 'admin-billing', label: 'Administração de Créditos', mobileLabel: 'Admin', icon: CreditCard, category: 'portal', hidden: true },
];
export const CATEGORY_LABELS: Record<ModuleCategory, string> = { intelligence: 'Inteligência', portal: 'Projeto', studio: 'IARA', finance: 'Orçamento', production: 'Produção' };
