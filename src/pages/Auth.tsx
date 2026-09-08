import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import logo from '@/assets/marcenapp-logo.jpeg';

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

  const SUPPORT_LINK = import.meta.env.VITE_SUPPORT_WHATSAPP_LINK || "https://wa.me/5511999999999";

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown]);

  // Reset states when switching between login/signup/reset
  useEffect(() => {
    setError('');
    setSuccess('');
    setLoading(false);
    // We keep countdown to prevent bypass by switching tabs
  }, [isLogin, isReset]);

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isReset) {
        if (countdown > 0) {
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) {
          setError(error.message);
        } else {
          setSuccess('E-mail de recuperação enviado!');
          setCountdown(30);
        }
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setError(error.message);
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) setError(error.message);
        else setSuccess('Verifique seu e-mail para confirmar o cadastro.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--sidebar-bg))] px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <img src={logo} alt="MarcenApp" className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-[hsl(var(--sidebar-active))] shadow-lg shadow-[hsl(var(--sidebar-active)/0.3)]" />
          <h1 className="text-2xl font-bold text-white tracking-tight">
            MARCENA<span className="text-[hsl(var(--sidebar-active))]">PP</span>
          </h1>
          <p className="text-[hsl(var(--sidebar-text))] text-sm mt-1">Marcenaria 4.0</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && !isReset && (
            <input
              type="text"
              placeholder="Nome completo"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sidebar-active))] focus:border-transparent"
            />
          )}
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sidebar-active))] focus:border-transparent"
          />
          {!isReset && (
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sidebar-active))] focus:border-transparent"
            />
          )}

          {isLogin && !isReset && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => { 
                  setIsReset(true); 
                  // States are cleared by the useEffect [isLogin, isReset]
                }}
                className="text-xs text-[hsl(var(--sidebar-text))] hover:text-[hsl(var(--sidebar-active))] transition-colors"
              >
                Esqueceu a senha?
              </button>
            </div>
          )}

          {isReset && success && (
            <div className="text-center">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || countdown > 0}
                className="text-xs text-[hsl(var(--sidebar-active))] hover:underline transition-colors font-medium disabled:opacity-50 disabled:no-underline"
              >
                {loading ? 'Enviando...' : countdown > 0 ? `Tente novamente em ${countdown}s` : 'Não recebeu? Reenviar link de redefinição'}
              </button>
            </div>
          )}

          {error && (
            <div className="space-y-2">
              <p className="text-red-400 text-sm bg-red-950/50 p-3 rounded-lg">{error}</p>
              {isReset && (
                <p className="text-center">
                  <a 
                    href={SUPPORT_LINK} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-[hsl(var(--sidebar-text))] hover:text-white underline"
                  >
                    Não resolveu? Fale com o suporte
                  </a>
                </p>
              )}
            </div>
          )}
          {success && <p className="text-emerald-400 text-sm bg-emerald-950/50 p-3 rounded-lg">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[hsl(var(--sidebar-active))] text-white font-bold hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="animate-spin" size={18} />}
            {isReset ? 'Enviar Recuperação' : isLogin ? 'Entrar' : 'Cadastrar'}
          </button>
        </form>

        <p className="text-center text-[hsl(var(--sidebar-text))] text-sm">
          {isReset ? (
            <button onClick={() => { setIsReset(false); }} className="text-[hsl(var(--sidebar-active))] font-semibold hover:underline">
              Voltar para o login
            </button>
          ) : (
            <>
              {isLogin ? 'Não tem conta?' : 'Já tem conta?'}{' '}
              <button onClick={() => { setIsLogin(!isLogin); }} className="text-[hsl(var(--sidebar-active))] font-semibold hover:underline">
                {isLogin ? 'Cadastre-se' : 'Entrar'}
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default Auth;
