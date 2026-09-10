import React from 'react';
import { ArrowLeft, X } from 'lucide-react';
import AuthDialog from '@/components/marcenaria/AuthDialog';
import { useNovoProjeto } from './hooks/useNovoProjeto';
import { ProgressoObra } from './components/ProgressoObra';
import { EtapaNome, EtapaFoto, EtapaPedido, EtapaAnalise, EtapaApresentacao, EtapaOrcamento } from './components/Etapas';
import type { ProjectData } from '@/modules/projetos/types';

interface Props { projectId: string | null; setBudgetProject: React.Dispatch<React.SetStateAction<ProjectData>>; navigateTo: (id: string) => void; }
export const NovoProjeto = ({ projectId, setBudgetProject, navigateTo }: Props) => {
  const j = useNovoProjeto({ projectId, setBudgetProject });
  const renderEtapa = () => {
    switch (j.etapa) {
      case 1: return <EtapaNome nome={j.nome} setNome={j.setNome} clienteNome={j.clienteNome} setClienteNome={j.setClienteNome} onNext={j.salvarNome} loading={j.loading === 'salvando'} precisaLogin={!j.logado} />;
      case 2: return <EtapaFoto foto={j.foto?.dataUrl ?? null} onFile={j.escolherFoto} onClear={j.limparFoto} onNext={j.confirmarFoto} loading={j.loading === 'salvando'} />;
      case 3: return <EtapaPedido pedido={j.pedido} setPedido={j.setPedido} onNext={j.analisar} loading={j.loading === 'analisando'} />;
      case 4: return j.analise ? <EtapaAnalise analise={j.analise} respostas={j.respostas} setRespostas={j.setRespostas} onNext={j.gerarApresentacao} loading={j.loading === 'gerando'} /> : null;
      case 5: case 6: return <EtapaApresentacao imagem={j.imagem} ajuste={j.ajuste} setAjuste={j.setAjuste} onAjustar={j.ajustarApresentacao} onAprovar={j.registrarAprovacao} loading={j.loading === 'ajustando'} aprovando={j.loading === 'salvando'} nome={j.nome} />;
      default: return <EtapaOrcamento onOrcamento={() => navigateTo('orcamento')} onInicio={() => navigateTo('dashboard')} />;
    }
  };
  return <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300"><div className="flex items-center justify-between mb-4"><button type="button" onClick={j.etapa > 1 && j.etapa < 7 ? j.voltar : () => navigateTo('dashboard')} className="min-h-[44px] px-3 rounded-xl flex items-center gap-2 text-slate-600 hover:bg-slate-100 font-bold" aria-label={j.etapa > 1 ? 'Voltar um passo' : 'Voltar ao início'}><ArrowLeft size={20} /> {j.etapa > 1 && j.etapa < 7 ? 'Voltar' : 'Início'}</button>{j.nome && <span className="text-sm font-bold text-slate-500 truncate max-w-[50%]">{j.nome}</span>}</div><div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 md:p-8 space-y-6"><ProgressoObra etapa={j.etapa} />{j.erro && <div role="alert" className="rounded-2xl bg-red-50 border border-red-200 p-4 flex items-start gap-3"><p className="flex-1 text-red-700 font-semibold">{j.erro}</p><button type="button" onClick={j.limparErro} aria-label="Fechar aviso" className="text-red-400 hover:text-red-600"><X size={18} /></button></div>}{j.retomando ? <div className="space-y-3" role="status" aria-live="polite"><p className="text-slate-500 font-semibold">Buscando sua obra…</p><div className="h-24 rounded-2xl bg-slate-100 animate-pulse" /></div> : renderEtapa()}</div><AuthDialog isOpen={j.showAuth} onClose={() => j.setShowAuth(false)} onSuccess={j.onAuthSuccess} /></div>;
};
export default NovoProjeto;
