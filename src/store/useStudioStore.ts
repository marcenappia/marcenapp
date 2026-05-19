import { create } from 'zustand';

export type CommandStatus = 'pending' | 'processing' | 'completed' | 'failed';

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
  setGeneratedImage: (url: string | null) => void;
  clearQueue: () => void;
  removeFromQueue: (id: string) => void;
}

export const useStudioStore = create<StudioState>((set) => ({
  commandQueue: [],
  lastResult: null,
  generatedImage: null,
  isRendering: false,

  enqueueCommand: (command) => {
    const id = Math.random().toString(36).substring(7);
    const newCommand: RenderCommand = {
      ...command,
      id,
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

  setGeneratedImage: (url) => set({ generatedImage: url }),
  
  clearQueue: () => set({ commandQueue: [] }),
  
  removeFromQueue: (id) => set((state) => ({
    commandQueue: state.commandQueue.filter(cmd => cmd.id !== id)
  })),
}));
