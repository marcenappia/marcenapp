import {
  ArrowRight,
  Check,
  Cuboid,
  FileText,
  Image as ImageIcon,
  Lightbulb,
  Menu,
  Ruler,
  Scissors,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import logo from '@/assets/marcenapp-logo.svg';

const plans = [
  { name: 'Start', price: '79', description: 'Para começar a transformar projetos em vendas.', features: ['MARCENA Studio', 'IARA', 'Jornada do projeto', 'Orçamento', 'Diário digital'] },
  { name: 'Pro', price: '179', description: 'Para projetar, apresentar e produzir com mais velocidade.', featured: true, features: ['Tudo do Start', 'Mais uso de IA', 'Plano de corte', 'Produção', 'Memória da obra'] },
  { name: 'Business', price: '349', description: 'Para equipes e marcenarias com maior volume.', features: ['Tudo do Pro', 'Maior capacidade de IA', 'Visão administrativa', 'Indicadores', 'Suporte prioritário'] },
] as const;

const Landing = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate('/app', { replace: true });
  }, [loading, user, navigate]);

  if (loading || user) return <div className="min-h-screen bg-[#0b1015]" />;

  const start = (plan?: string) => navigate(plan ? `/auth?plan=${plan}` : '/auth');

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0b1015] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b1015]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link to="/" className="flex items-center gap-3" aria-label="MARCENAPP início">
            <img src={logo} alt="MARCENAPP" className="h-9 w-9 object-contain" />
            <div className="leading-none"><div className="text-base font-black tracking-tight">MARCENAPP</div><div className="mt-1 text-[9px] font-semibold uppercase tracking-[.18em] text-slate-500">Marcenaria inteligente</div></div>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-300 md:flex">
            <a href="#marcena" className="transition hover:text-white">MARCENA</a>
            <a href="#como-funciona" className="transition hover:text-white">Como funciona</a>
            <a href="#vantagens" className="transition hover:text-white">Vantagens</a>
            <a href="#planos" className="transition hover:text-white">Planos</a>
          </nav>

          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/auth')} className="hidden rounded-xl px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-white/5 hover:text-white sm:block">Entrar</button>
            <button onClick={() => start()} className="inline-flex items-center gap-2 rounded-xl bg-[#f4a640] px-4 py-2.5 text-sm font-black text-[#17110a] shadow-lg shadow-orange-500/10 transition hover:-translate-y-0.5 hover:bg-[#ffb85f]">Criar projeto <ArrowRight size={16} /></button>
            <button onClick={() => setMenuOpen(!menuOpen)} className="rounded-xl p-2 text-slate-300 md:hidden" aria-label="Abrir menu">{menuOpen ? <X size={21} /> : <Menu size={21} />}</button>
          </div>
        </div>
        {menuOpen && <div className="border-t border-white/10 bg-[#0b1015] px-5 py-4 md:hidden"><div className="flex flex-col gap-4 text-sm font-semibold text-slate-300"><a onClick={() => setMenuOpen(false)} href="#marcena">MARCENA</a><a onClick={() => setMenuOpen(false)} href="#como-funciona">Como funciona</a><a onClick={() => setMenuOpen(false)} href="#vantagens">Vantagens</a><a onClick={() => setMenuOpen(false)} href="#planos">Planos</a></div></div>}
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_20%,rgba(244,166,64,.18),transparent_31%),radial-gradient(circle_at_12%_70%,rgba(35,63,86,.48),transparent_38%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-16 pt-14 md:grid-cols-[.9fr_1.1fr] md:items-center md:pb-24 md:pt-20 lg:px-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/20 bg-orange-300/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[.18em] text-orange-200"><Sparkles size={14} /> MARCENA + IARA</div>
              <h1 className="mt-6 max-w-2xl text-5xl font-black leading-[.98] tracking-[-.04em] sm:text-6xl lg:text-[4.6rem]">Do rascunho ao <span className="text-[#f4a640]">3D em minutos.</span></h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300 sm:text-xl">Transforme a ideia do cliente em um projeto que ele consegue enxergar, aprovar e comprar — antes de você colocar a mão na produção.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button onClick={() => start()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#f4a640] px-6 py-3.5 font-black text-[#17110a] shadow-xl shadow-orange-500/15 transition hover:-translate-y-0.5 hover:bg-[#ffb85f]">Criar meu primeiro projeto <ArrowRight size={18} /></button>
                <a href="#marcena" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-6 py-3.5 font-bold text-slate-200 transition hover:border-white/25 hover:bg-white/5">Conhecer a MARCENA</a>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500"><span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-400" /> Feito para marcenaria</span><span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-400" /> Funciona no celular</span><span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-400" /> IARA integrada</span></div>
            </div>

            <div className="relative mx-auto w-full max-w-2xl">
              <div className="absolute -inset-8 rounded-[3rem] bg-orange-400/10 blur-3xl" />
              <div className="relative rounded-[2rem] border border-white/10 bg-white/[.045] p-2 shadow-2xl shadow-black/40 sm:p-3">
                <div className="grid gap-2 sm:grid-cols-[.72fr_1.28fr]">
                  <figure className="relative overflow-hidden rounded-[1.4rem] bg-[#eee7dc]">
                    <img src="/landing-sketch.svg" alt="Rascunho técnico de móvel planejado" className="h-full min-h-[330px] w-full object-cover" />
                    <div className="absolute left-4 top-4 rounded-full border border-[#5b4638]/15 bg-white/75 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.15em] text-[#5b4638] backdrop-blur">Rascunho</div>
                    <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent px-4 pb-4 pt-12 text-xs font-bold text-white">Ideia + medidas</figcaption>
                  </figure>
                  <figure className="relative overflow-hidden rounded-[1.4rem] bg-[#191714]">
                    <img src="https://images.unsplash.com/photo-1556912167-f556f1f39fdf?auto=format&fit=crop&w=1200&q=88" alt="Cozinha planejada realista" className="h-full min-h-[330px] w-full object-cover" loading="eager" />
                    <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.15em] text-white backdrop-blur"><Sparkles size={12} className="text-[#f4a640]" /> MARCENA</div>
                    <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-4 pt-16 text-sm font-black text-white">O cliente vê antes de produzir</figcaption>
                  </figure>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-white/10 bg-black/25 px-4 py-3"><div className="flex items-center gap-2 text-xs font-bold text-slate-300"><span className="h-2 w-2 rounded-full bg-[#f4a640]" /> IARA analisou o projeto</div><span className="text-xs font-black text-emerald-300">Pronto para apresentar</span></div>
              </div>
            </div>
          </div>
        </section>

        <section id="marcena" className="bg-[#f7f5f1] py-20 text-slate-950 md:py-28">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
              <div><p className="text-xs font-black uppercase tracking-[.22em] text-orange-600">A experiência que vende</p><h2 className="mt-3 text-4xl font-black leading-tight tracking-tight sm:text-5xl">MARCENA coloca o projeto na frente do cliente.</h2></div>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">A inteligência da IARA ajuda a interpretar o que foi pedido. A MARCENA transforma isso em uma apresentação visual profissional. O marceneiro deixa de explicar só com palavras e passa a mostrar.</p>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {[
                ['01', 'Entenda a ideia', 'Foto do ambiente, rascunho, medidas e pedido do cliente entram no projeto.', ImageIcon],
                ['02', 'Visualize o resultado', 'A IARA organiza o contexto e a MARCENA conduz a criação visual em 3D.', Cuboid],
                ['03', 'Apresente para vender', 'Mostre o ambiente pronto, alinhe detalhes e avance para aprovação.', Sparkles],
              ].map(([number, title, text, Icon]) => <article key={number as string} className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"><div className="flex items-center justify-between"><span className="text-sm font-black text-orange-600">{number as string}</span><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white"><Icon size={20} /></div></div><h3 className="mt-7 text-xl font-black">{title as string}</h3><p className="mt-3 text-sm leading-6 text-slate-500">{text as string}</p></article>)}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="border-y border-white/10 bg-[#111820] py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="max-w-3xl"><p className="text-xs font-black uppercase tracking-[.22em] text-orange-300">Seu jeito de trabalhar, só que mais rápido</p><h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Você começa com uma ideia. O sistema leva o projeto adiante.</h2></div>
            <div className="relative mt-14 grid gap-4 md:grid-cols-4">
              {[['01', 'Foto ou rascunho', ImageIcon], ['02', 'IARA entende', Sparkles], ['03', 'MARCENA cria o 3D', Cuboid], ['04', 'Cliente aprova', Check]].map(([n, t, Icon], index) => <div key={n as string} className="relative rounded-3xl border border-white/10 bg-white/[.035] p-6"><div className="flex items-center justify-between"><span className="text-3xl font-black text-orange-300">{n as string}</span><Icon size={21} className="text-slate-400" /></div><h3 className="mt-8 font-black">{t as string}</h3>{index < 3 && <div className="mt-6 hidden h-px w-full bg-gradient-to-r from-orange-400/40 to-transparent md:block" />}</div>)}
            </div>
            <div className="mt-8 rounded-3xl border border-orange-300/15 bg-orange-300/[.055] p-6 sm:p-8"><div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between"><div><p className="text-sm font-black text-orange-200">Depois que o cliente aprova</p><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">O MARCENAPP organiza orçamento, produção, corte e obra. A visualização vende; o restante ajuda você a executar sem perder o fio do projeto.</p></div><button onClick={() => start()} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-100">Começar agora <ArrowRight size={16} /></button></div></div>
          </div>
        </section>

        <section id="vantagens" className="bg-[#f7f5f1] py-20 text-slate-950 md:py-28">
          <div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="mx-auto max-w-3xl text-center"><p className="text-xs font-black uppercase tracking-[.22em] text-orange-600">Por que usar</p><h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Mais tempo para projetar. Mais clareza para vender.</h2></div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[['Ganhe tempo', 'Pare de começar cada projeto do zero.', Lightbulb], ['Apresente melhor', 'Faça o cliente enxergar o móvel no ambiente.', Cuboid], ['Venda com confiança', 'Alinhe expectativa antes da produção.', Sparkles], ['Execute organizado', 'Leve o contexto do projeto para orçamento, corte e obra.', Ruler]].map(([title, text, Icon]) => <article key={title as string} className="rounded-3xl border border-slate-200 bg-white p-6"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600"><Icon size={22} /></div><h3 className="mt-5 text-lg font-black">{title as string}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{text as string}</p></article>)}
            </div>
          </div>
        </section>

        <section id="planos" className="bg-[#0b1015] py-20 md:py-28"><div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="mx-auto max-w-3xl text-center"><p className="text-xs font-black uppercase tracking-[.22em] text-orange-300">Planos</p><h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Comece pela visualização. Cresça com a operação.</h2><p className="mt-4 text-slate-400">Todos os planos começam com 7 dias grátis.</p></div><div className="mt-12 grid gap-5 lg:grid-cols-3">{plans.map((plan) => <article key={plan.name} className={`relative rounded-3xl border p-6 ${plan.featured ? 'border-orange-400/70 bg-white text-slate-950 shadow-2xl shadow-orange-500/10' : 'border-white/10 bg-white/[.035]'}`}>{plan.featured && <span className="absolute -top-3 left-6 rounded-full bg-[#f4a640] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#17110a]">Mais escolhido</span>}<h3 className="text-xl font-black">{plan.name}</h3><p className={`mt-2 min-h-12 text-sm leading-6 ${plan.featured ? 'text-slate-500' : 'text-slate-400'}`}>{plan.description}</p><div className="mt-6 flex items-end gap-1"><span className={`text-sm font-bold ${plan.featured ? 'text-slate-500' : 'text-slate-400'}`}>R$</span><span className="text-4xl font-black">{plan.price}</span><span className={`pb-1 text-sm ${plan.featured ? 'text-slate-500' : 'text-slate-400'}`}>/mês</span></div><button onClick={() => start(plan.name.toLowerCase())} className={`mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-black ${plan.featured ? 'bg-[#f4a640] text-[#17110a] hover:bg-[#ffb85f]' : 'border border-white/15 text-white hover:bg-white/5'}`}>Começar agora <ArrowRight size={16} /></button><ul className={`mt-6 space-y-3 border-t pt-5 ${plan.featured ? 'border-slate-200' : 'border-white/10'}`}>{plan.features.map((feature) => <li key={feature} className={`flex gap-2 text-sm ${plan.featured ? 'text-slate-600' : 'text-slate-300'}`}><Check size={17} className="mt-0.5 shrink-0 text-emerald-500" />{feature}</li>)}</ul></article>)}</div></div></section>

        <section className="relative overflow-hidden bg-[#f4a640] py-16 text-[#17110a] md:py-20"><div className="absolute inset-0 opacity-20 [background-image:linear-gradient(90deg,transparent_49%,#17110a_50%,transparent_51%),linear-gradient(transparent_49%,#17110a_50%,transparent_51%)] [background-size:44px_44px]" /><div className="relative mx-auto max-w-4xl px-5 text-center"><p className="text-xs font-black uppercase tracking-[.22em]">Seu próximo projeto pode começar agora</p><h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Pare de só explicar a ideia. Mostre o projeto.</h2><p className="mx-auto mt-5 max-w-2xl text-base font-semibold leading-7 opacity-80">Crie seu primeiro projeto no MARCENAPP e descubra como a IARA + MARCENA podem mudar a forma como você apresenta marcenaria.</p><button onClick={() => start()} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#17110a] px-7 py-3.5 font-black text-white shadow-xl transition hover:-translate-y-0.5">Criar meu primeiro projeto <ArrowRight size={18} /></button></div></section>
      </main>

      <footer className="border-t border-white/10 bg-[#0b1015] py-10"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8"><div className="flex items-center gap-3"><img src={logo} alt="" className="h-7 w-7" /><span>© {new Date().getFullYear()} MARCENAPP · Marcenaria inteligente</span></div><div className="flex gap-5"><a href="#marcena" className="hover:text-white">MARCENA</a><a href="#planos" className="hover:text-white">Planos</a><button onClick={() => navigate('/auth')} className="hover:text-white">Entrar</button></div></div></footer>
    </div>
  );
};

export default Landing;
