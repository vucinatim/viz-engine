'use client';

import React from 'react';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import {
  createVizEditorAppStore,
  type VizEditorAppState,
  type VizEditorAppStore,
} from '@/lib/v2-editor/app-store';

const VizEditorAppStoreContext = createContext<VizEditorAppStore | null>(null);

export const V2EditorProvider = ({ children }: { children: ReactNode }) => {
  const storeRef = useRef<VizEditorAppStore | null>(null);

  if (!storeRef.current) {
    storeRef.current = createVizEditorAppStore();
  }

  useEffect(() => {
    return () => {
      storeRef.current?.dispose();
    };
  }, []);

  return (
    <VizEditorAppStoreContext.Provider value={storeRef.current}>
      {children}
    </VizEditorAppStoreContext.Provider>
  );
};

const useVizEditorAppStore = (): VizEditorAppStore => {
  const store = useContext(VizEditorAppStoreContext);

  if (!store) {
    throw new Error('V2 editor hooks must be used inside V2EditorProvider.');
  }

  return store;
};

export const useV2EditorSnapshot = (): VizEditorAppState => {
  const store = useVizEditorAppStore();
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
};

export const useV2EditorActions = (): VizEditorAppStore => {
  return useVizEditorAppStore();
};
