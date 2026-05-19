import React from 'react';
import { Maximize2 } from 'lucide-react';

export interface ChatMessage {
  id: string;
  user_id: string;
  sender: string;
  text: string | null;
  image_url: string | null;
  budget: string | null;
  created_at: string;
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  isTyping: boolean;
  onImageZoom: (data: { url: string; budget?: string | null }) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export const ChatMessages = ({ messages, isTyping, onImageZoom, messagesEndRef }: ChatMessagesProps) => {
  return (
    <main className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin relative">
      <div className="text-center pb-2">
        <span className="px-3 py-1 bg-muted rounded-full text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Sessão de Materialização</span>
      </div>

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
