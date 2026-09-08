import { ArrowRight, Check, Cuboid, FileText, Hammer, Image as ImageIcon, Ruler, Scissors, ShieldCheck, Sparkles, Workflow, Zap } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import logo from '@/assets/marcenapp-logo.svg';

const plans = [
  { name: 'Start', price: '79', description: 'Para começar a organizar a operação.', features: ['Jornada da obra', 'Diário digital', 'Estúdio', 'Orçamentos', 'IARA com uso controlado'] },
  { name: 'Pro', price: '179', description: 'Para vender e produzir com mais velocidade.', featured: true, features: ['Tudo do Start', 'Produção e plano de corte', 'Mais uso de IA', 'Memória operacional da obra', 'Prioridade nas melhorias'] },
  { name: 'Business', price: '349', description: 'Para equipes e operações com maior volume.', features: ['Tudo do Pro', 'Maior capacidade de IA', 'Visão administrativa', 'Indicadores operacionais', 'Suporte prioritário'] },
] as const;

const Landing = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate('/app', { replace: true });
  }, [loading, user, navigate]);

  if (loading || user) return <div className="min-h-screen bg-[#0b1015]" />;

  const start = (plan?: string) => navigate(plan ? `/auth?plan=${plan}` : '/auth');

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0b1015] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b1015]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link to="/" className="flex items-center gap-3" aria-label="MARCENAPP início">
            <img src={logo} alt="MARCENAPP" className="h-10 w-10 object-contain" />
            <div><div className="text-base font-black tracking-tight">MARCENAPP</div><div className="text-[10px] font-semibold text-slate-400">Marcenaria inteligente</div></div>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-300 md:flex">
            <a href="#funcionalidades" className="hover:text-white">Funcionalidades</a>
            <a href="#como-funciona" className="hover:text-white">Como funciona</a>
            <a href="#planos" className="hover:text-white">Planos</a>
            <a href="#faq" className="hover:text-white">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/auth')} className="hidden rounded-xl px-4 py-2.5 text-sm font-bold text-slate-300 hover:bg-white/5 hover:text-white sm:block">Entrar</button>
            <button onClick={() => start('pro')} className="inline-flex items-center gap-2 rounded-xl bg-[#f4a640] px-4 py-2.5 text-sm font-black text-[#15100a] shadow-lg shadow-orange-500/10 hover:bg-[#ffb75a]">Teste por 7 dias <ArrowRight size={16} /></button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(244,166,64,.20),transparent_32%),radial-gradient(circle_at_10%_50%,rgba(38,70,94,.45),transparent_42%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-16 pt-14 md:grid-cols-[.92fr_1.08fr] md:items-center md:pb-24 md:pt-20 lg:px-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/20 bg-orange-300/10 px-3 py-1.5 text-xs font-black uppercase tracking-[.12em] text-orange-200"><Hammer size={14} /> Software para marcenarias</div>
              <h1 className="mt-6 text-4xl font-black leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl">Do primeiro rascunho à produção, <span className="text-[#f4a640]">sem perder o controle.</span></h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">O MARCENAPP reúne projeto 2D e 3D, orçamento, plano de corte, produção, diário de obra e IARA em um único fluxo.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button onClick={() => start('pro')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#f4a640] px-6 py-3.5 font-black text-[#15100a] shadow-xl shadow-orange-500/15 hover:bg-[#ffb75a]">Começar teste grátis <ArrowRight size={18} /></button>
                <a href="#planos" className="inline-flex items-center justify-center rounded-xl border border-white/15 px-6 py-3.5 font-bold text-slate-200 hover:bg-white/5">Ver planos e valores</a>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400"><span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-400" /> 7 dias grátis</span><span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-400" /> Dados protegidos</span><span className="flex items-center gap-1.5"><Zap size={14} className="text-amber-400" /> Feito para celular</span></div>
            </div>

            <div className="relative">
              <div className="absolute -inset-6 rounded-[2.5rem] bg-orange-400/10 blur-3xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-3 shadow-2xl">
                <div className="grid gap-3 sm:grid-cols-2">
                  <figure className="overflow-hidden rounded-2xl bg-[#f7f0e5]">
                    <img src="/landing-sketch.svg" alt="Rascunho técnico de um móvel planejado" className="h-full min-h-56 w-full object-cover" />
                    <figcaption className="bg-[#f7f0e5] px-4 py-3 text-xs font-bold text-[#5b4638]">01 · Ideia e medidas</figcaption>
                  </figure>
                  <figure className="overflow-hidden rounded-2xl bg-[#191714]">
                    <img src="https://images.unsplash.com/photo-1556912167-f556f1f39fdf?auto=format&fit=crop&w=1000&q=85" alt="Ambiente de cozinha planejada com móveis de madeira" className="h-full min-h-56 w-full object-cover" loading="eager" />
                    <figcaption className="bg-[#191714] px-4 py-3 text-xs font-bold text-slate-200">02 · Resultado no ambiente</figcaption>
                  </figure>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-slate-300"><span className="flex items-center gap-2"><Workflow size={15} className="text-[#f4a640]" /> Projeto → orçamento → corte → produção</span><span className="hidden font-bold text-emerald-300 sm:block">Tudo conectado</span></div>
              </div>
            </div>
          </div>
        </section>

        <section id="funcionalidades" className="bg-[#f7f5f1] py-16 text-slate-950 md:py-20">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="max-w-2xl"><p className="text-xs font-black uppercase tracking-[.2em] text-orange-600">Tudo em um só lugar</p><h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Menos retrabalho. Mais tempo para vender e produzir.</h2><p className="mt-4 leading-7 text-slate-600">O fluxo acompanha o projeto desde a primeira conversa com o cliente até a entrega, mantendo as informações organizadas.</p></div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Projeto 3D', 'Apresente o móvel no ambiente antes de produzir.', Cuboid],
                ['Projeto 2D', 'Organize planta, vistas, medidas e documentação.', Ruler],
                ['Orçamento', 'Materiais, mão de obra, margem e proposta em um fluxo.', FileText],
                ['Corte e produção', 'Transforme o projeto aprovado em tarefas de produção.', Scissors],
              ].map(([title, text, Icon]) => <article key={title as string} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><Icon size={21} /></div><h3 className="mt-4 font-black">{title as string}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{text as string}</p></article>)}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="border-y border-white/10 bg-[#111820] py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-xs font-black uppercase tracking-[.2em] text-orange-300">Do rascunho ao real</p><h2 className="mt-2 text-3xl font-black sm:text-4xl">Um projeto. Um fluxo. Três momentos.</h2></div><p className="max-w-md text-sm leading-6 text-slate-400">Você não precisa refazer o trabalho a cada etapa. O MARCENAPP leva o contexto adiante.</p></div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {[['01', 'Capture a ideia', 'Registre ambiente, medidas, pedido e referências para começar o projeto.', ImageIcon], ['02', 'Apresente e aprove', 'Use o Estúdio, projeto 2D/3D e orçamento para alinhar o que será produzido.', Cuboid], ['03', 'Produza e entregue', 'Plano de corte, produção e diário mantêm a execução organizada.', Scissors]].map(([num, title, text, Icon]) => <article key={num as string} className="rounded-3xl border border-white/10 bg-white/[.035] p-6"><div className="flex items-center justify-between"><span className="text-3xl font-black text-orange-300">{num as string}</span><Icon size={22} className="text-slate-400" /></div><h3 className="mt-8 text-xl font-black">{title as string}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{text as string}</p></article>)}
            </div>
          </div>
        </section>

        <section id="planos" className="bg-[#f7f5f1] py-16 text-slate-950 md:py-20">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="mx-auto max-w-3xl text-center"><p className="text-xs font-black uppercase tracking-[.2em] text-orange-600">Planos e valores</p><h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Escolha o plano para o momento da sua marcenaria.</h2><p className="mt-4 text-slate-600">Todos começam com <strong>7 dias grátis</strong>. A primeira cobrança acontece depois do período de teste.</p></div>
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {plans.map((plan) => <article key={plan.name} className={`relative rounded-3xl border bg-white p-6 shadow-sm ${plan.featured ? 'border-orange-400 ring-2 ring-orange-100' : 'border-slate-200'}`}>
                {plan.featured && <span className="absolute -top-3 left-6 rounded-full bg-[#f4a640] px-3 py-1 text-xs font-black text-[#15100a]">MAIS ESCOLHIDO</span>}
                <h3 className="text-xl font-black">{plan.name}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">{plan.description}</p>
                <div className="mt-5 flex items-end gap-1"><span className="text-sm font-bold text-slate-500">R$</span><span className="text-4xl font-black">{plan.price}</span><span className="pb-1 text-sm text-slate-500">/mês</span></div>
                <p className="mt-2 text-xs font-bold text-emerald-700">7 dias grátis · cobrança depois do teste</p>
                <button onClick={() => start(plan.name.toLowerCase())} className={`mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-black ${plan.featured ? 'bg-[#f4a640] text-[#15100a] hover:bg-[#ffb75a]' : 'border border-slate-200 hover:border-orange-300 hover:text-orange-700'}`}>Começar agora <ArrowRight size={16} /></button>
                <ul className="mt-6 space-y-3 border-t border-slate-100 pt-5">{plan.features.map((feature) => <li key={feature} className="flex gap-2 text-sm text-slate-600"><Check size={17} className="mt-0.5 shrink-0 text-emerald-600" />{feature}</li>)}</ul>
              </article>)}
            </div>
            <p className="mt-6 text-center text-xs text-slate-500">Pagamento recorrente preparado para Asaas. Você escolhe a forma de cobrança no fluxo de assinatura.</p>
          </div>
        </section>

        <section id="faq" className="bg-[#0b1015] py-16 md:py-20">
          <div className="mx-auto max-w-4xl px-5 lg:px-8"><div className="text-center"><p className="text-xs font-black uppercase tracking-[.2em] text-orange-300">Perguntas frequentes</p><h2 className="mt-2 text-3xl font-black">Antes de começar</h2></div><div className="mt-8 grid gap-3">
            {[['O teste realmente dura 7 dias?', 'Sim. O período inicial é de 7 dias e a primeira cobrança da assinatura é programada para depois desse período.'], ['Preciso instalar algum programa?', 'Não. O MARCENAPP funciona no navegador e foi pensado também para uso no celular.'], ['O que é a IARA?', 'É a assistente técnica do MARCENAPP, integrada ao fluxo para apoiar decisões e tarefas de projeto e operação.'], ['Como o pagamento funciona?', 'A assinatura é preparada pelo Asaas. Depois de entrar, você confirma o plano e a forma de cobrança antes de concluir a contratação.']].map(([q, a]) => <details key={q} className="group rounded-2xl border border-white/10 bg-white/[.03] p-5"><summary className="cursor-pointer list-none font-bold text-slate-100">{q}<span className="float-right text-orange-300">+</span></summary><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{a}</p></details>)}
          </div></div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#080c10]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:grid-cols-[1.5fr_1fr_1fr_1fr] lg:px-8">
          <div><Link to="/" className="flex items-center gap-3"><img src={logo} alt="MARCENAPP" className="h-9 w-9" /><span className="font-black">MARCENAPP</span></Link><p className="mt-4 max-w-sm text-sm leading-6 text-slate-500">Marcenaria inteligente para transformar ideias em projetos organizados e produção com mais precisão.</p></div>
          <div><h3 className="font-bold">Produto</h3><div className="mt-4 space-y-2 text-sm text-slate-500"><a href="#funcionalidades" className="block hover:text-white">Funcionalidades</a><a href="#como-funciona" className="block hover:text-white">Como funciona</a><a href="#planos" className="block hover:text-white">Planos</a></div></div>
          <div><h3 className="font-bold">Acesso</h3><div className="mt-4 space-y-2 text-sm text-slate-500"><button onClick={() => navigate('/auth')} className="block hover:text-white">Entrar</button><button onClick={() => start('pro')} className="block hover:text-white">Teste grátis</button><Link to="/planos" className="block hover:text-white">Página de planos</Link></div></div>
          <div><h3 className="font-bold">MARCENA</h3><p className="mt-4 text-sm leading-6 text-slate-500">Apresentação visual e experiência de projeto para transformar a ideia do cliente em uma proposta mais clara.</p></div>
        </div>
        <div className="border-t border-white/10"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between lg:px-8"><span>© {new Date().getFullYear()} MARCENAPP. Todos os direitos reservados.</span><span>Marcenaria inteligente.</span></div></div>
      </footer>
    </div>
  );
};

export default Landing;
