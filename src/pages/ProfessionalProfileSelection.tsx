import { ArrowLeft, ArrowRight, Building2, Factory, HardHat, Palette, Ruler, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logo from '@/assets/marcenapp-logo.svg';
import { PROFESSIONAL_PROFILES, type ProfessionalProfile } from '@/modules/admin/ProfessionalProfiles';

const PROFILE_ICONS: Record<ProfessionalProfile, typeof HardHat> = {
  marceneiro: HardHat,
  loja_planejados: Building2,
  arquiteto: Ruler,
  designer_interiores: Palette,
  projetista: Ruler,
  vendedor_planejados: Users,
  fabrica: Factory,
};

export default function ProfessionalProfileSelection() {
  const navigate = useNavigate();

  const select = (profession: ProfessionalProfile) => {
    navigate(`/signup?profession=${encodeURIComponent(profession)}`);
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col justify-center">
        <button type="button" onClick={() => navigate('/')} className="mb-8 inline-flex w-fit items-center gap-2 text-sm font-semibold text-slate-400 transition-colors hover:text-white" aria-label="Voltar para o Marcenapp">
          <ArrowLeft size={17} /> Voltar
        </button>
        <div className="mb-10 max-w-2xl">
          <div className="mb-5 flex items-center gap-3"><img src={logo} alt="Marcenapp" className="h-10 w-10 rounded-xl" /><span className="text-sm font-black tracking-wide">MARCENAPP</span></div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">Antes do cadastro</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] sm:text-5xl">Como você trabalha?</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-400">Escolha seu perfil profissional. Essa escolha orienta a experiência inicial do Marcenapp e o contexto que a IARA deve priorizar.</p>
        </div>
        <section aria-labelledby="profile-options" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <h2 id="profile-options" className="sr-only">Perfis profissionais disponíveis</h2>
          {PROFESSIONAL_PROFILES.map((profile) => {
            const Icon = PROFILE_ICONS[profile.value];
            return <button key={profile.value} type="button" onClick={() => select(profile.value)} className="group rounded-2xl border border-white/10 bg-white/[0.045] p-5 text-left transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
              <div className="flex items-start justify-between gap-4"><div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-slate-200"><Icon size={20} strokeWidth={1.8} aria-hidden="true" /></div><ArrowRight size={17} className="mt-1 text-slate-600 transition-transform group-hover:translate-x-1 group-hover:text-slate-300" aria-hidden="true" /></div>
              <h3 className="mt-5 text-lg font-black">{profile.label}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{profile.description}</p>
            </button>;
          })}
        </section>
        <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-500">Você poderá revisar o perfil depois em <span className="text-slate-300">Central da marcenaria</span>.</p>
          <button type="button" onClick={() => navigate('/auth')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold text-slate-300 transition-colors hover:bg-white/5 hover:text-white">Já tenho conta <ArrowRight size={16} /></button>
        </div>
      </div>
    </main>
  );
}
