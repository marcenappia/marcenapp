import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Calendar, Camera, Clock, ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import { Card, Button, Modal } from '@/components/marcenaria/shared';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Props { navigateTo?: (id: string) => void; }
interface Entry { id: string; texto: string; categoria: string | null; importante: boolean | null; created_at: string; }

const DiarioModule = ({ navigateTo }: Props) => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [text, setText] = useState('');
  const [category, setCategory] = useState('geral');
  const [important, setImportant] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!user) { setEntries([]); setLoading(false); return; }
    setLoading(true); setError('');
    const { data, error: loadError } = await supabase.from('diario_entradas').select('id, texto, categoria, importante, created_at').eq('user_id', user.id).order('created_at', { ascending: false });
    if (loadError) setError('Não foi possível carregar o diário.');
    else setEntries((data || []) as Entry[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [user]);

  const save = async () => {
    if (!user || !text.trim()) return;
    setSaving(true); setError('');
    const { error: saveError } = await supabase.from('diario_entradas').insert({ user_id: user.id, texto: text.trim(), categoria: category, importante: important });
    if (saveError) setError('Não foi possível salvar a atualização.');
    else { setText(''); setCategory('geral'); setImportant(false); setOpen(false); await load(); }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!user || !window.confirm('Excluir esta atualização?')) return;
    const { error: deleteError } = await supabase.from('diario_entradas').delete().eq('id', id).eq('user_id', user.id);
    if (deleteError) setError('Não foi possível excluir a atualização.');
    else await load();
  };

  const todayCount = useMemo(() => entries.filter(e => new Date(e.created_at).toDateString() === new Date().toDateString()).length, [entries]);
  const weekCount = useMemo(() => entries.filter(e => Date.now() - new Date(e.created_at).getTime() <= 7 * 86400000).length, [entries]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigateTo ? navigateTo('dashboard') : window.history.back()} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label="Voltar para a jornada"><ArrowLeft size={20} /></button>
        <div className="flex-1"><h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><BookOpen className="text-amber-600" /> Diário de Obra</h2><p className="text-slate-500">Acompanhe a evolução de cada montagem e instalação.</p></div>
        <Button variant="magic" icon={Camera} onClick={() => setOpen(true)}>Nova Atualização</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-blue-50 border-blue-100 flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Clock size={20} /></div><div><p className="text-xs text-blue-700 font-bold uppercase">Hoje</p><p className="text-sm font-medium">{todayCount} atualizações</p></div></Card>
        <Card className="p-4 bg-green-50 border-green-100 flex items-center gap-3"><div className="p-2 bg-green-100 rounded-lg text-green-600"><Calendar size={20} /></div><div><p className="text-xs text-green-700 font-bold uppercase">Últimos 7 dias</p><p className="text-sm font-medium">{weekCount} registros</p></div></Card>
        <Card className="p-4 bg-purple-50 border-purple-100 flex items-center gap-3"><div className="p-2 bg-purple-100 rounded-lg text-purple-600"><Camera size={20} /></div><div><p className="text-xs text-purple-700 font-bold uppercase">Registros</p><p className="text-sm font-medium">{entries.length} no total</p></div></Card>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {loading ? <Card className="p-12 flex justify-center"><Loader2 className="animate-spin text-indigo-600" /></Card> : entries.length ? (
        <div className="space-y-3">{entries.map(entry => <Card key={entry.id} className="p-5"><div className="flex justify-between gap-4"><div className="min-w-0"><div className="flex items-center gap-2 mb-1"><span className="text-xs font-bold uppercase text-indigo-600">{entry.categoria || 'geral'}</span>{entry.importante && <span className="text-xs font-bold text-amber-600">Importante</span>}</div><p className="text-slate-700 whitespace-pre-wrap">{entry.texto}</p><p className="text-xs text-slate-400 mt-2">{new Date(entry.created_at).toLocaleString('pt-BR')}</p></div><button onClick={() => remove(entry.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg shrink-0" aria-label="Excluir atualização"><Trash2 size={16} /></button></div></Card>)}</div>
      ) : (
        <Card className="p-12 flex flex-col items-center justify-center text-center space-y-4 border-dashed border-2"><div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><Calendar size={32} /></div><div><h3 className="text-lg font-semibold text-slate-700">Seu diário está vazio</h3><p className="text-slate-500 max-w-xs mx-auto">Registre notas das suas instalações para manter o histórico da obra.</p></div><Button variant="secondary" onClick={() => setOpen(true)} icon={Plus}>Registrar primeira atualização</Button></Card>
      )}

      <Modal isOpen={open} onClose={() => !saving && setOpen(false)} title="Nova Atualização" maxWidth="max-w-lg" footer={<Button onClick={save} disabled={saving || !text.trim()}>{saving ? <Loader2 className="animate-spin" size={16} /> : null}{saving ? 'Salvando...' : 'Salvar atualização'}</Button>}>
        <div className="space-y-4"><div><label className="text-sm font-medium text-slate-700">Registro</label><textarea autoFocus value={text} onChange={e => setText(e.target.value)} rows={6} placeholder="Descreva o que aconteceu na obra..." className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="text-sm font-medium text-slate-700">Categoria</label><select value={category} onChange={e => setCategory(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="geral">Geral</option><option value="montagem">Montagem</option><option value="instalacao">Instalação</option><option value="pendencia">Pendência</option><option value="entrega">Entrega</option></select></div><label className="flex items-center gap-2 text-sm font-medium text-slate-700 mt-6"><input type="checkbox" checked={important} onChange={e => setImportant(e.target.checked)} /> Marcar como importante</label></div></div>
      </Modal>
    </div>
  );
};

export default DiarioModule;
