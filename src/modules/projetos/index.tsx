import React from 'react';
import { DollarSign, Package, Scissors, Wand2, ArrowRight, History } from 'lucide-react';
import { Card } from '@/components/marcenaria/shared';
import type { ProjectData } from './types';

interface Props { projectData: ProjectData; partsData: unknown[]; navigateTo: (id: string) => void; }

const Dashboard = ({ projectData, partsData, navigateTo }: Props) => {
  const hasProject = Boolean(projectData.id);
  const dimensions = [projectData.width, projectData.height, projectData.depth].every(value => Number.isFinite(value) && value > 0);
  const partsCount = partsData.length;

  return <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-0">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="p-5">
        <div className="flex justify-between items-start mb-4"><div className="p-2 bg-muted rounded-lg"><DollarSign size={20} /></div><span className="text-xs font-medium text-muted-foreground">Dados reais</span></div>
        <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Orçamento</p>
        <h3 className="text-lg font-bold mt-1 text-foreground">{hasProject ? 'Consultar orçamento' : 'Sem projeto'}</h3>
        <p className="text-xs text-muted-foreground mt-1">Nenhum valor é estimado nesta tela.</p>
      </Card>
      <Card className="p-5">
        <div className="flex justify-between items-start mb-4"><div className="p-2 bg-muted rounded-lg"><Package size={20} /></div><span className="text-xs font-medium text-muted-foreground">{hasProject ? 'Ativo' : 'Não definido'}</span></div>
        <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Projeto atual</p>
        <h3 className="text-lg font-bold mt-1 text-foreground truncate">{dimensions ? `${projectData.width} × ${projectData.height} × ${projectData.depth}` : 'Dimensões não informadas'}</h3>
      </Card>
      <Card className="p-5">
        <div className="flex justify-between items-start mb-4"><div className="p-2 bg-muted rounded-lg"><Scissors size={20} /></div><span className="text-xs font-medium text-muted-foreground">{partsCount} peças</span></div>
        <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Produção</p>
        <h3 className="text-lg font-bold mt-1 text-foreground">{partsCount > 0 ? `${partsCount} peças no plano atual` : 'Nenhuma peça registrada'}</h3>
      </Card>
      <Card className="p-5 cursor-pointer hover:border-primary/40 hover:shadow-md transition-all" onClick={() => navigateTo('studio')}>
        <div className="flex justify-between items-start mb-4"><div className="p-2 bg-muted rounded-lg"><Wand2 size={20} /></div><ArrowRight size={16} className="text-muted-foreground" /></div>
        <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Criação</p>
        <h3 className="text-lg font-bold mt-1 text-foreground">Ir para Studio 3D</h3>
      </Card>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6"><h3 className="font-bold text-foreground mb-4 flex items-center gap-2"><History size={18} /> Estado do projeto</h3><div className="space-y-3"><div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-muted-foreground shrink-0" /><div><p className="text-sm font-medium text-foreground">{hasProject ? 'Projeto persistido' : 'Projeto ainda não persistido'}</p><p className="text-xs text-muted-foreground">{hasProject ? `ID ${projectData.id}` : 'Crie ou carregue um projeto para continuar.'}</p></div></div><div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-muted-foreground shrink-0" /><div><p className="text-sm font-medium text-foreground">Materiais</p><p className="text-xs text-muted-foreground">{projectData.externalMaterial || 'Não informado'}</p></div></div><div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-muted-foreground shrink-0" /><div><p className="text-sm font-medium text-foreground">Ferragens / puxadores</p><p className="text-xs text-muted-foreground">{projectData.handleType || 'Não informado'}</p></div></div></div></Card>
      <Card className="p-6"><h3 className="font-bold text-foreground mb-2">Ações do projeto</h3><p className="text-sm text-muted-foreground mb-5">Use os dados persistidos para continuar o trabalho, sem indicadores ou valores inventados.</p><div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><button type="button" onClick={() => navigateTo('studio')} className="rounded-lg border border-border p-3 text-left hover:bg-muted"><Wand2 size={18} /><span className="block text-sm font-semibold mt-2">Studio 3D</span></button><button type="button" onClick={() => navigateTo('orcamento')} className="rounded-lg border border-border p-3 text-left hover:bg-muted"><DollarSign size={18} /><span className="block text-sm font-semibold mt-2">Orçamento</span></button><button type="button" onClick={() => navigateTo('corte')} className="rounded-lg border border-border p-3 text-left hover:bg-muted"><Scissors size={18} /><span className="block text-sm font-semibold mt-2">Plano de corte</span></button></div></Card>
    </div>
  </div>;
};

export default Dashboard;
