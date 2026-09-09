import React, { useEffect, useMemo, useState } from 'react';
import { Users, Plus, Search, Pencil, Trash2, X, Save, Loader2 } from 'lucide-react';
import { Card, Button } from '@/components/marcenaria/shared';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Cliente {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  observacoes: string | null;
}

type FormState = Omit<Cliente, 'id'>;
const emptyForm: FormState = { nome: '', email: '', telefone: '', endereco: '', observacoes: '' };

const ClientesModule = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const loadClientes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clientes')
      .select('id, nome, email, telefone, endereco, observacoes')
      .order('nome', { ascending: true });
    if (error) {
      toast.error('Não foi possível carregar os clientes.');
      setClientes([]);
    } else {
      setClientes((data ?? []) as Cliente[]);
    }
    setLoading(false);
  };

  useEffect(() => { void loadClientes(); }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    if (!term) return clientes;
    return clientes.filter((cliente) => [cliente.nome, cliente.email, cliente.telefone]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase('pt-BR').includes(term)));
  }, [clientes, search]);

  const openNew = () => { setEditingId(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (cliente: Cliente) => {
    setEditingId(cliente.id);
    setForm({ nome: cliente.nome, email: cliente.email ?? '', telefone: cliente.telefone ?? '', endereco: cliente.endereco ?? '', observacoes: cliente.observacoes ?? '' });
    setShowForm(true);
  };
  const closeForm = () => { if (!saving) setShowForm(false); };

  const saveCliente = async (event: React.FormEvent) => {
    event.preventDefault();
    const nome = form.nome.trim();
    if (!nome) { toast.error('Informe o nome do cliente.'); return; }
    setSaving(true);
    const payload = {
      nome,
      email: form.email.trim() || null,
      telefone: form.telefone.trim() || null,
      endereco: form.endereco.trim() || null,
      observacoes: form.observacoes.trim() || null,
    };
    const result = editingId
      ? await supabase.from('clientes').update(payload).eq('id', editingId)
      : await supabase.from('clientes').insert(payload);
    setSaving(false);
    if (result.error) { toast.error('Não foi possível salvar o cliente.'); return; }
    toast.success(editingId ? 'Cliente atualizado.' : 'Cliente cadastrado.');
    setShowForm(false);
    await loadClientes();
  };

  const removeCliente = async (cliente: Cliente) => {
    const { count, error: countError } = await supabase.from('projects').select('id', { count: 'exact', head: true }).eq('cliente_id', cliente.id);
    if (countError) { toast.error('Não foi possível verificar os projetos vinculados.'); return; }
    if ((count ?? 0) > 0) { toast.error('Este cliente possui projetos vinculados. Desvincule-os antes de excluir.'); return; }
    if (!window.confirm(`Excluir o cliente “${cliente.nome}”?`)) return;
    const { error } = await supabase.from('clientes').delete().eq('id', cliente.id);
    if (error) { toast.error('Não foi possível excluir o cliente.'); return; }
    toast.success('Cliente excluído.');
    await loadClientes();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Users className="text-indigo-600" /> Gestão de Clientes</h2>
          <p className="text-slate-500">Organize sua base de contatos e histórico de projetos.</p>
        </div>
        <Button icon={Plus} onClick={openNew}>Novo Cliente</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} type="search" placeholder="Buscar por nome, e-mail ou telefone..." className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
      </div>

      {showForm && (
        <Card className="p-5 border-indigo-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800">{editingId ? 'Editar cliente' : 'Novo cliente'}</h3>
            <button type="button" onClick={closeForm} aria-label="Fechar formulário" className="p-2 rounded-lg hover:bg-slate-100"><X size={18} /></button>
          </div>
          <form onSubmit={saveCliente} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {([['nome','Nome *'],['email','E-mail'],['telefone','Telefone'],['endereco','Endereço']] as const).map(([key, label]) => (
              <label key={key} className="space-y-1 text-sm font-medium text-slate-700">
                {label}
                <input value={form[key]} onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))} required={key === 'nome'} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10" />
              </label>
            ))}
            <label className="md:col-span-2 space-y-1 text-sm font-medium text-slate-700">Observações<textarea value={form.observacoes} onChange={(e) => setForm((prev) => ({ ...prev, observacoes: e.target.value }))} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10" /></label>
            <div className="md:col-span-2 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={closeForm}>Cancelar</Button><Button type="submit" icon={saving ? Loader2 : Save} disabled={saving}>{saving ? 'Salvando…' : 'Salvar cliente'}</Button></div>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden">
        {loading ? <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-indigo-600" /></div> : filtered.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center space-y-4 border-dashed border-2 border-slate-200">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><Users size={32} /></div>
            <div><h3 className="text-lg font-semibold text-slate-700">{search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}</h3><p className="text-slate-500 max-w-xs mx-auto">{search ? 'Tente outro nome, e-mail ou telefone.' : 'Comece adicionando seu primeiro cliente.'}</p></div>
            {!search && <Button variant="secondary" onClick={openNew} icon={Plus}>Cadastrar cliente</Button>}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((cliente) => <div key={cliente.id} className="p-4 flex flex-col md:flex-row md:items-center gap-4 hover:bg-slate-50/70 transition-colors"><div className="w-11 h-11 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold shrink-0">{cliente.nome.charAt(0).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="font-semibold text-slate-800 truncate">{cliente.nome}</p><p className="text-sm text-slate-500 truncate">{cliente.email || cliente.telefone || 'Sem contato informado'}</p>{cliente.endereco && <p className="text-xs text-slate-400 truncate">{cliente.endereco}</p>}</div><div className="flex gap-2"><button type="button" onClick={() => openEdit(cliente)} aria-label={`Editar ${cliente.nome}`} className="p-2 rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"><Pencil size={17} /></button><button type="button" onClick={() => void removeCliente(cliente)} aria-label={`Excluir ${cliente.nome}`} className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 size={17} /></button></div></div>)}
          </div>
        )}
      </Card>
    </div>
  );
};

export default ClientesModule;
