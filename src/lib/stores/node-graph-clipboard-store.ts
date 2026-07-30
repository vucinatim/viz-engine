import { create } from 'zustand';

import type { VizGraphFragment } from '@/lib/viz-session/graph-fragments';

interface NodeGraphClipboardStore {
  clipboard: VizGraphFragment | null;
  setClipboard: (fragment: VizGraphFragment) => void;
  clearClipboard: () => void;
  hasClipboardData: () => boolean;
}

export const useNodeGraphClipboardStore = create<NodeGraphClipboardStore>(
  (set, get) => ({
    clipboard: null,
    setClipboard: (clipboard) => set({ clipboard: structuredClone(clipboard) }),
    clearClipboard: () => set({ clipboard: null }),
    hasClipboardData: () => (get().clipboard?.nodes.length ?? 0) > 0,
  }),
);
