import { useEffect, useState } from 'react';
import { ArrowRight, Camera, ChevronDown, ClipboardList, Factory, Image as ImageIcon, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logo from '@/assets/marcenapp-logo.svg';
import { supabase } from '@/integrations/supabase/client';

interface Plan { id: string; code: string; name: string; description: string | null; monthly_price_cents: number | null; features: { ai_messages_monthly?: number | null } | null }
interface Product { id: string; code: string; name: string; description: string | null; credits: number; price_cents: number | null }

const money = (v: number | null) => v == null ? 'Preço a definir' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v / 100);

const NAV = [['fluxo', 'Como funciona'], ['recursos', 'Recursos'], ['valores', 'Valores'], ['duvidas', 'Dúvidas']] as const;

const STEPS = [
  { icon: Camera, title: 'Registre o ambiente', text: 'Foto do local, medidas informadas e anotações do cliente ficam no projeto.' },
  { icon: ClipboardList, title: 'Monte o projeto', text: 'Descreva o móvel. A IARA organiza o pedido e aponta o que ainda precisa ser conferido.' },
  { icon: ImageIcon, title: 'Mostre ao cliente', text: 'Gere o visual a partir da foto real e envie para aprovação.' },
  { icon: Factory, title: 'Orce e produza', text: 'Materiais, ferragens, orçamento e plano de corte a partir do mesmo projeto.' },
];

const FEATURES = [
  ['Medidas e ambiente', 'Trabalhe com medidas informadas, fotos e plantas sem inventar o que não foi validado.'],
  ['Visual do projeto', 'Render a partir da foto do ambiente para o cliente enxergar a proposta.'],
  ['Documentação técnica', 'Plantas, vistas, cortes e cotas a partir do modelo do projeto.'],
  ['Orçamento', 'Leve medidas, materiais e decisões do projeto direto para o orçamento.'],
  ['Produção', 'Organize materiais, ferragens, plano de corte e informações para a oficina.'],
  ['Revisão do cliente', 'Envie um link para aprovar ou pedir alterações antes de liberar a produção.'],
];

const FAQS = [
  ['Preciso começar com uma imagem?', 'Não. Para criar projeto, orçamento e documentação, você pode começar pelas medidas e informações do trabalho. Para gerar um render, envie uma foto do ambiente ou uma referência visual.'],
  ['O Marcenapp muda meu jeito de trabalhar?', 'Não. O projeto continua sendo seu. O sistema organiza informações e acelera tarefas sem tirar de você as decisões do trabalho.'],
  ['Posso usar só uma parte do Marcenapp?', 'Sim. As capacidades são conectadas, mas você pode usar documentação, orçamento, produção, render ou outras etapas conforme a necessidade do projeto.'],
  ['Como funcionam os créditos?', 'Algumas operações de processamento consomem créditos. Você pode comprar avulso ou usar a franquia de um plano mensal.'],
];

const eyebrow = 'text-xs font-black uppercase tracking-[.2em] text-primary';
const h2 = 'mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl text-balance';
const primaryBtn = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-foreground px-7 py-3 font-black text-background transition-colors hover:bg-foreground/90 active:bg-foreground/80';

