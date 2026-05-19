import { 
  Home, Wand2, ArrowUpFromLine, Calculator, Scissors, Scale, MessageSquare
} from 'lucide-react';

export const modules = [
  { id: 'chat', label: 'IARA Chat', mobileLabel: 'Chat', icon: MessageSquare },
  { id: 'dashboard', label: 'Visão Geral', mobileLabel: 'Início', icon: Home },
  { id: 'studio', label: 'Studio 3D', mobileLabel: 'Studio', icon: Wand2 },
  { id: 'elevator', label: 'Elevador Planta', mobileLabel: 'Planta', icon: ArrowUpFromLine },
  { id: 'orcamento', label: 'Orçamento', mobileLabel: 'Custo', icon: Calculator },
  { id: 'corte', label: 'Plano de Corte', mobileLabel: 'Corte', icon: Scissors },
  { id: 'contrato', label: 'Contrato', mobileLabel: 'Legal', icon: Scale },
];
