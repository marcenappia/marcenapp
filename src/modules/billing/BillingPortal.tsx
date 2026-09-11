import { useEffect, useRef, useState } from 'react';
import { CreditCard, Sparkles, WalletCards, ArrowUpRight, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Plan { id: string; code: string; name: string; description: string | null; monthly_price_cents: number | null; status: string; }
interface Product { id: string; code: string; name: string; description: string | null; operation_type: string; credit_type: string; credits: number; price_cents: number | null; status: string; }
interface Wallet { image_credits: number; contract_credits: number; cut_plan_credits: number; marcena_credits: number; }

const money = (cents: number | null) => cents == null ? 'Preço a definir' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
const PURCHASEABLE = new Set(['marcena_essencial', 'marcena_profissional']);

export default function BillingPortal() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState('');
  const [message, setMessage] = useState('');
  const autoPurchaseStarted = useRef(false);

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

  useEffect(() => { void load(); }, []);

  const startPurchase = async (productKey: string) => {
    if (!PURCHASEABLE.has(productKey) || buying) return;
    setBuying(productKey);
    setMessage('Preparando sua compra…');
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error('Sua sessão expirou. Entre novamente para continuar a compra.');
      const { data: customers, error: customerListError } = await supabase.functions.invoke('asaas', { body: { action: 'list_customers' } });
      if (customerListError) throw customerListError;
      let customerId = customers?.data?.[0]?.id as string | undefined;
      if (!customerId) {
        const metadata = authData.user.user_metadata ?? {};
        const name = String(metadata.name ?? metadata.full_name ?? authData.user.email?.split('@')[0] ?? 'Cliente Marcenapp').trim();
        const { data: created, error: createCustomerError } = await supabase.functions.invoke('asaas', { body: { action: 'create_customer', name, email: authData.user.email ?? undefined } });
        if (createCustomerError) throw createCustomerError;
        customerId = created?.customer?.id as string | undefined;
      }
      if (!customerId) throw new Error('Não foi possível preparar o cliente no Asaas.');
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('asaas', { body: { action: 'create_product_payment', productKey, customerId, billingType: 'UNDEFINED' } });
      if (paymentError) throw paymentError;
      const invoiceUrl = paymentData?.payment?.invoiceUrl as string | undefined;
      if (!invoiceUrl) throw new Error('O Asaas não retornou o endereço de pagamento.');
      setMessage('Compra criada. Abrindo o pagamento seguro do Asaas…');
      window.location.assign(invoiceUrl);
    } catch (caught) {
      const detail = caught instanceof Error ? caught.message : 'Não foi possível iniciar a compra.';
      setMessage(detail.includes('Asaas') || detail.includes('sessão') ? detail : 'Não foi possível iniciar a compra. Verifique a configuração do pagamento e tente novamente.');
      setBuying('');
    }
  };

  useEffect(() => {
    if (loading || autoPurchaseStarted.current) return;
    const purchase = new URLSearchParams(window.location.search).get('purchase');
    if (!purchase || !PURCHASEABLE.has(purchase)) return;
    autoPurchaseStarted.current = true;
    void startPurchase(purchase);
  }, [loading, products]);

  if (loading) return <section className="rounded-2xl border bg-white p-6 shadow-sm">Carregando Central de Uso…</section>;

  return <section className="space-y-6">
    <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-xs font-black uppercase tracking-widest text-indigo-300">Marcenapp</p><h2 className="mt-1 text-2xl font-black">Planos e Central de Uso</h2><p className="mt-2 max-w-2xl text-sm text-slate-300">Escolha como comprar. O pagamento é concluído em uma página segura do Asaas e, depois da confirmação, os créditos ficam disponíveis na sua conta.</p></div>
        <CreditCard className="hidden sm:block text-indigo-300" size={32} />
      </div>
    </div>

    {message && <div className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-indigo-600" /><span>{message}</span></div>}

    <div className="grid gap-4 md:grid-cols-4">
      {[['Render', wallet?.image_credits ?? 0], ['Contratos', wallet?.contract_credits ?? 0], ['Plano de corte', wallet?.cut_plan_credits ?? 0], ['Marcenapp', wallet?.marcena_credits ?? 0]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-slate-500"><WalletCards size={16} /><span className="text-xs font-bold uppercase tracking-wide">{label}</span></div><strong className="mt-2 block text-3xl text-slate-800">{value}</strong><p className="text-xs text-slate-400">créditos disponíveis</p></div>)}
    </div>

    <div className="rounded-3xl border bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.18em] text-primary">Valores</p><h3 className="mt-1 text-2xl font-black text-slate-900">Compre quando precisar</h3><p className="mt-1 text-sm text-slate-500">Sem esconder o preço e sem transformar a compra em uma tela confusa.</p></div></div>
      <div className="grid gap-5 lg:grid-cols-2">
        {products.filter(product => PURCHASEABLE.has(product.code)).map(product => <article key={product.id} className={`rounded-2xl border p-5 ${product.code === 'marcena_profissional' ? 'border-primary/40 bg-primary/[0.03] shadow-lg shadow-primary/10' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-primary">{product.code === 'marcena_profissional' ? 'Mais completo' : 'Essencial'}</p><h4 className="mt-1 text-xl font-black text-slate-900">{product.name}</h4></div><span className="whitespace-nowrap text-2xl font-black text-slate-900">{money(product.price_cents)}</span></div>
          <p className="mt-3 text-sm leading-6 text-slate-600">{product.description}</p>
          <p className="mt-3 text-xs font-semibold text-slate-500">{product.credits} crédito{product.credits === 1 ? '' : 's'} Marcenapp</p>
          <button type="button" disabled={Boolean(buying)} onClick={() => void startPurchase(product.code)} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-black text-white shadow-lg shadow-primary/20 transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60"><span>{buying === product.code ? 'Preparando pagamento…' : 'Comprar agora'}</span>{buying === product.code ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpRight size={16} />}</button>
        </article>)}
      </div>
    </div>

    <div className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center gap-2 mb-4"><Sparkles size={18} className="text-indigo-600" /><h3 className="font-black text-slate-800">Planos recorrentes</h3></div>{plans.length ? <div className="space-y-3">{plans.map(plan => <article key={plan.id} className="rounded-xl border p-4"><div className="flex items-center justify-between gap-3"><h4 className="font-black">{plan.name}</h4><span className="font-bold">{money(plan.monthly_price_cents)}/mês</span></div><p className="mt-1 text-sm text-slate-500">{plan.description || 'Plano Marcenapp.'}</p></article>)}</div> : <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Os planos recorrentes ainda não foram publicados. A compra avulsa acima já está preparada para o fluxo Asaas.</div>}</div>
      <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center gap-2 mb-4"><WalletCards size={18} className="text-indigo-600" /><h3 className="font-black text-slate-800">Outras ferramentas</h3></div>{products.filter(product => !PURCHASEABLE.has(product.code)).length ? <div className="space-y-3">{products.filter(product => !PURCHASEABLE.has(product.code)).map(product => <article key={product.id} className="rounded-xl border p-4"><div className="flex items-center justify-between gap-3"><h4 className="font-bold">{product.name}</h4><span className="font-bold">{money(product.price_cents)}</span></div><p className="mt-1 text-sm text-slate-500">{product.description || `${product.credits} crédito(s) para ${product.operation_type}.`}</p><span className="mt-3 inline-flex text-xs font-bold text-slate-400">Disponibilidade comercial em breve</span></article>)}</div> : <p className="text-sm text-slate-500">Nenhum outro produto publicado.</p>}</div>
    </div>

    <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 text-sm text-indigo-900"><strong>Pagamento seguro:</strong> o Marcenapp cria a cobrança no servidor, abre a página de pagamento do Asaas e usa o Webhook para confirmar a compra antes de liberar os créditos.</div>
  </section>;
}
