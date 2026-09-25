import { useEffect, useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { Activity, Bot, CreditCard, Database, Gauge, Loader2, ShieldCheck, Users, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type CardProps = {
  title: string;
  description: string;
  icon: typeof ShieldCheck;
  to?: string;
  onClick?: () => void;
};

function AdminCard({ title, description, icon: Icon, to, onClick }: CardProps) {
  const className = "group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500";
  const content = <>
    <div className="flex items-start justify-between gap-4">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white"><Icon size={20} aria-hidden="true" /></span>
      <ArrowRight size={18} className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-500" aria-hidden="true" />
    </div>
    <h2 className="mt-5 text-base font-black text-slate-900">{title}</h2>
    <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
  </>;
  if (to) return <Link to={to} className={className}>{content}</Link>;
  return <button type="button" onClick={onClick} className={className}>{content}</button>;
}

export default function AdminHub() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const verify = async () => {
      if (!user) {
        if (active) setChecking(false);
        return;
      }
      const { data, error: rpcError } = await supabase.rpc('is_admin_user', { p_user_id: user.id });
      if (!active) return;
      if (rpcError) {
        setError('Não foi possível validar a permissão administrativa.');
        setIsAdmin(false);
      } else {
        setIsAdmin(Boolean(data));
      }
      setChecking(false);
    };
    void verify();
    return () => { active = false; };
  }, [user?.id]);

  if (loading || checking) {
    return <main className="min-h-[60vh] flex items-center justify-center" aria-busy="true"><Loader2 className="animate-spin text-indigo-600" aria-hidden="true" /><span className="sr-only">Validando acesso administrativo…</span></main>;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 md:px-8" aria-labelledby="admin-title">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-indigo-600"><ShieldCheck size={16} aria-hidden="true" /> Administração</div>
            <h1 id="admin-title" className="mt-2 text-3xl font-black tracking-tight text-slate-950">Central administrativa do Marcenapp</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Acesso centralizado às áreas administrativas já existentes. A autorização continua sendo validada pelo backend e pelo papel administrativo.</p>
          </div>
          <button type="button" onClick={() => navigate('/')} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">Voltar ao Marcenapp</button>
        </header>

        {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Áreas administrativas">
          <AdminCard title="Agentes e governança" description="Registro de agentes, domínio, autonomia, dependências, status e última validação." icon={Bot} to="/admin/agentes" />
          <AdminCard title="Créditos e observabilidade" description="Regras de créditos, Skills, execuções da IARA, alertas e provedor de IA." icon={CreditCard} onClick={() => navigate('/?module=admin-billing')} />
          <AdminCard title="Inteligência operacional" description="Acompanhe a operação do produto pelo módulo de inteligência já integrado ao workspace." icon={Gauge} onClick={() => navigate('/?module=inteligencia')} />
          <AdminCard title="Projetos e dados" description="Abra o workspace para revisar clientes, projetos, diário, documentos, orçamento e produção." icon={Database} onClick={() => navigate('/')} />
          <AdminCard title="Execuções IARA" description="Acesse o painel administrativo de execuções, erros e evidências já persistidos." icon={Activity} onClick={() => navigate('/?module=admin-billing')} />
          <AdminCard title="Perfis profissionais" description="A gestão de perfis profissionais está disponível dentro da central administrativa de créditos." icon={Users} onClick={() => navigate('/?module=admin-billing')} />
        </section>

        <p className="mt-6 text-xs text-slate-400">Acesso protegido: esta tela não concede privilégios; ela apenas expõe funções para usuários que já foram autorizados como administradores.</p>
      </div>
    </main>
  );
}
