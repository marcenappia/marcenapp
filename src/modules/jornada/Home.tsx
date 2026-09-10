import React, { useEffect, useState } from 'react';
import { Plus, Hammer, ChevronRight, Camera, MessageSquareText, Sparkles, Calculator } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { carregarProgresso, ETAPAS_OBRA, percentualObra, EtapaId } from './types';

interface ObraResumo { id: string; nome: string; cliente?: string | null; atualizadoEm: string; etapa: EtapaId; }
const etapaDaObra = (p: { id: string; status?: string | null; jornada?: unknown }): EtapaId => {
  const aprovado = p.status === 'aprovado' || p.status === 'em_producao' || p.status === 'concluido';
  const remota = (p.jornada && typeof p.jornada === 'object' ? (p.jornada as { etapa?: number }).etapa : undefined);
  const local = carregarProgresso(p.id)?.etapa;
  const etapa = remota ?? local ?? 1;
  return (aprovado ? Math.max(etapa, 7) : etapa) as EtapaId;
};
interface Props { navigateTo: (id: string, params?: Record<string, string>) => void; }

export const Home = ({ navigateTo }: Props) => {
  const { user, profile } = useAuth();
  const [obras, setObras] = useState<ObraResumo[]>([]);
  const [carregando, setCarregando] = useState(false);
  const userId = user?.id;
  useEffect(() => {
    if (!userId) { setObras([]); return; }
    setCarregando(true);
    supabase.from('projects').select('id, nome, name, updated_at, status, jornada, clientes(nome)').eq('user_id', userId).order('updated_at', { ascending: false }).limit(20).then(({ data }) => {
      const lista: ObraResumo[] = (data ?? []).map(p => ({ id: p.id, nome: p.nome || p.name || 'Obra sem nome', cliente: p.clientes?.nome ?? null, atualizadoEm: p.updated_at, etapa: etapaDaObra(p) }));
      setObras(lista); setCarregando(false);
    });
  }, [userId]);
  const primeiroNome = profile?.name?.split(' ')[0];
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div><h2 className="text-2xl md:text-3xl font-black text-slate-900">{primeiroNome ? `Olá, ${primeiroNome}!` : 'Bem-vindo à sua marcenaria'}</h2><p className="text-slate-500 mt-1">Comece uma obra nova ou continue de onde parou.</p></div>
      <button type="button" id="btn-novo-projeto" onClick={() => navigateTo('novo')} className="w-full min-h-[88px] rounded-3xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-4 px-6 shadow-xl shadow-indigo-600/25 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"><span className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0"><Plus size={32} strokeWidth={3} /></span><span className="text-left"><span className="block text-2xl font-black leading-none">NOVO PROJETO</span><span className="block text-indigo-100 text-sm mt-1">Foto do ambiente → pedido do cliente → apresentação</span></span><ChevronRight size={28} className="ml-auto opacity-70" /></button>
      <section aria-labelledby="minhas-obras"><h3 id="minhas-obras" className="text-lg font-black text-slate-800 mb-3 flex items-center gap-2"><Hammer size={20} /> Minhas obras</h3>
        {!user && <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 text-center"><p className="text-slate-700 font-semibold">Entre na sua conta para ver e salvar suas obras.</p><p className="text-slate-500 text-sm mt-1">Você pode começar um projeto agora — pediremos o acesso só quando for salvar.</p></div>}
        {user && !carregando && obras.length === 0 && <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6"><p className="text-slate-800 font-bold text-lg">Nenhuma obra ainda</p><p className="text-slate-500 mt-1">Em 3 passos você já tem uma imagem para mostrar ao cliente:</p><ol className="mt-4 space-y-3">{[{ icon: Camera, t: 'Tire uma foto do ambiente' }, { icon: MessageSquareText, t: 'Escreva o que o cliente quer' }, { icon: Sparkles, t: 'A IARA confere e monta a apresentação' }].map(({ icon: I, t }, i) => <li key={t} className="flex items-center gap-3 text-slate-700"><span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-sm">{i + 1}</span><I size={18} className="text-indigo-500" /><span className="font-semibold">{t}</span></li>)}</ol></div>}
        {carregando && <div className="h-20 rounded-2xl bg-slate-100 animate-pulse" />}
        <ul className="space-y-3">{obras.map(o => { const pct = percentualObra(o.etapa); const etapa = ETAPAS_OBRA.find(e => e.id === o.etapa)?.label; const concluida = o.etapa >= 7; return <li key={o.id}><button type="button" onClick={() => navigateTo(concluida ? 'orcamento' : 'novo', { projeto: o.id })} className="w-full text-left rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md p-4 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="font-extrabold text-slate-900 text-lg truncate">{o.nome}</p><p className="text-sm text-slate-500 truncate">{o.cliente ? `${o.cliente} · ` : ''}{concluida ? 'Aprovada — ver orçamento' : `Próximo passo: ${etapa}`}</p></div><span className={`shrink-0 text-sm font-black px-3 py-1.5 rounded-full ${concluida ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>{concluida ? <Calculator size={16} /> : 'Continuar'}</span></div><div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full rounded-full ${concluida ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${Math.max(pct, 4)}%` }} /></div></button></li>; })}</ul>
      </section>
    </div>
  );
};
export default Home;
