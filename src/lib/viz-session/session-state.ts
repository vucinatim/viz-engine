import { createIdbJsonStorage } from '@/lib/idb-json-storage';
import {
  VIZ_PROJECT_SCHEMA_VERSION,
  type VizProjectDocument,
} from '@viz-engine/contracts';
import type { VizSessionHost } from '@viz-engine/editor-control';
import { validateProjectDocument } from '@viz-engine/runtime';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';

import { createEmptyVizProjectDocument } from './project-document';
import type {
  VizSessionAudioState,
  VizSessionHistoryState,
  VizSessionPreviewState,
  VizSessionProjectState,
  VizSessionState,
} from './types';

const createSessionStorage = () => {
  if (typeof window === 'undefined') {
    return {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    };
  }

  return createIdbJsonStorage({
    dbName: 'viz-engine',
    storeName: 'viz-session-store',
    throttleMs: 100,
  });
};

const createInitialProjectState = (): VizSessionProjectState => ({
  initialized: false,
  revision: 0,
  sourceProject: null,
  workingProject: createEmptyVizProjectDocument(),
});

const createInitialPreviewState = (
  host: VizSessionHost,
): VizSessionPreviewState => ({ transport: host.getSnapshot().transport });

const createInitialAudioState = (
  host: VizSessionHost,
): VizSessionAudioState => ({
  session: host.getSnapshot().audioSession,
  diagnostics: host.getSnapshot().audioDiagnostics,
  audioFile: null,
  currentTrackUrl: null,
  trackList: [],
  currentTrackIndex: -1,
  currentTime: 0,
  visualTime: 0,
});

const createInitialHistoryState = (): VizSessionHistoryState => ({
  isNodeEditorFocused: false,
  activeGestureId: null,
});

interface PersistedVizProjectState {
  projectDocument: VizProjectDocument;
}

export const createStudioSessionStore = (host: VizSessionHost) =>
  createStore<VizSessionState>()(
    persist<VizSessionState, [], [], PersistedVizProjectState>(
      () => ({
        project: createInitialProjectState(),
        preview: createInitialPreviewState(host),
        audio: createInitialAudioState(host),
        history: createInitialHistoryState(),
      }),
      {
        name: `viz-project-${VIZ_PROJECT_SCHEMA_VERSION}`,
        storage: createJSONStorage(createSessionStorage),
        partialize: (state) => ({
          projectDocument: state.project.workingProject,
        }),
        merge: (persistedState, currentState) => {
          const persistedDocument = (
            persistedState as Partial<PersistedVizProjectState>
          )?.projectDocument;
          const persistedProject =
            persistedDocument && validateProjectDocument(persistedDocument).ok
              ? persistedDocument
              : currentState.project.workingProject;

          return {
            ...currentState,
            project: {
              initialized: false,
              revision: 0,
              sourceProject: null,
              workingProject: persistedProject,
            },
          };
        },
      },
    ),
  );
