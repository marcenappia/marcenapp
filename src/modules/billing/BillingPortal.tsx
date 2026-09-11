import { useEffect, useState } from 'react';
import { CreditCard, Sparkles, WalletCards, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Plan { id: string; code: string; name: string; description: string | null; monthly_price_cents: number | null; status: string; }
interface Product { id: string; code: string; name: string; description: string | null; operation_type: string; credit_type: string; credits: number; price_cents: number | null; status: string; }
interface Wallet { image_credits: number; contract_credits: number; cut_plan_credits: number; marcena_credits: number; }

const money = (cents: number | null) => cents == null ? 'Preço a definir' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

const walletItems = [
  { key: 'image_credits', label: 'Render', description: 'créditos disponíveis' },
  { key: 'contract_credits', label: 'Contratos', description: 'créditos disponíveis' },
  { key: 'cut_plan_credits', label: 'Plano de corte', description: 'créditos disponíveis' },
  { key: 'marcena_credits', label: 'Marcenapp', description: 'créditos disponíveis' },
] as const;

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

  if (loading) {
    return (
      <section aria-label="Carregando informações de uso" className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse">
          <div className="h-3 w-24 rounded bg-slate-200" />
          <div className="mt-3 h-7 w-72 max-w-full rounded bg-slate-200" />
          <div className="mt-3 h-4 w-full max-w-2xl rounded bg-slate-100" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {walletItems.map(item => <div key={item.key} className="h-32 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse"><div className="h-3 w-28 rounded bg-slate-100" /><div className="mt-4 h-8 w-16 rounded bg-slate-200" /></div>)}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6" aria-labelledby="billing-title">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Uso do Marcenapp</p>
            <h2 id="billing-title" className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Planos e créditos</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 md:text-base">Acompanhe seus créditos e consulte as opções de uso disponíveis para o seu trabalho.</p>
          </div>
          <div className="hidden rounded-2xl bg-indigo-50 p-3 text-indigo-600 sm:block" aria-hidden="true"><CreditCard size={24} /></div>
        </div>
      </header>

      <section aria-labelledby="wallet-title">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <h3 id="wallet-title" className="text-base font-bold text-slate-900">Seus créditos</h3>
            <p className="mt-1 text-sm text-slate-500">Saldo disponível por tipo de uso.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {walletItems.map(item => {
            const value = wallet?.[item.key] ?? 0;
            return (
              <article key={item.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-center gap-2 text-slate-500"><WalletCards size={16} aria-hidden="true" /><span className="text-xs font-semibold uppercase tracking-wide">{item.label}</span></div>
                <strong className="mt-3 block text-3xl font-bold tracking-tight text-slate-900">{value}</strong>
                <p className="mt-1 text-xs text-slate-500">{item.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section aria-labelledby="plans-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-5 flex items-start gap-3">
            <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600" aria-hidden="true"><Sparkles size={18} /></div>
            <div><h3 id="plans-title" className="font-bold text-slate-900">Planos</h3><p className="mt-1 text-sm text-slate-500">Opções de assinatura publicadas no Marcenapp.</p></div>
          </div>
          {plans.length ? (
            <div className="space-y-3">
              {plans.map(plan => (
                <article key={plan.id} className="rounded-xl border border-slate-200 p-4 transition-colors hover:border-slate-300">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2"><h4 className="font-bold text-slate-900">{plan.name}</h4><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700"><CheckCircle2 size={12} aria-hidden="true" /> Ativo</span></div>
                    <span className="font-bold text-slate-900">{money(plan.monthly_price_cents)}<span className="ml-1 text-xs font-medium text-slate-500">/mês</span></span>
                  </div>
                  <p className="mt-2 text-sm leading-5 text-slate-600">{plan.description || 'Plano Marcenapp.'}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">Nenhum plano comercial está publicado ainda. Os preços aparecem aqui quando forem definidos oficialmente.</div>
          )}
        </section>

        <section aria-labelledby="products-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-5 flex items-start gap-3">
            <div className="rounded-xl bg-slate-100 p-2 text-slate-700" aria-hidden="true"><WalletCards size={18} /></div>
            <div><h3 id="products-title" className="font-bold text-slate-900">Créditos por ferramenta</h3><p className="mt-1 text-sm text-slate-500">Consulte os produtos de crédito publicados.</p></div>
          </div>
          {products.length ? (
            <div className="space-y-3">
              {products.map(product => (
                <article key={product.id} className="rounded-xl border border-slate-200 p-4 transition-colors hover:border-slate-300">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><h4 className="font-bold text-slate-900">{product.name}</h4><span className="font-bold text-slate-900">{money(product.price_cents)}</span></div>
                  <p className="mt-2 text-sm leading-5 text-slate-600">{product.description || `${product.credits} crédito(s) para ${product.operation_type}.`}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">Nenhum produto de crédito está publicado ainda. Não há preço inventado nesta tela.</div>
          )}
        </section>
      </div>

      <aside className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 text-sm leading-6 text-indigo-950">
        <strong className="font-bold">Transparência no uso.</strong> O custo de uma operação deve aparecer antes da execução. Valores e opções exibidos nesta tela vêm das configurações publicadas do sistema.
      </aside>
    </section>
  );
}
