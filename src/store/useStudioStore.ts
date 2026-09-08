import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type CommandStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface ImageData {
  mimeType: string;
  data: string;
}

export interface RenderCommand {
  id: string;
  prompt: string;
  images?: ImageData[];
  style?: string;
  decor?: string;
  status: CommandStatus;
  error?: string;
  resultUrl?: string;
  timestamp: number;
  idempotencyKey?: string;
  metadata?: {
    origin: 'iara' | 'manual';
    originalPrompt?: string;
    targetModule?: string;
  };
}

export interface StudioState {
  commandQueue: RenderCommand[];
  lastResult: string | null;
  generatedImage: string | null;
  isRendering: boolean;
  
  // Actions
  enqueueCommand: (command: Omit<RenderCommand, 'id' | 'status' | 'timestamp'>) => string;
  startProcessing: (id: string) => void;
  completeCommand: (id: string, resultUrl: string) => void;
  failCommand: (id: string, error: string) => void;
  cancelCommand: (id: string) => void;
  setGeneratedImage: (url: string | null) => void;
  clearQueue: () => void;
  removeFromQueue: (id: string) => void;
}

export const useStudioStore = create<StudioState>()(
  persist(
    (set, get) => ({
      commandQueue: [],
      lastResult: null,
      generatedImage: null,
      isRendering: false,

      enqueueCommand: (command) => {
        const idempotencyKey = command.idempotencyKey || 
          Math.random().toString(36).substring(7) + Date.now().toString();
        
        const existingCommand = get().commandQueue.find(
          cmd => cmd.idempotencyKey === idempotencyKey
        );
        
        if (existingCommand && existingCommand.status !== 'failed' && existingCommand.status !== 'cancelled') {
          return existingCommand.id;
        }

        const id = Math.random().toString(36).substring(7);
        const newCommand: RenderCommand = {
          ...command,
          id,
          idempotencyKey,
          status: 'pending',
          timestamp: Date.now()
        };
        
        set((state) => ({
          commandQueue: [...state.commandQueue, newCommand]
        }));
        
        return id;
      },

      startProcessing: (id) => set((state) => ({
        isRendering: true,
        commandQueue: state.commandQueue.map(cmd => 
          cmd.id === id ? { ...cmd, status: 'processing' } : cmd
        )
      })),

      completeCommand: (id, resultUrl) => set((state) => ({
        isRendering: false,
        lastResult: resultUrl,
        generatedImage: resultUrl,
        commandQueue: state.commandQueue.map(cmd => 
          cmd.id === id ? { ...cmd, status: 'completed', resultUrl } : cmd
        )
      })),

      failCommand: (id, error) => set((state) => ({
        isRendering: false,
        commandQueue: state.commandQueue.map(cmd => 
          cmd.id === id ? { ...cmd, status: 'failed', error } : cmd
        )
      })),

      cancelCommand: (id) => set((state) => ({
        isRendering: false,
        commandQueue: state.commandQueue.map(cmd => 
          cmd.id === id ? { ...cmd, status: 'cancelled' } : cmd
        )
      })),

      setGeneratedImage: (url) => set({ generatedImage: url }),
      
      clearQueue: () => set({ commandQueue: [] }),
      
      removeFromQueue: (id) => set((state) => ({
        commandQueue: state.commandQueue.filter(cmd => cmd.id !== id)
      })),
    }),
    {
      name: 'marcenapp-studio-storage',
      version: 2, // Incrementado de 1 para 2 para refletir a nova estrutura de comandos (idempotencyKey, metadata, etc)
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState: unknown, version: number) => {
        const state = (persistedState && typeof persistedState === 'object'
          ? persistedState
          : {}) as Partial<StudioState>;
        if (version === 0) {
          // Migração da versão legada (sem commandQueue)
          return {
            ...state,
            commandQueue: [],
          };
        }
        if (version === 1) {
          // Migração da versão 1 para 2: Adiciona campos obrigatórios caso faltem
          return {
            ...state,
            commandQueue: state.commandQueue?.map((cmd: Partial<RenderCommand>) => ({
              ...cmd,
              status: cmd.status || 'pending',
              metadata: cmd.metadata || { origin: 'manual' }
            })) || []
          };
        }
        return persistedState;
      },
      partialize: (state) => ({ 
        commandQueue: state.commandQueue.map(cmd => ({
          ...cmd,
          // Evitamos persistir base64 gigantes no localStorage se possível, 
          // mas para manter consistência entre reloads de rascunhos pendentes, mantemos por enquanto.
          images: (cmd.status === 'completed' || cmd.status === 'cancelled') ? [] : cmd.images 
        })),
        lastResult: state.lastResult,
        generatedImage: state.generatedImage
      }),
    }
  )
);
