import React, { useEffect, useState } from 'react';
import { Studio } from './index';
import { useDebouncedValue } from '@/hooks/useDebounce';
import { sincronizarLinhaDoTempoProjeto, registrarEventoSistema } from '@/modules/projetos/services/diarioStorage';

interface StudioHubProps {
  setBudgetProject: React.Dispatch<React.SetStateAction<any>>;
  navigateTo: (id: string) => void;
  gallery: string[];
  setGallery: React.Dispatch<React.SetStateAction<string[]>>;
  budgetProject: any;
}

const DIARY_CONTEXT_KEY = 'marcenapp_studio_diary_context';

export const StudioHub = (props: StudioHubProps) => {
  const { budgetProject, ...studioProps } = props;
  const [description, setDescription] = useState('');
  const [diaryContext, setDiaryContext] = useState<string | null>(null);
  const debouncedDescription = useDebouncedValue(description, 300);
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
      registrarEventoSistema(projectId, 'descricao-atualizada-estudio', 'Descrição do projeto atualizada no Estúdio.', 'studio');
    }, 700);
    return () => window.clearTimeout(timer);
  }, [description, projectId]);

  return <div className="relative space-y-5">
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">Projeto em andamento</p>
          <h3 className="mt-1 truncate text-base font-extrabold text-slate-900">Estúdio de marcenaria</h3>
          <p className="mt-1 text-xs text-slate-500">Crie a apresentação visual, confira o ambiente e prepare a documentação do projeto.</p>
        </div>
        <div className="shrink-0 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-right">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Medidas atuais</p>
          <p className="mt-0.5 text-sm font-extrabold text-slate-700">{budgetProject?.width} × {budgetProject?.height} × {budgetProject?.depth} m</p>
        </div>
      </div>
      {diaryContext && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900"><strong>Nota do Diário:</strong> {diaryContext}</div>}
      <div className="mt-4">
        <label htmlFor="studio-description" className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Briefing do projeto</label>
        <textarea id="studio-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva o que precisa ser criado. Ex.: cozinha com ilha, painel de TV ou armário planejado..." className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400" />
        <p className="mt-1.5 text-[10px] text-slate-400">O briefing fica no contexto do projeto e ajuda a organizar a próxima etapa.</p>
      </div>
    </section>

    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-white px-2.5 py-1.5 text-sm font-black text-indigo-600 shadow-sm">✦</div>
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-indigo-900">IARA disponível no cabeçalho</p>
          <p className="mt-1 text-[11px] leading-relaxed text-indigo-800">Use a IARA para revisar medidas, esclarecer dúvidas e apoiar decisões técnicas sem ocupar a área principal do Estúdio.</p>
        </div>
      </div>
    </div>

    <Studio {...studioProps} projectId={projectId} />
    <p className="px-1 text-[10px] text-slate-400">Resultados visuais são referências até serem conferidos. A IARA não transforma medidas estimadas em produção automaticamente.</p>
  </div>;
};

export default StudioHub;
