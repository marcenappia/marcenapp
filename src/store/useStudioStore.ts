import { create } from 'zustand';

interface RenderCommand {
  id: string;
  prompt: string;
  images?: { mimeType: string; data: string }[];
  style?: string;
  decor?: string;
  callback?: (imageUrl: string) => void;
}

interface StudioState {
  pendingCommand: RenderCommand | null;
  lastResult: string | null;
  isRendering: boolean;
  requestRender: (command: Omit<RenderCommand, 'id'>) => void;
  setRendering: (loading: boolean) => void;
  setResult: (url: string | null) => void;
  clearCommand: () => void;
}

export const useStudioStore = create<StudioState>((set) => ({
  pendingCommand: null,
  lastResult: null,
  isRendering: false,
  requestRender: (command) => set({ 
    pendingCommand: { ...command, id: Math.random().toString(36).substring(7) } 
  }),
  setRendering: (loading) => set({ isRendering: loading }),
  setResult: (url) => set({ lastResult: url }),
  clearCommand: () => set({ pendingCommand: null }),
}));
