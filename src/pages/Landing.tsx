import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  Cuboid,
  FileText,
  Gauge,
  Menu,
  MessageSquareText,
  Play,
  Scissors,
  Sparkles,
  Users,
  WalletCards,
  X,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '@/assets/marcenapp-logo.svg';

const modernKitchen = 'https://images.unsplash.com/photo-1778088442657-eb0b0491b48c?auto=format&fit=crop&fm=jpg&q=80&w=1800';
const oldKitchen = 'https://images.unsplash.com/photo-1769745918779-f255f567664c?auto=format&fit=crop&fm=jpg&q=80&w=1800';
const renovation = 'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&fm=jpg&q=80&w=1800';

const features = [
  { icon: Cuboid, title: 'Projeto e ambientes', text: 'Organize ambientes, medidas e projetos sem perder informação no caminho.' },
  { icon: Sparkles, title: 'IA que trabalha com você', text: 'Use a IA para acelerar tarefas, interpretar informações e tirar trabalho repetitivo da sua frente.' },
  { icon: Gauge, title: 'Orçamento inteligente', text: 'Transforme projeto, materiais e custos em uma proposta comercial mais clara.' },
  { icon: Scissors, title: 'Corte e produção', text: 'Leve o projeto para plano de corte, produção e acompanhamento da obra.' },
  { icon: Users, title: 'Clientes e aprovação', text: 'Mantenha cliente, revisão, aprovação e histórico conectados à obra.' },
  { icon: BarChart3, title: 'Gestão da marcenaria', text: 'Tenha uma visão única do que está sendo vendido, produzido e entregue.' },
];

const journey = [
  ['1', 'Você recebe o projeto', 'Foto, desenho, medidas ou informações do cliente.'],
  ['2', 'O Marcenapp organiza', 'Projeto, ambiente, materiais e informações ficam centralizados.'],
  ['3', 'Você calcula e apresenta', 'Orçamento e documentação saem com muito menos trabalho manual.'],
  ['4', 'Cliente aprova', 'A negociação evolui para aprovação, contrato e produção.'],
  ['5', 'Sua equipe produz', 'Corte, produção, instalação e acompanhamento continuam conectados.'],
];

const creditPacks = [
  { name: 'Avulso', price: 'R$ 79,90', detail: '1 crédito', unit: 'R$ 79,90 / ambiente', tag: 'Para experimentar', items: ['1 crédito = 1 ambiente', '2 revisões gratuitas', 'Liberação imediata', 'Crédito sem expiração'] },
  { name: 'Pack Start', price: 'R$ 699,90', detail: '10 créditos', unit: 'R$ 69,99 / projeto', tag: 'Economia de 20%', items: ['1 crédito = 1 ambiente', '2 revisões gratuitas', 'Acesso às ferramentas', 'Créditos sem expiração'] },
  { name: 'Pack Pro', price: 'R$ 2.994,90', detail: '50 créditos', unit: 'R$ 59,90 / projeto', tag: 'Mais escolhido', items: ['1 crédito = 1 ambiente', '2 revisões gratuitas', 'Prioridade na fila de render', 'Créditos sem expiração'] },
  { name: 'Pack Elite', price: 'R$ 4.990,90', detail: '100 créditos', unit: 'R$ 49,90 / projeto', tag: 'Maior economia', items: ['1 crédito = 1 ambiente', '2 revisões gratuitas', 'Suporte técnico prioritário', 'Economia de até 50%'] },
];

const faqs = [
  ['Preciso saber usar 3D?', 'Não. A proposta do Marcenapp é reduzir a complexidade e ajudar você a transformar informações do projeto em uma operação organizada.'],
  ['Como funcionam os créditos?', 'Os créditos são usados em operações que consomem IA e processamento. A oferta pública atual trabalha com créditos pré-pagos, sem expiração.'],
  ['Existe mensalidade?', 'A oferta pública atual do Marcenapp trabalha com pacotes de créditos, sem mensalidade recorrente. A plataforma também possui estrutura para planos comerciais futuros.'],
  ['Posso usar no celular?', 'Sim. O Marcenapp é uma aplicação web e a experiência deve acompanhar você no computador, tablet e celular.'],
  ['O Marcenapp serve só para orçamento?', 'Não. A proposta é acompanhar a jornada da marcenaria do projeto ao orçamento, produção, cliente e pós-venda.'],
];

