import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import logo from '@/assets/marcenapp-logo.svg';
import { PROFESSIONAL_PROFILES } from '@/modules/admin/ProfessionalProfiles';

const PRODUCTION_ORIGIN = 'https://www.marcenapp.com.br';
const AUTH_CALLBACK = `${PRODUCTION_ORIGIN}/auth`;
const PURCHASE_STORAGE_KEY = 'marcenapp_pending_purchase';

const getAppOrigin = () => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return window.location.origin;
  return PRODUCTION_ORIGIN;
};

const describeAuthError = (authError: { code?: string; message?: string; status?: number } | null) => {
  if (!authError) return '';
  const raw = authError.message?.trim() || '';
  const code = authError.code?.trim().toLowerCase() || '';
  const message = raw.toLowerCase();
  if (code === 'redirect_to_not_allowed' || message.includes('redirect') && message.includes('not allowed')) return `O endereço de confirmação ${AUTH_CALLBACK} não está autorizado no Supabase Auth. A configuração de URLs de autenticação precisa incluir esse endereço.`;
  if (code === 'signup_disabled' || message.includes('signups not allowed')) return 'O cadastro de novos usuários está desativado no Supabase Auth.';
  if (code === 'email_address_invalid' || message.includes('invalid email')) return 'O endereço de e-mail informado é inválido.';
  if (code === 'email_provider_disabled' || message.includes('email provider') && message.includes('disabled')) return 'O provedor de e-mail do Supabase Auth está desativado.';
  if (message.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (message.includes('email not confirmed') || message.includes('email_not_confirmed')) return 'Seu e-mail ainda não foi confirmado. Verifique a caixa de entrada e o spam.';
  if (message.includes('user already registered') || message.includes('already been registered')) return 'Este e-mail já possui uma conta. Entre com sua senha ou use “Esqueceu a senha?”.';
  if (message.includes('rate limit') || message.includes('too many requests') || code.includes('rate_limit') || authError.status === 429) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  if (message.includes('failed to fetch') || message.includes('network') || message.includes('fetch')) return 'Não foi possível conectar ao servidor de autenticação. Verifique sua internet e tente novamente.';
  if (message.includes('captcha')) return 'A validação de segurança do cadastro falhou. Recarregue a página e tente novamente.';
  if (authError.status && authError.status >= 500) return `O servidor de autenticação apresentou um erro (${authError.status}). Tente novamente em instantes.`;
  return raw || `Falha na autenticação${authError.status ? ` (HTTP ${authError.status})` : ''}.`;
};

const Auth = () => {
  const { user, profileLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  const isRecoveryPath = path === '/reset-password';
  const isSignupPath = path === '/signup' || path === '/register';
  const initialLogin = !isSignupPath && !['/forgot-password'].includes(path);
  const initialReset = path === '/forgot-password';
  const queryProfession = new URLSearchParams(location.search).get('profession') || '';
  const selectedProfile = PROFESSIONAL_PROFILES.find((item) => item.value === queryProfession) ?? null;
  const [isLogin, setIsLogin] = useState(initialLogin);
  const [isReset, setIsReset] = useState(initialReset);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [profession, setProfession] = useState(queryProfession);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);

  const supportLink = import.meta.env.VITE_SUPPORT_WHATSAPP_LINK?.trim();
  const appOrigin = getAppOrigin();

  const redirectAfterAuth = () => {
    const purchase = sessionStorage.getItem(PURCHASE_STORAGE_KEY);
    if (purchase) {
      sessionStorage.removeItem(PURCHASE_STORAGE_KEY);
      navigate(`/?module=billing&purchase=${encodeURIComponent(purchase)}`, { replace: true });
      return;
    }
    navigate('/', { replace: true });
  };

  useEffect(() => {
    const purchase = new URLSearchParams(location.search).get('purchase');
    if (purchase) sessionStorage.setItem(PURCHASE_STORAGE_KEY, purchase);
  }, [location.search]);

  useEffect(() => {
    setIsLogin(initialLogin);
    setIsReset(initialReset);
    setError('');
    setSuccess('');
    setProfession(queryProfession);
    if (isSignupPath && !queryProfession) navigate('/perfil-profissional', { replace: true });
  }, [path, queryProfession]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const authError = params.get('error_description') || params.get('error');
    if (!authError) return;
    setError(decodeURIComponent(authError.replace(/\+/g, ' ')));
    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
  }, []);

  useEffect(() => {
    if (user && !profileLoading && !isRecoveryPath) redirectAfterAuth();
  }, [user, profileLoading, isRecoveryPath]);

  const title = useMemo(() => {
    if (isRecoveryPath) return 'Redefinir senha';
    if (isReset) return 'Recuperar acesso';
    return isLogin ? 'Entrar no Marcenapp' : 'Criar conta';
  }, [isLogin, isReset, isRecoveryPath]);

  const handleGoogleLogin = async () => {
    if (googleLoading || loading || !isLogin || isReset || isRecoveryPath) return;
    setGoogleLoading(true);
    setError('');
    setSuccess('');
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: AUTH_CALLBACK } });
      if (authError) setError(describeAuthError(authError));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível iniciar o login com Google.');
    } finally { setGoogleLoading(false); }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading || googleLoading) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (isRecoveryPath) {
        if (!user) { setError('O link de recuperação é inválido ou expirou. Solicite uma nova recuperação de senha.'); return; }
        if (password.length < 6) { setError('A nova senha deve ter pelo menos 6 caracteres.'); return; }
        const { error: authError } = await supabase.auth.updateUser({ password });
        if (authError) { setError(describeAuthError(authError)); return; }
        setSuccess('Senha atualizada com sucesso. Entrando no Marcenapp...');
        window.setTimeout(() => redirectAfterAuth(), 400);
        return;
      }
      if (isReset) {
        if (!email.trim()) { setError('Informe um e-mail válido.'); return; }
        if (countdown > 0) return;
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${PRODUCTION_ORIGIN}/reset-password` });
        if (authError) setError(describeAuthError(authError)); else { setSuccess('Se o e-mail estiver cadastrado, enviaremos a recuperação. Verifique também o spam.'); setCountdown(30); }
        return;
      }
      if (!email.trim()) { setError('Informe seu e-mail.'); return; }
      if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return; }
      if (isLogin) {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) { setError(describeAuthError(authError)); return; }
        if (data.user && data.session) return;
        setError('A autenticação não retornou uma sessão. Tente novamente.');
        return;
      }
      if (!name.trim()) { setError('Informe seu nome.'); return; }
      if (!profession) { setError('Escolha seu perfil profissional antes de continuar.'); return; }
      const { data, error: authError } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { name: name.trim(), profession }, emailRedirectTo: AUTH_CALLBACK } });
      if (authError) { setError(describeAuthError(authError)); return; }
      if (data.session && data.user) {
        await supabase.from('profiles').update({ profession }).eq('user_id', data.user.id);
        await refreshProfile();
        return;
      }
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) { setError('Este e-mail já possui uma conta. Entre com sua senha ou use “Esqueceu a senha?”.'); return; }
      if (data.user) { setSuccess('Cadastro recebido. Confirme o e-mail enviado para liberar o primeiro acesso.'); return; }
      setError('O servidor não confirmou a criação da conta. Tente novamente.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Ocorreu um erro inesperado durante a autenticação.');
    } finally { setLoading(false); }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-muted text-foreground">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-36 h-[28rem] w-[28rem] rounded-full bg-blue-100/70 blur-3xl" />
        <div className="absolute -bottom-40 -right-28 h-[30rem] w-[30rem] rounded-full bg-sky-100/80 blur-3xl" />
      </div>
      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:gap-14 lg:px-10 lg:py-10">
        <section className="hidden lg:flex lg:flex-col lg:justify-between lg:self-stretch lg:py-8">
          <button type="button" onClick={() => navigate('/')} className="flex w-fit items-center gap-3 rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
            <img src={logo} alt="Marcenapp" className="h-12 w-12 rounded-2xl border border-border bg-card p-1 shadow-sm" />
            <span><span className="block text-lg font-black tracking-tight text-foreground">MARCENAPP</span><span className="block text-xs font-medium text-muted-foreground">Do projeto à produção</span></span>
          </button>
          <div className="max-w-lg py-12">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-card/80 px-3 py-1.5 text-xs font-bold text-blue-800 shadow-sm"><span className="h-2 w-2 rounded-full bg-blue-600" /> Gestão para marcenarias</span>
            <h1 className="mt-6 text-4xl font-black leading-[1.12] tracking-tight text-foreground xl:text-5xl">Seu trabalho, organizado do início à entrega.</h1>
            <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">Projetos, orçamento, materiais e produção conectados em um só lugar — com você no controle de cada decisão.</p>
            <div className="mt-8 grid max-w-md grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border bg-card/85 p-4 shadow-sm"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Check size={18}/></span><p className="mt-3 text-sm font-bold text-foreground">Mais organização</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Informações do projeto reunidas.</p></div>
              <div className="rounded-2xl border border-border bg-card/85 p-4 shadow-sm"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-foreground"><Check size={18}/></span><p className="mt-3 text-sm font-bold text-foreground">Mais controle</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Dados claros para decidir melhor.</p></div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Marcenapp · Ferramentas para o dia a dia da marcenaria</p>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="mb-5 flex items-center justify-between lg:hidden">
            <button type="button" onClick={() => navigate('/')} className="flex items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
              <img src={logo} alt="Marcenapp" className="h-10 w-10 rounded-xl border border-border bg-card p-1 shadow-sm" />
              <span className="text-sm font-black tracking-tight text-foreground">MARCENAPP</span>
            </button>
            <span className="rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold text-muted-foreground">Acesso seguro</span>
          </div>
          <div className="rounded-[28px] border border-border bg-card p-5 shadow-[0_24px_70px_-32px_rgba(15,23,42,.28)] sm:p-8">
            <div className="mb-7">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Check size={21}/></div>
              <p className="text-xs font-bold uppercase tracking-[.16em] text-primary">{isRecoveryPath ? 'Segurança da conta' : isReset ? 'Recuperação de acesso' : isLogin ? 'Bem-vindo de volta' : 'Vamos começar'}</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{isRecoveryPath ? 'Escolha uma nova senha para voltar a acessar sua conta.' : isReset ? 'Informe seu e-mail e enviaremos as instruções para recuperar o acesso.' : isLogin ? 'Entre para continuar seus projetos e sua produção.' : 'Preencha seus dados para criar seu acesso.'}</p>
            </div>

            {selectedProfile && !isReset && !isRecoveryPath && <div className="mb-5 rounded-2xl border border-primary/20 bg-primary/10 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-primary">Perfil escolhido</p><p className="mt-1 text-base font-bold text-foreground">{selectedProfile.label}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{selectedProfile.description}</p></div><Check size={18} className="mt-1 shrink-0 text-primary" /></div>{isSignupPath && <button type="button" onClick={() => navigate('/perfil-profissional')} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80"><ArrowLeft size={14} /> Trocar perfil</button>}</div>}

            {isLogin && !isReset && !isRecoveryPath && <>
              <button type="button" onClick={handleGoogleLogin} disabled={loading || googleLoading} className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-3 font-semibold text-foreground transition hover:border-border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50">{googleLoading ? <Loader2 className="animate-spin" size={18} /> : <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-sm font-black text-primary">G</span>}{googleLoading ? 'Conectando ao Google...' : 'Continuar com Google'}</button>
              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" /><span>ou entre com e-mail</span><div className="h-px flex-1 bg-border" /></div>
            </>}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && !isReset && !isRecoveryPath && <label className="block space-y-1.5"><span className="text-sm font-semibold text-foreground">Nome completo</span><input type="text" placeholder="Como podemos te chamar?" value={name} onChange={(event) => setName(event.target.value)} required autoComplete="name" className="min-h-12 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground hover:border-border focus:border-ring focus:ring-4 focus:ring-ring/40" /></label>}
              {!isRecoveryPath && <label className="block space-y-1.5"><span className="text-sm font-semibold text-foreground">E-mail</span><input type="email" placeholder="voce@empresa.com.br" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className="min-h-12 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground hover:border-border focus:border-ring focus:ring-4 focus:ring-ring/40" /></label>}
              {(!isReset || isRecoveryPath) && <label className="block space-y-1.5"><span className="text-sm font-semibold text-foreground">{isRecoveryPath ? 'Nova senha' : 'Senha'}</span><input type="password" placeholder={isRecoveryPath ? 'Crie uma nova senha' : 'Digite sua senha'} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} autoComplete={isLogin && !isRecoveryPath ? 'current-password' : 'new-password'} className="min-h-12 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground hover:border-border focus:border-ring focus:ring-4 focus:ring-ring/40" /></label>}
              {isLogin && !isReset && !isRecoveryPath && <div className="-mt-1 text-right"><button type="button" onClick={() => navigate('/forgot-password')} className="text-sm font-semibold text-primary hover:text-primary/80 hover:underline">Esqueceu a senha?</button></div>}
              {error && <div className="space-y-2" role="alert"><p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm leading-5 text-destructive">{error}</p>{isReset && supportLink && <p className="text-center"><a href={supportLink} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary underline">Não resolveu? Fale com o suporte</a></p>}</div>}
              {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-5 text-emerald-700">{success}</p>}
              <button type="submit" disabled={loading || googleLoading || (isReset && countdown > 0)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60">{loading && <Loader2 className="animate-spin" size={18} />}{isRecoveryPath ? 'Atualizar senha' : isReset ? (countdown > 0 ? `Aguarde ${countdown}s` : 'Enviar recuperação') : isLogin ? 'Entrar no Marcenapp' : 'Criar minha conta'}</button>
            </form>

            <div className="mt-6 border-t border-border pt-5 text-center text-sm text-muted-foreground">{isRecoveryPath || isReset ? <button type="button" onClick={() => navigate('/auth')} className="font-semibold text-primary hover:underline">Voltar para o login</button> : <>{isLogin ? 'Ainda não tem conta?' : 'Já tem conta?'}{' '}<button type="button" onClick={() => navigate(isLogin ? '/perfil-profissional' : '/auth')} className="font-bold text-primary hover:text-primary/80 hover:underline">{isLogin ? 'Criar conta' : 'Entrar'}</button></>}</div>
          </div>
          <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">Ao continuar, você acessa seu ambiente de trabalho do Marcenapp.</p>
          {appOrigin !== window.location.origin && <p className="mt-3 text-center text-[10px] text-muted-foreground">Ambiente oficial: {appOrigin}</p>}
        </section>
      </div>
    </main>
  );
};

export default Auth;
