import { ArrowRight, Check, ShoppingBag, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const plans = [
  { name: 'Start', slug: 'start', price: '79', description: 'Para começar a tirar trabalho operacional das costas.', features: ['Jornada da obra', 'Diário digital', 'Estúdio', 'Orçamentos', 'IARA com uso controlado'] },
  { name: 'Pro', slug: 'pro', price: '179', description: 'Para marcenarias que querem vender e entregar com mais velocidade.', featured: true, features: ['Tudo do Start', 'Produção e plano de corte', 'Mais uso de IA', 'Memória operacional da obra', 'Prioridade nas melhorias'] },
  { name: 'Business', slug: 'business', price: '349', description: 'Para equipes e operações com maior volume.', features: ['Tudo do Pro', 'Maior capacidade de IA', 'Visão administrativa', 'Indicadores operacionais', 'Suporte prioritário'] },
] as Array<{ name: string; slug: string; price: string; description: string; featured?: boolean; features: readonly string[] }>;

export default function Planos() {
  const navigate = useNavigate();
  return (
    <main className="min-h-screen bg-[#f7f5f1] px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mx-auto max-w-3xl text-center"><Link to="/" className="text-sm font-black tracking-tight text-orange-600">MARCENAPP</Link><div className="mt-8 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700"><Sparkles size={14} /> Planos para a sua marcenaria</div><h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">Você vende. O MARCENAPP organiza o resto.</h1><p className="mt-4 text-base leading-7 text-slate-500">Escolha o plano, teste por 7 dias e avance para a assinatura quando estiver pronto.</p></header>
        <section className="mt-10 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => <article key={plan.name} className={`relative rounded-3xl border bg-white p-6 shadow-sm ${plan.featured ? 'border-orange-400 ring-2 ring-orange-100' : 'border-slate-200'}`}>
            {plan.featured && <span className="absolute -top-3 left-6 rounded-full bg-[#f4a640] px-3 py-1 text-xs font-black">MAIS ESCOLHIDO</span>}
            <h2 className="text-xl font-black">{plan.name}</h2><p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">{plan.description}</p>
            <div className="mt-5 flex items-end gap-1"><span className="text-sm font-bold text-slate-500">R$</span><span className="text-4xl font-black">{plan.price}</span><span className="pb-1 text-sm text-slate-500">/mês</span></div><p className="mt-2 text-xs font-bold text-emerald-700">7 dias grátis · primeira cobrança após o teste</p>
            <button type="button" onClick={() => navigate(`/auth?plan=${plan.slug}`)} className={`mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black ${plan.featured ? 'bg-[#f4a640] text-[#15100a] hover:bg-[#ffb75a]' : 'border border-slate-200 bg-white text-slate-800 hover:border-orange-300 hover:text-orange-700'}`}>Começar teste grátis <ArrowRight size={16} /></button>
            <ul className="mt-6 space-y-3 border-t border-slate-100 pt-5">{plan.features.map((feature) => <li key={feature} className="flex items-start gap-2 text-sm text-slate-600"><Check size={17} className="mt-0.5 shrink-0 text-emerald-600" />{feature}</li>)}</ul>
          </article>)}
        </section>
        <section className="mx-auto mt-8 max-w-4xl rounded-2xl border border-orange-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-black text-slate-800">Não quer mensalidade?</p><p className="mt-1 text-xs leading-5 text-slate-500">Compre só a ferramenta que precisar: imagem, contrato, plano de corte ou MARCENA.</p></div><Link to="/loja" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white hover:bg-slate-800"><ShoppingBag size={16} /> Comprar avulso</Link></div></section>
        <section className="mx-auto mt-4 max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm"><p className="text-sm font-bold text-slate-800">7 dias para testar · sem pagamento obrigatório</p><p className="mt-1 text-xs leading-5 text-slate-500">A assinatura recorrente é criada no Asaas somente quando você decidir contratar.</p></section>
        <footer className="mt-8 text-center"><Link to="/" className="text-sm font-bold text-orange-600 hover:text-orange-700">Voltar ao MARCENAPP</Link></footer>
      </div>
    </main>
  );
}
