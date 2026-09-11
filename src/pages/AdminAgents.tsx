import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, ShieldCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

type Agent = {
  slug: string;
  name: string;
  mission: string;
  domain: string;
  autonomy_level: string;
  status: string;
  dependencies: string[];
  last_validated_at: string | null;
};

const AdminAgents = () => {
  const { user, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setError(null);
    setChecking(true);
    const { data: admin, error: adminError } = await supabase.rpc('is_admin_user', { p_user_id: user.id });
    if (adminError) {
      setError('Não foi possível validar a permissão administrativa.');
      setIsAdmin(false);
      setChecking(false);
      return;
    }
    const allowed = Boolean(admin);
    setIsAdmin(allowed);
    if (!allowed) {
      setChecking(false);
      return;
    }
    const { data, error: agentsError } = await supabase
      .from('agent_registry')
      .select('slug,name,mission,domain,autonomy_level,status,dependencies,last_validated_at')
      .order('domain')
      .order('name');
    if (agentsError) setError('Não foi possível carregar o registro de agentes.');
    else setAgents((data ?? []) as Agent[]);
    setChecking(false);
  };

  useEffect(() => { void load(); }, [user?.id]);

  if (loading || checking) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest"><ShieldCheck size={16} /> Agent OS</div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Registro de Agentes</h1>
          <p className="text-sm text-slate-500 mt-1">Governança, escopo, autonomia e evidência. Agente registrado não é automaticamente considerado ativo.</p>
        </div>
        <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"><RefreshCw size={16} /> Atualizar</button>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => (
          <article key={agent.slug} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-extrabold text-slate-900">{agent.name}</h2>
                <p className="text-xs text-slate-400 mt-1 font-mono">{agent.slug}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-600">{agent.status}</span>
            </div>
            <p className="text-sm text-slate-600 mt-4 leading-6">{agent.mission}</p>
            <dl className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between gap-3"><dt className="text-slate-400">Domínio</dt><dd className="font-bold text-slate-700">{agent.domain}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-400">Autonomia</dt><dd className="font-bold text-slate-700">{agent.autonomy_level}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-400">Validação</dt><dd className="font-bold text-slate-700">{agent.last_validated_at ? new Date(agent.last_validated_at).toLocaleString('pt-BR') : 'Pendente'}</dd></div>
            </dl>
            {agent.dependencies?.length > 0 && <p className="mt-4 text-[11px] text-slate-400">Dependências: {agent.dependencies.join(', ')}</p>}
          </article>
        ))}
      </div>
    </section>
  );
};

export default AdminAgents;
