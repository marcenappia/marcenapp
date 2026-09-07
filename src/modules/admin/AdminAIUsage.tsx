import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowLeft, Bot, CheckCircle2, Clock3, Loader2, ShieldCheck, TriangleAlert, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getAIProvider, isLovableProviderConfigured, type AIProvider } from '@/services/aiProvider';

type Run = { id: string; created_at: string; status: string | null; used_fallback: boolean | null };
type Metrics = { total: number | null; last7: number | null; completed: number | null; failed: number | null; fallback: number | null };

export default function AdminAIUsage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({ total: null, last7: null, completed: null, failed: null, fallback: null });
  const [provider, setProvider] = useState<AIProvider>('automatic');
  const [loading, setLoading] = useState(true);
  const [queryError, setQueryError] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [all, recent, completed, failed, fallback, currentProvider] = await Promise.all([
        supabase.from('orchestrator_runs').select('id,created_at,status,used_fallback').order('created_at', { ascending: false }).limit(200),
        supabase.from('orchestrator_runs').select('id', { count: 'exact', head: true }).gte('created_at', since),
        supabase.from('orchestrator_runs').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('orchestrator_runs').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
        supabase.from('orchestrator_runs').select('id', { count: 'exact', head: true }).eq('used_fallback', true),
        getAIProvider().catch(() => 'automatic' as AIProvider),
      ]);
      if (!active) return;
      setQueryError(Boolean(all.error || recent.error || completed.error || failed.error || fallback.error));
      setRuns(all.error ? [] : ((all.data ?? []) as Run[]));
      setMetrics({ total: all.error ? null : all.data?.length ?? 0, last7: recent.error ? null : recent.count ?? 0, completed: completed.error ? null : completed.count ?? 0, failed: failed.error ? null : failed.count ?? 0, fallback: fallback.error ? null : fallback.count ?? 0 });
      setProvider(currentProvider);
      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, []);

  const providerLabel = provider === 'automatic' ? 'Automático → Gemini' : provider === 'gemini' ? 'Gemini' : 'Lovable';
  const providerReady = provider !== 'lovable' || isLovableProviderConfigured();
  const successRate = useMemo(() => {
    if (metrics.completed === null || metrics.failed === null) return null;
    const total = metrics.completed + metrics.failed;
    return total ? Math.round((metrics.completed / total) * 100) : 100;
  }, [metrics.completed, metrics.failed]);
  const formatDate = (value: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));

  const cards: Array<[string, number | null, typeof Activity]> = [
    ['Execuções registradas', metrics.total, Activity], ['Últimos 7 dias', metrics.last7, Clock3], ['Concluídas', metrics.completed, CheckCircle2], ['Falhas', metrics.failed, XCircle], ['Fallback', metrics.fallback, TriangleAlert],
  ];

  return <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><Link to="/admin" className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600"><ArrowLeft size={14} /> Admin</Link><div className="mt-2 flex items-center gap-2"><Bot className="text-indigo-600" size={22} /><h1 className="text-2xl font-black text-slate-950">Consumo de IA</h1></div><p className="mt-1 text-sm text-slate-500">Telemetria real das execuções registradas pelo orquestrador.</p></div><span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${providerReady ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}><ShieldCheck size={14} /> {providerReady ? 'IA disponível' : 'Configuração pendente'}</span></header>
    {queryError && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex gap-2"><TriangleAlert size={18} /> A telemetria não está disponível para este administrador. Os indicadores sem fonte aparecem como “—”.</div>}
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">{cards.map(([label, value, Icon]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><Icon size={18} className="text-indigo-600" /><p className="mt-3 text-2xl font-black text-slate-900">{value === null ? '—' : value}</p><p className="mt-1 text-xs font-semibold text-slate-500">{label}</p></div>)}</section>
    <section className="grid gap-5 lg:grid-cols-[.75fr_1.25fr]"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Provedor selecionado</p><p className="mt-2 text-xl font-black text-slate-900">{providerLabel}</p><p className="mt-2 text-sm text-slate-500">A escolha não armazena credenciais no navegador.</p><Link to="/admin/ia" className="mt-4 inline-flex rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white">Configurar provedor</Link>{successRate !== null && <div className="mt-5 border-t border-slate-100 pt-4"><p className="text-xs font-bold text-slate-400">Taxa de conclusão registrada</p><p className="mt-1 text-2xl font-black text-slate-900">{successRate}%</p></div>}</div>
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"><div className="p-5 border-b border-slate-100"><h2 className="font-black text-slate-900">Últimas execuções</h2><p className="text-xs text-slate-500 mt-1">Registros recentes do orquestrador.</p></div>{loading ? <div className="p-6 flex items-center gap-2 text-sm text-slate-500"><Loader2 size={17} className="animate-spin" /> Carregando…</div> : runs.length === 0 ? <div className="p-8 text-center text-sm text-slate-400">Nenhuma execução registrada.</div> : <div className="divide-y divide-slate-100">{runs.slice(0, 12).map(run => <div key={run.id} className="px-5 py-3 flex items-center gap-3"><div className={`w-2 h-2 rounded-full ${run.status === 'completed' ? 'bg-emerald-500' : run.status === 'failed' ? 'bg-red-500' : 'bg-amber-500'}`} /><div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-800">Execução do orquestrador</p><p className="text-[11px] text-slate-400">{formatDate(run.created_at)} · {run.status || 'sem status'}{run.used_fallback ? ' · fallback' : ''}</p></div>{run.status === 'completed' ? <CheckCircle2 size={16} className="text-emerald-600" /> : run.status === 'failed' ? <XCircle size={16} className="text-red-500" /> : <Clock3 size={16} className="text-amber-500" />}</div>)}</div>}</div></section>
    <footer className="text-xs text-slate-400 flex items-center gap-2"><ShieldCheck size={13} /> Dados administrativos sujeitos às políticas de acesso do banco.</footer>
  </div></main>;
}
