import { useStore } from 'zustand';

import { vizSessionActions, vizSessionStore } from '@/lib/viz-session';
import type {
  VizEditorAudioAnalyzerState,
  VizEditorAudioSessionState,
  VizEditorLiveInputDiagnostics,
} from '@viz-engine/editor-session';

export interface EditorAudioSessionStore {
  session: VizEditorAudioSessionState;
  diagnostics: VizEditorLiveInputDiagnostics;
  audioFile: File | null;
  currentTrackUrl: string | null;
  trackList: string[];
  currentTrackIndex: number;
  currentTime: number;
  visualTime: number;
  setTrackList: (trackList: string[]) => void;
  setCurrentTime: (currentTime: number) => void;
  setVisualTime: (visualTime: number) => void;
  attachBundledTrack: (filename: string, index?: number) => void;
  attachLocalFile: (audioFile: File, objectUrl: string) => void;
  attachCapturedStream: (label: string) => void;
  detachCapturedStream: () => void;
  setAnalyzerState: (analyzerState: VizEditorAudioAnalyzerState) => void;
  setLiveInputAvailable: (liveInputAvailable: boolean) => void;
  skipToNext: () => void;
  skipToPrevious: () => void;
  restartTrack: () => void;
  clearSelection: () => void;
  reset: () => void;
}

const selectEditorAudioSessionStore = (): EditorAudioSessionStore => {
  const audio = vizSessionStore.getState().audio;

  return {
    session: audio.session,
    diagnostics: audio.diagnostics,
    audioFile: audio.audioFile,
    currentTrackUrl: audio.currentTrackUrl,
    trackList: audio.trackList,
    currentTrackIndex: audio.currentTrackIndex,
    currentTime: audio.currentTime,
    visualTime: audio.visualTime,
    setTrackList: vizSessionActions.audio.setTrackList,
    setCurrentTime: vizSessionActions.audio.setCurrentTime,
    setVisualTime: vizSessionActions.audio.setVisualTime,
    attachBundledTrack: vizSessionActions.audio.attachBundledTrack,
    attachLocalFile: vizSessionActions.audio.attachLocalFile,
    attachCapturedStream: vizSessionActions.audio.attachCapturedStream,
    detachCapturedStream: vizSessionActions.audio.detachCapturedStream,
    setAnalyzerState: vizSessionActions.audio.setAnalyzerState,
    setLiveInputAvailable: vizSessionActions.audio.setLiveInputAvailable,
    skipToNext: vizSessionActions.audio.skipToNext,
    skipToPrevious: vizSessionActions.audio.skipToPrevious,
    restartTrack: vizSessionActions.audio.restartTrack,
    clearSelection: vizSessionActions.audio.clearSelection,
    reset: vizSessionActions.audio.reset,
  };
};

type EditorAudioSessionSelector<T> = (state: EditorAudioSessionStore) => T;
type EditorAudioSessionListener = (
  state: EditorAudioSessionStore,
  previousState: EditorAudioSessionStore,
) => void;

const useEditorAudioSessionStore = Object.assign(
  <T>(selector: EditorAudioSessionSelector<T>) =>
    useStore(vizSessionStore, () => selector(selectEditorAudioSessionStore())),
  {
    getState: () => selectEditorAudioSessionStore(),
    setState: (partial: Partial<EditorAudioSessionStore>) =>
      vizSessionActions.audio.setState({
        session: partial.session,
        diagnostics: partial.diagnostics,
        audioFile: partial.audioFile,
        currentTrackUrl: partial.currentTrackUrl,
        trackList: partial.trackList,
        currentTrackIndex: partial.currentTrackIndex,
        currentTime: partial.currentTime,
        visualTime: partial.visualTime,
      }),
    subscribe: (listener: EditorAudioSessionListener) =>
      vizSessionStore.subscribe((state, previousState) =>
        listener(
          {
            ...selectEditorAudioSessionStore(),
            ...state.audio,
          },
          {
            ...selectEditorAudioSessionStore(),
            ...previousState.audio,
          },
        ),
      ),
  },
);

export default useEditorAudioSessionStore;
