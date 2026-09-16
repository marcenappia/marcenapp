import { ArrowLeft, ArrowRight, BriefcaseBusiness, HardHat, Palette, Ruler } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const OPTIONS = [
  { value: 'marceneiro', label: 'Marceneiro', description: 'Projeto e produção', icon: HardHat },
  { value: 'projetista', label: 'Projetista', description: 'Projeto e detalhamento', icon: Ruler },
  { value: 'arquiteto', label: 'Arquiteto / Design de interiores', description: 'Ambientes e especificações', icon: Palette },
  { value: 'outros', label: 'Outros', description: 'Outras formas de trabalhar', icon: BriefcaseBusiness },
] as const;

export default function ProfessionalProfileSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLogin = new URLSearchParams(location.search).get('mode') === 'login';
  if (isLogin) { navigate('/auth', { replace: true }); return null; }
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col justify-center">
        <button type="button" onClick={() => navigate('/')} className="mb-5 inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-white"><ArrowLeft size={14} /> Voltar</button>
        <div className="mb-6"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">Cadastro</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">Como você trabalha?</h1><p className="mt-2 text-sm text-slate-400">Escolha seu perfil para preparar sua experiência.</p></div>
        <section aria-label="Perfil profissional" className="grid gap-2">
          {OPTIONS.map(({ value, label, description, icon: Icon }) => <button key={value} type="button" onClick={() => navigate(`/signup?profession=${encodeURIComponent(value)}`)} className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.045] px-4 py-3 text-left transition hover:border-white/20 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-slate-300"><Icon size={17} strokeWidth={1.8} aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-black">{label}</span><span className="block text-xs text-slate-500">{description}</span></span><ArrowRight size={15} className="text-slate-600 group-hover:text-slate-300" aria-hidden="true" /></button>)}
        </section>
        <p className="mt-5 text-center text-[11px] text-slate-600">O perfil pode ser ajustado depois na Central da marcenaria.</p>
      </div>
    </main>
  );
}
