import React from 'react';
import { Bot, X, Sparkles, ShieldCheck, ChevronRight } from 'lucide-react';
import IaraModule from './index';

interface IaraAssistantLayerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: { id?: string; width?: number; height?: number; depth?: number } | null;
  onProjectChange?: (project: { width: number; height: number; depth: number }) => void;
  contextLabel?: string;
}

const IaraAssistantLayer = ({
  open,
  onOpenChange,
  project,
  onProjectChange,
  contextLabel = 'Perguntar à IARA',
}: IaraAssistantLayerProps) => {
  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        aria-label="Abrir IARA"
        className="hidden md:inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3.5 py-2 text-xs font-black text-indigo-700 shadow-sm transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <Sparkles size={15} className="text-indigo-500" aria-hidden="true" />
        IARA
        <ChevronRight size={13} className="text-indigo-300" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={() => onOpenChange(true)}
        aria-label="Abrir assistente IARA"
        className="md:hidden fixed right-4 bottom-[76px] z-[80] flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 ring-4 ring-white transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <Sparkles size={21} aria-hidden="true" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="IARA — Assistente técnica do MARCENAPP">
          <button
            type="button"
            aria-label="Fechar IARA"
            onClick={() => onOpenChange(false)}
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
          />

          <section className="absolute inset-y-0 right-0 flex w-full max-w-[500px] flex-col bg-slate-50 shadow-2xl animate-in slide-in-from-right duration-200 md:border-l md:border-slate-200">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Bot size={19} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-sm font-black text-slate-900">IARA</h2>
                    <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-600">Ativa</span>
                  </div>
                  <p className="truncate text-[10px] font-medium text-slate-500">Assistente técnica do MARCENAPP · {contextLabel}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Fechar painel da IARA"
                className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <X size={19} aria-hidden="true" />
              </button>
            </div>

            <div className="flex items-center gap-2 border-b border-slate-200 bg-indigo-50/60 px-4 py-2.5 text-[10px] text-indigo-900">
              <ShieldCheck size={14} className="shrink-0 text-indigo-600" aria-hidden="true" />
              <span><strong>Modo técnico seguro:</strong> a IARA sugere, confere e pergunta antes de decisões críticas.</span>
            </div>

            <div className="min-h-0 flex-1 p-2 md:p-3">
              <IaraModule
                embedded
                projectId={project?.id ?? null}
                syncProject={project}
                onProjectChange={onProjectChange}
              />
            </div>
          </section>
        </div>
      )}
    </>
  );
};

export default IaraAssistantLayer;
