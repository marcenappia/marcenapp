import { useEffect, useState } from 'react';
import { ArrowRight, Check, Image as ImageIcon, FileText, Scissors, Sparkles, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { createAsaasCustomer, createAsaasProductPayment, getAsaasWallet, type StoreProductKey } from '@/services/asaas';

const products: Array<{ key: StoreProductKey; name: string; price: number; description: string; creditLabel: string; icon: typeof ImageIcon; featured?: boolean }> = [
  { key: 'image_single', name: 'Imagem avulsa', price: 50, description: 'Uma visualização profissional para apresentar o móvel ao cliente.', creditLabel: '1 crédito de imagem', icon: ImageIcon, featured: true },
  { key: 'image_pack_5', name: 'Pacote 5 imagens', price: 199, description: 'Créditos para projetos que precisam de mais apresentações.', creditLabel: '5 créditos de imagem', icon: ImageIcon },
  { key: 'contract_single', name: 'Contrato avulso', price: 29.9, description: 'Gere um contrato sem precisar contratar um plano mensal.', creditLabel: '1 crédito de contrato', icon: FileText },
  { key: 'contract_pack_5', name: 'Pacote 5 contratos', price: 99, description: 'Para quem fecha obras de forma recorrente e quer pagar por uso.', creditLabel: '5 créditos de contrato', icon: FileText },
  { key: 'cut_plan_single', name: 'Plano de corte avulso', price: 39.9, description: 'Use o plano de corte profissional sem assinatura mensal.', creditLabel: '1 crédito de corte', icon: Scissors },
  { key: 'marcena_essencial', name: 'MARCENA Essencial', price: 29.9, description: 'Visualização comercial avulsa para uma necessidade específica.', creditLabel: '1 crédito MARCENA', icon: Sparkles },
  { key: 'marcena_profissional', name: 'MARCENA Profissional', price: 79.9, description: 'Pacote para apresentar uma proposta com mais força visual.', creditLabel: '3 créditos MARCENA', icon: Sparkles },
];

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Loja() {
  const { user, profile } = useAuth();
  const [wallet, setWallet] = useState({ image_credits: 0, contract_credits: 0, cut_plan_credits: 0, marcena_credits: 0 });
  const [busy, setBusy] = useState<StoreProductKey | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => { if (user) getAsaasWallet().then(result => setWallet(result.wallet)).catch(() => undefined); }, [user]);

  const buy = async (product: typeof products[number]) => {
    if (!user) return;
    setBusy(product.key); setMessage('');
    try {
      const { customer } = await createAsaasCustomer({ name: profile?.name || String(user.user_metadata?.name || 'Cliente MARCENAPP'), email: user.email || undefined, externalReference: `marcenapp:${user.id}` });
      const { payment } = await createAsaasProductPayment({ customerId: customer.id, productKey: product.key, billingType: 'UNDEFINED' });
      if (payment.invoiceUrl) window.open(payment.invoiceUrl, '_blank', 'noopener,noreferrer');
      setMessage(`Cobrança criada para ${product.name}. Os créditos entram automaticamente depois da confirmação do pagamento.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível criar a cobrança.'); }
    finally { setBusy(null); }
  };

  return (
    <main className="min-h-screen bg-[#f7f5f1] px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><Link to="/" className="text-sm font-black text-orange-600">MARCENAPP</Link><p className="mt-5 text-xs font-black uppercase tracking-[.18em] text-orange-600">Loja e créditos</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Pague só pelo que precisar.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">O marceneiro pequeno não precisa assumir uma mensalidade para cada ferramenta. Compre imagem, contrato, corte ou MARCENA quando houver demanda.</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400"><Wallet size={15} /> Seus créditos</div><div className="mt-2 grid grid-cols-4 gap-4 text-center"><div><b className="text-lg">{wallet.image_credits}</b><p className="text-[10px] text-slate-500">imagens</p></div><div><b className="text-lg">{wallet.contract_credits}</b><p className="text-[10px] text-slate-500">contratos</p></div><div><b className="text-lg">{wallet.cut_plan_credits}</b><p className="text-[10px] text-slate-500">cortes</p></div><div><b className="text-lg">{wallet.marcena_credits}</b><p className="text-[10px] text-slate-500">MARCENA</p></div></div></div>
        </header>
        {message && <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">{message}</div>}
        <section className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {products.map(product => { const Icon = product.icon; return <article key={product.key} className={`relative rounded-3xl border bg-white p-6 shadow-sm ${product.featured ? 'border-orange-400 ring-2 ring-orange-100' : 'border-slate-200'}`}>
            {product.featured && <span className="absolute -top-3 left-5 rounded-full bg-[#f4a640] px-3 py-1 text-[10px] font-black">MAIS DIRETO</span>}
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><Icon size={21} /></div>
            <h2 className="mt-5 text-xl font-black">{product.name}</h2><p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">{product.description}</p>
            <div className="mt-5 text-3xl font-black">{money(product.price)}</div><p className="mt-1 text-xs font-bold text-emerald-700">{product.creditLabel}</p>
            <button type="button" onClick={() => buy(product)} disabled={!user || busy !== null} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 font-black text-white hover:bg-slate-800 disabled:opacity-50">{busy === product.key ? 'Gerando cobrança…' : !user ? 'Entre para comprar' : 'Comprar agora'} <ArrowRight size={16} /></button>
            <ul className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500"><li className="flex gap-2"><Check size={15} className="shrink-0 text-emerald-600" />Pagamento avulso</li><li className="flex gap-2"><Check size={15} className="shrink-0 text-emerald-600" />Sem mensalidade obrigatória</li></ul>
          </article>; })}
        </section>
        <footer className="mt-10 flex flex-col gap-2 border-t border-slate-200 pt-5 text-xs text-slate-500 sm:flex-row sm:justify-between"><span>Pagamento avulso processado pelo Asaas.</span><Link to="/planos" className="font-bold text-orange-600">Ver planos mensais</Link></footer>
      </div>
    </main>
  );
}
