import { LayoutDashboard, MessageSquareText, FolderPlus, ClipboardList, WalletCards, Calculator, Scissors, FileText, ArrowUpFromLine, UsersRound, Activity, type LucideProps } from 'lucide-react';

export type ModuleCategory = 'intelligence' | 'portal' | 'studio' | 'finance' | 'production';
export interface ModuleConfig {
  id: string;
  label: string;
  mobileLabel: string;
  icon: React.ComponentType<LucideProps>;
  category: ModuleCategory;
  hidden?: boolean;
}

export const MOBILE_NAV_IDS = ['dashboard', 'diario', 'studio'];

export const modules: ModuleConfig[] = [
  { id: 'dashboard', label: 'Visão geral', mobileLabel: 'Início', icon: LayoutDashboard, category: 'portal' },
  { id: 'inteligencia', label: 'Inteligência Operacional', mobileLabel: 'IARA', icon: Activity, category: 'intelligence', hidden: true },
  { id: 'novo', label: 'Novo projeto', mobileLabel: 'Novo', icon: FolderPlus, category: 'portal', hidden: true },
  { id: 'clientes', label: 'Clientes', mobileLabel: 'Clientes', icon: UsersRound, category: 'portal' },
  { id: 'diario', label: 'Diário de obra', mobileLabel: 'Diário', icon: ClipboardList, category: 'portal' },
  { id: 'billing', label: 'Créditos e planos', mobileLabel: 'Créditos', icon: WalletCards, category: 'finance' },
  { id: 'studio', label: 'IARA · Projetos e renders', mobileLabel: 'IARA', icon: MessageSquareText, category: 'studio' },
  { id: 'elevator', label: 'Elevação de planta', mobileLabel: 'Elevação', icon: ArrowUpFromLine, category: 'studio', hidden: true },
  { id: 'orcamento', label: 'Orçamento', mobileLabel: 'Orçamento', icon: Calculator, category: 'finance' },
  { id: 'corte', label: 'Lista de corte', mobileLabel: 'Corte', icon: Scissors, category: 'production' },
  { id: 'contrato', label: 'Contratos', mobileLabel: 'Contratos', icon: FileText, category: 'production' },
  { id: 'admin-billing', label: 'Administração de créditos', mobileLabel: 'Admin', icon: WalletCards, category: 'portal', hidden: true },
];

export const CATEGORY_LABELS: Record<ModuleCategory, string> = {
  intelligence: 'Inteligência',
  portal: 'Gestão',
  studio: 'Projetos',
  finance: 'Financeiro',
  production: 'Produção',
};
