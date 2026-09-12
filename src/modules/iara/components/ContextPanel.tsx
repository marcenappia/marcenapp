import React, { useEffect, useRef } from 'react';
import { ExternalLink, X } from 'lucide-react';

export interface ContextPanelData {
  title: string;
  type: string;
  imageUrl?: string | null;
  description?: string;
  href?: string | null;
}

interface ContextPanelProps {
  panel: ContextPanelData | null;
  onClose: () => void;
}

export const ContextPanel = ({ panel, onClose }: ContextPanelProps) => {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!panel) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [panel, onClose]);

  if (!panel) return null;
  const typeLabel = panel.type === 'render' ? 'Render' : panel.type === 'budget' ? 'Orçamento' : panel.type === 'cut_plan' ? 'Plano de corte' : panel.type === 'project' ? 'Projeto' : 'Contexto do projeto';

  return (
    <aside role="dialog" aria-modal="true" aria-label={panel.title} className="fixed inset-x-0 bottom-0 z-[260] max-h-[86vh] rounded-t-2xl bg-card border-t border-border shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-200 md:inset-y-0 md:bottom-auto md:left-auto md:right-0 md:w-[420px] md:max-h-none md:rounded-none md:border-l md:border-t-0 md:slide-in-from-right">
      <header className="min-h-14 px-4 flex items-center justify-between border-b border-border shrink-0">
        <div className="min-w-0"><p className="text-sm font-bold truncate">{panel.title}</p><p className="text-[10px] text-muted-foreground uppercase tracking-widest">{typeLabel}</p></div>
        <button ref={closeRef} type="button" aria-label="Fechar contexto" onClick={onClose} className="p-2.5 min-w-11 min-h-11 rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><X size={18} aria-hidden="true" /></button>
      </header>
      <div className="flex-1 overflow-auto p-4 sm:p-5">
        {panel.imageUrl ? <img src={panel.imageUrl} alt={panel.title} className="w-full h-auto max-h-[65vh] rounded-xl border border-border object-contain" /> : <div className="min-h-48 rounded-xl border border-dashed border-border bg-muted/40 flex items-center justify-center text-sm text-muted-foreground text-center p-6">Este artefato está vinculado ao projeto atual.</div>}
        {panel.description && <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{panel.description}</p>}
        {panel.href && <a href={panel.href} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><ExternalLink size={16} aria-hidden="true" /> Abrir</a>}
      </div>
    </aside>
  );
};
