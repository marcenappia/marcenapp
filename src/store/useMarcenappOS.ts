import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type OSModule = 'iara' | 'studio' | 'portal' | 'estela' | 'production' | 'system';
export type OSCommandStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface OSCommand {
  id: string;
  source: OSModule;
  target: OSModule;
  action: string;
  payload: Record<string, unknown>;
  status: OSCommandStatus;
  result?: Record<string, unknown>;
  error?: string;
  timestamp: number;
  idempotencyKey?: string;
}

interface OSState {
  // Núcleo: Estado Global e Gerenciamento de Comandos
  commandHistory: OSCommand[];
  activeModule: string;
  
  // Ações de Governança
  dispatchCommand: (cmd: Omit<OSCommand, 'id' | 'status' | 'timestamp'>) => string;
  updateCommandStatus: (id: string, status: OSCommandStatus, result?: Record<string, unknown>, error?: string) => void;
  setActiveModule: (id: string) => void;
  
  // Memória e Cache
  clearHistory: () => void;
}

export const useMarcenappOS = create<OSState>()(
  persist(
    (set, get) => ({
      commandHistory: [],
      activeModule: 'chat',

      dispatchCommand: (cmd) => {
        const id = Math.random().toString(36).substring(7) + Date.now().toString();
        
        // Idempotência
        if (cmd.idempotencyKey) {
          const existing = get().commandHistory.find(c => c.idempotencyKey === cmd.idempotencyKey);
          if (existing && existing.status !== 'failed' && existing.status !== 'cancelled') {
            return existing.id;
          }
        }

        const newCmd: OSCommand = {
          ...cmd,
          id,
          status: 'pending',
          timestamp: Date.now()
        };

        set(state => ({
          commandHistory: [newCmd, ...state.commandHistory].slice(0, 100) // Mantém os últimos 100 comandos
        }));

        return id;
      },

      updateCommandStatus: (id, status, result, error) => set(state => ({
        commandHistory: state.commandHistory.map(cmd => 
          cmd.id === id ? { ...cmd, status, result, error } : cmd
        )
      })),

      setActiveModule: (id) => set({ activeModule: id }),
      
      clearHistory: () => set({ commandHistory: [] }),
    }),
    {
      name: 'marcenapp-os-core',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);
