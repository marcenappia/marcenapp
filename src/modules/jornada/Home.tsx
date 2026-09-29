import React, { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Camera, ChevronRight, FolderOpen, Plus, Ruler, Users } from 'lucide-react';
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
      if (error) { setErro(true); setObras([]); } else {
        const rows = (data ?? []) as unknown as HomeProjectRow[];
        setObras(rows.map(p => ({ id: p.id, nome: p.nome || p.name || 'Obra sem nome', cliente: p.clientes?.nome ?? null, atualizadoEm: p.updated_at, etapa: etapaDaObra(p) })));
      }
      setCarregando(false);
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  const primeiroNome = profile?.name?.split(' ')[0];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 md:space-y-8">
      <header className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="min-w-0">
          <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Seu espaço de trabalho</p>
          <h2 className="text-3xl font-black tracking-[-0.03em] text-slate-950 md:text-4xl">{primeiroNome ? `Olá, ${primeiroNome}.` : 'Seu próximo projeto começa aqui.'}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Retome uma obra, registre uma visita ou abra diretamente a etapa que precisa resolver hoje.</p>
        </div>
        <button type="button" onClick={() => navigateTo('studio')} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 active:scale-[.99]"><Sparkles size={17} /> Registrar no Diário <ArrowRight size={15} /></button>
      </header>

      <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm md:p-7" aria-labelledby="start-work">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600"><FolderOpen size={13} /> Trabalho</div>
            <h3 id="start-work" className="mt-4 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">Comece pelo que está na sua frente.</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">Abra uma obra existente, registre uma visita ou desenvolva uma imagem a partir de uma foto. O sistema mantém o restante organizado.</p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => navigateTo('diario')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800"><BookOpen size={16} /> Registrar visita</button>
            <button type="button" onClick={() => navigateTo('studio')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 hover:bg-slate-50"><Ruler size={16} /> Desenvolver projeto</button>
          </div>
        </div>
      </section>
      <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm md:p-7" aria-labelledby="workspace-actions">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Acesso rápido</p>
            <h3 id="workspace-actions" className="mt-2 text-2xl font-black tracking-tight text-slate-950">Escolha a próxima etapa do trabalho.</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">Abra diretamente a área que você precisa e continue de onde parou.</p>
          </div>
          <button type="button" onClick={() => navigateTo('studio')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-800 hover:bg-slate-100"><Sparkles size={16} /> Desenvolver projeto</button>
        </div>
        <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['clientes','Clientes e obras','Retomar atendimento'],
            ['orcamento','Orçamentos','Valores e margens'],
            ['corte','Lista de corte','Preparar produção'],
            ['contrato','Contratos','Documentos do projeto']
          ].map(([id,title,desc]) => <button key={id} type="button" onClick={() => navigateTo(id)} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:bg-slate-50"><p className="text-sm font-black text-slate-900">{title}</p><p className="mt-1 text-xs text-slate-500">{desc}</p><ArrowRight size={14} className="mt-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-700"/></button>)}
        </div>
      </section>
      <section className="grid gap-3 sm:grid-cols-2" aria-label="Atalhos de trabalho">
        <button type="button" onClick={() => navigateTo('diario')} className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Camera size={18} /></div>
          <p className="mt-4 text-sm font-black text-slate-900">Registrar uma obra</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Foto, voz ou texto para guardar o contexto do cliente e da produção.</p>
          <ChevronRight size={15} className="mt-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-600" />
        </button>
        <button type="button" onClick={() => navigateTo('clientes')} className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Users size={18} /></div>
          <p className="mt-4 text-sm font-black text-slate-900">Clientes e obras</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Retome uma obra e continue de onde parou, sem perder o contexto.</p>
          <ChevronRight size={15} className="mt-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-600" />
        </button>
      </section>

      <section aria-labelledby="minhas-obras">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Continuidade</p><h3 id="minhas-obras" className="mt-1 text-xl font-black text-slate-900">Obras recentes</h3></div>
          <button type="button" onClick={() => navigateTo('clientes')} className="text-xs font-black text-slate-600 hover:text-slate-950">Ver clientes</button>
        </div>
        {!user && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-7 text-center"><p className="font-semibold text-slate-700">Entre na sua conta para ver e salvar suas obras.</p></div>}
        {user && erro && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5"><p className="font-black text-red-800">Não foi possível carregar suas obras.</p><p className="mt-1 text-sm text-red-700">Tente novamente em instantes.</p><button type="button" onClick={() => window.location.reload()} className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-black text-red-800 ring-1 ring-red-200">Tentar novamente</button></div>}
        {user && carregando && <div className="space-y-3" aria-label="Carregando obras" aria-busy="true"><div className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white" /><div className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white" /></div>}
        {user && !carregando && !erro && obras.length === 0 && <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Plus size={22} /></div><div className="flex-1"><p className="font-black text-slate-900">Ainda não há uma obra por aqui.</p><p className="mt-1 text-sm text-slate-500">Registre a primeira visita no Diário ou abra uma nova obra.</p></div><button type="button" onClick={() => navigateTo('studio')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">Abrir área de trabalho <ArrowRight size={15} /></button></div></div>}
        {user && !carregando && !erro && obras.length > 0 && <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{obras.map(o => { const pct = percentualObra(o.etapa); const etapa = ETAPAS_OBRA.find(e => e.id === o.etapa)?.label; const concluida = o.etapa >= 7; return <li key={o.id}><button type="button" onClick={() => navigateTo(concluida ? 'orcamento' : 'studio', { projeto: o.id })} className="group h-full w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-base font-black text-slate-900">{o.nome}</p><p className="mt-1 truncate text-xs text-slate-500">{o.cliente ? `${o.cliente} · ` : ''}{concluida ? 'Aprovada' : etapa}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${concluida ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{concluida ? 'Concluída' : 'Continuar'}</span></div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-900" style={{ width: `${Math.max(pct, 4)}%` }} /></div><div className="mt-2 flex items-center justify-between text-[10px] text-slate-400"><span>{Math.round(pct)}% da jornada</span><ChevronRight size={13} className="transition group-hover:translate-x-0.5" /></div></button></li>; })}</ul>}
      </section>
    </div>
  );
};
export default Home;