export default function LandingV2() {
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [faq, setFaq] = useState<number | null>(null);
  const [pricingState, setPricingState] = useState<'loading' | 'ready' | 'error'>('loading');

  const signup = () => navigate('/perfil-profissional');
  const login = () => navigate('/perfil-profissional?mode=login');
  const buy = (code: string) => navigate(`/auth?purchase=${encodeURIComponent(code)}`);

  useEffect(() => {
    void Promise.all([
      supabase.from('billing_plans').select('id,code,name,description,monthly_price_cents,features').eq('status', 'active').order('sort_order'),
      supabase.from('billing_credit_products').select('id,code,name,description,credits,price_cents').eq('status', 'active').order('sort_order'),
    ]).then(([a, b]) => {
      setPlans((a.data ?? []) as Plan[]);
      setProducts((b.data ?? []) as Product[]);
      setPricingState(a.error && b.error ? 'error' : 'ready');
    }).catch(() => setPricingState('error'));
  }, []);

  const noPricing = pricingState !== 'ready' || (products.length === 0 && plans.length === 0);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-background focus:px-4 focus:py-3 focus:font-bold">Pular para o conteúdo</a>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-5 lg:px-8">
          <a href="#topo" aria-label="Marcenapp, voltar ao topo" className="flex min-h-11 items-center gap-3 rounded-xl">
            <img src={logo} alt="" aria-hidden="true" width={36} height={36} className="h-9 w-9 rounded-xl" />
            <span className="font-black tracking-tight">MARCENAPP</span>
          </a>
          <nav aria-label="Principal" className="hidden items-center gap-6 md:flex">
            {NAV.map(([id, label]) => <a key={id} href={`#${id}`} className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">{label}</a>)}
            <button type="button" onClick={login} className="min-h-11 rounded-xl px-3 text-sm font-bold hover:bg-muted">Entrar</button>
            <button type="button" onClick={signup} className="min-h-11 rounded-xl bg-foreground px-5 text-sm font-black text-background hover:bg-foreground/90">Começar agora</button>
          </nav>
          <button type="button" onClick={() => setMenu(!menu)} className="inline-flex h-11 w-11 items-center justify-center rounded-xl hover:bg-muted md:hidden" aria-expanded={menu} aria-controls="menu-mobile" aria-label={menu ? 'Fechar menu' : 'Abrir menu'}>
            {menu ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
        {menu && (
          <nav id="menu-mobile" aria-label="Menu" className="border-t border-border bg-background px-4 py-3 md:hidden">
            <div className="flex flex-col gap-1">
              {NAV.map(([id, label]) => <a key={id} href={`#${id}`} onClick={() => setMenu(false)} className="flex min-h-11 items-center rounded-xl px-3 font-semibold text-foreground hover:bg-muted">{label}</a>)}
              <button type="button" onClick={login} className="min-h-11 rounded-xl px-3 text-left font-semibold hover:bg-muted">Entrar</button>
            </div>
          </nav>
        )}
      </header>

      <main id="conteudo">
        <section id="topo" aria-labelledby="hero-title" className="overflow-hidden bg-background px-4 pb-16 pt-28 sm:px-5 lg:px-8 lg:pb-24 lg:pt-36">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[.9fr_1.1fr]">
            <div className="min-w-0">
              <p className={`mb-5 ${eyebrow}`}>Para marcenarias que projetam e produzem</p>
              <h1 id="hero-title" className="max-w-3xl text-4xl font-black leading-[1] tracking-[-.04em] text-balance sm:text-6xl lg:text-7xl">
                Do ambiente real <span className="text-primary">à produção.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
                Fotografe o ambiente, descreva o móvel e avance no mesmo projeto: visual para o cliente, documentação, orçamento e plano de corte para a oficina.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button type="button" onClick={signup} className={primaryBtn}>Começar agora <ArrowRight aria-hidden="true" size={18} /></button>
                <a href="#fluxo" className="inline-flex min-h-11 items-center justify-center rounded-2xl px-4 font-bold text-foreground underline-offset-4 hover:underline">Ver como funciona</a>
              </div>
              <p className="mt-5 text-sm font-semibold text-muted-foreground">Cadastro gratuito. Recursos de processamento usam créditos.</p>
            </div>
            <figure className="relative mx-auto w-full max-w-[640px]">
              <div className="overflow-hidden rounded-[28px] border border-border bg-muted shadow-[var(--shadow-popover)]">
                <img src="/landing/marcenapp-hero.svg" alt="Cozinha planejada em madeira com painel de projeto técnico sobreposto" className="block aspect-[14/9] h-auto w-full object-cover" width={1400} height={900} fetchPriority="high" decoding="async" />
              </div>
              <figcaption className="mt-3 text-right text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground">Projeto, materiais e execução no mesmo contexto.</figcaption>
            </figure>
          </div>
        </section>

        <section id="fluxo" aria-labelledby="fluxo-title" className="scroll-mt-16 bg-muted px-4 py-16 sm:px-5 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className={eyebrow}>Como funciona</p>
              <h2 id="fluxo-title" className={h2}>Você não recomeça o projeto a cada etapa.</h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">As informações ficam no projeto e seguem com você de uma etapa para a outra.</p>
            </div>
            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map(({ icon: Icon, title, text }, i) => (
                <li key={title} className="rounded-3xl border border-border bg-card p-6">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon aria-hidden="true" size={20} /></span>
                    <span className="text-xs font-black tracking-widest text-muted-foreground">0{i + 1}</span>
                  </div>
                  <h3 className="mt-6 text-lg font-black">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="recursos" aria-labelledby="recursos-title" className="scroll-mt-16 bg-background px-4 py-16 sm:px-5 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <p className={eyebrow}>Feito para a rotina real</p>
                <h2 id="recursos-title" className={h2}>Menos trabalho repetido. Mais informação aproveitável.</h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-muted-foreground">Use somente o que a obra precisa. O restante pode entrar depois, sem perder o contexto.</p>
            </div>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(([title, text]) => (
                <li key={title} className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
                  <h3 className="text-lg font-black">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="valores" aria-labelledby="valores-title" className="scroll-mt-16 bg-inverse px-4 py-16 text-inverse-foreground sm:px-5 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[.2em] text-inverse-accent">Valores</p>
              <h2 id="valores-title" className="mt-3 text-3xl font-black tracking-tight text-balance sm:text-4xl">Use a capacidade que fizer sentido para a obra.</h2>
              <p className="mt-4 text-base leading-7 text-inverse-muted">Sem obrigar sua marcenaria a comprar um fluxo fechado.</p>
            </div>
            {noPricing && (
              <div role="status" aria-live="polite" className="mt-10 rounded-3xl border border-inverse-foreground/15 bg-inverse-foreground/5 p-6 text-sm text-inverse-muted">
                {pricingState === 'loading' ? 'Carregando valores…' : (
                  <>Não foi possível carregar os valores agora. <button type="button" onClick={signup} className="min-h-11 font-bold text-inverse-foreground underline underline-offset-4">Crie sua conta gratuita</button> para ver os planos disponíveis.</>
                )}
              </div>
            )}
            {products.length > 0 && (
              <div className="mt-10 grid gap-4 md:grid-cols-3">
                {products.slice(0, 3).map(p => (
                  <article key={p.id} className="flex flex-col rounded-3xl border border-inverse-foreground/15 bg-inverse-foreground/5 p-6">
                    <p className="text-xs font-black uppercase tracking-widest text-inverse-accent">Compra avulsa</p>
                    <h3 className="mt-3 text-xl font-black">{p.name}</h3>
                    <p className="mt-2 flex-1 text-sm leading-6 text-inverse-muted">{p.description}</p>
                    <div className="mt-6 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-2xl font-black">{money(p.price_cents)}</p>
                        <p className="text-xs text-inverse-muted">{p.credits} {p.credits === 1 ? 'crédito' : 'créditos'}</p>
                      </div>
                      <button type="button" onClick={() => buy(p.code)} className="min-h-11 rounded-xl bg-inverse-foreground px-4 text-sm font-black text-inverse hover:bg-inverse-foreground/90">Comprar</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
            {plans.length > 0 && (
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {plans.slice(0, 3).map(p => (
                  <article key={p.id} className="flex flex-col rounded-3xl border border-inverse-foreground/15 p-6">
                    <p className="text-xs font-black uppercase tracking-widest text-inverse-muted">Plano mensal</p>
                    <h3 className="mt-2 text-xl font-black">{p.name.replace('MARCENAPP ', '')}</h3>
                    <p className="mt-5 text-2xl font-black">{money(p.monthly_price_cents)}<span className="text-xs font-bold text-inverse-muted">/mês</span></p>
                    <p className="mt-3 flex-1 text-sm leading-6 text-inverse-muted">{p.description}</p>
                    <button type="button" onClick={() => buy(p.code)} className="mt-6 min-h-11 w-full rounded-xl border border-inverse-foreground/25 px-4 text-sm font-black hover:bg-inverse-foreground/10">Escolher plano</button>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section id="duvidas" aria-labelledby="duvidas-title" className="scroll-mt-16 bg-background px-4 py-16 sm:px-5 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-4xl">
            <p className={eyebrow}>Dúvidas</p>
            <h2 id="duvidas-title" className={h2}>Antes de começar</h2>
            <div className="mt-8 divide-y divide-border rounded-3xl border border-border bg-card">
              {FAQS.map(([q, a], i) => (
                <div key={q}>
                  <h3>
                    <button type="button" id={`faq-btn-${i}`} aria-expanded={faq === i} aria-controls={`faq-${i}`} onClick={() => setFaq(faq === i ? null : i)} className="flex min-h-11 w-full items-center justify-between gap-5 rounded-3xl px-6 py-5 text-left font-black hover:bg-muted/60">
                      <span>{q}</span>
                      <ChevronDown aria-hidden="true" size={18} className={`shrink-0 transition-transform ${faq === i ? 'rotate-180' : ''}`} />
                    </button>
                  </h3>
                  {faq === i && <p id={`faq-${i}`} role="region" aria-labelledby={`faq-btn-${i}`} className="px-6 pb-5 text-sm leading-7 text-muted-foreground">{a}</p>}
                </div>
              ))}
            </div>
            <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-border bg-muted p-6">
              <p className="font-bold">Pronto para levar a próxima obra do ambiente à produção?</p>
              <button type="button" onClick={signup} className={primaryBtn}>Começar agora <ArrowRight aria-hidden="true" size={18} /></button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-background px-4 py-8 sm:px-5">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <img src={logo} alt="" aria-hidden="true" width={24} height={24} className="h-6 w-6 rounded-lg" />
            <span className="font-black text-foreground">MARCENAPP</span>
          </div>
          <nav aria-label="Rodapé" className="flex flex-wrap gap-x-5">
            {NAV.map(([id, label]) => <a key={id} href={`#${id}`} className="inline-flex min-h-11 items-center hover:text-foreground">{label}</a>)}
            <button type="button" onClick={login} className="min-h-11 hover:text-foreground">Entrar</button>
          </nav>
          <span>Do ambiente real à produção.</span>
        </div>
      </footer>
    </div>
  );
}
