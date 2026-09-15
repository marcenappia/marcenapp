import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type CommandStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export interface ImageData { mimeType: string; data: string; }
export interface RenderCommand { id: string; prompt: string; images?: ImageData[]; style?: string; decor?: string; status: CommandStatus; error?: string; resultUrl?: string; timestamp: number; idempotencyKey?: string; metadata?: { origin: 'iara' | 'manual'; originalPrompt?: string; targetModule?: string; referenceCount?: number; planId?: string; }; }
export interface StudioState { commandQueue: RenderCommand[]; lastResult: string | null; generatedImage: string | null; isRendering: boolean; enqueueCommand: (command: Omit<RenderCommand, 'id' | 'status' | 'timestamp'>) => string; startProcessing: (id: string) => void; completeCommand: (id: string, resultUrl: string) => void; failCommand: (id: string, error: string) => void; cancelCommand: (id: string) => void; setGeneratedImage: (url: string | null) => void; clearQueue: () => void; removeFromQueue: (id: string) => void; }

type PersistedStudioState = Partial<StudioState>;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const asPersistedState = (value: unknown): PersistedStudioState => isRecord(value) ? value as PersistedStudioState : {};
const asStatus = (value: unknown): CommandStatus => value === 'processing' || value === 'completed' || value === 'failed' || value === 'cancelled' ? value : 'pending';
const asMetadata = (value: unknown): RenderCommand['metadata'] => {
  if (!isRecord(value)) return { origin: 'manual' };
  const origin = value.origin === 'iara' ? 'iara' : 'manual';
  return {
    origin,
    ...(typeof value.originalPrompt === 'string' ? { originalPrompt: value.originalPrompt } : {}),
    ...(typeof value.targetModule === 'string' ? { targetModule: value.targetModule } : {}),
    ...(typeof value.referenceCount === 'number' ? { referenceCount: value.referenceCount } : {}),
    ...(typeof value.planId === 'string' ? { planId: value.planId } : {}),
  };
};
const asMigratedCommand = (value: unknown, recoverProcessing = false): RenderCommand | null => {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.prompt !== 'string') return null;
  const persistedStatus = asStatus(value.status);
  const status = recoverProcessing && persistedStatus === 'processing' ? 'pending' : persistedStatus;
  return {
    id: value.id,
    prompt: value.prompt,
    status,
    timestamp: typeof value.timestamp === 'number' ? value.timestamp : Date.now(),
    ...(Array.isArray(value.images) ? { images: value.images.filter(isRecord).flatMap(image => typeof image.mimeType === 'string' && typeof image.data === 'string' ? [{ mimeType: image.mimeType, data: image.data }] : []) } : {}),
    ...(typeof value.style === 'string' ? { style: value.style } : {}),
    ...(typeof value.decor === 'string' ? { decor: value.decor } : {}),
    ...(typeof value.error === 'string' ? { error: value.error } : {}),
    ...(typeof value.resultUrl === 'string' ? { resultUrl: value.resultUrl } : {}),
    ...(typeof value.idempotencyKey === 'string' ? { idempotencyKey: value.idempotencyKey } : {}),
    metadata: asMetadata(value.metadata),
  };
};

export const useStudioStore = create<StudioState>()(
  persist(
    (set, get) => ({
      commandQueue: [], lastResult: null, generatedImage: null, isRendering: false,
      enqueueCommand: (command) => {
        const idempotencyKey = command.idempotencyKey || Math.random().toString(36).substring(7) + Date.now().toString();
        const existingCommand = get().commandQueue.find(cmd => cmd.idempotencyKey === idempotencyKey);
        if (existingCommand && existingCommand.status !== 'failed' && existingCommand.status !== 'cancelled') return existingCommand.id;
        const id = Math.random().toString(36).substring(7);
        const newCommand: RenderCommand = { ...command, id, idempotencyKey, status: 'pending', timestamp: Date.now() };
        set(state => ({ commandQueue: [...state.commandQueue, newCommand] })); return id;
      },
      startProcessing: (id) => set(state => ({ isRendering: true, commandQueue: state.commandQueue.map(cmd => cmd.id === id ? { ...cmd, status: 'processing' } : cmd) })),
      completeCommand: (id, resultUrl) => set(state => ({ isRendering: false, lastResult: resultUrl, generatedImage: resultUrl, commandQueue: state.commandQueue.map(cmd => cmd.id === id ? { ...cmd, status: 'completed', resultUrl } : cmd) })),
      failCommand: (id, error) => set(state => ({ isRendering: false, commandQueue: state.commandQueue.map(cmd => cmd.id === id ? { ...cmd, status: 'failed', error } : cmd) })),
      cancelCommand: (id) => set(state => ({ isRendering: false, commandQueue: state.commandQueue.map(cmd => cmd.id === id ? { ...cmd, status: 'cancelled' } : cmd) })),
      setGeneratedImage: (url) => set({ generatedImage: url }),
      clearQueue: () => set({ commandQueue: [] }),
      removeFromQueue: (id) => set(state => ({ commandQueue: state.commandQueue.filter(cmd => cmd.id !== id) })),
    }),
    {
      name: 'marcenapp-studio-storage',
      version: 3,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState: unknown, version: number) => {
        const state = asPersistedState(persistedState);
        if (version === 0) return { ...state, commandQueue: [] };
        if (version === 1) {
          const commandQueue = Array.isArray(state.commandQueue) ? state.commandQueue.map(command => asMigratedCommand(command)).filter((command): command is RenderCommand => command !== null) : [];
          return { ...state, commandQueue };
        }
        if (version === 2) {
          const commandQueue = Array.isArray(state.commandQueue) ? state.commandQueue.map(command => asMigratedCommand(command, true)).filter((command): command is RenderCommand => command !== null) : [];
          return { ...state, commandQueue };
        }
        return state;
      },
      partialize: (state) => ({ commandQueue: state.commandQueue.map(cmd => ({ ...cmd, status: cmd.status === 'processing' ? 'pending' : cmd.status, images: (cmd.status === 'completed' || cmd.status === 'cancelled') ? [] : cmd.images })), lastResult: state.lastResult, generatedImage: state.generatedImage }),
    }
  )
);
