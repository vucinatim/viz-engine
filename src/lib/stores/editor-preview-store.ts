import { useStore } from 'zustand';

import { vizSessionActions, vizSessionStore } from '@/lib/viz-session';
import type { VizEditorTransportState } from '@viz-engine/editor-session';

export interface EditorPreviewStore {
  transport: VizEditorTransportState;
  play: () => void;
  pause: () => void;
  togglePlayback: () => void;
  seekToFrame: (frame: number) => void;
  seekToSeconds: (seconds: number) => void;
  syncCurrentFrame: (frame: number) => void;
  setDurationFrames: (durationFrames: number) => void;
  reset: () => void;
}

const selectEditorPreviewStore = (): EditorPreviewStore => {
  const preview = vizSessionStore.getState().preview;

  return {
    transport: preview.transport,
    play: vizSessionActions.preview.play,
    pause: vizSessionActions.preview.pause,
    togglePlayback: vizSessionActions.preview.togglePlayback,
    seekToFrame: vizSessionActions.preview.seekToFrame,
    seekToSeconds: vizSessionActions.preview.seekToSeconds,
    syncCurrentFrame: vizSessionActions.preview.syncCurrentFrame,
    setDurationFrames: vizSessionActions.preview.setDurationFrames,
    reset: vizSessionActions.preview.reset,
  };
};

type EditorPreviewSelector<T> = (state: EditorPreviewStore) => T;
type EditorPreviewListener = (
  state: EditorPreviewStore,
  previousState: EditorPreviewStore,
) => void;

const useEditorPreviewStore = Object.assign(
  <T>(selector: EditorPreviewSelector<T>) =>
    useStore(vizSessionStore, () => selector(selectEditorPreviewStore())),
  {
    getState: () => selectEditorPreviewStore(),
    setState: (partial: Partial<EditorPreviewStore>) => {
      if (partial.transport) {
        vizSessionActions.preview.setState({
          transport: partial.transport,
        });
      }
    },
    subscribe: (listener: EditorPreviewListener) =>
      vizSessionStore.subscribe((state, previousState) =>
        listener(
          {
            ...selectEditorPreviewStore(),
            transport: state.preview.transport,
          },
          {
            ...selectEditorPreviewStore(),
            transport: previousState.preview.transport,
          },
        ),
      ),
  },
);

export default useEditorPreviewStore;
