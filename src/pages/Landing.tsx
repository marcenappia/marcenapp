import {
  ArrowRight,
  BarChart3,
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
  { icon: ClipboardList, title: 'Projetos', text: 'Tudo começa em um projeto organizado, com contexto, ambientes e etapas.' },
  { icon: Ruler, title: 'Medidas', text: 'Registre as medidas e informações que realmente importam para executar o móvel.' },
  { icon: Box, title: '2D e 3D', text: 'Visualize o ambiente e tome decisões antes de levar o projeto para a produção.' },
  { icon: Layers3, title: 'Materiais', text: 'Tenha materiais e componentes associados ao projeto em um único fluxo.' },
  { icon: Hammer, title: 'Ferragens', text: 'Organize as ferragens necessárias para cada projeto e evite informação perdida.' },
  { icon: ClipboardList, title: 'Lista de corte', text: 'Transforme o projeto em informação útil para a próxima etapa da marcenaria.' },
  { icon: CircleDollarSign, title: 'Orçamento', text: 'Leve os dados do projeto para uma visão mais clara do custo e da venda.' },
  { icon: BarChart3, title: 'Gestão', text: 'Acompanhe o trabalho com mais clareza, organização e controle.' },
];

const faqs = [
  ['O que é o Marcenapp?', 'É uma plataforma profissional para marcenarias que organiza o fluxo entre projeto, medidas, visualização, materiais, ferragens, corte, orçamento e produção.'],
  ['Para quem o Marcenapp foi criado?', 'Para marceneiros, marcenarias, projetistas e profissionais que trabalham com móveis sob medida e precisam transformar projetos em produção organizada.'],
  ['Preciso abandonar as ferramentas que já uso?', 'Não. O Marcenapp é pensado para organizar o fluxo do trabalho e centralizar informações importantes. Os recursos e integrações disponíveis determinam o que pode ser conectado ao seu processo atual.'],
  ['O que é a Yara?', 'A Yara é a assistente de inteligência artificial do Marcenapp. Ela foi pensada para ajudar o profissional dentro do fluxo do produto, sem tirar o controle de quem está projetando e produzindo.'],
  ['O Marcenapp ajuda na produção?', 'Sim. A proposta é levar as informações do projeto para as etapas seguintes, reduzindo a distância entre o que foi projetado e o que precisa ser executado.'],
  ['Como começo?', 'Clique em Começar agora para entrar no fluxo de acesso da plataforma e conhecer as condições atuais.'],
];

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[680px]">
      <div className="absolute -left-8 top-20 hidden h-32 w-32 rounded-full bg-primary/20 blur-3xl sm:block" />
      <div className="absolute -right-10 bottom-8 h-40 w-40 rounded-full bg-amber-400/20 blur-3xl" />
      <div className="relative overflow-hidden rounded-[28px] border border-white/15 bg-slate-950 shadow-2xl shadow-slate-950/20">
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="ml-3 text-xs font-bold text-slate-400">Marcenapp / Projeto</span>
        </div>
        <div className="grid min-h-[390px] grid-cols-[92px_1fr]">
          <div className="border-r border-white/10 bg-white/[.025] p-3">
            <div className="mb-7 flex h-10 items-center justify-center rounded-xl bg-primary text-xs font-black text-white">M</div>
            {['Projeto', 'Ambiente', 'Medidas', 'Materiais', 'Produção'].map((item, index) => (
              <div key={item} className={`mb-2 rounded-lg px-2 py-2 text-[10px] font-bold ${index === 0 ? 'bg-white/10 text-white' : 'text-slate-500'}`}>
                {item}
              </div>
            ))}
          </div>
          <div className="p-5 sm:p-7">
            <div className="flex items-center justify-between">
              <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">Projeto ativo</p><p className="mt-1 text-lg font-black text-white">Cozinha — Residencial</p></div>
              <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-[10px] font-bold text-emerald-300">Em desenvolvimento</span>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-[1.2fr_.8fr]">
              <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4">
                <div className="flex h-44 items-end justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 p-4">
                  <div className="h-28 w-16 rounded-t-lg border border-white/10 bg-slate-700/80" />
                  <div className="h-36 w-24 rounded-t-lg border border-white/10 bg-slate-600/80" />
                  <div className="h-24 w-14 rounded-t-lg border border-white/10 bg-slate-700/80" />
                  <div className="absolute mt-52 h-2 w-44 rounded-full bg-slate-600" />
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-slate-400"><span>Visualização 3D</span><span className="text-white">Abrir projeto →</span></div>
              </div>
              <div className="space-y-3">
                <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><p className="text-[10px] text-slate-500">Medidas</p><p className="mt-1 text-xl font-black text-white">4,82 m</p><div className="mt-3 h-1.5 rounded-full bg-white/10"><div className="h-1.5 w-3/4 rounded-full bg-primary" /></div></div>
                <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><p className="text-[10px] text-slate-500">Itens no projeto</p><p className="mt-1 text-xl font-black text-white">24</p><p className="mt-1 text-[10px] text-emerald-300">Tudo organizado</p></div>
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[.06] p-4"><div className="flex items-center gap-2 text-amber-300"><Sparkles size={13} /><span className="text-[10px] font-black">Yara</span></div><p className="mt-2 text-[10px] leading-4 text-slate-300">Pronta para ajudar no próximo passo.</p></div>
              </div>
            </div>
          </div>
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
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3" aria-label="Voltar ao topo">
            <img src={logo} alt="Marcenapp" className="h-9 w-9 rounded-xl" />
            <span className="text-base font-black tracking-tight">MARCENAPP</span>
          </button>
          <nav className="hidden items-center gap-7 md:flex">
            <a href="#produto" className="text-sm font-semibold text-muted-foreground transition hover:text-foreground">Produto</a>
            <a href="#recursos" className="text-sm font-semibold text-muted-foreground transition hover:text-foreground">Recursos</a>
            <a href="#yara" className="text-sm font-semibold text-muted-foreground transition hover:text-foreground">Yara</a>
            <a href="#faq" className="text-sm font-semibold text-muted-foreground transition hover:text-foreground">Dúvidas</a>
            <button onClick={go} className="rounded-xl px-3 py-2 text-sm font-bold">Entrar</button>
            <button onClick={go} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition hover:-translate-y-0.5">Começar agora</button>
          </nav>
          <button className="rounded-xl p-2 md:hidden" onClick={() => setMenu(!menu)} aria-label="Abrir menu">{menu ? <X /> : <Menu />}</button>
        </div>
        {menu && <div className="border-t border-border bg-background px-5 py-4 md:hidden"><div className="flex flex-col gap-1">{['produto', 'recursos', 'yara', 'faq'].map((item) => <a key={item} href={`#${item}`} onClick={() => setMenu(false)} className="rounded-xl px-3 py-3 font-semibold text-muted-foreground">{item === 'faq' ? 'Dúvidas' : item[0].toUpperCase() + item.slice(1)}</a>)}<button onClick={go} className="mt-2 rounded-xl bg-primary px-4 py-3 font-black text-primary-foreground">Começar agora</button></div></div>}
      </header>

      <main>
        <section className="relative overflow-hidden bg-slate-950 px-5 pb-20 pt-32 text-white lg:px-8 lg:pb-28 lg:pt-40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(59,130,246,.22),transparent_32%),radial-gradient(circle_at_90%_90%,rgba(245,158,11,.10),transparent_28%)]" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[.86fr_1.14fr]">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.05] px-3 py-1.5 text-xs font-bold text-slate-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Feito para quem vive de marcenaria</div>
              <h1 className="max-w-2xl text-5xl font-black leading-[.96] tracking-[-.05em] sm:text-6xl lg:text-7xl">Do projeto à produção, <span className="text-primary">sem perder o controle.</span></h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300 sm:text-xl">O Marcenapp organiza o trabalho da marcenaria em um único fluxo: projetos, medidas, 2D e 3D, materiais, ferragens, corte, orçamento e produção.</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row"><button onClick={go} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-7 py-4 font-black text-white shadow-xl shadow-primary/20 transition hover:-translate-y-0.5">Começar agora <ArrowRight size={18} /></button><a href="#produto" className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/[.04] px-7 py-4 font-bold text-white transition hover:bg-white/[.08]">Conhecer o produto</a></div>
              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-400"><span className="inline-flex items-center gap-2"><Check size={14} className="text-emerald-400" /> Projeto organizado</span><span className="inline-flex items-center gap-2"><Check size={14} className="text-emerald-400" /> Fluxo profissional</span><span className="inline-flex items-center gap-2"><Check size={14} className="text-emerald-400" /> IA integrada</span></div>
            </div>
            <ProductPreview />
          </div>
        </section>

        <section id="produto" className="border-b border-border bg-card px-5 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
            <div><p className="text-sm font-black uppercase tracking-[.18em] text-primary">Uma nova forma de trabalhar</p><h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight sm:text-5xl">A marcenaria é complexa. Seu sistema não precisa ser.</h2><p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">O projeto deixa de ser uma coleção de arquivos, mensagens e anotações espalhadas. O Marcenapp cria um caminho único para transformar informação em execução.</p><div className="mt-8 space-y-4">{['Centralize o contexto de cada projeto.', 'Enxergue o móvel antes de produzir.', 'Leve as informações para as próximas etapas.'].map((item) => <div key={item} className="flex items-start gap-3"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Check size={14} /></span><span className="font-bold">{item}</span></div>)}</div></div>
            <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-3xl bg-slate-950 p-7 text-white shadow-xl"><Ruler className="text-primary" /><p className="mt-12 text-4xl font-black">1 fluxo</p><p className="mt-2 text-sm leading-6 text-slate-400">Da visita e medidas até as informações necessárias para produzir.</p></div><div className="rounded-3xl border border-border bg-background p-7"><Box className="text-primary" /><p className="mt-12 text-4xl font-black">2D + 3D</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Mais clareza para validar o projeto antes de executar.</p></div><div className="rounded-3xl border border-border bg-background p-7"><Sparkles className="text-amber-500" /><p className="mt-12 text-4xl font-black">Yara</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Uma camada de inteligência para ajudar no trabalho.</p></div><div className="rounded-3xl border border-border bg-background p-7"><BarChart3 className="text-primary" /><p className="mt-12 text-4xl font-black">Mais controle</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Informação organizada para decisões melhores.</p></div></div>
          </div>
        </section>

        <section id="recursos" className="px-5 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl"><div className="max-w-3xl"><p className="text-sm font-black uppercase tracking-[.18em] text-primary">Dentro do Marcenapp</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Tudo que precisa estar conectado ao projeto.</h2><p className="mt-5 text-lg leading-8 text-muted-foreground">Recursos pensados para acompanhar a realidade de quem vende, projeta e produz móveis sob medida.</p></div><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{resources.map(({ icon: Icon, title, text }, i) => <div key={title} className="group rounded-3xl border border-border bg-card p-6 transition duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon size={20} /></div><p className="mt-5 text-xs font-black uppercase tracking-wider text-muted-foreground">{String(i + 1).padStart(2, '0')}</p><h3 className="mt-1 text-lg font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div>)}</div></div>
        </section>

        <section className="bg-slate-950 px-5 py-20 text-white lg:px-8 lg:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.75fr_1.25fr] lg:items-center"><div><p className="text-sm font-black uppercase tracking-[.18em] text-primary">O fluxo</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Menos improviso. Mais processo.</h2><p className="mt-5 text-lg leading-8 text-slate-300">A informação acompanha o projeto em vez de ficar espalhada entre papel, conversa e arquivos diferentes.</p></div><div className="space-y-3">{[['01', 'Visite', 'Registre medidas, fotos e informações do ambiente.'], ['02', 'Projete', 'Desenvolva e visualize o móvel com contexto.'], ['03', 'Defina', 'Organize materiais, ferragens e detalhes do projeto.'], ['04', 'Orce', 'Use as informações para construir uma visão mais clara do negócio.'], ['05', 'Produza', 'Siga para a execução com o projeto mais organizado.']].map(([n, title, text]) => <div key={n} className="grid gap-4 rounded-2xl border border-white/10 bg-white/[.04] p-5 sm:grid-cols-[48px_130px_1fr] sm:items-center"><span className="font-black text-primary">{n}</span><strong>{title}</strong><span className="text-sm leading-6 text-slate-400">{text}</span></div>)}</div></div>
        </section>

        <section id="yara" className="px-5 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto overflow-hidden rounded-[32px] bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white shadow-2xl shadow-blue-900/20 sm:p-12 lg:p-16"><div className="grid gap-10 lg:grid-cols-[1fr_.7fr] lg:items-end"><div><div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black"><Sparkles size={14} /> INTELIGÊNCIA ARTIFICIAL</div><h2 className="mt-6 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">Yara. Inteligência trabalhando junto com a sua marcenaria.</h2><p className="mt-5 max-w-2xl text-lg leading-8 text-blue-100">A Yara foi criada para ajudar a interpretar informações, responder dúvidas e acompanhar o profissional dentro do fluxo do Marcenapp.</p></div><div className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur"><p className="text-xs font-black uppercase tracking-[.18em] text-blue-100">Princípio</p><p className="mt-3 text-2xl font-black">Você continua no controle.</p><p className="mt-2 text-sm leading-6 text-blue-100">A IA ajuda. O profissional decide.</p></div></div></div>
        </section>

        <section id="faq" className="border-t border-border bg-card px-5 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-4xl"><p className="text-sm font-black uppercase tracking-[.18em] text-primary">Dúvidas</p><h2 className="mt-3 text-3xl font-black sm:text-5xl">Antes de começar.</h2><div className="mt-10 divide-y divide-border border-y border-border">{faqs.map(([question, answer], i) => <div key={question}><button onClick={() => setFaq(faq === i ? null : i)} className="flex w-full items-center justify-between gap-4 py-6 text-left font-black"><span>{question}</span><ChevronDown size={20} className={`shrink-0 transition-transform ${faq === i ? 'rotate-180' : ''}`} /></button>{faq === i && <p className="max-w-3xl pb-6 pr-8 leading-7 text-muted-foreground">{answer}</p>}</div>)}</div></div>
        </section>

        <section className="px-5 py-20 lg:px-8 lg:py-28"><div className="mx-auto max-w-7xl overflow-hidden rounded-[32px] bg-slate-950 px-7 py-14 text-center text-white sm:px-12 sm:py-20"><p className="text-sm font-black uppercase tracking-[.18em] text-primary">Próximo projeto</p><h2 className="mx-auto mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">Pare de administrar o caos. Comece a organizar o trabalho.</h2><p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">Conheça o Marcenapp e veja como o seu processo pode ficar mais conectado.</p><button onClick={go} className="mt-9 inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 font-black text-white shadow-xl shadow-primary/20">Começar agora <ArrowRight size={18} /></button></div></section>
      </main>

      <footer className="border-t border-border px-5 py-10 lg:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><img src={logo} alt="Marcenapp" className="h-8 w-8 rounded-lg" /><div><p className="font-black">MARCENAPP</p><p className="text-xs text-muted-foreground">Tecnologia para marcenaria profissional.</p></div></div><div className="flex flex-wrap gap-5 text-sm font-semibold text-muted-foreground"><a href="#produto" className="hover:text-foreground">Produto</a><a href="#recursos" className="hover:text-foreground">Recursos</a><a href="#yara" className="hover:text-foreground">Yara</a><a href="#faq" className="hover:text-foreground">Dúvidas</a></div></div></footer>
    </div>
  );
}
