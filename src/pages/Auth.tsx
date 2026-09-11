import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import logo from '@/assets/marcenapp-logo.svg';

const PRODUCTION_ORIGIN = 'https://marcenapp.com.br';
const AUTH_CALLBACK = `${PRODUCTION_ORIGIN}/auth`;

const getAppOrigin = () => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return window.location.origin;
  }
  return PRODUCTION_ORIGIN;
};

const Auth = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [isReset, setIsReset] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);

  const supportLink = import.meta.env.VITE_SUPPORT_WHATSAPP_LINK?.trim();
  const appOrigin = getAppOrigin();

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const oauthError = params.get('error_description') || params.get('error');
    if (!oauthError) return;
    setError(decodeURIComponent(oauthError.replace(/\+/g, ' ')));
    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
  }, []);

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isReset) {
        if (countdown > 0) return;
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: AUTH_CALLBACK,
        });
        if (authError) setError(authError.message);
        else {
          setSuccess('E-mail de recuperação enviado. Verifique também o spam.');
          setCountdown(30);
        }
        return;
      }

      if (isLogin) {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) {
          setError(authError.message);
          return;
        }
        if (data.session) navigate('/', { replace: true });
        return;
      }

      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: AUTH_CALLBACK,
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      if (data.session) {
        navigate('/', { replace: true });
      } else {
        setSuccess('Cadastro criado. Confirme o e-mail para liberar o primeiro acesso.');
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Ocorreu um erro inesperado.');
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
          <p className="text-[hsl(var(--sidebar-text))] text-sm mt-1">Marcenaria 4.0</p>
        </div>

        <div className="flex items-center gap-3 text-white/40 text-xs">
          <div className="h-px flex-1 bg-white/15" />
          <span>Acesso seguro por e-mail</span>
          <div className="h-px flex-1 bg-white/15" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && !isReset && (
            <input type="text" placeholder="Nome completo" value={name} onChange={(event) => setName(event.target.value)} required className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sidebar-active))] focus:border-transparent" />
          )}
          <input type="email" placeholder="E-mail" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sidebar-active))] focus:border-transparent" />
          {!isReset && (
            <input type="password" placeholder="Senha" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} autoComplete={isLogin ? 'current-password' : 'new-password'} className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sidebar-active))] focus:border-transparent" />
          )}
          {isLogin && !isReset && (
            <div className="text-right">
              <button type="button" onClick={() => setIsReset(true)} className="text-xs text-[hsl(var(--sidebar-text))] hover:text-[hsl(var(--sidebar-active))] transition-colors">Esqueceu a senha?</button>
            </div>
          )}
          {error && (
            <div className="space-y-2">
              <p className="text-red-400 text-sm bg-red-950/50 p-3 rounded-lg">{error}</p>
              {isReset && supportLink && <p className="text-center"><a href={supportLink} target="_blank" rel="noopener noreferrer" className="text-xs text-[hsl(var(--sidebar-text))] hover:text-white underline">Não resolveu? Fale com o suporte</a></p>}
            </div>
          )}
          {success && <p className="text-emerald-400 text-sm bg-emerald-950/50 p-3 rounded-lg">{success}</p>}
          <button type="submit" disabled={loading || (isReset && countdown > 0)} className="w-full py-3 rounded-xl bg-[hsl(var(--sidebar-active))] text-white font-bold hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 className="animate-spin" size={18} />}
            {isReset ? (countdown > 0 ? `Aguarde ${countdown}s` : 'Enviar Recuperação') : isLogin ? 'Entrar' : 'Cadastrar'}
          </button>
        </form>

        <p className="text-center text-[hsl(var(--sidebar-text))] text-sm">
          {isReset ? (
            <button type="button" onClick={() => setIsReset(false)} className="text-[hsl(var(--sidebar-active))] font-semibold hover:underline">Voltar para o login</button>
          ) : (
            <>
              {isLogin ? 'Não tem conta?' : 'Já tem conta?'}{' '}
              <button type="button" onClick={() => setIsLogin((value) => !value)} className="text-[hsl(var(--sidebar-active))] font-semibold hover:underline">{isLogin ? 'Cadastre-se' : 'Entrar'}</button>
            </>
          )}
        </p>

        <p className="text-center text-white/30 text-[11px]">Autenticação oficial Marcenapp · {appOrigin.replace('https://', '')}</p>
      </div>
    </div>
  );
};

export default Auth;
