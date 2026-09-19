import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Factory, HardHat, Home, Palette, Ruler, ShoppingBag, Store, Loader2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { PROFESSIONAL_PROFILES } from '@/modules/admin/ProfessionalProfiles';

const ICONS = {
  marceneiro: HardHat,
  loja_planejados: Store,
  arquiteto: Home,
  designer_interiores: Palette,
  projetista: Ruler,
  vendedor_planejados: ShoppingBag,
  fabrica: Factory,
} as const;

export default function ProfessionalProfileSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isLogin = new URLSearchParams(location.search).get('mode') === 'login';

  useEffect(() => {
    if (isLogin && !loading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [isLogin, loading, user, navigate]);

  if (isLogin && loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white" aria-busy="true">
        <div className="text-center">
          <p className="text-sm font-black tracking-wide">MARCENAPP</p>
          <p className="mt-2 text-xs text-slate-400">Restaurando sua sessão…</p>
        </div>
      </main>
    );
  }

  if (isLogin && !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white" aria-busy="true">
        <div className="text-center">
          <p className="text-sm font-black tracking-wide">MARCENAPP</p>
          <p className="mt-2 text-xs text-slate-400">Abrindo a autenticação…</p>
        </div>
      </main>
    );
  }

  const chooseProfile = async (value: string) => {
    if (saving) return;
    if (!user) {
      navigate(`/signup?profession=${encodeURIComponent(value)}`);
      return;
    }
    setSaving(true);
    setError('');
    const { error: updateError } = await supabase.from('profiles').update({ profession: value }).eq('user_id', user.id);
    if (updateError) {
      console.error('Falha ao salvar perfil profissional:', updateError);
      setError('Não foi possível salvar seu perfil agora. Tente novamente.');
      setSaving(false);
      return;
    }
    await refreshProfile();
    navigate('/', { replace: true });
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col justify-center">
        <button type="button" onClick={() => navigate('/')} className="mb-5 inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-white">
          <ArrowLeft size={14} /> Voltar
        </button>
        <div className="mb-7">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-300">{user ? 'Primeiro acesso' : 'Cadastro'}</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-.04em]">Como você trabalha?</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">Escolha o perfil que mais representa sua rotina. Isso orienta a experiência principal do Marcenapp e o contexto profissional da IARA.</p>
        </div>
        <section aria-label="Perfil profissional" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PROFESSIONAL_PROFILES.map((profile) => {
            const Icon = ICONS[profile.value] ?? BriefcaseBusiness;
            return (
              <button
                key={profile.value}
                type="button"
                disabled={saving}
                onClick={() => void chooseProfile(profile.value)}
                className="group flex min-h-32 flex-col items-start rounded-2xl border border-white/10 bg-white/[.045] p-4 text-left transition hover:border-white/20 hover:bg-white/[.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-wait disabled:opacity-60"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-slate-300">
                  <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span className="mt-4 min-w-0 flex-1">
                  <span className="block text-sm font-black">{profile.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">{profile.description}</span>
                </span>
                <span className="mt-3 flex w-full items-center justify-between text-slate-600 group-hover:text-slate-300">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Selecionar</span>
                  {saving ? <Loader2 size={15} className="animate-spin text-blue-300" aria-hidden="true" /> : <ArrowRight size={15} aria-hidden="true" />}
                </span>
              </button>
            );
          })}
        </section>
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</p>}
        <p className="mt-5 text-center text-[11px] text-slate-600">Você pode alterar o perfil depois na Central da marcenaria.</p>
      </div>
    </main>
  );
}
