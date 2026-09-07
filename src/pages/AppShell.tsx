import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Boxes, Cable, ChevronRight, Factory, Menu, PackageSearch, ShoppingCart, Truck, X } from 'lucide-react';
import Index from './Index';

const connections = [
  { title: 'Distribuidores de MDF e materiais', text: 'Consultar estoque, preço e disponibilidade de chapas e acessórios.', icon: Factory },
  { title: 'Compra inteligente de material', text: 'A IARA poderá sugerir e iniciar compras quando faltar material.', icon: ShoppingCart },
  { title: 'Plano de corte conectado', text: 'Levar o plano de corte direto para fornecedores e parceiros.', icon: PackageSearch },
  { title: 'Logística e entrega', text: 'Cotações, coleta, transporte e acompanhamento do pedido.', icon: Truck },
  { title: 'Marketplace de sobras', text: 'Oferecer e encontrar sobras de MDF entre marceneiros da região.', icon: Boxes },
  { title: 'Conexões de IA', text: 'Automatizar tarefas e decisões com a IARA em cada etapa.', icon: Bot },
];

const AppShell = () => {
  const [open, setOpen] = useState(false);
  return <div className="relative h-screen">
    <Index />
    <button aria-label="Abrir conexões" onClick={() => setOpen(true)} className="fixed top-20 right-4 md:right-8 z-[60] w-11 h-11 rounded-xl bg-slate-900 text-white shadow-xl border border-white/10 flex items-center justify-center hover:bg-indigo-600 transition"><Menu size={20}/></button>
    {open && <div className="fixed inset-0 z-[70] bg-slate-950/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-200 p-5 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-indigo-600">MARCENAPP</p><h2 className="text-xl font-black text-slate-900">Conexões</h2></div><button onClick={() => setOpen(false)} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center"><X size={18}/></button></div>
        <div className="p-5 space-y-3"><div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-4 mb-5"><div className="flex items-center gap-2 text-indigo-700 font-black"><Cable size={17}/> Ecossistema em construção</div><p className="mt-2 text-sm text-indigo-900/70">As conexões abaixo já ficam preparadas no MARCENAPP. Por enquanto estão apenas como <strong>Em breve</strong> — nenhuma integração externa foi ativada.</p></div>
          {connections.map(({title,text,icon:Icon}) => <div key={title} className="rounded-2xl border border-slate-200 p-4 flex gap-3"><div className="w-10 h-10 shrink-0 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center"><Icon size={19}/></div><div className="min-w-0 flex-1"><div className="flex items-start gap-2 justify-between"><h3 className="font-extrabold text-sm text-slate-900">{title}</h3><span className="shrink-0 text-[9px] font-black uppercase tracking-wide rounded-full bg-amber-100 text-amber-700 px-2 py-1">Em breve</span></div><p className="mt-1 text-xs leading-relaxed text-slate-500">{text}</p></div></div>)}
          <Link to="/planos" onClick={() => setOpen(false)} className="mt-4 flex items-center justify-between rounded-2xl bg-slate-900 text-white p-4"><div><p className="font-black text-sm">Ver planos do MARCENAPP</p><p className="text-xs text-slate-400">Prepare sua operação para o próximo nível.</p></div><ChevronRight size={18}/></Link>
        </div>
      </aside>
    </div>}
  </div>;
};

export default AppShell;
