import React from 'react';
import { Maximize2, Loader2, AlertCircle, RefreshCcw, XCircle } from 'lucide-react';
import { useStudioStore } from '@/store/useStudioStore';
import { useMarcenappOS } from '@/store/useMarcenappOS';

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
  } | null;
}

const SUGGESTIONS = [
  'Guarda-roupa 2,40×2,60m com 6 portas e 4 gavetas',
  'Cozinha planejada minimalista com ilha central',
  'Calcule o orçamento deste projeto',
  'Gere um render em estilo industrial',
];

interface ChatMessagesProps {
  messages: ChatMessage[];
  isTyping: boolean;
  onImageZoom: (data: { url: string; budget?: string | null }) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  error?: string | null;
  onRetry?: () => void;
  onDismissError?: () => void;
  onSuggestion?: (text: string) => void;
}

export const ChatMessages = ({ messages, isTyping, onImageZoom, messagesEndRef, error, onRetry, onDismissError, onSuggestion }: ChatMessagesProps) => {
  const commandHistory = useMarcenappOS(state => state.commandHistory);
  const cancelCommand = useStudioStore(state => state.cancelCommand);
  const enqueueCommand = useStudioStore(state => state.enqueueCommand);

  const activeCommands = commandHistory.filter(cmd => 
    cmd.source === 'iara' && (cmd.status === 'pending' || cmd.status === 'processing' || cmd.status === 'failed' || cmd.status === 'cancelled')
  );

  return (
    <main className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin relative">
      <div className="text-center pb-2">
        <span className="px-3 py-1 bg-muted rounded-full text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Sessão de Materialização</span>
      </div>

      {activeCommands.length > 0 && (
        <div className="space-y-2 mb-4">
          {activeCommands.map(cmd => (
            <div key={cmd.id} className="bg-card border border-border rounded-xl p-3 shadow-sm animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {cmd.status === 'processing' ? (
                    <Loader2 size={14} className="animate-spin text-primary" />
                  ) : cmd.status === 'failed' ? (
                    <AlertCircle size={14} className="text-destructive" />
                  ) : cmd.status === 'cancelled' ? (
                    <XCircle size={14} className="text-muted-foreground" />
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-muted-foreground animate-pulse" />
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {cmd.status === 'processing' ? 'Estúdio Processando' : 
                     cmd.status === 'failed' ? 'Falha no Estúdio' : 
                     cmd.status === 'cancelled' ? 'Comando Cancelado' : 'Na Fila do Estúdio'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {(cmd.status === 'failed' || cmd.status === 'cancelled') && (
                    <button 
                      onClick={() => {
                        const { id, status, timestamp, result, ...cleanCmd } = cmd.payload;
                        enqueueCommand(cleanCmd);
                      }}
                      className="p-1 hover:bg-muted rounded text-primary transition-colors"
                      title="Tentar novamente"
                    >
                      <RefreshCcw size={14} />
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      if (cmd.status === 'pending' || cmd.status === 'processing') {
                        cancelCommand(cmd.id);
                      } else {
                        // Comandos em histórico do OS não são removidos via UI aqui para manter memória
                      }
                    }}
                    className="p-1 hover:bg-muted rounded text-muted-foreground transition-colors"
                    title={cmd.status === 'pending' || cmd.status === 'processing' ? "Cancelar" : "Remover"}
                  >
                    <XCircle size={14} />
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground truncate italic">"{cmd.payload?.metadata?.originalPrompt || cmd.payload?.prompt}"</p>
            </div>
          ))}
        </div>
      )}

      {messages.length === 0 && activeCommands.length === 0 && !isTyping && (
        <div className="flex flex-col items-center justify-center text-center py-10 px-4 opacity-80">
          <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          </div>
          <p className="text-sm font-bold text-foreground mb-1">Converse com a IARA</p>
          <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
            Descreva seu projeto no campo abaixo — dimensões, estilo, materiais. A descrição fica sincronizada com o Estúdio.
          </p>
        </div>
      )}

      {messages.map((msg) => {
        const isUser = msg.sender === 'user';
        return (
          <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-1 shadow-md ${isUser ? 'bg-primary rounded-tr-sm' : 'bg-card border border-border rounded-tl-sm'}`}>
              {msg.image_url && (
                <div className="relative rounded-xl overflow-hidden mb-1 group cursor-zoom-in" onClick={() => isUser && onImageZoom({ url: msg.image_url!, budget: msg.budget })}>
                  <img src={msg.image_url} className="w-full h-auto max-h-[300px] object-cover" alt="Referência" />
                  {isUser && (
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <Maximize2 size={24} className="text-white" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className="bg-black/40 text-[8px] text-white px-2 py-0.5 rounded-full uppercase font-bold tracking-widest backdrop-blur-sm">Contexto</span>
                  </div>
                </div>
              )}
              {msg.text && (
                <div className={`px-4 py-2 text-sm leading-relaxed ${isUser ? 'text-primary-foreground' : 'text-foreground'}`}>
                  {msg.text}
                </div>
              )}
              <div className={`px-3 pb-1 text-[8px] font-bold text-right ${isUser ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        );
      })}

      {error && !isTyping && (
        <div role="alert" className="flex items-start gap-3 bg-destructive/10 border border-destructive/30 rounded-xl p-3 animate-in fade-in">
          <AlertCircle size={16} className="text-destructive shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-destructive">Não consegui responder</p>
            <p className="text-[11px] text-muted-foreground break-words">{error}</p>
            <div className="flex gap-2 mt-2">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-[10px] font-black uppercase tracking-wider hover:opacity-90 transition-opacity"
                >
                  <RefreshCcw size={12} aria-hidden="true" /> Tentar novamente
                </button>
              )}
              {onDismissError && (
                <button onClick={onDismissError} className="px-3 py-1.5 text-[10px] font-bold uppercase text-muted-foreground hover:text-foreground transition-colors">
                  Fechar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isTyping && (
        <div className="flex items-start">
          <div className="bg-card border border-border rounded-2xl rounded-tl-sm p-4 shadow-md flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </main>
  );
};
