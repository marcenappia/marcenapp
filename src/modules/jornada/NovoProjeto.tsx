import type { ProjectData } from '@/modules/projetos/types';
import React from 'react';
import { ArrowLeft, X, Camera, MessageSquare, Sparkles, Boxes, FileText, Factory, Scissors } from 'lucide-react';
import AuthDialog from '@/components/marcenaria/AuthDialog';
import { useNovoProjeto } from './hooks/useNovoProjeto';
import { ProgressoObra } from './components/ProgressoObra';
import { EtapaNome, EtapaFoto, EtapaPedido, EtapaAnalise, EtapaApresentacao, EtapaOrcamento } from './components/Etapas';

interface Props { projectId: string | null; setBudgetProject: React.Dispatch<React.SetStateAction<ProjectData>>; navigateTo: (id: string) => void; }

const JOURNEY = [
  { label: 'Foto', icon: Camera },
  { label: 'Pedido', icon: MessageSquare },
  { label: 'IARA', icon: Sparkles },
  { label: 'Projeto', icon: Boxes },
  { label: 'Orçamento', icon: FileText },
  { label: 'Produção', icon: Factory },
  { label: 'Corte', icon: Scissors },
];

/** Jornada guiada "Novo Projeto": uma ação principal por etapa, mobile-first. */
export const NovoProjeto = ({ projectId, setBudgetProject, navigateTo }: Props) => {
  const j = useNovoProjeto({ projectId, setBudgetProject });
  const journeyIndex = j.etapa <= 1 ? 0 : j.etapa === 2 ? 0 : j.etapa === 3 ? 1 : j.etapa === 4 ? 2 : j.etapa <= 6 ? 3 : 4;
  const renderEtapa = () => {
    switch (j.etapa) {
      case 1: return <EtapaNome nome={j.nome} setNome={j.setNome} clienteNome={j.clienteNome} setClienteNome={j.setClienteNome} onNext={j.salvarNome} loading={j.loading === 'salvando'} precisaLogin={!j.logado} />;
      case 2: return <EtapaFoto foto={j.foto?.dataUrl ?? null} onFile={j.escolherFoto} onClear={j.limparFoto} onNext={j.confirmarFoto} loading={j.loading === 'salvando'} />;
      case 3: return <EtapaPedido pedido={j.pedido} setPedido={j.setPedido} onNext={j.analisar} loading={j.loading === 'analisando'} />;
      case 4: return j.analise ? <EtapaAnalise analise={j.analise} respostas={j.respostas} setRespostas={j.setRespostas} onNext={j.gerarApresentacao} loading={j.loading === 'gerando'} /> : null;
      case 5:
      case 6: return <EtapaApresentacao imagem={j.imagem} ajuste={j.ajuste} setAjuste={j.setAjuste} onAjustar={j.ajustarApresentacao} onAprovar={j.registrarAprovacao} loading={j.loading === 'ajustando'} aprovando={j.loading === 'salvando'} nome={j.nome} />;
      default: return <EtapaOrcamento onOrcamento={() => navigateTo('orcamento')} onInicio={() => navigateTo('dashboard')} />;
    }
  };
  return <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
    <div className="flex items-center justify-between mb-4"><button type="button" onClick={j.etapa > 1 && j.etapa < 7 ? j.voltar : () => navigateTo('dashboard')} className="min-h-[44px] px-3 rounded-xl flex items-center gap-2 text-slate-600 hover:bg-slate-100 font-bold" aria-label={j.etapa > 1 ? 'Voltar um passo' : 'Voltar ao início'}><ArrowLeft size={20} /> {j.etapa > 1 && j.etapa < 7 ? 'Voltar' : 'Início'}</button>{j.nome && <span className="text-sm font-bold text-slate-500 truncate max-w-[50%]">{j.nome}</span>}</div>
    <div className="mb-5 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm overflow-x-auto"><div className="flex min-w-[620px] items-center justify-between gap-2">{JOURNEY.map((item, index) => { const Icon = item.icon; const active = index === journeyIndex; const done = index < journeyIndex; return <React.Fragment key={item.label}><div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide whitespace-nowrap ${active ? 'text-indigo-700' : done ? 'text-slate-600' : 'text-slate-400'}`}><span className={`w-7 h-7 rounded-full flex items-center justify-center ${active ? 'bg-indigo-600 text-white' : done ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}><Icon size={14}/></span>{item.label}</div>{index < JOURNEY.length - 1 && <div className={`h-px flex-1 min-w-3 ${index < journeyIndex ? 'bg-indigo-200' : 'bg-slate-200'}`} />}</React.Fragment>})}</div></div>
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 md:p-8 space-y-6"><ProgressoObra etapa={j.etapa} /><div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3"><p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">MARCENAPP · jornada do projeto</p><p className="text-sm text-slate-600 mt-1">A IARA acompanha o projeto e ajuda a levar as informações daqui até orçamento, produção e corte.</p></div>{j.erro && <div role="alert" className="rounded-2xl bg-red-50 border border-red-200 p-4 flex items-start gap-3"><p className="flex-1 text-red-700 font-semibold">{j.erro}</p><button type="button" onClick={j.limparErro} aria-label="Fechar aviso" className="text-red-400 hover:text-red-600"><X size={18}/></button></div>}{j.retomando ? <div className="space-y-3" role="status" aria-live="polite"><p className="text-slate-500 font-semibold">Buscando sua obra…</p><div className="h-24 rounded-2xl bg-slate-100 animate-pulse" /></div> : renderEtapa()}</div>
    <AuthDialog isOpen={j.showAuth} onClose={() => j.setShowAuth(false)} onSuccess={j.onAuthSuccess} />
  </div>;
};
export default NovoProjeto;
