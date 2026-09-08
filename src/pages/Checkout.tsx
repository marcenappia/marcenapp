import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Loader2, ShieldCheck } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { createAsaasCustomer, createAsaasSubscription } from '@/services/asaas';

const plans = {
  start: { name: 'Start', price: 79 },
  pro: { name: 'Pro', price: 179 },
  business: { name: 'Business', price: 349 },
} as const;

type PlanKey = keyof typeof plans;

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function Checkout() {
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const planKey = (searchParams.get('plan') || 'pro') as PlanKey;
  const plan = plans[planKey] ?? plans.pro;
  const [billingType, setBillingType] = useState<'UNDEFINED' | 'PIX' | 'BOLETO'>('UNDEFINED');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const email = user?.email ?? '';
  const trialDate = useMemo(() => addDays(7), []);

  useEffect(() => {
    if (!authLoading && !user) navigate(`/auth?plan=${planKey}`, { replace: true });
    if (user) setName(String(user.user_metadata?.name ?? ''));
  }, [authLoading, user, navigate, planKey]);

  if (authLoading || !user) return <div className="min-h-screen bg-[#0b1015]" />;

  const handleActivate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const { customer } = await createAsaasCustomer({
        name: name.trim(),
        email,
        mobilePhone: phone || undefined,
        externalReference: `marcenapp:${user.id}`,
      });
      const { subscription } = await createAsaasSubscription({
        customerId: customer.id,
        value: plan.price,
        billingType,
        cycle: 'MONTHLY',
        nextDueDate: trialDate,
        description: `MARCENAPP ${plan.name} — teste de 7 dias`,
        externalReference: `marcenapp:${user.id}:${planKey}`,
      });
      setSuccess(`Plano ${plan.name} ativado. Sua primeira cobrança está programada para ${new Date(`${trialDate}T12:00:00`).toLocaleDateString('pt-BR')}. Código da assinatura: ${subscription.id}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível conectar ao Asaas agora.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0b1015] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_.8fr] lg:py-12">
        <section className="rounded-3xl border border-white/10 bg-white/[.04] p-7 shadow-2xl sm:p-9">
          <Link to="/" className="text-sm font-black text-[#f4a640]">MARCENAPP</Link>
          <p className="mt-8 text-xs font-black uppercase tracking-[.18em] text-orange-300">Contratação</p>
          <h1 className="mt-2 text-3xl font-black">Comece seu teste de 7 dias</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">A assinatura é criada no Asaas com a primeira cobrança somente após o período de teste.</p>
          <form onSubmit={handleActivate} className="mt-8 space-y-4">
            <div><label className="mb-1.5 block text-sm font-bold">Nome</label><input required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-orange-300" placeholder="Nome completo" /></div>
            <div><label className="mb-1.5 block text-sm font-bold">E-mail</label><input readOnly value={email} className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-slate-400" /></div>
            <div><label className="mb-1.5 block text-sm font-bold">WhatsApp <span className="font-normal text-slate-500">(opcional)</span></label><input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-orange-300" placeholder="(00) 00000-0000" /></div>
            <div><label className="mb-1.5 block text-sm font-bold">Forma de cobrança</label><select value={billingType} onChange={(e) => setBillingType(e.target.value as typeof billingType)} className="w-full rounded-xl border border-white/10 bg-[#151c24] px-4 py-3 text-white outline-none focus:border-orange-300"><option value="UNDEFINED">Escolher no Asaas</option><option value="PIX">PIX</option><option value="BOLETO">Boleto</option></select></div>
            {error && <div className="rounded-xl border border-red-400/20 bg-red-950/30 p-3 text-sm text-red-300">{error}</div>}
            {success && <div className="rounded-xl border border-emerald-400/20 bg-emerald-950/30 p-3 text-sm text-emerald-300">{success}</div>}
            <button disabled={loading || Boolean(success)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#f4a640] px-5 py-3.5 font-black text-[#15100a] disabled:opacity-60">{loading ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />} {loading ? 'Conectando ao Asaas...' : 'Ativar teste de 7 dias'}</button>
          </form>
        </section>

        <aside className="h-fit rounded-3xl border border-orange-300/20 bg-orange-300/[.07] p-7">
          <p className="text-xs font-black uppercase tracking-[.18em] text-orange-300">Resumo</p>
          <h2 className="mt-3 text-2xl font-black">Plano {plan.name}</h2>
          <div className="mt-5 flex items-end gap-1"><span className="text-sm font-bold text-slate-400">R$</span><span className="text-4xl font-black">{plan.price}</span><span className="pb-1 text-sm text-slate-400">/mês</span></div>
          <div className="my-6 h-px bg-white/10" />
          <ul className="space-y-3 text-sm text-slate-300"><li className="flex gap-2"><Check size={17} className="text-emerald-400" /> 7 dias grátis</li><li className="flex gap-2"><Check size={17} className="text-emerald-400" /> Primeira cobrança em {new Date(`${trialDate}T12:00:00`).toLocaleDateString('pt-BR')}</li><li className="flex gap-2"><ShieldCheck size={17} className="text-emerald-400" /> Cobrança processada pelo Asaas</li><li className="flex gap-2"><Check size={17} className="text-emerald-400" /> Assinatura mensal</li></ul>
          <p className="mt-7 text-xs leading-5 text-slate-500">A criação da assinatura não é confirmação de pagamento. O status financeiro será acompanhado pelos eventos do Asaas.</p>
        </aside>
      </div>
    </main>
  );
}
