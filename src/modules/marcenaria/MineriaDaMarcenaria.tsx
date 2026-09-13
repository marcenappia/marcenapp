import React, { useEffect, useMemo, useState } from 'react';
import { Boxes, Building2, FileUp, Package, Plus, Search, Store, Trash2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { extractMaterialsFromFile } from './dnaIngestion';
import { DNA_UPLOAD_ACCEPT, validateDnaUpload } from './uploadContract';

type Tab = 'materiais' | 'fornecedores' | 'estoque' | 'documentos';
interface Props { onClose?: () => void; }

export default function MinhaMarcenaria({ onClose }: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('materiais');
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [supplier, setSupplier] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');

  const table = useMemo(() => ({ materiais: 'marcenaria_materiais', fornecedores: 'marcenaria_fornecedores', estoque: 'marcenaria_estoque', documentos: 'marcenaria_documentos' }[tab]), [tab]);
  const title = { materiais: 'Materiais', fornecedores: 'Fornecedores', estoque: 'Estoque', documentos: 'Documentos de referência' }[tab];
  const description = { materiais: 'Materiais que sua marcenaria usa e compra.', fornecedores: 'Onde sua marcenaria costuma comprar.', estoque: 'O que você tem disponível agora.', documentos: 'PDFs, tabelas e arquivos que ensinam a IARA sobre sua operação.' }[tab];

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from(table).select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(200);
    setItems(data || []); setLoading(false);
  };
  useEffect(() => { void load(); }, [user, table]);

  const addItem = async () => {
    if (!user || !name.trim()) return;
    setLoading(true); setMessage('');
    const payload: Record<string, unknown> = { user_id: user.id };
    if (tab === 'materiais') Object.assign(payload, { nome: name.trim(), preco: price ? Number(price.replace(',', '.')) : null, fornecedor: supplier.trim() || null, origem: 'manual' });
    if (tab === 'fornecedores') Object.assign(payload, { nome: name.trim(), observacoes: supplier.trim() || null });
    if (tab === 'estoque') Object.assign(payload, { nome_item: name.trim(), quantidade: price ? Number(price.replace(',', '.')) : 0, unidade: 'un' });
    const { error } = await supabase.from(table).insert(payload);
    if (error) setMessage('Não foi possível salvar. Tente novamente.'); else { setName(''); setPrice(''); setSupplier(''); setShowAdd(false); await load(); }
    setLoading(false);
  };

  const uploadDocument = async () => {
    if (!user || !file) return;
    const validationError = validateDnaUpload(file);
    if (validationError) { setMessage(validationError); return; }
    setLoading(true); setMessage('Lendo o documento…');
    const path = `${user.id}/dna/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { error: uploadError } = await supabase.storage.from('obras').upload(path, file, { upsert: false, contentType: file.type });
    if (uploadError) { setMessage('Não foi possível enviar o arquivo.'); setLoading(false); return; }

    const { data: document, error: documentError } = await supabase.from('marcenaria_documentos').insert({ user_id: user.id, nome: file.name, tipo: file.type, storage_path: path, status: 'processando', metadata: { origem: 'minha_marcenaria' } }).select('id').single();
    if (documentError || !document) {
      await supabase.storage.from('obras').remove([path]);
      setMessage('Não foi possível registrar o documento.'); setLoading(false); return;
    }

    try {
      const extracted = await extractMaterialsFromFile(file);
      if (extracted.length) {
        const rows = extracted.map((material) => ({ user_id: user.id, nome: material.nome, categoria: material.categoria, unidade: material.unidade, espessura: material.espessura, preco: material.preco, fornecedor: material.fornecedor, ativo: true, origem: 'documento_ia', metadata: { documento_id: document.id, documento_nome: file.name } }));
        const { error: materialsError } = await supabase.from('marcenaria_materiais').insert(rows);
        if (materialsError) throw materialsError;
      }
      await supabase.from('marcenaria_documentos').update({ status: extracted.length ? 'processado' : 'sem_materiais', metadata: { origem: 'minha_marcenaria', materiais_extraidos: extracted.length } }).eq('id', document.id).eq('user_id', user.id);
      setMessage(extracted.length ? `Pronto. A IARA encontrou ${extracted.length} material(is) e adicionou à sua base.` : 'Documento recebido. Não encontrei materiais estruturados para adicionar automaticamente.');
      setFile(null);
      if (tab === 'materiais') await load();
    } catch (error) {
      await supabase.from('marcenaria_documentos').update({ status: 'erro', metadata: { origem: 'minha_marcenaria', erro: error instanceof Error ? error.message : 'falha_na_leitura' } }).eq('id', document.id).eq('user_id', user.id);
      setMessage('Recebi o documento, mas não consegui estruturá-lo agora. Você pode tentar novamente.');
    } finally { setLoading(false); }
  };

  const remove = async (id: string) => { if (!window.confirm('Remover este item da sua base?')) return; await supabase.from(table).delete().eq('id', id).eq('user_id', user?.id); await load(); };
  const filtered = items.filter(item => JSON.stringify(item).toLowerCase().includes(query.toLowerCase()));
  if (!user) return null;

  return <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
    <div className="border-b border-slate-100 p-5 md:p-6">
      <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-600"><Building2 size={15}/> Minha Marcenaria</div><h2 className="mt-1 text-xl md:text-2xl font-black text-slate-900">Seu DNA operacional</h2><p className="mt-1 max-w-2xl text-sm text-slate-500">Cadastre ou envie as informações que sua marcenaria usa. A IARA consulta esta base para trabalhar do seu jeito.</p></div>{onClose && <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100" aria-label="Fechar"><X size={18}/></button>}</div>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">{([['materiais','Materiais',Boxes],['fornecedores','Fornecedores',Store],['estoque','Estoque',Package],['documentos','Documentos',FileUp]] as const).map(([id,label,Icon]) => <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm font-bold transition ${tab===id?'border-indigo-200 bg-indigo-50 text-indigo-700':'border-slate-200 text-slate-600 hover:bg-slate-50'}`}><Icon size={16}/>{label}</button>)}</div>
    </div>
    <div className="p-5 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-black text-slate-900">{title}</h3><p className="text-xs text-slate-500">{description}</p></div><div className="flex gap-2"><div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar" className="w-36 rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-300"/></div>{tab !== 'documentos' && <button onClick={()=>setShowAdd(true)} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-black text-white"><Plus size={16}/> Adicionar</button>}</div></div>
      {tab === 'documentos' && <div className="mt-4 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/50 p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black text-slate-900">Envie uma referência</p><p className="mt-1 text-xs text-slate-500">PDF, CSV, TXT, JPG, PNG ou WebP. Limite de 10 MB. A IARA lê o arquivo e estrutura apenas o que identificar.</p></div><label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white"><FileUp size={16}/> Escolher arquivo<input type="file" accept={DNA_UPLOAD_ACCEPT} className="hidden" onChange={e=>{ const selected=e.target.files?.[0] ?? null; setFile(selected); setMessage(selected ? (validateDnaUpload(selected) ?? '') : ''); }}/></label></div>{file && <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-white p-3 text-xs font-bold text-slate-700"><span className="truncate">{file.name}</span><button onClick={()=>void uploadDocument()} disabled={loading || !!validateDnaUpload(file)} className="rounded-lg bg-slate-900 px-3 py-2 text-white disabled:opacity-40">{loading?'Processando…':'Enviar para a IARA'}</button></div>}</div>}
      <div className="mt-4 space-y-2">{loading && !items.length ? <div className="py-10 text-center text-sm text-slate-400">Carregando…</div> : filtered.length ? filtered.map(item => <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{item.nome || item.nome_item}</p><p className="text-xs text-slate-500">{tab==='materiais' && item.preco != null ? `R$ ${Number(item.preco).toLocaleString('pt-BR',{minimumFractionDigits:2})}${item.fornecedor?' · '+item.fornecedor:''}` : tab==='estoque' ? `${item.quantidade ?? 0} ${item.unidade ?? 'un'}` : tab==='documentos' ? item.status : 'Cadastro da sua marcenaria'}</p></div><button onClick={()=>void remove(item.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500" aria-label="Remover"><Trash2 size={15}/></button></div>) : <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center"><p className="text-sm font-bold text-slate-700">Ainda não há {title.toLowerCase()}.</p><p className="mt-1 text-xs text-slate-400">Adicione manualmente ou envie uma referência.</p></div>}</div>
      {message && <p className="mt-3 text-xs font-semibold text-slate-500">{message}</p>}
    </div>
    {showAdd && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4"><div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><h3 className="font-black text-slate-900">Adicionar {title === 'Fornecedores' ? 'Fornecedor' : title === 'Estoque' ? 'item' : 'Material'}</h3><button onClick={()=>setShowAdd(false)}><X size={18}/></button></div><input autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder={tab==='estoque'?'Nome do item':'Nome'} className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-indigo-300"/>{tab==='materiais' && <><input value={price} onChange={e=>setPrice(e.target.value)} placeholder="Preço de referência (ex.: 189,90)" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none"/><input value={supplier} onChange={e=>setSupplier(e.target.value)} placeholder="Fornecedor (opcional)" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none"/></>}{tab==='estoque' && <input value={price} onChange={e=>setPrice(e.target.value)} placeholder="Quantidade" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none"/>}<button onClick={()=>void addItem()} disabled={!name.trim() || loading} className="mt-4 w-full rounded-xl bg-slate-900 py-3 text-sm font-black text-white disabled:opacity-40">Salvar</button></div></div>}
  </div>;
}
