import React, { useEffect, useState } from 'react';
import { BookOpen, Calendar, Camera, Clock, ArrowLeft, Plus, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Card, Button } from '@/components/marcenaria/shared';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props { navigateTo?: (id: string) => void }
interface Project { id: string; nome: string }
interface Entry { id: string; project_id: string | null; tipo: string; texto: string; foto_path: string | null; categoria: string | null; evidencia: string | null; pendencia_resolvida: boolean; importante: boolean; created_at: string }

const DiarioModule = ({ navigateTo }: Props) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [projectId, setProjectId] = useState('');
  const [texto, setTexto] = useState('');
  const [categoria, setCategoria] = useState('geral');
  const [importante, setImportante] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: projectData, error: projectError }, { data: entryData, error: entryError }] = await Promise.all([
      supabase.from('projects').select('id, nome').order('updated_at', { ascending: false }),
      supabase.from('diario_entradas').select('id, project_id, tipo, texto, foto_path, categoria, evidencia, pendencia_resolvida, importante, created_at').order('created_at', { ascending: false }).limit(100),
    ]);
    if (projectError || entryError) toast.error('Não foi possível carregar o diário.');
    setProjects((projectData ?? []) as Project[]);
    setEntries((entryData ?? []) as Entry[]);
    if (!projectId && projectData?.[0]?.id) setProjectId(projectData[0].id);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const addEntry = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanText = texto.trim();
    if (!projectId) { toast.error('Selecione um projeto.'); return; }
    if (!cleanText) { toast.error('Escreva uma nota para registrar.'); return; }
    setSaving(true);
    const { error } = await supabase.from('diario_entradas').insert({ project_id: projectId, tipo: 'nota', texto: cleanText, categoria, importante, metadata: {} });
    setSaving(false);
    if (error) { toast.error('Não foi possível registrar a atualização.'); return; }
    setTexto(''); setImportante(false); toast.success('Atualização registrada.'); await load();
  };

  const toggleResolved = async (entry: Entry) => {
    const { error } = await supabase.from('diario_entradas').update({ pendencia_resolvida: !entry.pendencia_resolvida }).eq('id', entry.id);
    if (error) toast.error('Não foi possível atualizar a pendência.'); else await load();
  };
  const removeEntry = async (entry: Entry) => {
    if (!window.confirm('Excluir esta atualização do diário?')) return;
    const { error } = await supabase.from('diario_entradas').delete().eq('id', entry.id);
    if (error) toast.error('Não foi possível excluir a atualização.'); else { toast.success('Atualização excluída.'); await load(); }
  };

  const projectName = (id: string | null) => projects.find((project) => project.id === id)?.nome ?? 'Projeto não identificado';
  const activeCount = new Set(entries.filter((entry) => entry.project_id).map((entry) => entry.project_id)).size;
  const pendingCount = entries.filter((entry) => !entry.pendencia_resolvida && entry.categoria === 'pendencia').length;
  const photoCount = entries.filter((entry) => Boolean(entry.foto_path)).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigateTo ? navigateTo('dashboard') : window.history.back()} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label="Voltar para a jornada"><ArrowLeft size={20} /></button>
        <div className="flex-1"><h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><BookOpen className="text-amber-600" /> Diário de Obra</h2><p className="text-slate-500">Acompanhe a evolução de cada montagem e instalação.</p></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-blue-50 border-blue-100 flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Clock size={20} /></div><div><p className="text-xs text-blue-700 font-bold uppercase">Projetos com registros</p><p className="text-sm font-medium">{activeCount}</p></div></Card>
        <Card className="p-4 bg-green-50 border-green-100 flex items-center gap-3"><div className="p-2 bg-green-100 rounded-lg text-green-600"><CheckCircle2 size={20} /></div><div><p className="text-xs text-green-700 font-bold uppercase">Pendências abertas</p><p className="text-sm font-medium">{pendingCount}</p></div></Card>
        <Card className="p-4 bg-purple-50 border-purple-100 flex items-center gap-3"><div className="p-2 bg-purple-100 rounded-lg text-purple-600"><Camera size={20} /></div><div><p className="text-xs text-purple-700 font-bold uppercase">Fotos registradas</p><p className="text-sm font-medium">{photoCount}</p></div></Card>
      </div>

      <Card className="p-5">
        <form onSubmit={addEntry} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="space-y-1 text-sm font-medium text-slate-700">Projeto<select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 bg-white"><option value="">Selecione…</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.nome}</option>)}</select></label>
            <label className="space-y-1 text-sm font-medium text-slate-700">Categoria<select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 bg-white"><option value="geral">Geral</option><option value="instalacao">Instalação</option><option value="material">Material</option><option value="pendencia">Pendência</option><option value="entrega">Entrega</option></select></label>
            <label className="flex items-end gap-2 pb-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={importante} onChange={(e) => setImportante(e.target.checked)} className="h-4 w-4" /> Marcar como importante</label>
          </div>
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={4} placeholder="Registre o que aconteceu na obra…" className="w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10" />
          <div className="flex justify-end"><Button type="submit" icon={saving ? Loader2 : Plus} disabled={saving}>{saving ? 'Registrando…' : 'Nova atualização'}</Button></div>
        </form>
      </Card>

      <Card className="overflow-hidden">
        {loading ? <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-indigo-600" /></div> : entries.length === 0 ? <div className="p-12 text-center"><Calendar className="mx-auto text-slate-300" size={40} /><h3 className="mt-3 font-semibold text-slate-700">Seu diário está vazio</h3><p className="text-slate-500">Registre a primeira atualização de uma obra.</p></div> : (
          <div className="divide-y divide-slate-100">{entries.map((entry) => <article key={entry.id} className="p-5 space-y-2"><div className="flex items-start gap-3"><div className="mt-1 p-2 rounded-lg bg-slate-100 text-slate-600"><Calendar size={17} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-slate-800">{projectName(entry.project_id)}</span>{entry.importante && <span className="text-xs font-bold text-amber-700">Importante</span>}<span className="text-xs text-slate-400">{new Date(entry.created_at).toLocaleString('pt-BR')}</span></div><p className="text-sm text-slate-700 whitespace-pre-wrap">{entry.texto}</p><p className="text-xs text-slate-500">{entry.categoria || 'geral'}{entry.pendencia_resolvida ? ' · pendência resolvida' : entry.categoria === 'pendencia' ? ' · pendência aberta' : ''}</p></div><div className="flex gap-1"><button type="button" onClick={() => void toggleResolved(entry)} aria-label="Alternar pendência resolvida" className="p-2 rounded-lg hover:bg-green-50 text-slate-500 hover:text-green-600"><CheckCircle2 size={17} /></button><button type="button" onClick={() => void removeEntry(entry)} aria-label="Excluir atualização" className="p-2 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600"><Trash2 size={17} /></button></div></div>{entry.categoria === 'pendencia' && !entry.pendencia_resolvida && <div className="ml-12 flex items-center gap-2 text-xs text-amber-700"><AlertCircle size={14} /> Pendência em aberto</div>}</article>)}</div>
        )}
      </Card>
    </div>
  );
};

export default DiarioModule;
