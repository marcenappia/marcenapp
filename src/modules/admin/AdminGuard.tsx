import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function AdminGuard({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;

    const checkRole = async () => {
      if (!user) {
        if (active) setChecking(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (active) {
        setIsAdmin(!error && !!data);
        setChecking(false);
      }
    };

    if (!authLoading) checkRole();
    return () => { active = false; };
  }, [user, authLoading]);

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 gap-2">
        <Loader2 className="animate-spin" size={18} /> Verificando acesso…
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <ShieldAlert className="mx-auto mb-3 text-amber-600" size={34} />
          <h1 className="text-xl font-black text-slate-900">Acesso restrito</h1>
          <p className="mt-2 text-sm text-slate-500">Esta área é exclusiva para administradores do MARCENAPP.</p>
          <a href="/" className="inline-flex mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white">Voltar ao MARCENAPP</a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
