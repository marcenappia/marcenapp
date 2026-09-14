import { useEffect, useState } from 'react';
import { BriefcaseBusiness, Check, Loader2, Ruler, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const PROFESSIONAL_PROFILES = [
  { id: 'marcenaria', label: 'Marcenaria', description: 'Quero organizar e executar meus trabalhos de marcenaria', icon: BriefcaseBusiness },
  { id: 'projetista', label: 'Projetista', description: 'Meu foco é projeto, detalhamento e documentação', icon: Ruler },
  { id: 'outro', label: 'Outro', description: 'Quero usar uma ferramenta específica do Marcenapp', icon: Sparkles },
] as const;

const ProfessionalProfileGate = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string>(profile?.profession ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && profile?.profession) navigate('/workspace', { replace: true });
  }, [user, profile?.profession, navigate]);

  if (!user || profile?.profession) return null;

  const continueToWorkspace = async () => {
    if (!selected || saving) return;
    setSaving(true);
    setError('');
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profession: selected })
        .eq('user_id', user.id);
      if (updateError) throw updateError;

      await refreshProfile();
      navigate('/workspace', { replace: true });
    } catch (caught) {
      console.error('Falha ao salvar perfil profissional', caught);
      setError('Não foi possível salvar sua escolha. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center overflow-y-auto bg-slate-950 px-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-300">Primeiro acesso</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">Como você trabalha?</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-300 md:text-base">Escolha seu perfil profissional para abrir o Marcenapp já na área de trabalho mais adequada ao seu dia a dia.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {PROFESSIONAL_PROFILES.map(({ id, label, description, icon: Icon }) => {
            const active = selected === id;
            return (
              <button key={id} type="button" onClick={() => setSelected(id)} aria-pressed={active} className={`group rounded-2xl border p-5 text-left transition-all ${active ? 'border-indigo-400 bg-indigo-500/15 ring-2 ring-indigo-400/30' : 'border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]'}`}>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${active ? 'bg-indigo-500 text-white' : 'bg-white/10 text-slate-300'}`}><Icon size={22} /></div>
                <div className="mt-5 flex items-start justify-between gap-2"><div><h2 className="text-base font-black text-white">{label}</h2><p className="mt-1 text-xs leading-5 text-slate-400">{description}</p></div>{active && <Check size={18} className="shrink-0 text-indigo-300" />}</div>
              </button>
            );
          })}
        </div>

        {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-center text-sm text-red-300">{error}</p>}
        <button type="button" onClick={continueToWorkspace} disabled={!selected || saving} className="mx-auto mt-6 flex min-h-12 w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40">{saving && <Loader2 size={17} className="animate-spin" />}{saving ? 'Preparando sua área...' : 'Entrar na minha área de trabalho'}</button>
        <p className="mt-4 text-center text-[11px] text-slate-500">Você poderá ajustar seu perfil depois nas configurações da marcenaria.</p>
      </div>
    </div>
  );
};

export default ProfessionalProfileGate;
