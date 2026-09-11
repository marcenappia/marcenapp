import {
  ArrowRight,
  Check,
  ChevronDown,
  ClipboardList,
  Cuboid,
  FileText,
  Hammer,
  Layers3,
  Menu,
  Ruler,
  Scissors,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '@/assets/marcenapp-logo.svg';

const resources = [
  { icon: ClipboardList, title: 'Projeto', headline: 'Organize cada projeto em um único ambiente.', text: 'Tenha as informações do projeto reunidas e estruturadas.' },
  { icon: Layers3, title: 'Ambiente', headline: 'Estruture o ambiente antes de desenvolver o móvel.', text: 'Organize o espaço e as informações necessárias para o projeto.' },
  { icon: Ruler, title: 'Dimensionamento', headline: 'Trabalhe com as medidas do móvel de forma organizada.', text: 'Transforme as dimensões do projeto em informações úteis para as próximas etapas.' },
  { icon: Cuboid, title: '2D e 3D', headline: 'Veja o projeto antes de produzir.', text: 'Confira o desenvolvimento do móvel e entenda o resultado antes de avançar.' },
  { icon: Layers3, title: 'Materiais', headline: 'Organize os materiais usados no projeto.', text: 'Mantenha as informações de materiais associadas ao projeto.' },
  { icon: Hammer, title: 'Ferragens', headline: 'Mantenha as ferragens associadas ao projeto.', text: 'Organize os componentes necessários para a execução do móvel.' },
  { icon: Scissors, title: 'Lista de corte', headline: 'Transforme o projeto em informação para produção.', text: 'Reúna as informações necessárias para preparar o corte das peças.' },
  { icon: FileText, title: 'Orçamento', headline: 'Leve as informações do projeto para o orçamento.', text: 'Use os dados do projeto como base para organizar o orçamento.' },
];

const flow = [
  ['01', 'Projeto', 'Comece o projeto e organize o ambiente que será desenvolvido.'],
  ['02', 'Desenvolver', 'Trabalhe com medidas, módulos e detalhes do móvel.'],
  ['03', 'Visualizar', 'Confira o projeto em 2D e 3D antes de produzir.'],
  ['04', 'Configurar', 'Organize materiais, ferragens e demais informações.'],
  ['05', 'Preparar', 'Reúna as informações para corte, orçamento e produção.'],
];

const faqs = [
  ['O que é o Marcenapp?', 'O Marcenapp é uma plataforma para profissionais de marcenaria que reúne projeto, dimensionamento, visualização, materiais, ferragens, lista de corte e orçamento em um único fluxo de trabalho.'],
  ['Para quem ele foi desenvolvido?', 'Para quem trabalha com móveis sob medida: marceneiros, marcenarias, projetistas e profissionais de móveis planejados.'],
  ['Preciso saber trabalhar em 3D?', 'O Marcenapp foi pensado para acompanhar o desenvolvimento do projeto e permitir a visualização em 2D e 3D antes da produção.'],
  ['Como funciona a inteligência artificial?', 'A Yara ajuda a interpretar informações e acompanhar etapas do projeto dentro do fluxo de trabalho. Você continua no controle.'],
  ['O Marcenapp gera lista de corte?', 'O sistema reúne as informações do projeto necessárias para preparar a etapa de corte, conforme os recursos disponíveis no projeto.'],
  ['Como funcionam os créditos?', 'Os detalhes de créditos e condições devem ser consultados na configuração comercial atual da plataforma.'],
];

const Landing = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const goAuth = () => navigate('/auth');
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-stone-50 text-slate-900">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-stone-50/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3" aria-label="Marcenapp início">
            <img src={logo} alt="Marcenapp" className="h-10 w-10 rounded-xl" />
            <div className="text-left leading-tight">
              <div className="text-lg font-black tracking-tight">MARCENAPP</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Marcenaria</div>
            </div>
          </button>

          <nav className="hidden items-center gap-7 md:flex" aria-label="Navegação principal">
            <a href="#recursos" className="text-sm font-semibold text-slate-600 transition hover:text-slate-950">Recursos</a>
            <a href="#fluxo" className="text-sm font-semibold text-slate-600 transition hover:text-slate-950">Como funciona</a>
            <a href="#yara" className="text-sm font-semibold text-slate-600 transition hover:text-slate-950">Yara</a>
            <a href="#planos" className="text-sm font-semibold text-slate-600 transition hover:text-slate-950">Planos</a>
            <button onClick={goAuth} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">Entrar</button>
            <button onClick={goAuth} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white transition hover:bg-slate-700">Começar agora</button>
          </nav>

          <button className="rounded-xl p-2 md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu">{menuOpen ? <X /> : <Menu />}</button>
        </div>
        {menuOpen && (
          <div className="border-t border-slate-200 bg-stone-50 px-5 py-5 md:hidden">
            <div className="flex flex-col gap-2">
              {['#recursos', '#fluxo', '#yara', '#planos'].map((href) => <a key={href} onClick={closeMenu} href={href} className="rounded-xl px-3 py-3 font-semibold text-slate-700 hover:bg-slate-100">{href === '#recursos' ? 'Recursos' : href === '#fluxo' ? 'Como funciona' : href === '#yara' ? 'Yara' : 'Planos'}</a>)}
              <button onClick={goAuth} className="mt-2 rounded-xl bg-slate-900 px-4 py-3 font-black text-white">Entrar ou começar</button>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="px-5 pb-16 pt-32 lg:px-8 lg:pb-24 lg:pt-40">
          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[.92fr_1.08fr]">
            <div>
              <p className="mb-5 text-sm font-black uppercase tracking-[0.18em] text-slate-500">Feito para quem projeta e produz móveis sob medida</p>
              <h1 className="max-w-3xl text-5xl font-black leading-[0.98] tracking-[-0.04em] sm:text-6xl lg:text-7xl">Do projeto à produção, <span className="text-slate-500">tudo no lugar.</span></h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">Desenvolva seus projetos de marcenaria, visualize em 2D e 3D e organize medidas, materiais, ferragens, lista de corte e orçamento em um único fluxo de trabalho.</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <button onClick={goAuth} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-7 py-4 font-black text-white transition hover:bg-slate-700">Começar agora <ArrowRight size={18} /></button>
                <a href="#historia" className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-7 py-4 font-bold text-slate-700 transition hover:bg-slate-100">Conhecer o Marcenapp</a>
              </div>
              <p className="mt-5 text-sm font-medium text-slate-500">Tecnologia no produto. Naturalidade na comunicação.</p>
            </div>

            <div id="historia" className="relative rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center justify-between px-1">
                <div><div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">O trabalho real</div><div className="mt-1 text-xl font-black">Do cliente ao projeto</div></div>
                <div className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-bold text-slate-500">01 — 03</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="relative min-h-[250px] overflow-hidden rounded-2xl bg-stone-200 p-4">
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,#e7e5e4_0%,#d6d3d1_48%,#c7c4c0_100%)]" />
                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-stone-300/70" />
                  <div className="absolute bottom-8 left-7 h-32 w-20 rounded-t-[2rem] bg-slate-700" />
                  <div className="absolute bottom-24 left-20 h-28 w-12 rotate-[-12deg] rounded-xl bg-slate-600" />
                  <div className="absolute right-7 top-10 h-20 w-16 rounded-lg border-4 border-slate-700 bg-slate-100 shadow-lg" />
                  <div className="absolute bottom-4 left-4 rounded-lg bg-white/90 px-2.5 py-1.5 text-[10px] font-black text-slate-700">CASA DO CLIENTE</div>
                  <div className="absolute right-4 top-4 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-slate-600">Foto</div>
                </div>
                <div className="relative min-h-[250px] overflow-hidden rounded-2xl bg-slate-900 p-3">
                  <div className="absolute inset-x-4 top-4 h-4 rounded-full bg-slate-800" />
                  <div className="absolute inset-x-4 top-12 bottom-10 rounded-xl border border-white/10 bg-slate-800 p-3">
                    <div className="h-3 w-20 rounded bg-slate-600" />
                    <div className="mt-4 grid grid-cols-[1.1fr_.9fr] gap-2">
                      <div className="rounded-lg border border-white/10 bg-slate-700 p-2"><div className="mt-5 h-20 rounded bg-slate-600" /><div className="mt-2 h-2 w-16 rounded bg-slate-500" /></div>
                      <div className="space-y-2"><div className="h-7 rounded bg-slate-700" /><div className="h-7 rounded bg-slate-700" /><div className="h-7 rounded bg-slate-700" /></div>
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-3 text-[10px] font-black tracking-wide text-slate-400">PROJETO NO MARCENAPP</div>
                </div>
                <div className="relative min-h-[250px] overflow-hidden rounded-2xl bg-stone-100 p-3">
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,#f5f5f4_0%,#e7e5e4_50%,#d6d3d1_100%)]" />
                  <div className="absolute bottom-10 left-5 right-5 h-28 rounded-t-xl border border-slate-300 bg-slate-100 shadow-sm" />
                  <div className="absolute bottom-10 left-5 top-28 w-8 bg-slate-300" />
                  <div className="absolute bottom-10 right-5 top-28 w-8 bg-slate-300" />
                  <div className="absolute bottom-24 left-12 right-12 h-16 rounded border border-slate-300 bg-white" />
                  <div className="absolute left-4 top-4 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-slate-600">Resultado</div>
                  <div className="absolute bottom-4 right-4 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10px] font-black text-white">PRONTO</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-[11px] font-bold text-slate-500"><div>01 · Entender</div><div>02 · Desenvolver</div><div>03 · Produzir</div></div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white px-5 py-16 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">O problema</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Um projeto de marcenaria não termina no desenho.</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">Depois do desenho vêm as medidas, materiais, espessuras, ferragens, detalhes construtivos, lista de corte e orçamento.</p>
              <p className="mt-4 text-lg font-bold leading-8 text-slate-900">Quando essas informações ficam espalhadas, acompanhar o projeto fica mais difícil e aumenta a chance de retrabalho.</p>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-500 sm:gap-3">
              {['Projeto', 'Medidas', 'Materiais', 'Ferragens', 'Corte', 'Orçamento', 'Produção'].map((item, index) => <div key={item} className="flex items-center gap-2"><span className="rounded-full border border-slate-200 bg-stone-50 px-3 py-2">{item}</span>{index < 6 && <ArrowRight size={14} className="text-slate-300" />}</div>)}
            </div>
          </div>
        </section>

        <section className="px-5 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">A solução</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Uma ferramenta pensada para o trabalho real da marcenaria.</h2>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9"><p className="text-lg leading-8 text-slate-600">O Marcenapp reúne as principais informações do projeto em um único fluxo de trabalho, ajudando você a organizar o caminho entre o projeto e a produção.</p><p className="mt-5 text-xl font-black">Menos informação espalhada. Mais controle sobre o projeto.</p></div>
          </div>
        </section>

        <section id="fluxo" className="border-y border-slate-200 bg-slate-900 px-5 py-20 text-white lg:px-8 lg:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.75fr_1.25fr]">
            <div><p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">Como funciona</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Um projeto. Um fluxo de trabalho.</h2><p className="mt-5 text-lg leading-8 text-slate-300">Desenvolva, visualize, configure e prepare as informações sem perder a continuidade do projeto.</p><button onClick={goAuth} className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-4 font-black text-slate-900 transition hover:bg-slate-100">Começar agora <ArrowRight size={18} /></button></div>
            <div className="space-y-3">{flow.map(([number, title, text]) => <div key={number} className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-5 sm:grid-cols-[48px_180px_1fr] sm:items-center"><div className="text-xs font-black text-slate-400">{number}</div><h3 className="font-black">{title}</h3><p className="text-sm leading-6 text-slate-400">{text}</p></div>)}</div>
          </div>
        </section>

        <section id="recursos" className="px-5 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl"><p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">O que o produto faz</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Tudo o que o projeto precisa, no mesmo lugar.</h2><p className="mt-5 text-lg leading-8 text-slate-600">Cada recurso existe para acompanhar uma etapa do trabalho, sem tirar o foco do projeto.</p></div>
            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{resources.map(({ icon: Icon, title, headline, text }) => <article key={title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><Icon size={23} strokeWidth={1.8} className="text-slate-500" /><p className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-slate-400">{title}</p><h3 className="mt-2 text-lg font-black leading-6">{headline}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{text}</p></article>)}</div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white px-5 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl"><p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Produto na prática</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">O projeto continua no centro.</h2><p className="mt-5 text-lg leading-8 text-slate-600">A experiência deve responder uma pergunta simples: é isso que eu vou encontrar quando entrar no Marcenapp?</p></div>
            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {['Projeto e ambiente', 'Medidas e visualização', 'Materiais, ferragens e orçamento'].map((title, index) => <div key={title} className="overflow-hidden rounded-3xl border border-slate-200 bg-stone-50"><div className="h-52 bg-slate-100 p-5">{index === 0 ? <div className="h-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex gap-2"><span className="h-3 w-20 rounded bg-slate-200" /><span className="h-3 w-10 rounded bg-slate-100" /></div><div className="mt-5 grid h-32 grid-cols-[1fr_.6fr] gap-3"><div className="rounded-xl bg-stone-100" /><div className="space-y-2"><div className="h-8 rounded-lg bg-stone-100" /><div className="h-8 rounded-lg bg-stone-100" /><div className="h-8 rounded-lg bg-stone-100" /></div></div></div> : index === 1 ? <div className="relative h-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="absolute left-8 top-8 h-28 w-40 rotate-[-4deg] rounded-lg border-2 border-slate-300" /><div className="absolute left-16 top-16 h-24 w-36 rotate-[5deg] rounded-lg border-2 border-slate-400" /><div className="absolute bottom-5 right-5 rounded-lg bg-slate-900 px-3 py-2 text-[10px] font-black text-white">2D / 3D</div></div> : <div className="h-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="space-y-2">{['MDF', 'Ferragens', 'Lista de corte', 'Orçamento'].map((item) => <div key={item} className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-xs font-bold"><span>{item}</span><span className="text-slate-400">organizado</span></div>)}</div></div>}</div><div className="p-5"><h3 className="font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">Uma visão objetiva do que acompanha o projeto dentro do sistema.</p></div></div>)}
            </div>
          </div>
        </section>

        <section id="yara" className="px-5 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
            <div><p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Yara / IA</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Inteligência artificial trabalhando junto com o seu projeto.</h2><p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">A Yara é a assistente de inteligência artificial do Marcenapp. Ela ajuda a interpretar informações e acompanhar etapas do projeto dentro do fluxo de trabalho.</p><p className="mt-5 text-lg font-black">Você continua no controle. A Yara ajuda no processo.</p></div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-3 border-b border-slate-200 pb-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-sm font-black">Y</div><div><div className="font-black">Yara</div><div className="text-xs text-slate-500">Assistente do Marcenapp</div></div></div><div className="mt-5 space-y-3"><div className="max-w-[85%] rounded-2xl bg-stone-100 p-4 text-sm leading-6 text-slate-600">Como posso ajudar com este projeto?</div><div className="ml-auto max-w-[85%] rounded-2xl bg-slate-900 p-4 text-sm leading-6 text-white">Quero organizar as informações do ambiente antes de seguir para a próxima etapa.</div><div className="max-w-[85%] rounded-2xl bg-stone-100 p-4 text-sm leading-6 text-slate-600">Vamos organizar isso dentro do fluxo do projeto.</div></div></div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white px-5 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl"><div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center"><div><p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Diferencial</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Mais do que projetar. Organize o caminho até a produção.</h2></div><div><div className="flex flex-wrap items-center gap-2 text-sm font-black text-slate-700">{['Projeto', 'Dimensionamento', 'Visualização', 'Materiais', 'Ferragens', 'Lista de corte', 'Orçamento'].map((item, index) => <div key={item} className="flex items-center gap-2"><span className="rounded-xl border border-slate-200 bg-stone-50 px-3 py-2.5">{item}</span>{index < 6 && <ArrowRight size={14} className="text-slate-300" />}</div>)}</div><p className="mt-7 text-lg leading-8 text-slate-600">O Marcenapp conecta informações que fazem parte do mesmo trabalho.</p></div></div></div>
        </section>

        <section className="px-5 py-20 lg:px-8 lg:py-28"><div className="mx-auto max-w-7xl"><div className="max-w-3xl"><p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Para quem é</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Feito para quem trabalha com móveis sob medida.</h2></div><div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{[['Marceneiros','Para quem projeta e produz seus próprios móveis.'],['Marcenarias','Para organizar projetos e informações de produção.'],['Projetistas','Para desenvolver projetos com mais organização.'],['Móveis planejados','Para centralizar as informações do projeto.']].map(([title,text]) => <div key={title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="font-black">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{text}</p></div>)}</div></div></section>

        <section className="border-y border-slate-200 bg-stone-100 px-5 py-20 lg:px-8 lg:py-28"><div className="mx-auto max-w-7xl"><div className="max-w-3xl"><p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Projetos reais</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Veja o que pode ser desenvolvido no Marcenapp.</h2><p className="mt-5 text-lg leading-8 text-slate-600">Quando houver portfólio real disponível, esta área mostra projeto, visualização e resultado do mesmo trabalho.</p></div><div className="mt-10 grid gap-4 md:grid-cols-3">{['Projeto', 'Visualização', 'Resultado'].map((label) => <div key={label} className="flex min-h-56 items-end rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div><span className="rounded-full bg-stone-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</span><p className="mt-3 text-sm font-semibold text-slate-500">Espaço preparado para imagens reais do produto.</p></div></div>)}</div></div></section>

        <section id="planos" className="px-5 py-20 lg:px-8 lg:py-28"><div className="mx-auto max-w-7xl"><div className="max-w-3xl"><p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Planos</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Use o Marcenapp do jeito que sua marcenaria trabalha.</h2><p className="mt-5 text-lg leading-8 text-slate-600">Escolha a opção disponível para sua operação e consulte as condições comerciais atuais antes de contratar.</p></div><div className="mt-10 grid gap-4 md:grid-cols-3">{['Começar','Profissional','Marcenaria'].map((title,index) => <div key={title} className={`rounded-3xl border p-7 ${index === 1 ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white'}`}><p className={`text-xs font-black uppercase tracking-[0.16em] ${index === 1 ? 'text-slate-400' : 'text-slate-400'}`}>Opção {index + 1}</p><h3 className="mt-3 text-2xl font-black">{title}</h3><p className={`mt-4 text-sm leading-6 ${index === 1 ? 'text-slate-300' : 'text-slate-600'}`}>Detalhes, créditos e condições conforme a configuração comercial atual do Marcenapp.</p><button onClick={goAuth} className={`mt-7 w-full rounded-2xl px-5 py-3.5 font-black ${index === 1 ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}>Começar agora</button></div>)}</div></div></section>

        <section className="border-y border-slate-200 bg-white px-5 py-20 lg:px-8 lg:py-28"><div className="mx-auto max-w-4xl"><div className="text-center"><p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">FAQ</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Perguntas frequentes.</h2></div><div className="mt-10 divide-y divide-slate-200 rounded-3xl border border-slate-200 bg-white">{faqs.map(([question,answer],index) => <div key={question}><button className="flex w-full items-center justify-between gap-6 p-6 text-left font-black" onClick={() => setOpenFaq(openFaq === index ? null : index)}>{question}<ChevronDown size={19} className={`shrink-0 transition ${openFaq === index ? 'rotate-180' : ''}`} /></button>{openFaq === index && <div className="px-6 pb-6 text-sm leading-7 text-slate-600">{answer}</div>}</div>)}</div></div></section>

        <section className="px-5 py-20 lg:px-8 lg:py-28"><div className="mx-auto max-w-5xl rounded-[2rem] bg-slate-900 px-6 py-14 text-center text-white sm:px-12"><p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">Comece pelo próximo projeto</p><h2 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">Seu próximo projeto pode começar aqui.</h2><p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">Organize o projeto, desenvolva o móvel e reúna as informações necessárias para seguir para a produção.</p><button onClick={goAuth} className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-4 font-black text-slate-900 transition hover:bg-slate-100">Começar agora <ArrowRight size={18} /></button><p className="mt-5 text-sm font-semibold text-slate-400">Do projeto à produção, tudo no lugar.</p></div></section>
      </main>

      <footer className="border-t border-slate-200 bg-white px-5 py-8 lg:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between"><div className="font-black text-slate-900">MARCENAPP</div><div>Do projeto à produção, tudo no lugar.</div></div></footer>
    </div>
  );
};

export default Landing;
