import React from 'react';
import { Maximize2, Loader2, AlertCircle, RefreshCcw, ExternalLink, CheckCircle2, CircleAlert, FileText } from 'lucide-react';

export interface ChatMessage {
  id: string;
  user_id: string;
  project_id?: string | null;
  sender: string;
  text: string | null;
  image_url: string | null;
  budget: string | null;
  created_at: string;
  metadata?: {
    commandId?: string;
    resultUrl?: string;
    domain?: string;
    action?: string;
    agent?: string;
    correlationId?: string;
    status?: 'requested' | 'processing' | 'ready' | 'needs_input' | 'completed' | 'failed' | 'error';
    intent?: { domain: string; action: string; agent: string };
    artifact?: { type: string; id?: string };
    artifacts?: Array<{ type: string; id?: string }>;
    panel?: { type: string };
    actions?: Array<{ id: string; label: string; kind: string }>;
  } | null;
}

const SUGGESTIONS = [
  'Guarda-roupa 2,40×2,60m com 6 portas e 4 gavetas',
  'Cozinha planejada minimalista com ilha central',
  'Calcule o orçamento deste projeto',
  'Gere um render deste projeto',
];

const ARTIFACT_LABELS: Record<string, string> = {
  project: 'Projeto', render: 'Render', budget: 'Orçamento', cut_plan: 'Plano de corte', materials: 'Materiais', hardware: 'Ferragens', contract: 'Documento', order: 'Pedido', checklist: 'Checklist', production: 'Produção',
};

const STATUS_LABELS: Record<string, string> = {
  requested: 'Solicitado', processing: 'Preparando', ready: 'Pronto', completed: 'Concluído', needs_input: 'Aguardando informação', failed: 'Não concluído', error: 'Precisa de atenção',
};

interface ChatMessagesProps {
  messages: ChatMessage[];
  isTyping: boolean;
  onImageZoom: (data: { url: string; budget?: string | null }) => void;
  onArtifactOpen?: (data: { type: string; id?: string; imageUrl?: string | null }) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  error?: string | null;
  onRetry?: () => void;
  onDismissError?: () => void;
  onSuggestion?: (text: string) => void;
}

export const ChatMessages = ({ messages, isTyping, onImageZoom, onArtifactOpen, messagesEndRef, error, onRetry, onDismissError, onSuggestion }: ChatMessagesProps) => (
  <main className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin relative" aria-live="polite">
    {messages.length === 0 && !isTyping && (
      <div className="flex flex-col items-center justify-center text-center py-10 px-4 opacity-80">
        <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-3"><div className="w-2 h-2 rounded-full bg-primary animate-pulse" /></div>
        <p className="text-sm font-bold text-foreground mb-1">Converse com a IARA</p>
        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">Descreva o que você quer fazer no projeto. A conversa permanece vinculada ao projeto atual.</p>
        {onSuggestion && <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-sm">{SUGGESTIONS.map(s => <button key={s} type="button" onClick={() => onSuggestion(s)} className="px-3 py-1.5 rounded-full border border-border bg-card text-[11px] text-foreground hover:border-primary hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">{s}</button>)}</div>}
      </div>
    )}

    {messages.map((msg) => {
      const isUser = msg.sender === 'user';
      const artifact = msg.metadata?.artifact;
      const status = msg.metadata?.status;
      const canOpenArtifact = Boolean(artifact && onArtifactOpen);
      const statusIcon = status === 'ready' || status === 'completed' ? <CheckCircle2 size={13} aria-hidden="true" /> : status === 'failed' || status === 'error' ? <CircleAlert size={13} aria-hidden="true" /> : <Loader2 size={13} className={status === 'processing' ? 'animate-spin' : ''} aria-hidden="true" />;
      return (
        <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`max-w-[92%] sm:max-w-[78%] rounded-2xl p-1 shadow-sm ${isUser ? 'bg-primary rounded-tr-sm' : 'bg-card border border-border rounded-tl-sm'}`}>
            {msg.image_url && <div className="relative rounded-xl overflow-hidden mb-1 group cursor-zoom-in" onClick={() => isUser && onImageZoom({ url: msg.image_url!, budget: msg.budget })}>
              <img src={msg.image_url} className="w-full h-auto max-h-[320px] object-cover" alt="Referência enviada" />
              {isUser && <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none"><Maximize2 size={24} className="text-white" /></div>}
              <div className="absolute top-2 right-2"><span className="bg-black/40 text-[8px] text-white px-2 py-0.5 rounded-full uppercase font-bold tracking-widest backdrop-blur-sm">Imagem</span></div>
            </div>}
            {msg.text && <div className={`px-4 py-2 text-sm leading-relaxed whitespace-pre-wrap ${isUser ? 'text-primary-foreground' : 'text-foreground'}`}>{msg.text}</div>}

            {artifact && (
              <div className={`mx-3 mb-2 rounded-xl border p-3 ${isUser ? 'border-primary-foreground/25 bg-primary-foreground/5' : 'border-border bg-muted/40'}`}>
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 p-1.5 rounded-lg bg-background border border-border"><FileText size={14} aria-hidden="true" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold">{ARTIFACT_LABELS[artifact.type] ?? 'Artefato do projeto'}</p>
                    {status && <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground" aria-label={STATUS_LABELS[status] ?? status}>{statusIcon}<span>{STATUS_LABELS[status] ?? status}</span></div>}
                  </div>
                </div>
                {canOpenArtifact && <button type="button" onClick={() => onArtifactOpen?.({ type: artifact.type, id: artifact.id, imageUrl: msg.image_url })} className={`mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isUser ? 'border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10' : 'border-border text-foreground hover:bg-background'}`}><ExternalLink size={14} /> {artifact.type === 'render' ? 'Abrir render' : 'Ver detalhes'}</button>}
              </div>
            )}

            <div className={`px-3 pb-1 text-[8px] font-bold text-right ${isUser ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>
      );
    })}

    {error && !isTyping && <div role="alert" className="flex items-start gap-3 bg-destructive/10 border border-destructive/30 rounded-xl p-3 animate-in fade-in"><AlertCircle size={16} className="text-destructive shrink-0 mt-0.5" aria-hidden="true" /><div className="flex-1 min-w-0"><p className="text-xs font-bold text-destructive">Não foi possível concluir</p><p className="text-[11px] text-muted-foreground break-words">{error}</p><div className="flex gap-2 mt-2">{onRetry && <button onClick={onRetry} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-[10px] font-black uppercase tracking-wider hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><RefreshCcw size={12} aria-hidden="true" /> Tentar novamente</button>}{onDismissError && <button onClick={onDismissError} className="px-3 py-1.5 text-[10px] font-bold uppercase text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Fechar</button>}</div></div></div>}
    {isTyping && <div className="flex items-start"><div role="status" aria-live="polite" className="bg-card border border-border rounded-2xl rounded-tl-sm p-4 shadow-sm flex items-center gap-2"><Loader2 size={16} className="animate-spin text-primary" aria-hidden="true" /><span className="text-xs text-muted-foreground">IARA está preparando...</span></div></div>}
    <div ref={messagesEndRef} />
  </main>
);
