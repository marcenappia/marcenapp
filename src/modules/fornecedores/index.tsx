import React, { useEffect, useMemo, useState } from 'react';
import { Building2, ExternalLink, Factory, MapPin, Plus, Search, Store, Truck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type Supplier = {
  id: string; nome: string; tipo: string; site: string | null; contato: string | null;
  cidade: string | null; estado: string | null; observacoes: string | null; escopo: string;
};
type Material = {
  id: string; nome: string; fabricante: string | null; padrao: string | null; acabamento: string | null;
  espessura: number | null; largura_chapa: number | null; altura_chapa: number | null;
  sentido_veio: boolean; fornecedor_id: string | null; fonte_url: string | null; escopo: string;
};

const typeLabel: Record<string,string> = { distribuidor:'Distribuidor', fornecedor:'Fornecedor', fabricante:'Fabricante', loja:'Loja', regional:'Regional' };
const typeIcon = (tipo: string) => tipo === 'fabricante' ? Factory : tipo === 'distribuidor' ? Truck : Store;

export default function FornecedoresModule() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'fornecedores'|'materiais'>('fornecedores');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ nome:'', tipo:'fornecedor', site:'', cidade:'', estado:'', contato:'' });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [s, m] = await Promise.all([
        supabase.from('marcenaria_fornecedores').select('id,nome,tipo,site,contato,cidade,estado,observacoes,escopo').eq('ativo', true).order('nome'),
        supabase.from('marcenaria_materiais').select('id,nome,fabricante,padrao,acabamento,espessura,largura_chapa,altura_chapa,sentido_veio,fornecedor_id,fonte_url,escopo').eq('ativo', true).order('nome'),
      ]);
      if (!cancelled) {
        if (s.error) console.error('[fornecedores] suppliers load failed', s.error);
        if (m.error) console.error('[fornecedores] materials load failed', m.error);
        setSuppliers((s.data ?? []) as Supplier[]);
        setMaterials((m.data ?? []) as Material[]);
        setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [user?.id]);

  const filteredSuppliers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return suppliers.filter(s => !q || [s.nome,s.tipo,s.cidade,s.estado,s.observacoes].filter(Boolean).join(' ').toLowerCase().includes(q));
  }, [suppliers, query]);

  const filteredMaterials = useMemo(() => {
    const q = query.trim().toLowerCase();
    return materials.filter(m => !q || [m.nome,m.fabricante,m.padrao,m.acabamento,String(m.espessura)].filter(Boolean).join(' ').toLowerCase().includes(q));
  }, [materials, query]);

  const addSupplier = async () => {
    if (!user || !newSupplier.nome.trim()) return;
    const { data, error } = await supabase.from('marcenaria_fornecedores').insert({
      user_id: user.id, nome: newSupplier.nome.trim(), tipo: newSupplier.tipo, site: newSupplier.site.trim() || null,
      cidade: newSupplier.cidade.trim() || null, estado: newSupplier.estado.trim() || null, contato: newSupplier.contato.trim() || null,
      escopo: 'privado', ativo: true,
    }).select('id,nome,tipo,site,contato,cidade,estado,observacoes,escopo').single();
    if (error) { console.error('[fornecedores] create failed', error); return; }
    setSuppliers(prev => [...prev, data as Supplier].sort((a,b) => a.nome.localeCompare(b.nome)));
    setNewSupplier({ nome:'', tipo:'fornecedor', site:'', cidade:'', estado:'', contato:'' });
    setShowAdd(false);
  };

  return <div className="space-y-6 pb-20 md:pb-0">
    <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div><div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.18em] text-slate-400"><Building2 size={14}/> Suprimentos</div><h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Fornecedores e materiais</h1><p className="mt-1 max-w-2xl text-sm text-slate-500">Uma cadeia única para encontrar MDF, comparar opções locais e alimentar orçamento e plano de corte.</p></div>
      <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white"><Plus size={14}/> Cadastrar fornecedor local</button>
    </header>

    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4"><span className="text-[10px] font-black uppercase text-slate-400">Fornecedores</span><strong className="mt-1 block text-xl font-black text-slate-900">{suppliers.length}</strong></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4"><span className="text-[10px] font-black uppercase text-slate-400">Materiais MDF</span><strong className="mt-1 block text-xl font-black text-slate-900">{materials.length}</strong></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4"><span className="text-[10px] font-black uppercase text-slate-400">Catálogo</span><strong className="mt-1 block text-xl font-black text-slate-900">{suppliers.filter(s=>s.escopo==='catalogo').length}</strong></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4"><span className="text-[10px] font-black uppercase text-slate-400">Preço</span><strong className="mt-1 block text-sm font-black text-amber-700">Cotação local</strong></div>
    </div>

    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 md:flex-row md:items-center md:justify-between">
      <div className="flex gap-1.5"><button onClick={()=>setTab('fornecedores')} className={`rounded-xl px-4 py-2 text-xs font-black ${tab==='fornecedores'?'bg-slate-900 text-white':'bg-slate-100 text-slate-500'}`}>Fornecedores</button><button onClick={()=>setTab('materiais')} className={`rounded-xl px-4 py-2 text-xs font-black ${tab==='materiais'?'bg-slate-900 text-white':'bg-slate-100 text-slate-500'}`}>Banco de MDF</button></div>
      <label className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:w-80"><Search size={15} className="text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={tab==='fornecedores'?'Buscar fornecedor, cidade...':'Buscar MDF, padrão, espessura...'} className="min-w-0 flex-1 bg-transparent text-xs outline-none"/></label>
    </div>

    {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Carregando catálogo…</div> :
    tab === 'fornecedores' ? <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{filteredSuppliers.map(s => { const Icon=typeIcon(s.tipo); return <article key={s.id} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-start gap-3"><span className="rounded-xl bg-slate-100 p-2.5 text-slate-700"><Icon size={18}/></span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h2 className="truncate text-sm font-black text-slate-900">{s.nome}</h2>{s.escopo==='catalogo' && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-700">CATÁLOGO</span>}</div><p className="mt-1 text-[11px] font-bold text-slate-400">{typeLabel[s.tipo] ?? s.tipo}</p></div></div>{(s.cidade||s.estado)&&<p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500"><MapPin size={13}/>{[s.cidade,s.estado].filter(Boolean).join(' / ')}</p>}<div className="mt-4 flex gap-2">{s.site&&<a href={s.site} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-black text-slate-700">Site <ExternalLink size={12}/></a>}<span className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-800">Preço depende da cotação</span></div></article> })}</div> :
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400"><tr><th className="px-4 py-3">Material</th><th className="px-4 py-3">Fabricante</th><th className="px-4 py-3">Chapa</th><th className="px-4 py-3">Espessura</th><th className="px-4 py-3">Veio</th><th className="px-4 py-3">Fonte</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredMaterials.map(m=><tr key={m.id} className="text-xs text-slate-600"><td className="px-4 py-3 font-black text-slate-800">{m.nome}</td><td className="px-4 py-3">{m.fabricante||'—'}</td><td className="px-4 py-3">{m.largura_chapa} × {m.altura_chapa} mm</td><td className="px-4 py-3">{m.espessura} mm</td><td className="px-4 py-3">{m.sentido_veio?'Direcional':'Livre'}</td><td className="px-4 py-3">{m.fonte_url?<a href={m.fonte_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-indigo-600">Ficha <ExternalLink size={12}/></a>:'Catálogo'}</td></tr>)}</tbody></table></div></div>}
    {!loading && ((tab==='fornecedores' && filteredSuppliers.length===0)||(tab==='materiais' && filteredMaterials.length===0)) && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Nenhum resultado encontrado. Cadastre o fornecedor ou material que falta.</div>}

    {showAdd && <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm md:items-center md:p-4"><div className="w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-2xl md:rounded-3xl"><div className="flex items-center justify-between"><div><h3 className="text-base font-black text-slate-900">Novo fornecedor</h3><p className="mt-1 text-xs text-slate-500">Fornecedores locais entram no catálogo da sua marcenaria.</p></div><button onClick={()=>setShowAdd(false)} className="rounded-lg p-2 text-slate-400">×</button></div><div className="mt-5 grid gap-3 md:grid-cols-2"><input value={newSupplier.nome} onChange={e=>setNewSupplier({...newSupplier,nome:e.target.value})} placeholder="Nome" className="rounded-xl border border-slate-200 px-3 py-3 text-sm"/><select value={newSupplier.tipo} onChange={e=>setNewSupplier({...newSupplier,tipo:e.target.value})} className="rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="fornecedor">Fornecedor</option><option value="distribuidor">Distribuidor</option><option value="loja">Loja</option><option value="regional">Regional</option></select><input value={newSupplier.site} onChange={e=>setNewSupplier({...newSupplier,site:e.target.value})} placeholder="Site" className="rounded-xl border border-slate-200 px-3 py-3 text-sm"/><input value={newSupplier.contato} onChange={e=>setNewSupplier({...newSupplier,contato:e.target.value})} placeholder="Telefone / WhatsApp" className="rounded-xl border border-slate-200 px-3 py-3 text-sm"/><input value={newSupplier.cidade} onChange={e=>setNewSupplier({...newSupplier,cidade:e.target.value})} placeholder="Cidade" className="rounded-xl border border-slate-200 px-3 py-3 text-sm"/><input value={newSupplier.estado} onChange={e=>setNewSupplier({...newSupplier,estado:e.target.value})} placeholder="UF" maxLength={2} className="rounded-xl border border-slate-200 px-3 py-3 text-sm"/></div><div className="mt-5 flex gap-2"><button onClick={()=>setShowAdd(false)} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600">Cancelar</button><button onClick={addSupplier} disabled={!newSupplier.nome.trim()} className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white disabled:opacity-40">Salvar fornecedor</button></div></div></div>}
  </div>;
}
