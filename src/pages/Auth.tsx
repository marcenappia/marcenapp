import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import logo from '@/assets/marcenapp-logo.svg';

const PRODUCTION_ORIGIN = 'https://www.marcenapp.com.br';
const AUTH_CALLBACK = `${PRODUCTION_ORIGIN}/auth`;

const getAppOrigin = () => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return window.location.origin;
  return PRODUCTION_ORIGIN;
};

const describeAuthError = (authError: { code?: string; message?: string; status?: number } | null) => {
  if (!authError) return '';
  const raw = authError.message?.trim() || '';
  const code = authError.code?.trim().toLowerCase() || '';
  const message = raw.toLowerCase();

  if (code === 'redirect_to_not_allowed' || message.includes('redirect') && message.includes('not allowed')) {
    return `O endereço de confirmação ${AUTH_CALLBACK} não está autorizado no Supabase Auth. A configuração de URLs de autenticação precisa incluir esse endereço.`;
  }
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  const isRecoveryPath = path === '/reset-password';
  const initialLogin = !['/signup', '/register', '/forgot-password'].includes(path);
  const initialReset = path === '/forgot-password';
  const [isLogin, setIsLogin] = useState(initialLogin);
  const [isReset, setIsReset] = useState(initialReset);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);

  const supportLink = import.meta.env.VITE_SUPPORT_WHATSAPP_LINK?.trim();
  const appOrigin = getAppOrigin();

  useEffect(() => {
    setIsLogin(initialLogin);
    setIsReset(initialReset);
    setError('');
    setSuccess('');
  }, [path]);

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
    if (user && !isRecoveryPath) navigate('/', { replace: true });
  }, [user, isRecoveryPath, navigate]);

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
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: AUTH_CALLBACK,
        },
      });

      if (authError) setError(describeAuthError(authError));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível iniciar o login com Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading || googleLoading) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isRecoveryPath) {
        if (!user) {
          setError('O link de recuperação é inválido ou expirou. Solicite uma nova recuperação de senha.');
          return;
        }
        if (password.length < 6) {
          setError('A nova senha deve ter pelo menos 6 caracteres.');
          return;
        }
        const { error: authError } = await supabase.auth.updateUser({ password });
        if (authError) {
          setError(describeAuthError(authError));
          return;
        }
        setSuccess('Senha atualizada com sucesso. Entrando no Marcenapp...');
        window.setTimeout(() => navigate('/', { replace: true }), 400);
        return;
      }

      if (isReset) {
        if (!email.trim()) {
          setError('Informe um e-mail válido.');
          return;
        }
        if (countdown > 0) return;
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${PRODUCTION_ORIGIN}/reset-password`,
        });
        if (authError) setError(describeAuthError(authError));
        else {
          setSuccess('Se o e-mail estiver cadastrado, enviaremos a recuperação. Verifique também o spam.');
          setCountdown(30);
        }
        return;
      }

      if (!email.trim()) {
        setError('Informe seu e-mail.');
        return;
      }
      if (password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres.');
        return;
      }

      if (isLogin) {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) {
          setError(describeAuthError(authError));
          return;
        }
        if (data.user && data.session) {
          navigate('/', { replace: true });
          return;
        }
        setError('A autenticação não retornou uma sessão. Tente novamente.');
        return;
      }

      if (!name.trim()) {
        setError('Informe seu nome.');
        return;
      }

      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { name: name.trim() }, emailRedirectTo: AUTH_CALLBACK },
      });

      if (authError) {
        setError(describeAuthError(authError));
        return;
      }

      if (data.session && data.user) {
        navigate('/', { replace: true });
        return;
      }

      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setError('Este e-mail já possui uma conta. Entre com sua senha ou use “Esqueceu a senha?”.');
        return;
      }

      if (data.user) {
        setSuccess('Cadastro recebido. Confirme o e-mail enviado para liberar o primeiro acesso.');
        return;
      }

      setError('O servidor não confirmou a criação da conta. Tente novamente.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Ocorreu um erro inesperado durante a autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--sidebar-bg))] px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <img src={logo} alt="Marcenapp" className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-[hsl(var(--sidebar-active))] shadow-lg shadow-[hsl(var(--sidebar-active)/0.3)]" />
          <h1 className="text-2xl font-bold text-white tracking-tight">MARCENA<span className="text-[hsl(var(--sidebar-active))]">PP</span></h1>
          <p className="text-[hsl(var(--sidebar-text))] text-sm mt-1">{title}</p>
        </div>

        <div className="flex items-center gap-3 text-white/40 text-xs">
          <div className="h-px flex-1 bg-white/15" />
          <span>Autenticação oficial Marcenapp</span>
          <div className="h-px flex-1 bg-white/15" />
        </div>

        {isLogin && !isReset && !isRecoveryPath && (
          <>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading}
              className="w-full py-3 rounded-xl bg-white text-gray-900 font-semibold hover:bg-gray-100 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {googleLoading ? <Loader2 className="animate-spin" size={18} /> : <span className="text-lg font-bold">G</span>}
              {googleLoading ? 'Conectando ao Google...' : 'Continuar com Google'}
            </button>
            <div className="flex items-center gap-3 text-white/30 text-xs">
              <div className="h-px flex-1 bg-white/10" />
              <span>ou entre com e-mail</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && !isReset && !isRecoveryPath && <input type="text" placeholder="Nome completo" value={name} onChange={(event) => setName(event.target.value)} required className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sidebar-active))] focus:border-transparent" />}
          {!isRecoveryPath && <input type="email" placeholder="E-mail" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sidebar-active))] focus:border-transparent" />}
          {(!isReset || isRecoveryPath) && <input type="password" placeholder={isRecoveryPath ? 'Nova senha' : 'Senha'} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} autoComplete={isLogin && !isRecoveryPath ? 'current-password' : 'new-password'} className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sidebar-active))] focus:border-transparent" />}
          {isLogin && !isReset && !isRecoveryPath && <div className="text-right"><button type="button" onClick={() => navigate('/forgot-password')} className="text-xs text-[hsl(var(--sidebar-text))] hover:text-[hsl(var(--sidebar-active))] transition-colors">Esqueceu a senha?</button></div>}
          {error && <div className="space-y-2"><p className="text-red-400 text-sm bg-red-950/50 p-3 rounded-lg">{error}</p>{isReset && supportLink && <p className="text-center"><a href={supportLink} target="_blank" rel="noopener noreferrer" className="text-xs text-[hsl(var(--sidebar-text))] hover:text-white underline">Não resolveu? Fale com o suporte</a></p>}</div>}
          {success && <p className="text-emerald-400 text-sm bg-emerald-950/50 p-3 rounded-lg">{success}</p>}
          <button type="submit" disabled={loading || googleLoading || (isReset && countdown > 0)} className="w-full py-3 rounded-xl bg-[hsl(var(--sidebar-active))] text-white font-bold hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 className="animate-spin" size={18} />}
            {isRecoveryPath ? 'Atualizar senha' : isReset ? (countdown > 0 ? `Aguarde ${countdown}s` : 'Enviar Recuperação') : isLogin ? 'Entrar' : 'Cadastrar'}
          </button>
        </form>

        <p className="text-center text-[hsl(var(--sidebar-text))] text-sm">
          {isRecoveryPath || isReset ? <button type="button" onClick={() => navigate('/auth')} className="text-[hsl(var(--sidebar-active))] font-semibold hover:underline">Voltar para o login</button> : <>{isLogin ? 'Não tem conta?' : 'Já tem conta?'}{' '}<button type="button" onClick={() => navigate(isLogin ? '/signup' : '/auth')} className="text-[hsl(var(--sidebar-active))] font-semibold hover:underline">{isLogin ? 'Cadastre-se' : 'Entrar'}</button></>}
        </p>
        <p className="text-center text-white/30 text-[11px]">{appOrigin.replace('https://', '')}</p>
      </div>
    </div>
  );
};

export default Auth;
