import React, { useEffect, useState } from 'react';
import { Studio } from './index';
import { sincronizarLinhaDoTempoProjeto, registrarEventoSistema } from '@/modules/projetos/services/diarioStorage';
import type { ProjectData } from '@/modules/projetos/types';

interface StudioHubProps {
  setBudgetProject: React.Dispatch<React.SetStateAction<ProjectData>>;
  navigateTo: (id: string) => void;
  gallery: string[];
  setGallery: React.Dispatch<React.SetStateAction<string[]>>;
  budgetProject: ProjectData | null;
}

const DIARY_CONTEXT_KEY = 'marcenapp_studio_diary_context';

export const StudioHub = (props: StudioHubProps) => {
  const { budgetProject, ...studioProps } = props;
  const [description, setDescription] = useState('');
  const [diaryContext, setDiaryContext] = useState<string | null>(null);
  const projectId: string | null = budgetProject?.id ?? null;

  useEffect(() => {
    if (!projectId) return;
    sincronizarLinhaDoTempoProjeto(projectId, budgetProject);
    try {
      const raw = localStorage.getItem(DIARY_CONTEXT_KEY);
      if (!raw) return;
      const context = JSON.parse(raw) as { projectId?: string; texto?: string };
      if (context.texto && (!context.projectId || context.projectId === projectId)) {
        setDescription(prev => prev || context.texto || '');
        setDiaryContext(context.texto);
        localStorage.removeItem(DIARY_CONTEXT_KEY);
      }
    } catch { /* contexto opcional */ }
  }, [projectId]);

  useEffect(() => {
    if (!projectId || !description.trim()) return;
    const timer = window.setTimeout(() => {
      registrarEventoSistema(projectId, 'descricao-atualizada-estudio', 'Descrição do projeto atualizada no Estúdio.', 'estudio');
    }, 700);
    return () => window.clearTimeout(timer);
  }, [description, projectId]);

  return <div className="relative space-y-5">
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">MARCENA · apresentação visual</p>
          <h3 className="mt-1 truncate text-base font-extrabold text-slate-900">Do rascunho ao 3D em minutos</h3>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">Transforme a ideia do cliente em uma apresentação visual profissional. A IARA ajuda a interpretar o ambiente e o briefing; o MARCENA prepara o projeto para apresentar.</p>
        </div>
        <div className="shrink-0 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-right">
          <p className="text-[9px] font-bold uppercase tracking-wider text-indigo-500">Ambiente do projeto</p>
          <p className="mt-0.5 text-sm font-extrabold text-slate-700">{budgetProject?.width} × {budgetProject?.height} × {budgetProject?.depth} m</p>
        </div>
      </div>
      {diaryContext && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900"><strong>Nota do Diário:</strong> {diaryContext}</div>}
      <div className="mt-4">
        <label htmlFor="studio-description" className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Briefing do projeto</label>
        <textarea id="studio-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva o que precisa ser criado. Ex.: cozinha com ilha, painel de TV ou armário planejado..." className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400" />
        <p className="mt-1.5 text-[10px] text-slate-400">O briefing fica associado ao projeto e orienta a criação da apresentação.</p>
      </div>
    </section>

    <Studio {...studioProps} projectId={projectId} />
    <p className="px-1 text-[10px] text-slate-400">A apresentação é visual. Confira medidas e detalhes técnicos antes de produzir.</p>
  </div>;
};

export default StudioHub;
