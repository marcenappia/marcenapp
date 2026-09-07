import { ArrowRight, Check, Cuboid, FileText, Hammer, MessageSquareText, ShieldCheck, Sparkles, Scissors, Zap } from 'lucide-react';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import logo from '@/assets/marcenapp-logo.svg';

const Landing = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate('/app', { replace: true });
  }, [loading, user, navigate]);

  if (loading || user) return <div className="min-h-screen bg-slate-950" />;

  const features = [
    ['Orçamento inteligente', 'Monte preços, margens e propostas sem perder tempo em planilhas.', FileText],
    ['Estúdio + IA', 'Transforme fotos e ideias do cliente em projetos visuais para apresentar.', Cuboid],
    ['Plano de corte', 'Leve o projeto para a produção com mais organização e menos desperdício.', Scissors],
    ['Diário da obra', 'Registre foto, voz, texto e pendências direto do celular.', MessageSquareText],
  ] as const;

  return <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
    <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="MARCENAPP" className="w-9 h-9 object-contain" />
          <div><div className="font-black tracking-tight">MARCENAPP</div><div className="text-[10px] text-slate-400 font-semibold">OS — Orquestrador Inteligente</div></div>
        </div>
        <button onClick={() => navigate('/auth')} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold hover:bg-white/10 transition">Entrar</button>
      </div>
    </header>

    <main>
      <section className="relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,.28),transparent_45%)]" />
        <div className="max-w-6xl mx-auto px-5 pt-20 pb-16 md:pt-28 md:pb-24 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1.5 text-xs font-bold text-indigo-200"><Sparkles size={14}/> Feito para quem vive a marcenaria</div>
            <h1 className="mt-6 text-4xl md:text-6xl font-black tracking-tight leading-[1.02]">Do pedido do cliente à produção, <span className="text-indigo-400">sem perder tempo.</span></h1>
            <p className="mt-6 text-lg md:text-xl text-slate-300 leading-relaxed max-w-2xl">O MARCENAPP organiza sua marcenaria em um só lugar: projeto, IA, orçamento, aprovação, diário da obra, produção e plano de corte.</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button onClick={() => navigate('/auth')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 font-black shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition">Começar agora <ArrowRight size={18}/></button>
              <button onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })} className="rounded-xl border border-white/15 px-6 py-3.5 font-bold text-slate-200 hover:bg-white/10 transition">Ver como funciona</button>
            </div>
            <div className="mt-7 flex flex-wrap gap-4 text-xs text-slate-400"><span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-400"/> 14 dias para testar</span><span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-400"/> Dados protegidos</span><span className="flex items-center gap-1.5"><Zap size={14} className="text-amber-400"/> Feito para celular</span></div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="bg-slate-900/60 border-y border-white/10">
        <div className="max-w-6xl mx-auto px-5 py-16 md:py-20">
          <div className="max-w-2xl"><p className="text-xs font-black uppercase tracking-[.2em] text-indigo-300">Um fluxo simples</p><h2 className="mt-2 text-3xl md:text-4xl font-black">Foto → Pedido → Aprovação → Entrega</h2><p className="mt-4 text-slate-400">Você trabalha. A MARCENAPP organiza a parte pesada por trás.</p></div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">{features.map(([title, text, Icon]) => <div key={title} className="rounded-2xl border border-white/10 bg-white/[.04] p-5"><div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-300 flex items-center justify-center"><Icon size={20}/></div><h3 className="mt-4 font-extrabold text-lg">{title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-400">{text}</p></div>)}</div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 py-16 md:py-20">
        <div className="rounded-3xl border border-indigo-400/20 bg-gradient-to-br from-indigo-500/15 to-white/[.03] p-7 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-7">
          <div><div className="flex items-center gap-2 text-indigo-200 font-bold"><Hammer size={18}/> Sua marcenaria, mais organizada.</div><h2 className="mt-2 text-2xl md:text-3xl font-black">Entre, cadastre sua marcenaria e comece pelo próximo projeto.</h2></div>
          <button onClick={() => navigate('/auth')} className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-white text-slate-950 px-6 py-3.5 font-black hover:bg-slate-100 transition">Criar minha conta <ArrowRight size={18}/></button>
        </div>
      </section>
    </main>
    <footer className="border-t border-white/10 py-7"><div className="max-w-6xl mx-auto px-5 text-xs text-slate-500 flex flex-col sm:flex-row gap-2 justify-between"><span>© {new Date().getFullYear()} MARCENAPP</span><span>Do rascunho à produção.</span></div></footer>
  </div>;
};

export default Landing;
