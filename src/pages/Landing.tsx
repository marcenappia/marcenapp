import { ArrowRight, Check, Cuboid, FileText, Gauge, Menu, Play, Sparkles, X, Zap } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '@/assets/marcenapp-logo.svg';

const features = [
  { icon: Cuboid, title: 'Projeto e 3D', text: 'Tire a ideia do papel, organize ambientes e visualize o projeto com mais segurança.' },
  { icon: Gauge, title: 'Orçamento inteligente', text: 'Transforme projeto e custos reais em uma proposta comercial clara e explicável.' },
  { icon: Zap, title: 'Produção conectada', text: 'Leve o projeto adiante para corte, produção, instalação e acompanhamento.' },
  { icon: FileText, title: 'Do projeto ao contrato', text: 'Aprovação do cliente, alterações, contrato e assinatura fazem parte da mesma jornada.' },
];

const stages = [
  ['Projetos', 'Organize seus projetos em um só lugar.'],
  ['Orçamentos', 'Conecte projeto e dados comerciais confirmados.'],
  ['Produção', 'Acompanhe a operação até a instalação.'],
  ['Clientes', 'Mantenha aprovação, comunicação e histórico conectados.'],
];

const Landing = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const goAuth = () => navigate('/auth');

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3" aria-label="Marcenapp início">
            <img src={logo} alt="Marcenapp" className="h-11 w-11 rounded-xl" />
            <div className="text-left leading-tight"><div className="text-lg font-black tracking-tight">MARCENA<span className="text-indigo-400">PP</span></div><div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Marcenaria 4.0</div></div>
          </button>
          <nav className="hidden items-center gap-8 md:flex" aria-label="Navegação principal">
            <a href="#como-funciona" className="text-sm font-semibold text-slate-300 hover:text-white">Como funciona</a>
            <a href="#recursos" className="text-sm font-semibold text-slate-300 hover:text-white">Recursos</a>
            <a href="#jornada" className="text-sm font-semibold text-slate-300 hover:text-white">Jornada</a>
            <button onClick={goAuth} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/10">Entrar</button>
            <button onClick={goAuth} className="rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-black shadow-lg shadow-indigo-500/20 hover:bg-indigo-400">Começar agora</button>
          </nav>
          <button className="rounded-xl p-2 md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu">{menuOpen ? <X /> : <Menu />}</button>
        </div>
        {menuOpen && <div className="border-t border-white/10 bg-slate-950 px-5 py-5 md:hidden"><div className="flex flex-col gap-3"><a onClick={() => setMenuOpen(false)} href="#como-funciona" className="rounded-xl px-3 py-3 text-slate-200">Como funciona</a><a onClick={() => setMenuOpen(false)} href="#recursos" className="rounded-xl px-3 py-3 text-slate-200">Recursos</a><button onClick={goAuth} className="rounded-xl bg-indigo-500 px-4 py-3 font-bold">Entrar ou cadastrar</button></div></div>}
      </header>

      <main>
        <section className="relative isolate overflow-hidden px-5 pb-24 pt-36 lg:px-8 lg:pb-32 lg:pt-44">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_70%_20%,rgba(99,102,241,.22),transparent_35%),radial-gradient(circle_at_15%_35%,rgba(56,189,248,.10),transparent_30%)]" />
          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.1fr_.9fr]">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1.5 text-xs font-bold text-indigo-300"><Sparkles size={14} /> A nova geração da marcenaria</div>
              <h1 className="max-w-4xl text-5xl font-black leading-[.98] tracking-[-0.04em] sm:text-6xl lg:text-7xl">Sua marcenaria inteira, <span className="text-indigo-400">conectada.</span></h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">O Marcenapp une inteligência artificial, projeto, orçamento, produção, gestão e relacionamento com o cliente em uma única jornada.</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row"><button onClick={goAuth} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-500 px-6 py-4 font-black shadow-xl shadow-indigo-500/20 hover:bg-indigo-400">Entrar ou cadastrar <ArrowRight size={18} /></button><a href="#como-funciona" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 px-6 py-4 font-bold text-slate-200 hover:bg-white/5"><Play size={17} /> Conhecer a plataforma</a></div>
              <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400"><span className="flex items-center gap-2"><Check size={15} className="text-emerald-400" /> Projeto conectado</span><span className="flex items-center gap-2"><Check size={15} className="text-emerald-400" /> Dados reais no orçamento</span><span className="flex items-center gap-2"><Check size={15} className="text-emerald-400" /> Cliente no centro</span></div>
            </div>
            <div className="relative">
              <div className="absolute -inset-8 rounded-[3rem] bg-indigo-500/10 blur-3xl" />
              <div className="relative rounded-[2rem] border border-white/10 bg-white/[.06] p-4 shadow-2xl backdrop-blur-xl">
                <div className="rounded-[1.5rem] border border-white/10 bg-slate-900 p-5">
                  <div className="mb-6 flex items-center justify-between"><div><div className="text-xs font-bold uppercase tracking-widest text-slate-500">Painel da marcenaria</div><div className="mt-1 text-xl font-black">Tudo em uma jornada</div></div><div className="rounded-xl bg-indigo-500/15 p-3 text-indigo-300"><Cuboid size={24} /></div></div>
                  <div className="grid grid-cols-2 gap-3">{stages.map(([title, text]) => <div key={title} className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><div className="text-xs font-semibold text-slate-500">{title}</div><div className="mt-2 text-sm font-bold text-slate-200">Conectado à jornada</div><div className="mt-1 text-[10px] leading-4 text-slate-500">{text}</div></div>)}</div>
                  <div className="mt-3 rounded-2xl border border-white/10 bg-gradient-to-r from-indigo-500/15 to-sky-500/10 p-5"><div className="flex items-center gap-3"><Sparkles className="text-indigo-300" size={20} /><div><div className="font-bold">IARA está pronta para ajudar</div><div className="mt-1 text-xs text-slate-400">Organize o próximo passo do seu projeto.</div></div></div></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="como-funciona" className="border-y border-white/10 bg-white/[.025] px-5 py-20 lg:px-8 lg:py-24"><div className="mx-auto max-w-7xl"><div className="max-w-2xl"><div className="text-sm font-black uppercase tracking-[.2em] text-indigo-400">Como funciona</div><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Do primeiro desenho ao pós-venda.</h2><p className="mt-4 text-slate-400">Em vez de espalhar sua operação em vários sistemas, o projeto acompanha você em todas as etapas.</p></div><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{features.map(({ icon: Icon, title, text }, index) => <article key={title} className="rounded-3xl border border-white/10 bg-slate-900/60 p-6"><div className="flex items-center justify-between"><div className="rounded-2xl bg-indigo-500/10 p-3 text-indigo-300"><Icon size={22} /></div><span className="text-xs font-black text-slate-600">0{index + 1}</span></div><h3 className="mt-6 text-lg font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{text}</p></article>)}</div></div></section>

        <section id="recursos" className="px-5 py-20 lg:px-8 lg:py-28"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center"><div><div className="text-sm font-black uppercase tracking-[.2em] text-indigo-400">Marcenaria 4.0</div><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Tecnologia que respeita o jeito real de trabalhar.</h2><p className="mt-5 max-w-xl leading-7 text-slate-400">IA ajuda a acelerar. Você continua decidindo. O Marcenapp foi pensado para reduzir retrabalho, organizar informação e transformar cada projeto em uma operação acompanhável.</p><div className="mt-8 space-y-4">{['IA para apoiar criação e atendimento','Orçamento baseado em dados confirmados','Histórico e versões do projeto','Aprovação do cliente e contrato integrados'].map(item => <div key={item} className="flex items-center gap-3"><div className="rounded-full bg-emerald-400/10 p-1 text-emerald-400"><Check size={15} /></div><span className="font-semibold text-slate-200">{item}</span></div>)}</div></div><div id="jornada" className="rounded-[2rem] border border-white/10 bg-white/[.04] p-6"><div className="text-xs font-black uppercase tracking-widest text-slate-500">A jornada</div><div className="mt-6 space-y-3">{['Ideia → Projeto','Projeto → Orçamento','Orçamento → Negociação','Aprovação → Contrato','Contrato → Produção','Produção → Instalação','Instalação → Pós-venda'].map((item, i) => <div key={item} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-xs font-black text-indigo-300">{i + 1}</span><span className="font-bold">{item}</span></div>)}</div></div></div></section>

        <section className="px-5 pb-24 lg:px-8 lg:pb-32"><div className="mx-auto max-w-5xl rounded-[2rem] border border-indigo-400/20 bg-gradient-to-br from-indigo-500/15 to-white/[.03] p-8 text-center sm:p-12"><Sparkles className="mx-auto text-indigo-300" size={28} /><h2 className="mt-5 text-3xl font-black sm:text-4xl">Pronto para colocar sua marcenaria em uma nova fase?</h2><p className="mx-auto mt-4 max-w-2xl text-slate-400">Entre ou crie sua conta e comece pelo seu primeiro projeto.</p><button onClick={goAuth} className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-indigo-500 px-7 py-4 font-black hover:bg-indigo-400">Entrar ou cadastrar <ArrowRight size={18} /></button></div></section>
      </main>
      <footer className="border-t border-white/10 px-5 py-8 lg:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><img src={logo} alt="" className="h-7 w-7 rounded-lg" /><span>Marcenapp · Marcenaria 4.0</span></div><span>Projeto, orçamento, produção e gestão em uma jornada.</span></div></footer>
    </div>
  );
};

export default Landing;
