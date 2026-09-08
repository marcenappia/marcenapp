import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, FolderKanban, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

type ProjectRow = { id: string; name: string; nome: string | null; status: string; user_id: string; created_at: string; updated_at: string; cliente: { nome: string } | null };

const statusLabel = (status: string) => ({
  em_andamento: 'Em andamento', aprovado: 'Aprovado', concluido: 'Concluído', rascunho: 'Rascunho', aguardando_cliente: 'Aguardando cliente', producao: 'Produção', corte: 'Corte',
}[status] ?? status.split('_').join(' '));

export default function AdminProjects() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data, error: queryError } = await supabase.from('projects').select('id,name,nome,status,user_id,created_at,updated_at,clientes(nome)').order('updated_at', { ascending: false });
      if (queryError) { setError(queryError.message); setLoading(false); return; }
      setProjects((data ?? []) as unknown as ProjectRow[]);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center gap-3">
          <Link to="/admin" className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:text-indigo-600"><ArrowLeft size={18} /></Link>
          <div><p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">MARCENAPP ADMIN</p><h1 className="text-2xl font-black text-slate-950">Obras</h1><p className="text-sm text-slate-500">Acompanhamento operacional das obras cadastradas.</p></div>
        </header>
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {loading ? <div className="p-8 text-sm text-slate-500">Carregando obras…</div> : error ? <div className="p-8 text-sm text-red-600">{error}</div> : projects.length === 0 ? <div className="p-8 text-sm text-slate-500">Nenhuma obra cadastrada.</div> : (
            <div className="divide-y divide-slate-100">
              {projects.map((p) => <div key={p.id} className="p-4 sm:p-5 flex items-center gap-4">
                <div className="h-11 w-11 shrink-0 rounded-xl bg-indigo-50 flex items-center justify-center"><FolderKanban size={19} className="text-indigo-600" /></div>
                <div className="min-w-0 flex-1"><p className="font-bold text-slate-900 truncate">{p.nome || p.name || 'Obra sem nome'}</p><p className="mt-1 text-xs text-slate-500 flex items-center gap-1.5 truncate"><UserRound size={12} /> {p.cliente?.nome || 'Cliente não informado'}</p></div>
                <div className="text-right"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${p.status === 'aprovado' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{p.status === 'aprovado' ? <CheckCircle2 size={12} /> : <Clock3 size={12} />}{statusLabel(p.status)}</span><p className="mt-1 hidden sm:flex items-center justify-end gap-1 text-[11px] text-slate-400"><CalendarDays size={11} /> {new Date(p.updated_at || p.created_at).toLocaleDateString('pt-BR')}</p></div>
              </div>)}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
