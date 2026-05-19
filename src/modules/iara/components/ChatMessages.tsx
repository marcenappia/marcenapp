import React from 'react';
import { Maximize2, Loader2, AlertCircle, RefreshCcw, XCircle } from 'lucide-react';
import { useStudioStore } from '@/store/useStudioStore';
import { useMarcenappOS } from '@/store/useMarcenappOS';

export interface ChatMessage {
  id: string;
  user_id: string;
  sender: string;
  text: string | null;
  image_url: string | null;
  budget: string | null;
  created_at: string;
  metadata?: {
    commandId?: string;
    resultUrl?: string;
  };
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  isTyping: boolean;
  onImageZoom: (data: { url: string; budget?: string | null }) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export const ChatMessages = ({ messages, isTyping, onImageZoom, messagesEndRef }: ChatMessagesProps) => {
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
