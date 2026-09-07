import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, Bot, CheckCircle2, ClipboardList, Factory, FolderKanban, Loader2, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getAIProvider, isLovableProviderConfigured, type AIProvider } from '@/services/aiProvider';

type Metrics = { users: number | null; projects: number | null; active: number | null; approved: number | null };

const MetricCard = ({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number | null }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between"><div className="rounded-xl bg-slate-100 p-2.5"><Icon size={19} className="text-indigo-600" /></div><span className="text-2xl font-black text-slate-900">{value ?? '—'}</span></div>
    <p className="mt-4 text-sm font-semibold text-slate-500">{label}</p>
  </div>
);

const Shortcut = ({ to, icon: Icon, title, description }: { to: string; icon: typeof FolderKanban; title: string; description: string }) => (
  <Link to={to} className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-indigo-200 hover:shadow-sm">
    <div className="flex items-center gap-3"><div className="rounded-xl bg-indigo-50 p-2.5"><Icon size={18} className="text-indigo-600" /></div><div className="min-w-0"><p className="font-bold text-slate-900">{title}</p><p className="text-xs text-slate-500 mt-0.5">{description}</p></div><ArrowRight size={16} className="ml-auto text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500" /></div>
  </Link>
);

export default function AdminDashboard() {
  const { user, profile } = useAuth();
  const [metrics, setMetrics] = useState<Metrics>({ users: null, projects: null, active: null, approved: null });
  const [provider, setProvider] = useState<AIProvider>('automatic');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [users, projects, activeProjects, approvedProjects, currentProvider] = await Promise.all([
        supabase.from('profiles').select('user_id', { count: 'exact', head: true }),
        supabase.from('projects').select('id', { count: 'exact', head: true }),
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'em_andamento'),
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'aprovado'),
        getAIProvider().catch(() => 'automatic' as AIProvider),
      ]);
      if (!active) return;
      setMetrics({ users: users.error ? null : users.count ?? 0, projects: projects.error ? null : projects.count ?? 0, active: activeProjects.error ? null : activeProjects.count ?? 0, approved: approvedProjects.error ? null : approvedProjects.count ?? 0 });
      setProvider(currentProvider);
      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, []);

  const providerLabel = provider === 'automatic' ? 'Automático' : provider === 'gemini' ? 'Gemini' : 'Lovable';
  const providerReady = provider !== 'lovable' || isLovableProviderConfigured();

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-7">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-indigo-600"><ShieldCheck size={15} /> MARCENAPP ADMIN</div><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Central de controle</h1><p className="mt-1 text-sm text-slate-500">Visão rápida da operação e da inteligência do MARCENAPP.</p></div>
          <Link to="/" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">Voltar ao MARCENAPP</Link>
        </header>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {loading ? <div className="col-span-2 lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-6 flex items-center gap-2 text-sm text-slate-500"><Loader2 size={17} className="animate-spin" /> Carregando indicadores…</div> : <><MetricCard icon={Users} label="Usuários cadastrados" value={metrics.users} /><MetricCard icon={FolderKanban} label="Total de obras" value={metrics.projects} /><MetricCard icon={Activity} label="Obras em andamento" value={metrics.active} /><MetricCard icon={CheckCircle2} label="Obras aprovadas" value={metrics.approved} /></>}
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><Bot size={20} className="text-indigo-600" /><h2 className="font-black text-slate-900">Inteligência Artificial</h2></div><p className="mt-1 text-sm text-slate-500">Controle do motor usado pela IARA.</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${providerReady ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{providerReady ? 'Disponível' : 'Configuração pendente'}</span></div>
            <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-50 p-4"><div><p className="text-xs font-semibold text-slate-500">Provedor atual</p><p className="mt-1 font-black text-slate-900">{providerLabel}</p></div><Sparkles size={20} className="text-indigo-500" /></div>
            <p className="mt-3 text-xs text-slate-500">Consumo detalhado de IA será exibido quando houver uma fonte real de telemetria.</p>
            <Link to="/admin/ia" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">Configurar IA <ArrowRight size={15} /></Link>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><ShieldCheck size={20} className="text-emerald-600" /><h2 className="font-black text-slate-900">Conta administrativa</h2></div><div className="mt-5 rounded-xl bg-slate-50 p-4"><p className="font-bold text-slate-900">{profile?.name || user?.email || 'Administrador'}</p><p className="mt-1 text-xs text-slate-500">{user?.email}</p><div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"><ShieldCheck size={13} /> Acesso Admin</div></div></div>
        </section>

        <section><div className="flex items-center gap-2 mb-3"><ClipboardList size={19} className="text-indigo-600" /><h2 className="font-black text-slate-900">Operação</h2></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Shortcut to="/admin/obras" icon={FolderKanban} title="Obras / Jornada" description="Acompanhar a jornada das obras" /><Shortcut to="/" icon={ClipboardList} title="Diário" description="Ir para os diários de obra" /><Shortcut to="/" icon={Activity} title="Orçamentos" description="Acompanhar a operação de orçamento" /><Shortcut to="/" icon={Factory} title="Produção" description="Acompanhar produção" /><Shortcut to="/" icon={ClipboardList} title="Corte" description="Planos de corte" /><Shortcut to="/admin/usuarios" icon={Users} title="Usuários" description="Gerenciar perfis cadastrados" /></div></section>

        <footer className="text-xs text-slate-400 flex items-center gap-2"><ShieldCheck size={13} /> Área administrativa protegida por autenticação e role admin.</footer>
      </div>
    </main>
  );
}
