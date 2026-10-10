import React, { useEffect, useState } from 'react';
import { ArrowRight, BriefcaseBusiness, Camera, Calculator, ChevronRight, ClipboardList, FolderOpen, Plus, Scissors, Sparkles, UsersRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { carregarProgresso, ETAPAS_OBRA, percentualObra, EtapaId } from './types';

interface ObraResumo { id: string; nome: string; cliente?: string | null; atualizadoEm: string; etapa: EtapaId; }
type HomeProjectRow = { id: string; nome?: string | null; name?: string | null; updated_at: string; status?: string | null; jornada?: unknown; clientes?: { nome?: string | null } | null };
const etapaDaObra = (p: { id: string; status?: string | null; jornada?: unknown }): EtapaId => {
  const concluida = p.status === 'aprovado' || p.status === 'em_producao' || p.status === 'concluido';
  const remota = p.jornada && typeof p.jornada === 'object' ? (p.jornada as { etapa?: number }).etapa : undefined;
  const local = carregarProgresso(p.id)?.etapa;
  return (concluida ? Math.max(remota ?? local ?? 1, 7) : (remota ?? local ?? 1)) as EtapaId;
};
interface Props { navigateTo: (id: string, params?: Record<string, string>) => void; }

const quickLinks = [
  { id: 'clientes', title: 'Clientes e obras', description: 'Acompanhe atendimentos e projetos.', icon: UsersRound },
  { id: 'orcamento', title: 'Orçamento', description: 'Revise custos, preço e margem.', icon: Calculator },
  { id: 'corte', title: 'Lista de corte', description: 'Organize peças para a produção.', icon: Scissors },
  { id: 'diario', title: 'Diário de obra', description: 'Registre visitas e andamento.', icon: ClipboardList },
];

export const Home = ({ navigateTo }: Props) => {
  const { user, profile } = useAuth();
  const [obras, setObras] = useState<ObraResumo[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (!user?.id) { setObras([]); return; }
    let cancelled = false;
    setCarregando(true);
    setErro(false);
    void supabase.from('projects').select('id, nome, name, updated_at, status, jornada, clientes(nome)').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(20).then(({ data, error }) => {
      if (cancelled) return;
      if (error) { setErro(true); setObras([]); }
      else {
        const rows = (data ?? []) as unknown as HomeProjectRow[];
        setObras(rows.map(p => ({ id: p.id, nome: p.nome || p.name || 'Obra sem nome', cliente: p.clientes?.nome ?? null, atualizadoEm: p.updated_at, etapa: etapaDaObra(p) })));
      }
      setCarregando(false);
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  const primeiroNome = profile?.name?.split(' ')[0];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-7 md:space-y-9">
      <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Painel de trabalho</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">{primeiroNome ? `Olá, ${primeiroNome}.` : 'Tudo pronto para continuar?'}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Seus clientes, projetos e produção organizados em um só lugar.</p>
        </div>
        <button type="button" onClick={() => navigateTo('studio')} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
          <Sparkles size={17} /> Abrir IARA <ArrowRight size={16} />
        </button>
      </header>

      <section aria-labelledby="start-work">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><FolderOpen size={19} /></span>
          <div><h2 id="start-work" className="text-base font-bold text-slate-900">Acessos rápidos</h2><p className="mt-0.5 text-sm text-slate-500">Vá direto à área que você precisa.</p></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map(item => <button key={item.id} type="button" onClick={() => navigateTo(item.id)} className="group flex min-h-28 items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition group-hover:bg-blue-50 group-hover:text-blue-700"><item.icon size={19} /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-900">{item.title}</span><span className="mt-1 block text-xs leading-5 text-slate-600">{item.description}</span></span>
            <ChevronRight size={16} className="mt-1 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-700" />
          </button>)}
        </div>
      </section>

      <section aria-labelledby="minhas-obras">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Continuidade</p><h2 id="minhas-obras" className="mt-1 text-xl font-bold tracking-tight text-slate-900">Projetos recentes</h2></div>
          <button type="button" onClick={() => navigateTo('clientes')} className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">Ver todos <ArrowRight size={15} /></button>
        </div>
        {!user && <div className="rounded-xl border border-dashed border-slate-300 bg-white p-7 text-center"><BriefcaseBusiness className="mx-auto mb-3 text-slate-400" size={24} /><p className="font-semibold text-slate-800">Entre na sua conta para ver seus projetos.</p><p className="mt-1 text-sm text-slate-600">Seus dados ficam organizados por cliente e obra.</p></div>}
        {user && erro && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5"><p className="font-semibold text-red-800">Não foi possível carregar os projetos.</p><p className="mt-1 text-sm text-red-700">Tente novamente em instantes.</p><button type="button" onClick={() => window.location.reload()} className="mt-3 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-red-800 ring-1 ring-red-200">Tentar novamente</button></div>}
        {user && carregando && <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="Carregando projetos" aria-busy="true">{[1,2,3].map(n => <div key={n} className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white" />)}</div>}
        {user && !carregando && !erro && obras.length === 0 && <div className="rounded-xl border border-slate-200 bg-white p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Plus size={21} /></span><div className="flex-1"><p className="font-semibold text-slate-900">Nenhum projeto recente</p><p className="mt-1 text-sm text-slate-600">Abra a IARA para iniciar um projeto ou renderizar a partir de uma foto.</p></div><button type="button" onClick={() => navigateTo('studio')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Iniciar projeto <ArrowRight size={15} /></button></div></div>}
        {user && !carregando && !erro && obras.length > 0 && <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{obras.map(o => { const pct = percentualObra(o.etapa); const etapa = ETAPAS_OBRA.find(e => e.id === o.etapa)?.label; const concluida = o.etapa >= 7; return <li key={o.id}><button type="button" onClick={() => navigateTo(concluida ? 'orcamento' : 'studio', { projeto: o.id })} className="group h-full w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{o.nome}</p><p className="mt-1 truncate text-xs text-slate-600">{o.cliente ? `${o.cliente} · ` : ''}{concluida ? 'Aprovada' : etapa}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${concluida ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{concluida ? 'Concluído' : 'Continuar'}</span></div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(pct, 4)}%` }} /></div><div className="mt-2 flex items-center justify-between text-xs text-slate-500"><span>{Math.round(pct)}% da jornada</span><ChevronRight size={14} className="transition group-hover:translate-x-0.5" /></div></button></li>; })}</ul>}
      </section>
    </div>
  );
};
export default Home;
