import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Boxes, Cable, ChevronRight, Factory, Menu, PackageSearch, ShoppingCart, Truck, X, FolderKanban, Presentation, ReceiptText, Hammer, Scissors } from 'lucide-react';
import Index from './Index';

const coreLinks = [
  { title: 'Projetos', to: '/app?module=dashboard', icon: FolderKanban },
  { title: 'MARCENA — apresentar projetos', to: '/app?module=studio', icon: Presentation },
  { title: 'Orçamento', to: '/app?module=orcamento', icon: ReceiptText },
  { title: 'Produção', to: '/app?module=producao', icon: Hammer },
  { title: 'Plano de Corte', to: '/app?module=corte', icon: Scissors },
];

const futureLinks = [
  { title: 'Fornecedores e distribuidores', text: 'Consultar estoque, preço e disponibilidade de materiais.', icon: Factory },
  { title: 'Materiais', text: 'Biblioteca e conexão futura com fornecedores.', icon: PackageSearch },
  { title: 'Logística', text: 'Cotações, coleta, transporte e acompanhamento.', icon: Truck },
  { title: 'Marketplace de sobras', text: 'Troca e reaproveitamento de sobras de MDF.', icon: Boxes },
  { title: 'Integrações de IA', text: 'Novas automações com a IARA.', icon: Bot },
  { title: 'Pagamentos', text: 'Cobranças e recebimentos integrados.', icon: ShoppingCart },
];

const AppShell = () => {
  const [open, setOpen] = useState(false);
  return <div className="relative h-screen">
    <style>{`\n      div.flex.h-screen > aside:first-of-type > div:first-child p { display:none !important; }\n      div.flex.h-screen > aside:first-of-type > div:first-child::after { content:'Marcenaria inteligente'; display:block; color:#94a3b8; font-size:10px; font-weight:400; letter-spacing:-0.02em; }\n      div.flex.h-screen main footer span:first-child { display:none !important; }\n      div.flex.h-screen main footer div::before { content:'MARCENAPP — Marcenaria inteligente'; font-weight:700; letter-spacing:.02em; color:#64748b; }\n    `}</style>
    <Index />
    <button aria-label="Abrir menu principal" onClick={() => setOpen(true)} className="fixed top-20 right-4 md:right-8 z-[60] w-11 h-11 rounded-xl bg-slate-900 text-white shadow-xl border border-white/10 flex items-center justify-center hover:bg-indigo-600 transition"><Menu size={20}/></button>
    {open && <div className="fixed inset-0 z-[70] bg-slate-950/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-200 p-5 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-indigo-600">MARCENAPP</p><h2 className="text-xl font-black text-slate-900">Menu principal</h2><p className="mt-1 text-xs text-slate-500">Marcenaria inteligente, do jeito simples.</p></div><button aria-label="Fechar menu principal" onClick={() => setOpen(false)} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center"><X size={18}/></button></div>
        <div className="p-5 space-y-2">
          <p className="px-1 pb-2 text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Agora</p>
          {coreLinks.map(({title,to,icon:Icon}) => <Link key={title} to={to} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-slate-800 transition hover:border-indigo-200 hover:bg-indigo-50"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700"><Icon size={18}/></span><span className="font-semibold text-sm">{title}</span><ChevronRight size={16} className="ml-auto text-slate-400"/></Link>)}
          <div className="pt-5"><p className="px-1 pb-2 text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Em breve</p><div className="space-y-2">{futureLinks.map(({title,text,icon:Icon}) => <div key={title} aria-disabled="true" className="flex gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3.5 opacity-80"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500"><Icon size={17}/></span><div className="min-w-0"><div className="flex items-center gap-2"><h3 className="font-semibold text-sm text-slate-700">{title}</h3><span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-amber-700">Em breve</span></div><p className="mt-0.5 text-xs leading-relaxed text-slate-500">{text}</p></div></div>)}</div></div>
          <Link to="/planos" onClick={() => setOpen(false)} className="mt-5 flex items-center justify-between rounded-2xl bg-slate-900 p-4 text-white"><div><p className="font-black text-sm">Planos do MARCENAPP</p><p className="text-xs text-slate-400">Evolua conforme sua marcenaria cresce.</p></div><ChevronRight size={18}/></Link>
        </div>
      </aside>
    </div>}
  </div>;
};

export default AppShell;
