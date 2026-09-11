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
  ['01', 'Projeto', 'Comece e organize o trabalho.'],
  ['02', 'Dimensionamento', 'Defina as medidas.'],
  ['03', 'Visualização', 'Confira o projeto em 2D e 3D.'],
  ['04', 'Materiais', 'Organize os materiais.'],
  ['05', 'Ferragens', 'Associe os componentes necessários.'],
  ['06', 'Lista de corte', 'Reúna informações para produção.'],
  ['07', 'Orçamento', 'Organize os dados para calcular o projeto.'],
];

const faqs = [
  ['O que é o Marcenapp?', 'O Marcenapp é uma plataforma para profissionais de marcenaria que reúne projeto, dimensionamento, visualização, materiais, ferragens, lista de corte e orçamento em um único fluxo de trabalho.'],
  ['Preciso usar todas as ferramentas?', 'Não. O fluxo acompanha as etapas do projeto e você usa os recursos necessários para o trabalho que está desenvolvendo.'],
  ['O Marcenapp gera lista de corte?', 'Quando essa etapa estiver disponível no projeto, o sistema reúne as informações necessárias para preparar o corte das peças.'],
  ['Posso organizar materiais e ferragens?', 'Sim. O projeto pode manter as informações de materiais e ferragens associadas às etapas correspondentes.'],
  ['A Yara é a própria plataforma?', 'Não. A Yara é a assistente de inteligência artificial do Marcenapp. Ela ajuda a interpretar informações e acompanhar etapas, enquanto você continua no controle do projeto.'],
  ['Preciso instalar algum programa?', 'O Marcenapp é uma aplicação web. O acesso e os recursos disponíveis dependem da configuração atual da plataforma.'],
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
            <a href="#fluxo" className="text-sm font-semibold text-slate-600 transition hover:text-slate-950">Fluxo</a>
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
              {['#recursos', '#fluxo', '#yara', '#planos'].map((href) => <a key={href} onClick={closeMenu} href={href} className="rounded-xl px-3 py-3 font-semibold text-slate-700 hover:bg-slate-100">{href === '#recursos' ? 'Recursos' : href === '#fluxo' ? 'Fluxo' : href === '#yara' ? 'Yara' : 'Planos'}</a>)}
              <button onClick={goAuth} className="mt-2 rounded-xl bg-slate-900 px-4 py-3 font-black text-white">Entrar ou começar</button>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="px-5 pb-20 pt-32 lg:px-8 lg:pb-28 lg:pt-40">
          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
            <div>
              <p className="mb-5 text-sm font-black uppercase tracking-[0.18em] text-slate-500">Feito para quem projeta e produz móveis sob medida</p>
              <h1 className="max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.04em] sm:text-6xl lg:text-7xl">Do projeto à produção, <span className="text-slate-500">tudo no lugar.</span></h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">Desenvolva seus projetos de marcenaria, visualize em 2D e 3D e organize medidas, materiais, ferragens, lista de corte e orçamento em um único fluxo de trabalho.</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <button onClick={goAuth} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-7 py-4 font-black text-white transition hover:bg-slate-700">Começar agora <ArrowRight size={18} /></button>
                <a href="#recursos" className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-7 py-4 font-bold text-slate-700 transition hover:bg-slate-100">Conhecer o Marcenapp</a>
              </div>
              <p className="mt-5 text-sm font-medium text-slate-500">Tecnologia no produto. Naturalidade na comunicação.</p>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="border-b border-slate-200 pb-5">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Fluxo do projeto</div>
                <div className="mt-2 text-2xl font-black">Um projeto. Um fluxo de trabalho.</div>
              </div>
              <div className="divide-y divide-slate-100">
                {flow.slice(0, 5).map(([number, title, text]) => (
                  <div key={number} className="flex items-center gap-4 py-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-black text-slate-500">{number}</div>
                    <div><div className="font-black">{title}</div><div className="text-sm text-slate-500">{text}</div></div>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-xl bg-stone-100 p-4 text-sm font-semibold text-slate-600">O projeto é o centro. As informações acompanham o projeto.</div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white px-5 py-16 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">O problema</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Um projeto de marcenaria não termina no desenho.</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">Depois do desenho ainda existem medidas, materiais, ferragens, cortes, orçamento e muitas outras informações que precisam estar organizadas.</p>
              <p className="mt-4 text-lg font-bold leading-8 text-slate-900">O desafio não é apenas projetar o móvel. É organizar tudo o que vem junto com ele.</p>
            </div>
          </div>
        </section>

        <section id="recursos" className="px-5 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Principais recursos</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Uma ferramenta pensada para o trabalho real da marcenaria.</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">Menos informação espalhada. Mais clareza em cada etapa do projeto.</p>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {resources.map(({ icon: Icon, title, headline, text }) => (
                <article key={title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <Icon size={23} strokeWidth={1.8} className="text-slate-500" />
                  <p className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-slate-400">{title}</p>
                  <h3 className="mt-2 text-lg font-black leading-6">{headline}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="fluxo" className="border-y border-slate-200 bg-slate-900 px-5 py-20 text-white lg:px-8 lg:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">Como funciona</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Um projeto. Um fluxo de trabalho.</h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">Desenvolva, visualize, configure e prepare as informações sem perder a continuidade do projeto.</p>
              <button onClick={goAuth} className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-4 font-black text-slate-900 transition hover:bg-slate-100">Começar agora <ArrowRight size={18} /></button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {flow.map(([number, title, text]) => (
                <div key={number} className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
                  <div className="text-xs font-black text-slate-400">{number}</div>
                  <h3 className="mt-2 font-black">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-400">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Resultado</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Mais clareza em cada etapa do projeto.</h2>
                <p className="mt-5 text-lg leading-8 text-slate-600">Entenda o que está sendo projetado, como foi desenvolvido, quais materiais e componentes acompanham o móvel e quais informações seguem para as próximas etapas.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {['Projeto organizado', 'Informação reunida', 'Materiais e ferragens associados', 'Preparação para produção'].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Check size={18} className="shrink-0 text-slate-500" /><span className="font-bold">{item}</span></div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="yara" className="border-y border-slate-200 bg-stone-100 px-5 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Yara</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">A inteligência artificial trabalha junto com o seu projeto.</h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">Você continua no controle. A Yara ajuda no processo, interpretando informações e acompanhando as etapas do projeto.</p>
              <div className="mt-7 space-y-3">
                {['Você continua tomando as decisões.', 'A Yara apoia o processo.', 'O projeto continua sendo o centro da experiência.'].map((item) => <div key={item} className="flex items-center gap-3 font-bold text-slate-800"><Check size={18} className="text-slate-500" />{item}</div>)}
              </div>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="border-b border-slate-200 pb-4 text-sm font-black">Yara · Assistente do projeto</div>
              <div className="mt-5 space-y-3 text-sm">
                <div className="max-w-[85%] rounded-2xl bg-slate-100 p-4 text-slate-700">Organizei as informações desta etapa do projeto. Revise as medidas antes de seguir.</div>
                <div className="ml-auto max-w-[75%] rounded-2xl bg-slate-900 p-4 text-white">Vou revisar e continuar o dimensionamento.</div>
              </div>
              <div className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-400">Exemplo de interação. A Yara apoia; você decide.</div>
            </div>
          </div>
        </section>

        <section className="px-5 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Projetos</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Projetos que começam no detalhe.</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">O portfólio do Marcenapp deve mostrar projetos reais desenvolvidos na plataforma, ambientes reais e imagens reais do produto. Não usamos imagens genéricas para representar resultados do sistema.</p>
            </div>
            <div className="mt-10 rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 sm:p-12">
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-400">Área reservada para portfólio real</p>
                <h3 className="mt-3 text-2xl font-black">Mostre aqui os seus projetos do Marcenapp.</h3>
                <p className="mt-3 leading-7 text-slate-600">As imagens devem ser capturas reais do produto, renders realmente gerados pelo sistema ou projetos autorizados. Assim que os arquivos reais forem disponibilizados, esta seção pode receber o portfólio sem alterar a identidade da página.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="planos" className="border-y border-slate-200 bg-white px-5 py-20 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-5xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Planos e créditos</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Use o Marcenapp do jeito que sua marcenaria trabalha.</h2>
            <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-slate-600">Planos, créditos, valores e condições comerciais devem acompanhar a oferta oficial disponível para sua conta. Nada é apresentado aqui como informação fixa quando pode mudar no sistema.</p>
            <div className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-3">
              {['Escolha o volume', 'Use conforme a demanda', 'Continue quando precisar'].map((item) => <div key={item} className="rounded-2xl border border-slate-200 bg-stone-50 p-5 font-black">{item}</div>)}
            </div>
            <button onClick={goAuth} className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-7 py-4 font-black text-white transition hover:bg-slate-700">Ver opções disponíveis <ArrowRight size={18} /></button>
          </div>
        </section>

        <section className="px-5 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-4xl">
            <div className="text-center"><p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Perguntas frequentes</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Antes de começar, tire suas dúvidas.</h2></div>
            <div className="mt-10 space-y-3">
              {faqs.map(([question, answer], index) => <div key={question} className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><button className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left font-black" onClick={() => setOpenFaq(openFaq === index ? null : index)} aria-expanded={openFaq === index}><span>{question}</span><ChevronDown className={`shrink-0 transition ${openFaq === index ? 'rotate-180 text-slate-700' : 'text-slate-400'}`} size={19} /></button>{openFaq === index && <div className="border-t border-slate-200 px-5 pb-5 pt-4 text-sm leading-7 text-slate-600">{answer}</div>}</div>)}
            </div>
          </div>
        </section>

        <section className="px-5 pb-24 lg:px-8 lg:pb-32">
          <div className="mx-auto max-w-6xl rounded-[2.5rem] bg-slate-900 p-8 text-center text-white sm:p-14">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">Próximo projeto</p>
            <h2 className="mt-3 text-3xl font-black sm:text-5xl">Seu próximo projeto pode começar aqui.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-300">Organize o projeto, desenvolva o móvel e reúna as informações necessárias para seguir para a produção.</p>
            <button onClick={goAuth} className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 font-black text-slate-900 transition hover:bg-slate-100">Começar agora <ArrowRight size={18} /></button>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white px-5 py-10 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><img src={logo} alt="Marcenapp" className="h-9 w-9 rounded-xl" /><div><div className="font-black">MARCENAPP</div><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Do projeto à produção, tudo no lugar.</div></div></div>
          <div className="flex gap-5 text-sm font-semibold text-slate-500"><a href="#recursos" className="hover:text-slate-900">Recursos</a><a href="#fluxo" className="hover:text-slate-900">Como funciona</a><a href="#planos" className="hover:text-slate-900">Planos</a><button onClick={goAuth} className="hover:text-slate-900">Entrar</button></div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
