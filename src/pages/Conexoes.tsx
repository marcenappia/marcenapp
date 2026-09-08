import { Bot, Boxes, Cable, Factory, PackageSearch, ShoppingCart, Truck } from 'lucide-react';

const items = [
  ['Distribuidores de MDF e materiais', 'Estoque, preços e disponibilidade de chapas, ferragens e acessórios.', Factory],
  ['Compra inteligente', 'A IARA poderá identificar faltas de material e preparar a compra.', ShoppingCart],
  ['Plano de corte conectado', 'Enviar necessidades de corte para fornecedores e parceiros.', PackageSearch],
  ['Logística', 'Cotação, coleta, entrega e rastreio de materiais e pedidos.', Truck],
  ['Marketplace de sobras', 'Compra e venda de sobras de MDF entre marceneiros próximos.', Boxes],
  ['IA e automações', 'Conectar a IARA a serviços que executam tarefas da operação.', Bot],
] as const;

export default function Conexoes() {
  return <div className="min-h-screen bg-slate-50 px-5 py-10"><div className="max-w-4xl mx-auto"><div className="flex items-center gap-3"><Cable className="text-indigo-600"/><div><p className="text-xs font-black uppercase tracking-[.18em] text-indigo-600">Ecossistema MARCENAPP</p><h1 className="text-3xl font-black text-slate-900">Conexões</h1></div></div><p className="mt-4 text-slate-500 max-w-2xl">Estrutura preparada para conectar fornecedores, compras, logística, IA e um marketplace regional de sobras. Nada aqui está conectado ainda.</p><div className="grid md:grid-cols-2 gap-4 mt-8">{items.map(([title,text,Icon]) => <article key={title} className="bg-white border border-slate-200 rounded-2xl p-5"><div className="flex items-center justify-between"><div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Icon size={19}/></div><span className="text-[9px] font-black uppercase tracking-wide rounded-full bg-amber-100 text-amber-700 px-2 py-1">Em breve</span></div><h2 className="mt-4 font-extrabold text-slate-900">{title}</h2><p className="mt-2 text-sm text-slate-500 leading-relaxed">{text}</p></article>)}</div></div></div>;
}
