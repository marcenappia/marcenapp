import { create } from 'zustand';

export interface ActiveContext {
  clientId: string | null;
  projectId: string | null;
  environmentId: string | null;
  versionId: string | null;
}

interface ActiveContextState extends ActiveContext {
  generation: number;
  setContext: (context: ActiveContext) => void;
  clearContext: () => void;
}

const emptyContext: ActiveContext = {
  clientId: null,
  projectId: null,
  environmentId: null,
  versionId: null,
};

export const useActiveContextStore = create<ActiveContextState>((set) => ({
  ...emptyContext,
  generation: 0,
  setContext: (context) => set((state) => {
    const changed = state.clientId !== context.clientId
      || state.projectId !== context.projectId
      || state.environmentId !== context.environmentId
      || state.versionId !== context.versionId;
    return changed ? { ...context, generation: state.generation + 1 } : state;
  }),
  clearContext: () => set((state) => ({ ...emptyContext, generation: state.generation + 1 })),
}));
