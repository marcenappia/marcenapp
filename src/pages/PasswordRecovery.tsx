import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function PasswordRecovery() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 6) return setError('A nova senha deve ter pelo menos 6 caracteres.');
    if (password !== confirmation) return setError('As senhas não conferem.');
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) return setError(updateError.message);
    navigate('/app', { replace: true });
  };

  if (!ready) return <div className="min-h-screen bg-[#0b1015] text-white grid place-items-center p-6"><p>Validando o link de recuperação…</p></div>;

  return <div className="min-h-screen bg-[#0b1015] text-white grid place-items-center p-6"><form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-white/10 bg-white/[.04] p-6"><h1 className="text-2xl font-black">Criar nova senha</h1><p className="text-sm text-slate-400">Defina uma nova senha para voltar ao MARCENAPP.</p><input aria-label="Nova senha" type="password" minLength={6} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Nova senha" className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white" /><input aria-label="Confirmar senha" type="password" minLength={6} required value={confirmation} onChange={e => setConfirmation(e.target.value)} placeholder="Confirmar senha" className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white" />{error && <p className="rounded-lg bg-red-950/50 p-3 text-sm text-red-300">{error}</p>}<button type="submit" disabled={saving} className="w-full rounded-xl bg-[#f4a640] px-4 py-3 font-black text-[#17110a] disabled:opacity-50">{saving ? 'Salvando…' : 'Alterar senha'}</button></form></div>;
}
