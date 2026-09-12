import React, { useEffect } from 'react';
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
  useEffect(() => {
    if (!panel) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [panel, onClose]);

  if (!panel) return null;
  return (
    <aside role="dialog" aria-modal="true" aria-label={panel.title} className="fixed inset-y-0 right-0 z-[260] w-full sm:w-[min(520px,92vw)] bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      <header className="h-14 px-4 flex items-center justify-between border-b border-border shrink-0">
        <div className="min-w-0"><p className="text-sm font-black truncate">{panel.title}</p><p className="text-[10px] text-muted-foreground uppercase tracking-widest">{panel.type}</p></div>
        <button type="button" aria-label="Fechar painel" onClick={onClose} className="p-2 rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><X size={18} /></button>
      </header>
      <div className="flex-1 overflow-auto p-4">
        {panel.imageUrl ? <img src={panel.imageUrl} alt={panel.title} className="w-full h-auto rounded-xl border border-border object-contain" /> : <div className="min-h-48 rounded-xl border border-dashed border-border bg-muted/40 flex items-center justify-center text-sm text-muted-foreground text-center p-6">O artefato está pronto para ser aberto neste contexto.</div>}
        {panel.description && <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{panel.description}</p>}
        {panel.href && <a href={panel.href} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><ExternalLink size={16} /> Abrir</a>}
      </div>
    </aside>
  );
};
