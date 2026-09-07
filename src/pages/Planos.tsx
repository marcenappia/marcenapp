import { Link } from 'react-router-dom';
import { ArrowRight, Check, Sparkles } from 'lucide-react';

const plans = [
  {
    name: 'Start', price: '79', description: 'Para começar a tirar trabalho operacional das costas.', features: ['Jornada da obra', 'Diário digital', 'Estúdio', 'Orçamentos', 'IARA com uso controlado'],
  },
  {
    name: 'Pro', price: '179', description: 'Para marcenarias que querem vender e entregar com mais velocidade.', featured: true, features: ['Tudo do Start', 'Produção e plano de corte', 'Mais uso de IA', 'Memória operacional da obra', 'Prioridade nas melhorias'],
  },
  {
    name: 'Business', price: '349', description: 'Para equipes e operações com maior volume.', features: ['Tudo do Pro', 'Maior capacidade de IA', 'Visão administrativa', 'Indicadores operacionais', 'Suporte prioritário'],
  },
];

export default function Planos() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mx-auto max-w-3xl text-center">
          <Link to="/" className="text-sm font-black tracking-tight text-indigo-600">MARCENAPP</Link>
          <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700"><Sparkles size={14} /> Planos simples para a sua marcenaria</div>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Você vende. O MARCENAPP cuida do resto.</h1>
          <p className="mt-4 text-base leading-7 text-slate-500">Da foto do ambiente à produção, a IARA organiza o caminho para você perder menos tempo com tarefas operacionais.</p>
        </header>

        <section className="mt-10 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.name} className={`relative rounded-3xl border bg-white p-6 shadow-sm ${plan.featured ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-200'}`}>
              {plan.featured && <span className="absolute -top-3 left-6 rounded-full bg-indigo-600 px-3 py-1 text-xs font-black text-white">MAIS ESCOLHIDO</span>}
              <h2 className="text-xl font-black text-slate-950">{plan.name}</h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">{plan.description}</p>
              <div className="mt-5 flex items-end gap-1"><span className="text-sm font-bold text-slate-500">R$</span><span className="text-4xl font-black text-slate-950">{plan.price}</span><span className="pb-1 text-sm text-slate-500">/mês</span></div>
              <button type="button" className={`mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black ${plan.featured ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'border border-slate-200 bg-white text-slate-800 hover:border-indigo-200 hover:text-indigo-700'}`} onClick={() => window.alert('Assinatura online será liberada quando o pagamento estiver conectado.')}>
                Começar teste grátis <ArrowRight size={16} />
              </button>
              <ul className="mt-6 space-y-3 border-t border-slate-100 pt-5">{plan.features.map((feature) => <li key={feature} className="flex items-start gap-2 text-sm text-slate-600"><Check size={17} className="mt-0.5 shrink-0 text-emerald-600" />{feature}</li>)}</ul>
            </article>
          ))}
        </section>

        <section className="mx-auto mt-8 max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
          <p className="text-sm font-bold text-slate-800">14 dias para testar · sem cartão de crédito</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Valores apresentados são a estrutura comercial inicial. A cobrança real será ativada somente após a integração de um gateway de pagamento.</p>
        </section>
        <footer className="mt-8 text-center"><Link to="/" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">Voltar ao MARCENAPP</Link></footer>
      </div>
    </main>
  );
}
