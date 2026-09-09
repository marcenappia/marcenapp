import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import logo from '@/assets/marcenapp-logo.svg';

type OAuthProvider = 'google' | 'apple';
const GoogleIcon = () => (<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.8-5.4 3.8-3.3 0-5.9-2.7-5.9-6s2.6-6 5.9-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" /></svg>);
const AppleIcon = () => (<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor"><path d="M16.4 12.7c0-2.5 2-3.7 2.1-3.8-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.1 2.5-1.8 3.1-.5 7.6 1.3 10.1 1.2 1.2 2.3 2.6 3.2 2.5 1.4 0 2.3-1.2 3.1-2.5.9-1.4 1.3-2.8 1.4-2.9-.1 0-2.9-1.1-2.9-3.9zM14 5.3c.7-.8 1.2-2 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4z" /></svg>);

const Auth = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedPlan = searchParams.get('plan');
  const requestedNext = searchParams.get('next');
  const safeNext = requestedNext && requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/app';
  const [isLogin, setIsLogin] = useState(true);
  const [isReset, setIsReset] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);
  const SUPPORT_LINK = import.meta.env.VITE_SUPPORT_WHATSAPP_LINK || 'https://wa.me/5511999999999';
  const goAfterAuth = useCallback(() => navigate(safeNext, { replace: true }), [navigate, safeNext]);

  useEffect(() => {
    const oauthError = searchParams.get('error_description') || searchParams.get('error');
    if (oauthError) { setOauthLoading(null); setError(oauthError.replace(/\+/g, ' ')); return; }
    if (searchParams.get('code')) setOauthLoading('google');
  }, [searchParams]);
  useEffect(() => { if (user) goAfterAuth(); }, [user, goAfterAuth]);
  useEffect(() => { let timer: ReturnType<typeof setTimeout> | undefined; if (countdown > 0) timer = setTimeout(() => setCountdown(countdown - 1), 1000); return () => { if (timer) clearTimeout(timer); }; }, [countdown]);
  useEffect(() => { setError(''); setSuccess(''); setLoading(false); }, [isLogin, isReset]);

  const handleOAuth = async (provider: OAuthProvider) => {
    setError(''); setSuccess(''); setOauthLoading(provider);
    try {
      const callbackParams = new URLSearchParams();
      if (selectedPlan) callbackParams.set('plan', selectedPlan);
      if (safeNext !== '/app') callbackParams.set('next', safeNext);
      const redirectTo = `${window.location.origin}/auth${callbackParams.toString() ? `?${callbackParams.toString()}` : ''}`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo, ...(provider === 'google' ? { queryParams: { prompt: 'select_account' } } : {}) } });
      if (oauthError) { setError(oauthError.message || 'Não foi possível iniciar o login.'); setOauthLoading(null); }
    } catch (err) { setError(err instanceof Error ? err.message : 'Ocorreu um erro inesperado ao iniciar o login.'); setOauthLoading(null); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(''); setSuccess('');
    try {
      if (isReset) {
        if (countdown > 0) return;
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/password-recovery` });
        if (error) setError(error.message); else { setSuccess('E-mail de recuperação enviado!'); setCountdown(30); }
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setError(error.message); else goAfterAuth();
      } else {
        const plan = selectedPlan || 'start';
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name, plan, selected_plan: plan, trial_days: 7 }, emailRedirectTo: `${window.location.origin}/auth${selectedPlan ? `?plan=${encodeURIComponent(selectedPlan)}` : ''}` } });
        if (error) setError(error.message); else if (data.session) goAfterAuth(); else { setSuccess('Conta criada. Confirme seu e-mail para liberar o acesso e depois entre no MARCENAPP.'); setIsLogin(true); }
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Ocorreu um erro inesperado.'); } finally { setLoading(false); }
  };

  return <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--sidebar-bg))] px-4"><div className="w-full max-w-sm space-y-8"><div className="text-center"><img src={logo} alt="MARCENAPP" width="88" height="88" className="mx-auto mb-4 h-22 w-22 object-contain" /><h1 className="text-2xl font-bold tracking-tight text-white">MARCENA<span className="text-[hsl(var(--sidebar-active))]">PP</span></h1><p className="mt-1 text-sm text-[hsl(var(--sidebar-text))]">Marcenaria 4.0</p></div>{!isReset && <div className="space-y-3"><button type="button" onClick={() => handleOAuth('google')} disabled={loading || oauthLoading !== null} className="flex w-full items-center justify-center gap-3 rounded-xl bg-white py-3 font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-50">{oauthLoading === 'google' ? <Loader2 className="animate-spin" size={18} /> : <GoogleIcon />}Continuar com Google</button><button type="button" onClick={() => handleOAuth('apple')} disabled={loading || oauthLoading !== null} className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/20 bg-black py-3 font-semibold text-white hover:bg-neutral-900 disabled:opacity-50">{oauthLoading === 'apple' ? <Loader2 className="animate-spin" size={18} /> : <AppleIcon />}Continuar com Apple</button><div className="flex items-center gap-3 text-[11px] uppercase tracking-widest text-[hsl(var(--sidebar-text))]"><span className="h-px flex-1 bg-white/15" />ou com e-mail<span className="h-px flex-1 bg-white/15" /></div></div>}<form onSubmit={handleSubmit} className="space-y-4">{!isLogin && !isReset && <input type="text" placeholder="Nome completo" value={name} onChange={e => setName(e.target.value)} required className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/40" />}<input type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} required className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/40" />{!isReset && <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/40" />}{isLogin && !isReset && <div className="text-right"><button type="button" onClick={() => setIsReset(true)} className="text-xs text-[hsl(var(--sidebar-text))]">Esqueceu a senha?</button></div>}{error && <div className="space-y-2"><p className="rounded-lg bg-red-950/50 p-3 text-sm text-red-400">{error}</p>{isReset && <a href={SUPPORT_LINK} target="_blank" rel="noopener noreferrer" className="block text-center text-xs text-slate-300 underline">Fale com o suporte</a>}</div>}{success && <p className="rounded-lg bg-emerald-950/50 p-3 text-sm text-emerald-400">{success}</p>}<button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--sidebar-active))] py-3 font-bold text-white disabled:opacity-50">{loading && <Loader2 className="animate-spin" size={18} />}{isReset ? 'Enviar Recuperação' : isLogin ? 'Entrar no MARCENAPP' : 'Criar conta e testar grátis'}</button></form><p className="text-center text-sm text-[hsl(var(--sidebar-text))]">{isReset ? <button onClick={() => setIsReset(false)} className="font-semibold text-[hsl(var(--sidebar-active))]">Voltar para o login</button> : <>{isLogin ? 'Não tem conta?' : 'Já tem conta?'}{' '}<button onClick={() => setIsLogin(!isLogin)} className="font-semibold text-[hsl(var(--sidebar-active))]">{isLogin ? 'Cadastre-se' : 'Entrar'}</button></>}</p></div></div>;
};
export default Auth;
