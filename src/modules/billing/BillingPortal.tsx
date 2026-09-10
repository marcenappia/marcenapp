import { useEffect, useState } from 'react';
import { CreditCard, Sparkles, WalletCards, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Plan { id: string; code: string; name: string; description: string | null; monthly_price_cents: number | null; status: string; }
interface Product { id: string; code: string; name: string; description: string | null; operation_type: string; credit_type: string; credits: number; price_cents: number | null; status: string; }
interface Wallet { image_credits: number; contract_credits: number; cut_plan_credits: number; marcena_credits: number; }

const money = (cents: number | null) => cents == null ? 'Preço a definir' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

export default function BillingPortal() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: planRows }, { data: productRows }, { data: walletRow }] = await Promise.all([
        supabase.from('billing_plans').select('id,code,name,description,monthly_price_cents,status').eq('status', 'active').order('sort_order'),
        supabase.from('billing_credit_products').select('id,code,name,description,operation_type,credit_type,credits,price_cents,status').eq('status', 'active').order('sort_order'),
        supabase.from('billing_wallets').select('image_credits,contract_credits,cut_plan_credits,marcena_credits').maybeSingle(),
      ]);
      setPlans((planRows ?? []) as Plan[]);
      setProducts((productRows ?? []) as Product[]);
      setWallet((walletRow ?? null) as Wallet | null);
      setLoading(false);
    };
    void load();
  }, []);

  if (loading) return <section className="rounded-2xl border bg-white p-6 shadow-sm">Carregando Central de Uso…</section>;

  return <section className="space-y-6">
    <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-xs font-black uppercase tracking-widest text-indigo-300">Marcenaria 4.0</p><h2 className="mt-1 text-2xl font-black">Planos e Central de Uso</h2><p className="mt-2 max-w-2xl text-sm text-slate-300">Escolha entre assinatura e uso por créditos. Cada ferramenta pode ter sua própria regra de consumo.</p></div>
        <CreditCard className="hidden sm:block text-indigo-300" size={32} />
      </div>
    </div>

    <div className="grid gap-4 md:grid-cols-4">
      {[
        ['Render', wallet?.image_credits ?? 0], ['Contratos', wallet?.contract_credits ?? 0], ['Plano de corte', wallet?.cut_plan_credits ?? 0], ['Marcenapp', wallet?.marcena_credits ?? 0],
      ].map(([label, value]) => <div key={String(label)} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-slate-500"><WalletCards size={16} /><span className="text-xs font-bold uppercase tracking-wide">{label}</span></div><strong className="mt-2 block text-3xl text-slate-800">{value}</strong><p className="text-xs text-slate-400">créditos disponíveis</p></div>)}
    </div>

    <div className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center gap-2 mb-4"><Sparkles size={18} className="text-indigo-600" /><h3 className="font-black text-slate-800">Planos</h3></div>{plans.length ? <div className="space-y-3">{plans.map(plan => <article key={plan.id} className="rounded-xl border p-4"><div className="flex items-center justify-between gap-3"><h4 className="font-black">{plan.name}</h4><span className="font-bold">{money(plan.monthly_price_cents)}/mês</span></div><p className="mt-1 text-sm text-slate-500">{plan.description || 'Plano Marcenapp.'}</p><button type="button" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white">Conhecer plano <ArrowUpRight size={14} /></button></article>)}</div> : <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Nenhum plano comercial está publicado ainda. A estrutura já está preparada; os preços só entram quando forem definidos oficialmente.</div>}</div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center gap-2 mb-4"><WalletCards size={18} className="text-indigo-600" /><h3 className="font-black text-slate-800">Créditos por ferramenta</h3></div>{products.length ? <div className="space-y-3">{products.map(product => <article key={product.id} className="rounded-xl border p-4"><div className="flex items-center justify-between gap-3"><h4 className="font-bold">{product.name}</h4><span className="font-bold">{money(product.price_cents)}</span></div><p className="mt-1 text-sm text-slate-500">{product.description || `${product.credits} crédito(s) para ${product.operation_type}.`}</p><button type="button" className="mt-4 inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700">Comprar quando publicado <ArrowUpRight size={14} /></button></article>)}</div> : <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Nenhum produto de crédito está publicado ainda. Não há preço inventado nesta tela.</div>}</div>
    </div>

    <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 text-sm text-indigo-900"><strong>Regra do Marcenapp:</strong> o custo de uma operação deve aparecer antes da execução. Assinatura e créditos são independentes para que você possa contratar somente o que realmente precisa.</div>
  </section>;
}
