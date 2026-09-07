import { useEffect, useState } from 'react';
import { ArrowLeft, ShieldCheck, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

type UserRow = { user_id: string; name: string; company: string | null; phone: string | null; created_at: string; roles: string[] };

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [{ data: profiles, error: profileError }, { data: roles, error: roleError }] = await Promise.all([
        supabase.from('profiles').select('user_id,name,company,phone,created_at').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('user_id,role'),
      ]);
      if (profileError || roleError) {
        setError(profileError?.message || roleError?.message || 'Não foi possível carregar os usuários.');
        setLoading(false);
        return;
      }
      const roleMap = new Map<string, string[]>();
      (roles ?? []).forEach((row) => roleMap.set(row.user_id, [...(roleMap.get(row.user_id) ?? []), row.role]));
      setUsers((profiles ?? []).map((p) => ({ ...p, roles: roleMap.get(p.user_id) ?? [] })));
      setLoading(false);
    };
    load();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center gap-3">
          <Link to="/admin" className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:text-indigo-600"><ArrowLeft size={18} /></Link>
          <div><p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">MARCENAPP ADMIN</p><h1 className="text-2xl font-black text-slate-950">Usuários</h1><p className="text-sm text-slate-500">Visão administrativa dos perfis cadastrados.</p></div>
        </header>
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {loading ? <div className="p-8 text-sm text-slate-500">Carregando usuários…</div> : error ? <div className="p-8 text-sm text-red-600">{error}</div> : users.length === 0 ? <div className="p-8 text-sm text-slate-500">Nenhum perfil cadastrado.</div> : (
            <div className="divide-y divide-slate-100">
              {users.map((u) => <div key={u.user_id} className="p-4 sm:p-5 flex items-center gap-4">
                <div className="h-11 w-11 shrink-0 rounded-full bg-indigo-50 flex items-center justify-center"><UserRound size={19} className="text-indigo-600" /></div>
                <div className="min-w-0 flex-1"><p className="font-bold text-slate-900 truncate">{u.name || 'Sem nome'}</p><p className="text-xs text-slate-500 truncate">{u.company || 'Marcenaria não informada'}{u.phone ? ` · ${u.phone}` : ''}</p></div>
                <div className="flex items-center gap-2">{u.roles.includes('admin') && <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700"><ShieldCheck size={12} /> Admin</span>}<span className="hidden sm:inline text-xs text-slate-400">{new Date(u.created_at).toLocaleDateString('pt-BR')}</span></div>
              </div>)}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