const Landing = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const goAuth = () => navigate('/auth');
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 text-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3" aria-label="Marcenapp início">
            <img src={logo} alt="Marcenapp" className="h-10 w-10 rounded-xl" />
            <div className="text-left leading-tight">
              <div className="text-lg font-black tracking-tight">MARCENA<span className="text-indigo-400">PP</span></div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Marcenaria 4.0</div>
            </div>
          </button>

          <nav className="hidden items-center gap-7 md:flex" aria-label="Navegação principal">
            <a href="#recursos" className="text-sm font-semibold text-slate-300 transition hover:text-white">Recursos</a>
            <a href="#transformacao" className="text-sm font-semibold text-slate-300 transition hover:text-white">Transformação</a>
            <a href="#como-funciona" className="text-sm font-semibold text-slate-300 transition hover:text-white">Como funciona</a>
            <a href="#planos" className="text-sm font-semibold text-slate-300 transition hover:text-white">Planos</a>
            <button onClick={goAuth} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/10">Entrar</button>
            <button onClick={goAuth} className="rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-black shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400">Começar agora</button>
          </nav>

          <button className="rounded-xl p-2 md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu">{menuOpen ? <X /> : <Menu />}</button>
        </div>
        {menuOpen && (
          <div className="border-t border-white/10 bg-slate-950 px-5 py-5 md:hidden">
            <div className="flex flex-col gap-2">
              {['#recursos', '#transformacao', '#como-funciona', '#planos'].map((href) => <a key={href} onClick={closeMenu} href={href} className="rounded-xl px-3 py-3 font-semibold text-slate-200 hover:bg-white/5">{href === '#recursos' ? 'Recursos' : href === '#transformacao' ? 'Transformação' : href === '#como-funciona' ? 'Como funciona' : 'Planos'}</a>)}
              <button onClick={goAuth} className="mt-2 rounded-xl bg-indigo-500 px-4 py-3 font-black">Entrar ou começar</button>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="relative isolate overflow-hidden px-5 pb-20 pt-32 lg:px-8 lg:pb-28 lg:pt-40">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_72%_18%,rgba(99,102,241,.26),transparent_34%),radial-gradient(circle_at_12%_30%,rgba(56,189,248,.10),transparent_30%)]" />
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.02fr_.98fr]">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-400/25 bg-indigo-400/10 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-indigo-300"><Sparkles size={14} /> Feito para marcenaria</div>
              <h1 className="max-w-4xl text-5xl font-black leading-[.96] tracking-[-0.045em] sm:text-6xl lg:text-7xl">Pare de administrar sua marcenaria no <span className="text-indigo-400">improviso.</span></h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">Projeto, orçamento, produção, clientes, IA e gestão em uma única jornada. Menos retrabalho. Mais controle. Mais profissionalismo na frente do cliente.</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <button onClick={goAuth} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-500 px-7 py-4 font-black shadow-xl shadow-indigo-500/20 transition hover:-translate-y-0.5 hover:bg-indigo-400">Quero usar o Marcenapp <ArrowRight size={18} /></button>
                <a href="#transformacao" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 px-7 py-4 font-bold text-slate-200 transition hover:bg-white/5"><Play size={17} /> Ver a transformação</a>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
                {['IA integrada', 'Projeto conectado', 'Orçamento inteligente', 'Produção organizada'].map((item) => <span key={item} className="flex items-center gap-2"><Check size={15} className="text-emerald-400" />{item}</span>)}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-8 rounded-[3rem] bg-indigo-500/10 blur-3xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[.06] p-3 shadow-2xl backdrop-blur-xl">
                <img src={modernKitchen} alt="Cozinha planejada moderna" className="h-[430px] w-full rounded-[1.5rem] object-cover" />
                <div className="absolute inset-x-8 bottom-8 rounded-2xl border border-white/15 bg-slate-950/85 p-4 backdrop-blur-xl">
                  <div className="flex items-center gap-3"><div className="rounded-xl bg-indigo-500/15 p-2 text-indigo-300"><Sparkles size={20} /></div><div><div className="text-sm font-black">Do projeto à entrega.</div><div className="text-xs text-slate-400">O Marcenapp acompanha o trabalho depois que a foto vira projeto.</div></div></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-white/[.025] px-5 py-8 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-5 text-center sm:grid-cols-3 sm:text-left">
            <div><div className="text-xs font-black uppercase tracking-[.2em] text-indigo-400">Uma plataforma</div><div className="mt-1 font-bold">em vez de ferramentas espalhadas</div></div>
            <div><div className="text-xs font-black uppercase tracking-[.2em] text-indigo-400">Uma jornada</div><div className="mt-1 font-bold">do projeto ao pós-venda</div></div>
            <div><div className="text-xs font-black uppercase tracking-[.2em] text-indigo-400">Uma decisão</div><div className="mt-1 font-bold">mais informação, menos improviso</div></div>
          </div>
        </section>

        <section id="transformacao" className="px-5 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl"><div className="text-sm font-black uppercase tracking-[.2em] text-indigo-400">Antes e depois</div><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Seu cliente não compra uma planilha. Ele compra uma experiência.</h2><p className="mt-5 leading-7 text-slate-400">A landing agora mostra visualmente a transformação que queremos vender: sair do improviso e chegar a uma operação profissional. As fotos abaixo são referências visuais; os próximos passos devem usar imagens reais dos projetos do Marcenapp.</p></div>
            <div className="mt-12 grid gap-5 lg:grid-cols-2">
              <article className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900"><div className="relative"><img src={oldKitchen} alt="Ambiente de cozinha antigo" className="h-[360px] w-full object-cover grayscale-[20%]" /><span className="absolute left-5 top-5 rounded-full bg-slate-950/85 px-3 py-1 text-xs font-black uppercase tracking-widest">Antes · referência</span></div><div className="p-6"><h3 className="text-xl font-black">Informação espalhada e decisão no improviso</h3><p className="mt-2 text-sm leading-6 text-slate-400">Projeto, medidas, orçamento e acompanhamento dependem de memória, mensagens e arquivos soltos.</p></div></article>
              <article className="overflow-hidden rounded-[2rem] border border-indigo-400/20 bg-gradient-to-br from-indigo-500/10 to-slate-900"><div className="relative"><img src={modernKitchen} alt="Ambiente de cozinha planejada moderno" className="h-[360px] w-full object-cover" /><span className="absolute left-5 top-5 rounded-full bg-indigo-500 px-3 py-1 text-xs font-black uppercase tracking-widest">Depois · referência</span></div><div className="p-6"><h3 className="text-xl font-black">Uma operação com cara de empresa</h3><p className="mt-2 text-sm leading-6 text-slate-400">O cliente percebe organização, você ganha contexto e sua equipe sabe o próximo passo.</p></div></article>
            </div>
          </div>
        </section>

        <section id="recursos" className="border-y border-white/10 bg-white/[.025] px-5 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl"><div className="max-w-3xl"><div className="text-sm font-black uppercase tracking-[.2em] text-indigo-400">O que você ganha</div><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Tudo que sua marcenaria precisa para parar de apagar incêndio.</h2><p className="mt-5 leading-7 text-slate-400">A tecnologia entra para conectar o processo — não para criar mais uma tela que você precisa aprender a usar.</p></div>
            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{features.map(({ icon: Icon, title, text }, index) => <article key={title} className="rounded-3xl border border-white/10 bg-slate-900/65 p-6 transition hover:-translate-y-1 hover:border-indigo-400/25"><div className="flex items-center justify-between"><div className="rounded-2xl bg-indigo-500/10 p-3 text-indigo-300"><Icon size={22} /></div><span className="text-xs font-black text-slate-600">0{index + 1}</span></div><h3 className="mt-6 text-lg font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{text}</p></article>)}</div>
          </div>
        </section>

        <section id="como-funciona" className="px-5 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-start"><div><div className="text-sm font-black uppercase tracking-[.2em] text-indigo-400">Como funciona</div><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Você trabalha. O sistema organiza.</h2><p className="mt-5 leading-7 text-slate-400">A experiência foi pensada para acompanhar o fluxo real da marcenaria, sem obrigar você a reconstruir sua rotina do zero.</p><button onClick={goAuth} className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-indigo-500 px-6 py-4 font-black hover:bg-indigo-400">Começar agora <ArrowRight size={18} /></button></div>
            <div className="space-y-3">{journey.map(([number, title, text]) => <div key={number} className="flex gap-4 rounded-3xl border border-white/10 bg-slate-900/60 p-5"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-sm font-black text-indigo-300">{number}</div><div><h3 className="font-black">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-400">{text}</p></div></div>)}</div>
          </div>
        </section>

        <section className="relative overflow-hidden border-y border-white/10 bg-slate-900 px-5 py-20 lg:px-8 lg:py-24"><div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_70%_40%,rgba(99,102,241,.20),transparent_55%)]" /><div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center"><div><div className="text-sm font-black uppercase tracking-[.2em] text-indigo-400">IA sem mistério</div><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">A IA faz o trabalho pesado. Você continua no comando.</h2><p className="mt-5 max-w-xl leading-7 text-slate-400">A proposta do Marcenapp não é tirar a decisão da sua mão. É acelerar o que consome tempo para você conseguir vender, produzir e atender melhor.</p><div className="mt-7 space-y-3">{['Acelere tarefas repetitivas', 'Tenha contexto do projeto em um só lugar', 'Use créditos somente quando precisar', 'Revise antes de tomar decisões importantes'].map(item => <div key={item} className="flex items-center gap-3"><Check size={17} className="text-emerald-400" /><span className="font-semibold text-slate-200">{item}</span></div>)}</div></div><div className="overflow-hidden rounded-[2rem] border border-white/10"><img src={renovation} alt="Cozinha em processo de renovação" className="h-[360px] w-full object-cover" /></div></div></section>

        <section id="planos" className="px-5 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl"><div className="mx-auto max-w-3xl text-center"><div className="text-sm font-black uppercase tracking-[.2em] text-indigo-400">Preços transparentes</div><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Comece pequeno. Escale quando a demanda crescer.</h2><p className="mt-5 leading-7 text-slate-400">A oferta pública atual usa créditos pré-pagos, sem mensalidade recorrente e sem expiração. Escolha o volume que combina com sua rotina.</p></div>
            <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">{creditPacks.map((pack) => <article key={pack.name} className={`relative flex flex-col rounded-[2rem] border p-6 ${pack.name === 'Pack Pro' ? 'border-indigo-400/50 bg-indigo-500/10 shadow-2xl shadow-indigo-500/10' : 'border-white/10 bg-slate-900/70'}`}>
              {pack.name === 'Pack Pro' && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-500 px-3 py-1 text-[10px] font-black uppercase tracking-widest">Mais escolhido</div>}
              <div className="text-xs font-black uppercase tracking-widest text-slate-500">{pack.tag}</div><h3 className="mt-3 text-2xl font-black">{pack.name}</h3><div className="mt-5 text-3xl font-black">{pack.price}</div><div className="mt-1 font-bold text-indigo-300">{pack.detail}</div><div className="mt-1 text-xs text-slate-500">{pack.unit}</div><div className="my-6 h-px bg-white/10"/><ul className="space-y-3">{pack.items.map(item => <li key={item} className="flex gap-2 text-sm text-slate-300"><Check size={16} className="mt-0.5 shrink-0 text-emerald-400" />{item}</li>)}</ul><button onClick={goAuth} className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-black ${pack.name === 'Pack Pro' ? 'bg-indigo-500 hover:bg-indigo-400' : 'border border-white/15 hover:bg-white/5'}`}>Escolher pacote <ArrowRight size={16} /></button>
            </article>)}</div>
            <div className="mx-auto mt-7 flex max-w-4xl flex-col gap-4 rounded-2xl border border-indigo-400/15 bg-indigo-500/5 p-5 text-sm text-slate-300 sm:flex-row sm:items-center"><WalletCards className="shrink-0 text-indigo-300" size={22} /><p><strong className="text-white">Créditos por ferramenta:</strong> o produto também possui estrutura de créditos separados para render, contratos, orçamento e plano de corte. Os preços dessas unidades só entram quando forem publicados oficialmente.</p></div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-white/[.025] px-5 py-20 lg:px-8 lg:py-24"><div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center"><div><div className="text-sm font-black uppercase tracking-[.2em] text-indigo-400">Por que isso importa?</div><h2 className="mt-3 text-3xl font-black sm:text-4xl">Porque velocidade sem organização vira retrabalho.</h2><p className="mt-5 leading-7 text-slate-400">Uma marcenaria cresce quando o dono deixa de ser o lugar onde todas as informações precisam passar. O Marcenapp foi desenhado para transformar conhecimento disperso em processo.</p></div><div className="grid gap-3 sm:grid-cols-2">{[['01', 'Mais contexto'], ['02', 'Menos retrabalho'], ['03', 'Apresentação profissional'], ['04', 'Operação acompanhável']].map(([n, t]) => <div key={n} className="rounded-2xl border border-white/10 bg-slate-900 p-5"><div className="text-xs font-black text-indigo-300">{n}</div><div className="mt-2 font-black">{t}</div></div>)}</div></div></section>

        <section className="px-5 py-20 lg:px-8 lg:py-28"><div className="mx-auto max-w-4xl"><div className="text-center"><div className="text-sm font-black uppercase tracking-[.2em] text-indigo-400">Perguntas frequentes</div><h2 className="mt-3 text-3xl font-black sm:text-4xl">Antes de começar, tire suas dúvidas.</h2></div><div className="mt-10 space-y-3">{faqs.map(([question, answer], index) => <div key={question} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70"><button className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left font-black" onClick={() => setOpenFaq(openFaq === index ? null : index)} aria-expanded={openFaq === index}><span>{question}</span><ChevronDown className={`shrink-0 transition ${openFaq === index ? 'rotate-180 text-indigo-300' : 'text-slate-500'}`} size={19} /></button>{openFaq === index && <div className="border-t border-white/10 px-5 pb-5 pt-4 text-sm leading-7 text-slate-400">{answer}</div>}</div>)}</div></div></section>

        <section className="px-5 pb-24 lg:px-8 lg:pb-32"><div className="mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] border border-indigo-400/20 bg-gradient-to-br from-indigo-500/20 via-slate-900 to-slate-900 p-8 text-center shadow-2xl sm:p-14"><MessageSquareText className="mx-auto text-indigo-300" size={30} /><h2 className="mt-5 text-3xl font-black sm:text-5xl">Sua próxima obra pode começar mais organizada.</h2><p className="mx-auto mt-4 max-w-2xl text-slate-300">Entre no Marcenapp, conheça a plataforma e veja como transformar o jeito que sua marcenaria trabalha.</p><button onClick={goAuth} className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-indigo-500 px-8 py-4 font-black shadow-xl shadow-indigo-500/20 hover:bg-indigo-400">Quero começar <ArrowRight size={18} /></button></div></section>
      </main>

      <footer className="border-t border-white/10 px-5 py-10 lg:px-8"><div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.3fr_1fr_1fr_1fr]"><div><div className="flex items-center gap-3"><img src={logo} alt="Marcenapp" className="h-9 w-9 rounded-xl" /><div><div className="font-black">MARCENAPP</div><div className="text-[10px] font-bold uppercase tracking-[.2em] text-slate-500">Marcenaria 4.0</div></div></div><p className="mt-4 max-w-sm text-sm leading-6 text-slate-500">Projeto, orçamento, produção, clientes e inteligência artificial em uma única jornada.</p></div><div><div className="text-xs font-black uppercase tracking-widest text-slate-500">Produto</div><div className="mt-4 space-y-3 text-sm text-slate-300"><a className="block hover:text-white" href="#recursos">Recursos</a><a className="block hover:text-white" href="#como-funciona">Como funciona</a><a className="block hover:text-white" href="#planos">Preços</a></div></div><div><div className="text-xs font-black uppercase tracking-widest text-slate-500">Conta</div><div className="mt-4 space-y-3 text-sm text-slate-300"><button onClick={goAuth} className="block hover:text-white">Entrar</button><button onClick={goAuth} className="block hover:text-white">Criar conta</button></div></div><div><div className="text-xs font-black uppercase tracking-widest text-slate-500">Confiança</div><div className="mt-4 space-y-3 text-sm text-slate-500"><span className="block">Valores claros</span><span className="block">IA com revisão humana</span><span className="block">Web e responsivo</span></div></div></div><div className="mx-auto mt-10 flex max-w-7xl flex-col gap-2 border-t border-white/10 pt-6 text-xs text-slate-600 sm:flex-row sm:justify-between"><span>Marcenapp · Marcenaria 4.0</span><span>Os valores comerciais podem ser atualizados conforme a oferta oficial.</span></div></footer>
    </div>
  );
};

export default Landing;
