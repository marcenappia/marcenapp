import React, { useEffect, useRef } from 'react';
import { ExternalLink, X, FileText, Image as ImageIcon } from 'lucide-react';

export interface ContextPanelData {
  title: string;
  type: string;
  imageUrl?: string | null;
  description?: string;
  href?: string | null;
}

interface ContextPanelProps { panel: ContextPanelData | null; onClose: () => void; }

export const ContextPanel = ({ panel, onClose }: ContextPanelProps) => {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (!panel) return; closeRef.current?.focus(); const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); }; window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown); }, [panel, onClose]);
  if (!panel) return null;
  const typeLabel = panel.type === 'render' ? 'Render' : panel.type === 'budget' ? 'Orçamento' : panel.type === 'cut_plan' ? 'Plano de corte' : panel.type === 'project' ? 'Projeto' : 'Contexto';
  return <aside role="dialog" aria-modal="true" aria-label={panel.title} className="fixed inset-x-0 bottom-0 z-[260] flex max-h-[86vh] flex-col rounded-t-2xl border-t border-border bg-card shadow-2xl animate-in slide-in-from-bottom duration-200 md:inset-y-0 md:bottom-auto md:left-auto md:right-0 md:w-[400px] md:max-h-none md:rounded-none md:border-l md:border-t-0 md:slide-in-from-right">
    <header className="flex min-h-14 shrink-0 items-center justify-between border-b border-border/70 px-4"><div className="min-w-0"><p className="truncate text-sm font-semibold">{panel.title}</p><p className="text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{typeLabel}</p></div><button ref={closeRef} type="button" aria-label="Fechar contexto" onClick={onClose} className="min-h-11 min-w-11 rounded-lg p-2.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><X size={18} aria-hidden="true" /></button></header>
    <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-5">
      {panel.imageUrl ? <div className="overflow-hidden rounded-xl border border-border bg-muted/20"><img src={panel.imageUrl} alt={panel.title} className="max-h-[68vh] w-full object-contain" /></div> : <div className="flex min-h-24 items-center gap-3 rounded-xl border border-border bg-muted/30 p-4"><div className="rounded-lg border border-border bg-background p-2 text-muted-foreground">{panel.type === 'render' ? <ImageIcon size={18} /> : <FileText size={18} />}</div><p className="text-xs leading-5 text-muted-foreground">O conteúdo deste contexto permanece vinculado ao projeto e à conversa.</p></div>}
      {panel.description && <p className="mt-4 text-sm leading-6 text-muted-foreground">{panel.description}</p>}
      {panel.href && <a href={panel.href} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><ExternalLink size={16} aria-hidden="true" /> Abrir</a>}
    </div>
  </aside>;
};
