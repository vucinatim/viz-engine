import { useStore } from 'zustand';

import { vizSessionStore } from './store';
import type { VizSessionState } from './types';

export const useVizSessionSelector = <T>(
  selector: (state: VizSessionState) => T,
) => useStore(vizSessionStore, selector);
