import { AnimInputData } from '@/components/config/animation-nodes';
import { create } from 'zustand';

type NodeOutputCacheState = {
  // Key is the node ID
  cache: Map<string, any>;
  globalAnimData: AnimInputData | null;
  setNodeOutput: (nodeId: string, output: any) => void;
  getNodeOutput: (nodeId: string) => any | undefined;
  setGlobalAnimData: (data: AnimInputData) => void;
};

export const useNodeOutputCache = create<NodeOutputCacheState>((set, get) => ({
  cache: new Map(),
  globalAnimData: null,
  setNodeOutput: (nodeId, output) => {
    set((state) => ({
      cache: new Map(state.cache).set(nodeId, output),
    }));
  },
  getNodeOutput: (nodeId) => {
    return get().cache.get(nodeId);
  },
  setGlobalAnimData: (data) => set({ globalAnimData: data }),
}));
