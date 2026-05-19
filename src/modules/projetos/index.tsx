import React from 'react';
import { DollarSign, Package, Scissors, Wand2, ArrowRight, Scale, History } from 'lucide-react';
import { Card, Button } from '@/components/marcenaria/shared';
import { formatBRL } from '@/utils/format';

interface Props {
  projectData: any;
  partsData: any[];
  navigateTo: (id: string) => void;
}

const Dashboard = ({ projectData, partsData, navigateTo }: Props) => {
  const totalArea = (projectData.width || 0) * (projectData.height || 0);
  const estimatedValue = totalArea * 2500 || 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white border-none">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-white/20 rounded-lg"><DollarSign size={20} /></div>
            <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded">+12%</span>
          </div>
          <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider">Faturamento Previsto</p>
          <h3 className="text-2xl font-bold mt-1">{formatBRL(estimatedValue)}</h3>
        </Card>

        <Card className="p-5">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><Package size={20} /></div>
            <span className="text-xs font-bold text-slate-400">Ativo</span>
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Projeto Atual</p>
          <h3 className="text-lg font-bold mt-1 text-slate-800 truncate">{projectData.width}×{projectData.height}m</h3>
        </Card>

        <Card className="p-5">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><Scissors size={20} /></div>
            <span className="text-xs font-bold text-slate-400">{partsData.length} peças</span>
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Produção</p>
          <div className="mt-1">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full transition-all" style={{ width: `${Math.min(partsData.length * 10, 100)}%` }} />
            </div>
            <p className="text-xs text-slate-500 mt-1">{partsData.length > 0 ? 'Em corte' : 'Aguardando peças'}</p>
          </div>
        </Card>

        <Card className="p-5 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all" onClick={() => navigateTo('studio')}>
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Wand2 size={20} /></div>
            <ArrowRight size={16} className="text-slate-300" />
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Nova Criação</p>
          <h3 className="text-lg font-bold mt-1 text-slate-800">Ir para Studio 3D</h3>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <History size={18} /> Ações Recentes
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Sistema Atualizado e Otimizado', time: 'Agora', color: 'bg-emerald-500' },
              { label: 'Projeto em andamento', time: `${projectData.width}×${projectData.height}m`, color: 'bg-indigo-500' },
              { label: `${partsData.length} peças no plano de corte`, time: 'Hoje', color: 'bg-amber-500' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 pb-3 border-b border-slate-100 last:border-0">
                <div className={`w-2 h-2 rounded-full ${item.color} shrink-0`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">{item.label}</p>
                  <p className="text-xs text-slate-400">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 bg-slate-900 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="font-bold text-lg mb-2">Precisa de Ajuda Jurídica?</h3>
            <p className="text-slate-400 text-sm mb-6 max-w-xs">
              Gere contratos blindados para o projeto atual com cláusulas geradas por IA.
            </p>
            <Button onClick={() => navigateTo('contrato')} variant="magic" className="w-full sm:w-auto text-sm">
              Gerar Contrato Agora
            </Button>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
            <Scale size={150} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Studio 3D', desc: 'Crie visualizações com IA', id: 'studio', color: 'from-indigo-500 to-purple-600', icon: Wand2 },
          { label: 'Orçamento', desc: 'Calcule custos e margens', id: 'orcamento', color: 'from-emerald-500 to-teal-600', icon: DollarSign },
          { label: 'Plano de Corte', desc: 'Otimize suas chapas', id: 'corte', color: 'from-amber-500 to-orange-600', icon: Scissors },
        ].map(m => (
          <Card
            key={m.id}
            className="p-5 cursor-pointer hover:shadow-md transition-all group"
            onClick={() => navigateTo(m.id)}
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center text-white mb-3 group-hover:scale-110 transition-transform`}>
              <m.icon size={20} />
            </div>
            <h4 className="font-bold text-slate-800">{m.label}</h4>
            <p className="text-xs text-slate-500 mt-0.5">{m.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
