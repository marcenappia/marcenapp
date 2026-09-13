import React, { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Camera, ChevronRight, CreditCard, Flame, Hammer, Plus, Sparkles, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { carregarProgresso, ETAPAS_OBRA, percentualObra, EtapaId } from './types';

interface ObraResumo { id: string; nome: string; cliente?: string | null; atualizadoEm: string; etapa: EtapaId; }
interface Gamification { xp: number; level: number; streak_days: number; }
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
  const [gamification, setGamification] = useState<Gamification | null>(null);

  useEffect(() => {
    if (!user?.id) { setObras([]); setGamification(null); return; }
    setCarregando(true);
    supabase.from('projects').select('id, nome, name, updated_at, status, jornada, clientes(nome)').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(20).then(({ data }) => {
      const rows = (data ?? []) as unknown as Array<{ id: string; nome: string | null; name: string | null; updated_at: string; status?: string | null; jornada?: unknown; clientes?: { nome: string | null } | null }>;
      setObras(rows.map(p => ({ id: p.id, nome: p.nome || p.name || 'Obra sem nome', cliente: p.clientes?.nome ?? null, atualizadoEm: p.updated_at, etapa: etapaDaObra(p) })));
      setCarregando(false);
    });
    supabase.rpc('register_gamification_activity', { p_user_id: user.id, p_xp: 10 }).then(({ data }) => { if (data) setGamification(data as Gamification); });
  }, [user?.id]);

  const primeiroNome = profile?.name?.split(' ')[0];
  const xpAtual = gamification?.xp ?? 0;
  const nivel = gamification?.level ?? 1;
  const xpNoNivel = xpAtual % 100;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 md:space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0"><p className="mb-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Seu trabalho</p><h2 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">{primeiroNome ? `Olá, ${primeiroNome}.` : 'Bem-vindo ao Marcenapp.'}</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Registre a obra no Diário e use a IARA quando precisar transformar contexto em projeto.</p></div>
        <button type="button" onClick={() => navigateTo('diario')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 active:scale-[.99]"><BookOpen size={17} /> Abrir Diário <ArrowRight size={15} /></button>
      </header>

      {user && <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><div className="flex min-w-0 flex-1 items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white"><Sparkles size={19} /></div><div className="min-w-0"><div className="flex items-center gap-2"><span className="text-xs font-black uppercase tracking-wider text-slate-500">Seu progresso</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-700">Nível {nivel}</span></div><p className="mt-0.5 text-sm font-black text-slate-900">{xpAtual} XP</p></div></div><div className="min-w-0 flex-1"><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-900 transition-all" style={{ width: `${Math.max(6, xpNoNivel)}%` }} /></div><p className="mt-1.5 text-[11px] text-slate-400">{100 - xpNoNivel} XP para o próximo nível</p></div><div className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-amber-700"><Flame size={16} /><span className="text-xs font-black">{gamification?.streak_days ?? 0} dias</span></div></div></section>}

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-5 text-white shadow-sm md:p-7"><div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between"><div className="max-w-2xl"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Ponto de partida</p><h3 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">A obra começa no que você registra.</h3><p className="mt-2 text-sm leading-6 text-slate-300">Foto, voz ou texto. O Diário guarda o contexto. Quando fizer sentido, leve esse contexto para a IARA e avance para o projeto.</p></div><div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row"><button type="button" onClick={() => navigateTo('diario')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-950 hover:bg-slate-100"><BookOpen size={16} /> Começar pelo Diário</button><button type="button" onClick={() => navigateTo('studio')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-black text-white hover:bg-white/10"><Sparkles size={16} /> Falar com a IARA</button></div></div></section>

      <section className="grid gap-3 sm:grid-cols-3"><button type="button" onClick={() => navigateTo('diario')} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700"><Camera size={17} /></div><p className="mt-3 text-sm font-black text-slate-900">Foto, voz ou texto</p><p className="mt-1 text-xs leading-5 text-slate-500">Registre a obra sem mudar seu jeito de trabalhar.</p><ChevronRight size={15} className="mt-3 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-600" /></button><button type="button" onClick={() => navigateTo('clientes')} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700"><Users size={17} /></div><p className="mt-3 text-sm font-black text-slate-900">Clientes e obras</p><p className="mt-1 text-xs leading-5 text-slate-500">Mantenha cada obra e cada cliente no lugar.</p><ChevronRight size={15} className="mt-3 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-600" /></button><button type="button" onClick={() => navigateTo('billing')} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700"><CreditCard size={17} /></div><p className="mt-3 text-sm font-black text-slate-900">Créditos e planos</p><p className="mt-1 text-xs leading-5 text-slate-500">Use IA quando precisar. O Diário continua gratuito.</p><ChevronRight size={15} className="mt-3 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-600" /></button></section>

      <section aria-labelledby="minhas-obras"><div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Continuidade</p><h3 id="minhas-obras" className="mt-1 flex items-center gap-2 text-lg font-black text-slate-900"><Hammer size={18} /> Minhas obras</h3></div><button type="button" onClick={() => navigateTo('diario')} className="text-xs font-black text-slate-600 hover:text-slate-950">Ver Diário</button></div>
        {!user && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-7 text-center"><p className="font-semibold text-slate-700">Entre na sua conta para ver e salvar suas obras.</p></div>}
        {user && !carregando && obras.length === 0 && <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Plus size={22} /></div><div className="flex-1"><p className="font-black text-slate-900">Sua primeira obra começa aqui.</p><p className="mt-1 text-sm text-slate-500">Abra o Diário, registre o cliente e conte o que precisa ser feito.</p></div><button type="button" onClick={() => navigateTo('diario')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">Criar obra <ArrowRight size={15} /></button></div></div>}
        {carregando && <div className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />}
        {!carregando && obras.length > 0 && <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{obras.map(o => { const pct = percentualObra(o.etapa); const etapa = ETAPAS_OBRA.find(e => e.id === o.etapa)?.label; const concluida = o.etapa >= 7; return <li key={o.id}><button type="button" onClick={() => navigateTo(concluida ? 'orcamento' : 'studio', { projeto: o.id })} className="group h-full w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-base font-black text-slate-900">{o.nome}</p><p className="mt-1 truncate text-xs text-slate-500">{o.cliente ? `${o.cliente} · ` : ''}{concluida ? 'Aprovada' : etapa}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${concluida ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{concluida ? 'Concluída' : 'Continuar'}</span></div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-900" style={{ width: `${Math.max(pct, 4)}%` }} /></div><div className="mt-2 flex items-center justify-between text-[10px] text-slate-400"><span>{Math.round(pct)}% da jornada</span><ChevronRight size={13} className="transition group-hover:translate-x-0.5" /></div></button></li>; })}</ul>}
      </section>
    </div>
  );
};
export default Home;
