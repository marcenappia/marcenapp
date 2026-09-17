import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type OSModule = 'iara' | 'studio' | 'portal' | 'estela' | 'production' | 'system';
export type OSCommandStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type OSCommandPayload = Record<string, unknown>;
export type OSCommandResult = { resultUrl?: string; imageUrl?: string; [key: string]: unknown };

export interface OSCommand {
  id: string;
  source: OSModule;
  target: OSModule;
  action: string;
  payload: OSCommandPayload;
  status: OSCommandStatus;
  result?: OSCommandResult;
  error?: string;
  timestamp: number;
  idempotencyKey?: string;
}

interface OSState {
  commandHistory: OSCommand[];
  activeModule: string;
  dispatchCommand: (cmd: Omit<OSCommand, 'id' | 'status' | 'timestamp'>) => string;
  updateCommandStatus: (id: string, status: OSCommandStatus, result?: OSCommandResult, error?: string) => void;
  setActiveModule: (id: string) => void;
  clearHistory: () => void;
}

export const useMarcenappOS = create<OSState>()(
  persist(
    (set, get) => ({
      commandHistory: [],
      activeModule: 'chat',
      dispatchCommand: (cmd) => {
        const id = Math.random().toString(36).substring(7) + Date.now().toString();
        if (cmd.idempotencyKey) {
          const existing = get().commandHistory.find(c => c.idempotencyKey === cmd.idempotencyKey);
          if (existing && existing.status !== 'failed' && existing.status !== 'cancelled') return existing.id;
        }
        const newCmd: OSCommand = { ...cmd, id, status: 'pending', timestamp: Date.now() };
        set(state => ({ commandHistory: [newCmd, ...state.commandHistory].slice(0, 100) }));
        return id;
      },
      updateCommandStatus: (id, status, result, error) => set(state => {
        const updated = state.commandHistory.find(cmd => cmd.id === id);
        if (!updated) return state;
        const next = { ...updated, status, result, error };
        return { commandHistory: [next, ...state.commandHistory.filter(cmd => cmd.id !== id)].slice(0, 100) };
      }),
      setActiveModule: (id) => set({ activeModule: id }),
      clearHistory: () => set({ commandHistory: [] }),
    }),
    { name: 'marcenapp-os-core', storage: createJSONStorage(() => localStorage), version: 1 }
  )
);