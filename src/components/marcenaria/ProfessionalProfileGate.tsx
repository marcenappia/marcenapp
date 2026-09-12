import { useState } from 'react';
import { ArrowRight, BriefcaseBusiness, Check, Compass, Hammer, HardHat, Ruler, UserRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const PROFESSIONAL_PROFILES = [
  { id: 'marceneiro', label: 'Marceneiro', description: 'Projeto, dimensionamento e produção', icon: Hammer },
  { id: 'designer', label: 'Designer de móveis', description: 'Criação, apresentação e especificação', icon: Compass },
  { id: 'arquiteto', label: 'Arquiteto', description: 'Projeto, ambientes e apresentação', icon: HardHat },
  { id: 'projetista', label: 'Projetista', description: 'Detalhamento, medidas e documentação', icon: Ruler },
  { id: 'montador', label: 'Montador / Instalador', description: 'Montagem, instalação e entrega', icon: BriefcaseBusiness },
  { id: 'gestor', label: 'Proprietário / Gestor de marcenaria', description: 'Equipe, operação e negócio', icon: UserRound },
  { id: 'outro', label: 'Outro', description: 'Atuo de outra forma no setor', icon: UserRound },
] as const;

const ProfessionalProfileGate = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [selected, setSelected] = useState<string>(profile?.profession ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!user || !profile || profile.profession) return null;

  const save = async () => {
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
    } catch (caught) {
      console.error('Falha ao salvar perfil profissional', caught);
      setError('Não foi possível salvar sua escolha. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="professional-profile-title">
      <div className="w-full max-w-3xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-3xl bg-white border border-slate-200 shadow-2xl">
        <div className="px-5 pt-7 pb-4 sm:px-8 sm:pt-9 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <UserRound size={24} aria-hidden="true" />
          </div>
          <h2 id="professional-profile-title" className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">Como você trabalha com marcenaria?</h2>
          <p className="mt-2 text-sm sm:text-base text-slate-500">Escolha seu perfil profissional. Isso ajuda o Marcenapp a adaptar sua experiência desde o primeiro acesso.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-5 sm:px-8 pb-5">
          {PROFESSIONAL_PROFILES.map(({ id, label, description, icon: Icon }) => {
            const active = selected === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelected(id)}
                aria-pressed={active}
                className={`group flex items-center gap-3 rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${active ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
              >
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'}`}>
                  <Icon size={21} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-slate-900">{label}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-500">{description}</span>
                </span>
                {active && <Check size={19} className="shrink-0 text-indigo-600" aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-8 sm:py-5">
          {error && <p className="mb-3 text-center text-sm font-medium text-red-600" role="alert">{error}</p>}
          <button
            type="button"
            onClick={save}
            disabled={!selected || saving}
            className="mx-auto flex w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Continuar'}
            {!saving && <ArrowRight size={18} aria-hidden="true" />}
          </button>
          <p className="mt-3 text-center text-[11px] text-slate-400">Essa escolha é do seu perfil profissional, não da configuração da marcenaria.</p>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalProfileGate;
