import React from 'react';
import { DollarSign, Package, Scissors, Wand2, ArrowRight, Scale, History } from 'lucide-react';
import { Card, Button } from '@/components/marcenaria/shared';
import type { ProjectData } from './types';
interface Props { projectData: ProjectData; partsData: unknown[]; navigateTo: (id: string) => void; }
const Dashboard = ({ projectData, partsData, navigateTo }: Props) => (
  <div className="space-y-6 pb-20 md:pb-0">
    <section aria-label="Resumo do projeto" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="border-slate-200 p-5">
        <div className="mb-4 flex items-start justify-between"><div className="rounded-lg bg-slate-100 p-2 text-slate-700" aria-hidden="true"><Package size={20} /></div><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">Ativo</span></div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Projeto atual</p>
        <h3 className="mt-1 truncate text-lg font-bold text-slate-900">{projectData.width} × {projectData.height} m</h3>
      </Card>
      <Card className="border-slate-200 p-5">
        <div className="mb-4 flex items-start justify-between"><div className="rounded-lg bg-amber-50 p-2 text-amber-700" aria-hidden="true"><Scissors size={20} /></div><span className="text-xs font-semibold text-slate-500">{partsData.length} peças</span></div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Produção</p>
        <div className="mt-2"><div className="h-2 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden="true"><div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${Math.min(partsData.length * 10, 100)}%` }} /></div><p className="mt-1.5 text-xs text-slate-500">{partsData.length > 0 ? 'Em corte' : 'Aguardando peças'}</p></div>
      </Card>
      <Card className="group cursor-pointer border-slate-200 p-5 transition-shadow hover:border-slate-300 hover:shadow-md" onClick={() => navigateTo('studio')}>
        <div className="mb-4 flex items-start justify-between"><div className="rounded-lg bg-slate-100 p-2 text-slate-700" aria-hidden="true"><Wand2 size={20} /></div><ArrowRight size={16} className="text-slate-400 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Próximo passo</p><h3 className="mt-1 text-lg font-bold text-slate-900">Abrir Studio 3D</h3>
      </Card>
      <Card className="group cursor-pointer border-slate-200 p-5 transition-shadow hover:border-slate-300 hover:shadow-md" onClick={() => navigateTo('orcamento')}>
        <div className="mb-4 flex items-start justify-between"><div className="rounded-lg bg-slate-100 p-2 text-slate-700" aria-hidden="true"><DollarSign size={20} /></div><ArrowRight size={16} className="text-slate-400 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Dados comerciais</p><h3 className="mt-1 text-lg font-bold text-slate-900">Abrir orçamento</h3>
      </Card>
    </section>
    <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="p-5 sm:p-6"><h3 className="mb-4 flex items-center gap-2 font-bold text-slate-900"><History size={18} aria-hidden="true" /> Ações recentes</h3><div className="space-y-3">{[{ label: 'Projeto em andamento', time: `${projectData.width} × ${projectData.height} m`, color: 'bg-slate-500' }, { label: `${partsData.length} peças no plano de corte`, time: 'Atual', color: 'bg-amber-500' }].map((item, i) => <div key={i} className="flex items-center gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0"><div className={`h-2 w-2 shrink-0 rounded-full ${item.color}`} aria-hidden="true" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-700">{item.label}</p><p className="text-xs text-slate-400">{item.time}</p></div></div>)}</div></Card>
      <Card className="relative overflow-hidden border-slate-800 bg-slate-900 p-5 text-white sm:p-6"><div className="relative z-10"><h3 className="mb-2 text-lg font-bold">Documentação do projeto</h3><p className="mb-6 max-w-sm text-sm leading-6 text-slate-300">Organize a documentação contratual do projeto atual antes de seguir para a produção.</p><Button onClick={() => navigateTo('contrato')} variant="magic" className="w-full text-sm sm:w-auto">Abrir contratos</Button></div><div className="pointer-events-none absolute bottom-0 right-0 opacity-10" aria-hidden="true"><Scale size={150} /></div></Card>
    </section>
    <section aria-label="Acessos rápidos" className="grid grid-cols-1 gap-4 sm:grid-cols-3">{[{ label: 'Studio 3D', desc: 'Crie visualizações do projeto', id: 'studio', icon: Wand2 }, { label: 'Orçamento', desc: 'Consulte custos e margens', id: 'orcamento', icon: DollarSign }, { label: 'Plano de corte', desc: 'Organize suas chapas', id: 'corte', icon: Scissors }].map(m => <Card key={m.id} className="group cursor-pointer border-slate-200 p-5 transition-shadow hover:border-slate-300 hover:shadow-md" onClick={() => navigateTo(m.id)}><div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700" aria-hidden="true"><m.icon size={20} /></div><h4 className="font-bold text-slate-900">{m.label}</h4><p className="mt-0.5 text-xs leading-5 text-slate-500">{m.desc}</p></Card>)}</section>
  </div>
);
export default Dashboard;
