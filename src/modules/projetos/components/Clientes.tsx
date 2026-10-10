import React, { useEffect, useMemo, useState } from 'react';
import { Users, Plus, Search, Pencil, Trash2, Loader2, X, Upload, MessageCircle, UserPlus, CheckCircle2 } from 'lucide-react';
import { Card, Button, Modal, InputGroup } from '@/components/marcenaria/shared';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Cliente {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  observacoes: string | null;
}

type FormData = Omit<Cliente, 'id'>;

const emptyForm: FormData = { nome: '', email: '', telefone: '', endereco: '', observacoes: '' };

const ClientesModule = () => {
  const { user } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<FormData>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<Array<{ nome: string; telefone: string; email: string | null }>>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [importResult, setImportResult] = useState('');
  
  const normalizePhone = (value: string) => value.replace(/[^0-9+]/g, '').replace(/^00/, '+').replace(/(?!^)\+/g, '');
  const whatsappUrl = (value: string) => {
    const digits = normalizePhone(value).replace(/^\+/, '');
    return digits ? `https://wa.me/${digits}` : null;
  };
  const parseVCard = (raw: string) => {
    const unfolded = raw.replace(/\r?\n[ \t]/g, '').replace(/\r/g, '');
    return unfolded.split(/BEGIN:VCARD/i).slice(1).map(block => {
      const get = (key: string) => {
        const line = block.split('\n').find(l => new RegExp(`^${key}(?:;[^:]*)?:`, 'i').test(l));
        return line?.split(':').slice(1).join(':').trim() || '';
      };
      const nome = get('FN') || get('N').replace(/;/g, ' ').trim();
      const telefone = get('TEL');
      const email = get('EMAIL');
      return nome && telefone ? { nome, telefone: normalizePhone(telefone), email: email || null } : null;
    }).filter((v): v is { nome: string; telefone: string; email: string | null } => Boolean(v));
  };
  const handleVCard = async (file: File) => {
    setError(''); setImportResult('');
    try {
      const preview = parseVCard(await file.text());
      if (!preview.length) throw new Error('Nenhum contato com nome e telefone foi encontrado no arquivo.');
      setImportPreview(preview);
      setImportOpen(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível ler o arquivo de contatos.'); }
  };
  const importContacts = async () => {
    if (!user || !importPreview.length) return;
    setImporting(true); setError('');
    try {
      const existingPhones = new Set(clientes.map(c => normalizePhone(c.telefone || '')).filter(Boolean));
      const unique = importPreview.filter(c => !existingPhones.has(c.telefone));
      if (!unique.length) { setImportResult('Todos os contatos selecionados já estão cadastrados.'); setImporting(false); return; }
      const { error: insertError } = await supabase.from('clientes').insert(unique.map(c => ({ user_id: user.id, nome: c.nome.trim(), telefone: c.telefone, email: c.email })));
      if (insertError) throw insertError;
      setImportResult(`${unique.length} contato(s) importado(s).`);
      setImportOpen(false); setImportPreview([]); await loadClientes();
    } catch { setError('Não foi possível importar os contatos.'); }
    finally { setImporting(false); }
  };

  const loadClientes = async () => {
    if (!user) { setClientes([]); setLoading(false); return; }
    setLoading(true);
    setError('');
    const { data, error: loadError } = await supabase
      .from('clientes')
      .select('id, nome, email, telefone, endereco, observacoes')
      .eq('user_id', user.id)
      .order('nome', { ascending: true });
    if (loadError) setError('Não foi possível carregar os clientes.');
    else setClientes((data || []) as Cliente[]);
    setLoading(false);
  };

  useEffect(() => { void loadClientes(); }, [user]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return clientes;
    return clientes.filter(c => [c.nome, c.email, c.telefone].some(v => (v || '').toLowerCase().includes(term)));
  }, [clientes, query]);

  const openNew = () => { setEditingId(null); setForm(emptyForm); setError(''); setOpen(true); };
  const openEdit = (cliente: Cliente) => {
    setEditingId(cliente.id);
    setForm({ nome: cliente.nome, email: cliente.email || '', telefone: cliente.telefone || '', endereco: cliente.endereco || '', observacoes: cliente.observacoes || '' });
    setError(''); setOpen(true);
  };

  const save = async () => {
    if (!user || !form.nome.trim()) { setError('Informe o nome do cliente.'); return; }
    setSaving(true); setError('');
    const payload = { nome: form.nome.trim(), email: form.email?.trim() || null, telefone: form.telefone?.trim() || null, endereco: form.endereco?.trim() || null, observacoes: form.observacoes?.trim() || null };
    const result = editingId
      ? await supabase.from('clientes').update(payload).eq('id', editingId).eq('user_id', user.id).select('id, nome, email, telefone, endereco, observacoes').single()
      : await supabase.from('clientes').insert({ ...payload, user_id: user.id }).select('id, nome, email, telefone, endereco, observacoes').single();
    if (result.error) setError('Não foi possível salvar o cliente.');
    else { setOpen(false); await loadClientes(); }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!user || !window.confirm('Excluir este cliente?')) return;
    const { error: deleteError } = await supabase.from('clientes').delete().eq('id', id).eq('user_id', user.id);
    if (deleteError) setError('Não foi possível excluir o cliente.');
    else await loadClientes();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">Clientes</h2>
          <p className="text-slate-500">Organize sua base de contatos e histórico de projetos.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50">
            <Upload size={15} /> Importar contatos
            <input type="file" accept=".vcf,text/vcard" className="sr-only" onChange={e => { const file = e.target.files?.[0]; if (file) void handleVCard(file); e.currentTarget.value = ''; }} />
          </label>
          <Button onClick={openNew}><UserPlus size={15} /> Novo cliente</Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por nome, e-mail ou telefone..." className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <Card className="p-12 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></Card>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(cliente => (
            <Card key={cliente.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><h3 className="font-bold text-slate-800 truncate">{cliente.nome}</h3><p className="text-sm text-slate-500 truncate">{cliente.telefone || cliente.email || 'Sem contato informado'}</p></div>
                <div className="flex gap-1">
                  {cliente.telefone && whatsappUrl(cliente.telefone) && <a href={whatsappUrl(cliente.telefone)!} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-600" aria-label={`Abrir WhatsApp de ${cliente.nome}`}><MessageCircle size={16} /></a>}
                  <button onClick={() => openEdit(cliente)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Editar cliente"><Pencil size={16} /></button><button onClick={() => remove(cliente.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-400" aria-label="Excluir cliente"><Trash2 size={16} /></button></div>
              </div>
              {cliente.email && <p className="mt-3 text-sm text-slate-600">{cliente.email}</p>}
              {cliente.endereco && <p className="mt-1 text-xs text-slate-400 line-clamp-2">{cliente.endereco}</p>}
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 flex flex-col items-center justify-center text-center space-y-4 border-dashed border-2">
          <div className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Clientes</div>
          <div><h3 className="text-lg font-semibold text-slate-700">{query ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}</h3><p className="text-slate-500 max-w-xs mx-auto">{query ? 'Tente outro nome, e-mail ou telefone.' : 'Comece adicionando seu primeiro cliente para vincular projetos e orçamentos.'}</p></div>
          {!query && <Button variant="secondary" onClick={openNew}>Adicionar Cliente</Button>}
        </Card>
      )}


      {importResult && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"><CheckCircle2 className="mr-2 inline-block" size={16} />{importResult}</div>}
      <Modal isOpen={importOpen} onClose={() => !importing && setImportOpen(false)} title="Revisar contatos" maxWidth="max-w-xl" footer={<Button onClick={() => void importContacts()} disabled={importing}>{importing ? <Loader2 className="animate-spin" size={16} /> : null}{importing ? 'Importando...' : `Importar ${importPreview.length} contato(s)`}</Button>}>
        <div className="space-y-3">
          <p className="text-sm text-slate-500">Os contatos são lidos no seu aparelho e só entram no Marcena depois desta confirmação. Nenhuma agenda é enviada para um serviço externo.</p>
          <div className="max-h-72 overflow-auto divide-y divide-slate-100 rounded-xl border border-slate-200">
            {importPreview.map((c, i) => <div key={`${c.telefone}-${i}`} className="flex items-center justify-between gap-3 px-3 py-2.5"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{c.nome}</p><p className="text-xs text-slate-500">{c.telefone}{c.email ? ` · ${c.email}` : ''}</p></div></div>)}
          </div>
        </div>
      </Modal>

      <Modal isOpen={open} onClose={() => !saving && setOpen(false)} title={editingId ? 'Editar Cliente' : 'Novo Cliente'} maxWidth="max-w-lg" footer={<Button onClick={save} disabled={saving}>{saving ? <Loader2 className="animate-spin" size={16} /> : null}{saving ? 'Salvando...' : 'Salvar Cliente'}</Button>}>
        <div className="space-y-4">
          <InputGroup label="Nome" type="text" value={form.nome} onChange={v => setForm({ ...form, nome: String(v) })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><InputGroup label="E-mail" type="email" value={form.email || ''} onChange={v => setForm({ ...form, email: String(v) })} /><InputGroup label="Telefone" type="text" value={form.telefone || ''} onChange={v => setForm({ ...form, telefone: String(v) })} /></div>
          <InputGroup label="Endereço" type="text" value={form.endereco || ''} onChange={v => setForm({ ...form, endereco: String(v) })} />
          <div><label className="text-sm font-medium text-slate-700">Observações</label><textarea value={form.observacoes || ''} onChange={e => setForm({ ...form, observacoes: e.target.value })} rows={4} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" /></div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </Modal>
    </div>
  );
};

export default ClientesModule;
