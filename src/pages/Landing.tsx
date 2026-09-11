import {
  ArrowRight,
  Box,
  Check,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  Hammer,
  Layers3,
  Menu,
  Ruler,
  Sparkles,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '@/assets/marcenapp-logo.svg';

const resources = [
  { icon: ClipboardList, title: 'Projetos', text: 'Organize cada projeto em um único ambiente.' },
  { icon: Ruler, title: 'Dimensionamento', text: 'Trabalhe com as medidas do móvel de forma organizada.' },
  { icon: Box, title: '2D e 3D', text: 'Veja o projeto antes de produzir.' },
  { icon: Layers3, title: 'Materiais', text: 'Organize os materiais usados no projeto.' },
  { icon: Hammer, title: 'Ferragens', text: 'Mantenha as ferragens associadas ao projeto.' },
  { icon: ClipboardList, title: 'Lista de corte', text: 'Transforme o projeto em informação para produção.' },
  { icon: CircleDollarSign, title: 'Orçamento', text: 'Leve as informações do projeto para o orçamento.' },
];

const faqs = [
  ['O que é o Marcenapp?', 'O Marcenapp é uma plataforma para profissionais de marcenaria que reúne projeto, dimensionamento, visualização, materiais, ferragens, lista de corte e orçamento em um único fluxo de trabalho.'],
  ['Para quem o Marcenapp foi criado?', 'Para marceneiros, marcenarias, projetistas e profissionais que desenvolvem e produzem móveis sob medida.'],
  ['Preciso abandonar as ferramentas que já uso?', 'Não necessariamente. O Marcenapp organiza as informações do trabalho em um fluxo próprio. O que pode ser conectado ao seu processo depende dos recursos disponíveis na plataforma.'],
  ['O que é a Yara?', 'A Yara é a assistente de inteligência artificial do Marcenapp. Ela ajuda no processo, enquanto o profissional continua no controle das decisões.'],
  ['O Marcenapp gera lista de corte?', 'Quando esse recurso está disponível para o projeto, as informações são organizadas para gerar a lista de corte e apoiar a próxima etapa do trabalho.'],
  ['Como começo?', 'Clique em Começar agora para entrar no fluxo de acesso da plataforma e conhecer as condições atuais.'],
];

const cabinetryImage = 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Kitchen_cabinets_at_a_store_in_NJ_7.jpg';

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[680px]">
      <div className="absolute -left-8 top-20 hidden h-32 w-32 rounded-full bg-primary/15 blur-3xl sm:block" aria-hidden="true" />
      <div className="absolute -right-10 bottom-8 h-40 w-40 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
      <div className="relative overflow-hidden rounded-[28px] border border-white/15 bg-slate-950 p-2 shadow-2xl shadow-slate-950/30">
        <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-slate-900">
          <img
            src={cabinetryImage}
            alt="Projeto de marcenaria com módulos e gavetas de cozinha"
            className="h-[430px] w-full object-cover object-center sm:h-[500px]"
            loading="eager"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/10 to-transparent" aria-hidden="true" />
          <div className="absolute inset-x-0 top-0 flex items-center gap-2 border-b border-white/10 bg-slate-950/55 px-5 py-4 backdrop-blur-md">
            <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
            <span className="ml-3 text-xs font-bold text-white/75">Marcenapp / Projeto</span>
          </div>
          <div className="absolute bottom-5 left-5 right-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">Projeto ativo</p>
              <p className="mt-1 text-2xl font-black text-white">Cozinha — Residencial</p>
              <p className="mt-1 text-sm text-slate-300">Visualização do móvel antes da produção.</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-slate-950/80 px-4 py-3 backdrop-blur-md">
              <div className="flex items-center gap-2 text-primary"><Sparkles size={13} /><span className="text-[10px] font-black">Yara</span></div>
              <p className="mt-1 text-[10px] text-slate-300">Você continua no controle.</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 px-1 pb-1 pt-2">
          <div className="rounded-xl bg-white/[.04] px-3 py-2 text-center"><p className="text-[9px] text-slate-500">Medidas</p><p className="text-[10px] font-black text-white">Organizadas</p></div>
          <div className="rounded-xl bg-white/[.04] px-3 py-2 text-center"><p className="text-[9px] text-slate-500">Materiais</p><p className="text-[10px] font-black text-white">Associados</p></div>
          <div className="rounded-xl bg-white/[.04] px-3 py-2 text-center"><p className="text-[9px] text-slate-500">Produção</p><p className="text-[10px] font-black text-white">Preparada</p></div>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const [faq, setFaq] = useState<number | null>(null);
  const go = () => navigate('/auth');

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 lg:px-8">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label="Voltar ao topo">
            <img src={logo} alt="Marcenapp" className="h-9 w-9 rounded-xl" />
            <span className="text-base font-black tracking-tight">MARCENAPP</span>
          </button>
          <nav className="hidden items-center gap-7 md:flex" aria-label="Navegação principal">
            <a href="#produto" className="rounded-lg text-sm font-semibold text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Produto</a>
            <a href="#recursos" className="rounded-lg text-sm font-semibold text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Recursos</a>
            <a href="#yara" className="rounded-lg text-sm font-semibold text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Yara</a>
            <a href="#faq" className="rounded-lg text-sm font-semibold text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 className="rounded-lg text-sm font-semibold text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Dúvidas</a>
            <button onClick={go} className="rounded-xl px-3 py-2 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Entrar</button>
            <button onClick={go} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Começar agora</button>
          </nav>
          <button className="rounded-xl p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden" onClick={() => setMenu(!menu)} aria-label={menu ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menu} aria-controls="mobile-navigation">{menu ? <X /> : <Menu />}</button>
        </div>
        {menu && <div id="mobile-navigation" className="border-t border-border bg-background px-5 py-4 md:hidden"><div className="flex flex-col gap-1">{['produto', 'recursos', 'yara', 'faq'].map((item) => <a key={item} href={`#${item}`} onClick={() => setMenu(false)} className="rounded-xl px-3 py-3 font-semibold text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{item === 'faq' ? 'Dúvidas' : item[0].toUpperCase() + item.slice(1)}</a>)}<button onClick={go} className="mt-2 rounded-xl bg-primary px-4 py-3 font-black text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Começar agora</button></div></div>}
      </header>

      <main>
        <section className="relative overflow-hidden bg-slate-950 px-5 pb-20 pt-32 text-white lg:px-8 lg:pb-28 lg:pt-40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(59,130,246,.18),transparent_32%),radial-gradient(circle_at_90%_90%,rgba(59,130,246,.08),transparent_28%)]" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[.86fr_1.14fr]">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.05] px-3 py-1.5 text-xs font-bold text-slate-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Feito para quem projeta e produz móveis sob medida</div>
              <h1 className="max-w-2xl text-5xl font-black leading-[.96] tracking-[-.05em] sm:text-6xl lg:text-7xl">Do projeto à produção, <span className="text-primary">tudo no lugar.</span></h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300 sm:text-xl">Desenvolva seus projetos de marcenaria, visualize em 2D e 3D e organize medidas, materiais, ferragens, lista de corte e orçamento em um único fluxo de trabalho.</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row"><button onClick={go} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-7 py-4 font-black text-white shadow-xl shadow-primary/20 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Começar agora <ArrowRight size={18} /></button><a href="#produto" className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/[.04] px-7 py-4 font-bold text-white transition hover:bg-white/[.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Conhecer o Marcenapp</a></div>
              <p className="mt-7 text-xs font-semibold text-slate-400">Feito para quem projeta e produz móveis sob medida.</p>
            </div>
            <ProductPreview />
          </div>
        </section>

        <section id="produto" className="scroll-mt-24 border-b border-border bg-card px-5 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
            <div><p className="text-sm font-black uppercase tracking-[.18em] text-primary">O problema</p><h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight sm:text-5xl">Um projeto de marcenaria não termina no desenho.</h2><p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">Depois do desenho ainda existem medidas, materiais, ferragens, cortes, orçamento e muitas outras informações que precisam estar organizadas.</p><p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">O Marcenapp reúne essas etapas em um único fluxo para que o projeto continue fazendo sentido até a produção.</p></div>
            <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-3xl bg-slate-950 p-7 text-white shadow-xl"><Ruler className="text-primary" /><p className="mt-12 text-3xl font-black">Dimensionamento</p><p className="mt-2 text-sm leading-6 text-slate-400">Defina e organize as medidas do móvel.</p></div><div className="rounded-3xl border border-border bg-background p-7"><Box className="text-primary" /><p className="mt-12 text-3xl font-black">2D + 3D</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Confira o projeto antes de produzir.</p></div><div className="rounded-3xl border border-border bg-background p-7"><Sparkles className="text-primary" /><p className="mt-12 text-3xl font-black">Yara</p><p className="mt-2 text-sm leading-6 text-muted-foreground">A assistente ajuda no processo. Você continua no controle.</p></div><div className="rounded-3xl border border-border bg-background p-7"><ClipboardList className="text-primary" /><p className="mt-12 text-3xl font-black">Informações organizadas</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Projeto, materiais, ferragens, corte e orçamento no mesmo fluxo.</p></div></div>
          </div>
        </section>

        <section id="recursos" className="scroll-mt-24 px-5 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl"><div className="max-w-3xl"><p className="text-sm font-black uppercase tracking-[.18em] text-primary">Recursos</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Tudo que precisa estar conectado ao projeto.</h2><p className="mt-5 text-lg leading-8 text-muted-foreground">Recursos pensados para acompanhar o trabalho real de quem projeta e produz móveis sob medida.</p></div><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{resources.map(({ icon: Icon, title, text }, i) => <div key={title} className="group rounded-3xl border border-border bg-card p-6 transition duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon size={20} /></div><p className="mt-5 text-xs font-black uppercase tracking-wider text-muted-foreground">{String(i + 1).padStart(2, '0')}</p><h3 className="mt-1 text-lg font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div>)}</div></div>
        </section>

        <section className="bg-slate-950 px-5 py-20 text-white lg:px-8 lg:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.75fr_1.25fr] lg:items-center"><div><p className="text-sm font-black uppercase tracking-[.18em] text-primary">Um projeto. Um fluxo de trabalho.</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Mais clareza em cada etapa do projeto.</h2><p className="mt-5 text-lg leading-8 text-slate-300">O projeto é o centro. As informações acompanham o projeto.</p></div><div className="space-y-3">{[['01', 'Projeto', 'Comece e organize o trabalho.'], ['02', 'Dimensionamento', 'Defina as medidas.'], ['03', 'Visualização', 'Confira o projeto em 2D e 3D.'], ['04', 'Materiais', 'Organize os materiais utilizados.'], ['05', 'Ferragens', 'Associe os componentes necessários.'], ['06', 'Lista de corte', 'Reúna as informações para produção.'], ['07', 'Orçamento', 'Organize os dados necessários para calcular o projeto.']].map(([n, title, text]) => <div key={n} className="grid gap-4 rounded-2xl border border-white/10 bg-white/[.04] p-5 sm:grid-cols-[48px_150px_1fr] sm:items-center"><span className="font-black text-primary">{n}</span><strong>{title}</strong><span className="text-sm leading-6 text-slate-400">{text}</span></div>)}</div></div>
        </section>

        <section id="yara" className="scroll-mt-24 px-5 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto overflow-hidden rounded-[32px] border border-border bg-card p-8 shadow-sm sm:p-12 lg:p-16"><div className="grid gap-10 lg:grid-cols-[1fr_.7fr] lg:items-end"><div><div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-black text-muted-foreground"><Sparkles size={14} /> YARA</div><h2 className="mt-6 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">Você continua no controle. A Yara ajuda no processo.</h2><p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">A Yara é a assistente de inteligência artificial do Marcenapp. Ela apoia o profissional dentro do fluxo do produto, sem substituir o conhecimento e as decisões de quem projeta e produz.</p></div><div className="rounded-3xl bg-slate-950 p-6 text-white"><p className="text-xs font-black uppercase tracking-[.18em] text-slate-400">Princípio</p><p className="mt-3 text-2xl font-black">Inteligência para apoiar o trabalho.</p><p className="mt-2 text-sm leading-6 text-slate-400">Tecnologia no produto. Naturalidade na comunicação.</p></div></div></div>
        </section>

        <section id="faq" className="scroll-mt-24 border-t border-border bg-card px-5 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-4xl"><p className="text-sm font-black uppercase tracking-[.18em] text-primary">Dúvidas</p><h2 className="mt-3 text-3xl font-black sm:text-5xl">Antes de começar.</h2><div className="mt-10 divide-y divide-border border-y border-border">{faqs.map(([question, answer], i) => <div key={question}><button onClick={() => setFaq(faq === i ? null : i)} className="flex w-full items-center justify-between gap-4 py-6 text-left font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-expanded={faq === i}><span>{question}</span><ChevronDown size={20} className={`shrink-0 transition-transform ${faq === i ? 'rotate-180' : ''}`} /></button>{faq === i && <p className="max-w-3xl pb-6 pr-8 leading-7 text-muted-foreground">{answer}</p>}</div>)}</div></div>
        </section>

        <section className="px-5 py-20 lg:px-8 lg:py-28"><div className="mx-auto max-w-7xl overflow-hidden rounded-[32px] bg-slate-950 px-7 py-14 text-center text-white sm:px-12 sm:py-20"><p className="text-sm font-black uppercase tracking-[.18em] text-primary">Próximo projeto</p><h2 className="mx-auto mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">Seu próximo projeto pode começar aqui.</h2><p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">Organize o projeto, desenvolva o móvel e reúna as informações necessárias para seguir para a produção.</p><button onClick={go} className="mt-9 inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 font-black text-white shadow-xl shadow-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Começar agora <ArrowRight size={18} /></button></div></section>
      </main>

      <footer className="border-t border-border px-5 py-10 lg:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><img src={logo} alt="Marcenapp" className="h-8 w-8 rounded-lg" /><div><p className="font-black">MARCENAPP</p><p className="text-xs text-muted-foreground">Do projeto à produção, tudo no lugar.</p></div></div><div className="flex flex-wrap gap-5 text-sm font-semibold text-muted-foreground"><a href="#produto" className="hover:text-foreground">Produto</a><a href="#recursos" className="hover:text-foreground">Recursos</a><a href="#yara" className="hover:text-foreground">Yara</a><a href="#faq" className="hover:text-foreground">Dúvidas</a></div></div></footer>
    </div>
  );
}