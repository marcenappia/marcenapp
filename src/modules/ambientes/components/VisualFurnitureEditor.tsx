import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Box, Grid3X3, Plus, Save, Trash2 } from 'lucide-react';

type Project = { id: string; nome?: string | null; name?: string | null };
type ModuleItem = { id: string; kind: string; label: string; x: number; y: number; width: number; height: number; depth: number; material: string };
type EditorSnapshot = { room: { width: number; depth: number; height: number }; modules: ModuleItem[] };

const catalog = [
  { kind: 'base', label: 'Balcão inferior', width: 800, height: 720, depth: 560 },
  { kind: 'upper', label: 'Armário aéreo', width: 800, height: 700, depth: 350 },
  { kind: 'tower', label: 'Torre quente', width: 700, height: 2200, depth: 600 },
  { kind: 'drawer', label: 'Gaveteiro', width: 600, height: 720, depth: 560 },
  { kind: 'closet', label: 'Módulo de closet', width: 900, height: 2400, depth: 600 },
];

const defaultSnapshot: EditorSnapshot = { room: { width: 3400, depth: 2800, height: 2700 }, modules: [] };

export default function VisualFurnitureEditor({ projectId: initialProjectId }: { projectId?: string }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState(initialProjectId ?? '');
  const [snapshot, setSnapshot] = useState<EditorSnapshot>(defaultSnapshot);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const selected = snapshot.modules.find(item => item.id === selectedId);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    void supabase.from('projects').select('id,nome,name').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(100)
      .then(({ data }) => {
        if (!alive) return;
        const rows = (data ?? []) as Project[];
        setProjects(rows);
        setProjectId(current => current || rows[0]?.id || '');
        setLoading(false);
      });
    return () => { alive = false; };
  }, [user]);

  useEffect(() => {
    if (!user || !projectId) { setSnapshot(defaultSnapshot); return; }
    let alive = true;
    void supabase.from('project_versions').select('id,version_number,snapshot').eq('user_id', user.id).eq('project_id', projectId).order('version_number', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        const stored = data?.snapshot && typeof data.snapshot === 'object' ? data.snapshot as Record<string, unknown> : {};
        const editor = stored.visualFurnitureEditor as EditorSnapshot | undefined;
        setSnapshot(editor?.room && Array.isArray(editor.modules) ? editor : defaultSnapshot);
        setSelectedId('');
      });
    return () => { alive = false; };
  }, [user, projectId]);

  const updateRoom = (key: keyof EditorSnapshot['room'], value: number) => setSnapshot(current => ({ ...current, room: { ...current.room, [key]: Math.max(100, Math.min(20000, value || 100)) } }));
  const addModule = (item: typeof catalog[number]) => {
    const id = globalThis.crypto?.randomUUID?.() ?? `module-${Date.now()}`;
    const next: ModuleItem = { id, ...item, x: 0, y: 0, depth: item.depth, material: 'MDF a definir' };
    setSnapshot(current => ({ ...current, modules: [...current.modules, next] }));
    setSelectedId(id);
    setMessage('');
  };
  const updateSelected = (patch: Partial<ModuleItem>) => setSnapshot(current => ({ ...current, modules: current.modules.map(item => item.id === selectedId ? { ...item, ...patch } : item) }));
  const save = async () => {
    if (!user || !projectId) { setMessage('Selecione um projeto para salvar.'); return; }
    setSaving(true); setMessage('');
    try {
      const { data: current, error: readError } = await supabase
        .from('project_versions')
        .select('id,version_number,status,snapshot,environment_id')
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (readError) throw readError;

      const prior = current?.snapshot && typeof current.snapshot === 'object' ? current.snapshot as Record<string, unknown> : {};
      const merged = { ...prior, visualFurnitureEditor: snapshot, visualFurnitureEditorUpdatedAt: new Date().toISOString() };

      let hasApprovalOrFreeze = false;
      if (current?.id) {
        const [{ data: approval, error: approvalError }, { data: freeze, error: freezeError }] = await Promise.all([
          supabase.from('project_approvals').select('id').eq('project_version_id', current.id).not('approved_at', 'is', null).limit(1).maybeSingle(),
          supabase.from('project_production_freezes').select('id').eq('project_version_id', current.id).limit(1).maybeSingle(),
        ]);
        if (approvalError) throw approvalError;
        if (freezeError) throw freezeError;
        hasApprovalOrFreeze = Boolean(approval || freeze);
      }

      const canUpdateDraft = current?.id && current.status === 'draft' && !hasApprovalOrFreeze;
      if (canUpdateDraft) {
        const { error } = await supabase.from('project_versions').update({ snapshot: merged }).eq('id', current.id).eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('project_versions').insert({
          project_id: projectId,
          user_id: user.id,
          version_number: (current?.version_number ?? 0) + 1,
          status: 'draft',
          snapshot: merged,
          environment_id: current?.environment_id ?? null,
        });
        if (error) throw error;
      }
      setMessage(canUpdateDraft ? 'Estudo salvo na versão em rascunho.' : 'Nova versão de rascunho criada; a versão aprovada/congelada foi preservada.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível salvar o ambiente.');
    } finally { setSaving(false); }
  };

  const scale = useMemo(() => Math.min(620 / snapshot.room.width, 420 / snapshot.room.depth), [snapshot.room]);
  if (loading) return <div className="p-8 text-sm text-slate-500">Carregando projetos…</div>;

  return <div className="mx-auto w-full max-w-7xl space-y-5 p-3 sm:p-6">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Projeto / Marcenaria</p><h1 className="text-2xl font-black text-slate-950">Editor visual de móveis</h1><p className="mt-1 text-sm text-slate-500">Monte módulos, ajuste medidas e registre o estudo no projeto.</p></div>
      <button type="button" onClick={() => void save()} disabled={saving || !projectId} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Save size={16}/>{saving ? 'Salvando…' : 'Salvar projeto'}</button>
    </header>
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
          <label className="min-w-[220px] flex-1 text-xs font-bold text-slate-600">Projeto<select value={projectId} onChange={e => setProjectId(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">{projects.map(p => <option key={p.id} value={p.id}>{p.nome || p.name || 'Projeto sem nome'}</option>)}</select></label>
          {(['width','depth','height'] as const).map(key => <label key={key} className="text-xs font-bold text-slate-600">{key === 'width' ? 'Largura' : key === 'depth' ? 'Profundidade' : 'Pé-direito'} (mm)<input type="number" min="100" max="20000" value={snapshot.room[key]} onChange={e => updateRoom(key, Number(e.target.value))} className="mt-1 min-h-11 w-28 rounded-lg border border-slate-200 px-2 text-sm"/></label>)}
        </div>
        <div className="overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-600"><Grid3X3 size={15}/> Planta esquemática · medidas em milímetros</div>
          <div className="relative mx-auto border-2 border-slate-500 bg-white" style={{ width: snapshot.room.width * scale, height: snapshot.room.depth * scale, minWidth: 260, minHeight: 220, backgroundImage: 'linear-gradient(#e2e8f0 1px, transparent 1px),linear-gradient(90deg,#e2e8f0 1px,transparent 1px)', backgroundSize: '20px 20px' }}>
            {snapshot.modules.map(item => <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`absolute flex flex-col items-center justify-center overflow-hidden border-2 p-1 text-center text-[10px] font-bold ${selectedId === item.id ? 'border-indigo-600 bg-indigo-100 text-indigo-900' : 'border-slate-500 bg-slate-200 text-slate-800'}`} style={{ left: item.x * scale, top: item.y * scale, width: Math.max(34, item.width * scale), height: Math.max(28, item.depth * scale) }}><span>{item.label}</span><span>{item.width} × {item.depth}</span></button>)}
          </div>
          <p className="mt-3 text-xs text-slate-500">Selecione um módulo para editar. O desenho é esquemático e não substitui conferência de medidas no local.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><h2 className="mb-3 flex items-center gap-2 text-sm font-black"><Box size={16}/> Biblioteca de módulos</h2><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{catalog.map(item => <button key={item.kind} type="button" onClick={() => addModule(item)} className="flex min-h-14 items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 text-left text-xs font-bold hover:border-indigo-300 hover:bg-indigo-50"><span>{item.label}<small className="mt-1 block font-medium text-slate-500">{item.width} × {item.height} × {item.depth} mm</small></span><Plus size={15}/></button>)}</div></div>
      </div>
      <aside className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><h2 className="text-sm font-black">Módulo selecionado</h2>{selected ? <div className="mt-3 space-y-3">
          <p className="text-xs font-semibold text-slate-500">{selected.label}</p>
          {(['width','height','depth','x','y'] as const).map(key => <label key={key} className="block text-xs font-bold text-slate-600">{({width:'Largura',height:'Altura',depth:'Profundidade',x:'Posição X',y:'Posição Y'})[key]} (mm)<input type="number" min="0" value={selected[key]} onChange={e => updateSelected({[key]: Math.max(0, Number(e.target.value))})} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label>)}
          <label className="block text-xs font-bold text-slate-600">Material / acabamento<input value={selected.material} onChange={e => updateSelected({material:e.target.value})} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" placeholder="Ex.: MDF Gianduia"/></label>
          <button type="button" onClick={() => { setSnapshot(current => ({...current,modules:current.modules.filter(item => item.id !== selectedId)})); setSelectedId(''); }} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-700"><Trash2 size={14}/> Remover módulo</button>
        </div> : <p className="mt-2 text-xs text-slate-500">Adicione um módulo ou selecione um existente na planta para editar suas medidas e acabamento.</p>}</div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-black text-amber-900">Validação de fabricação</p><p className="mt-1 text-xs leading-5 text-amber-800">As dimensões iniciais são referências editáveis. Confirme medidas reais, espessuras, folgas, ferragens e esquadro antes de gerar peças ou plano de corte.</p></div>
        {message && <p role="status" className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700">{message}</p>}
      </aside>
    </section>
  </div>;
}
