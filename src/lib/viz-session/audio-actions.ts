import useAudioEngineStore from '@/lib/stores/audio-engine-store';
import type { VizSessionHost } from '@viz-engine/editor-control';
import type {
  VizEditorAudioAnalyzerState,
  VizEditorAudioSource,
} from '@viz-engine/editor-session';

import type { VizSessionAudioState } from './types';

interface CreateStudioAudioActionsOptions {
  host: VizSessionHost;
  getState(): VizSessionAudioState;
  replaceState(state: VizSessionAudioState): void;
  seekToFrame(frame: number): void;
}

const bundledTrackUrl = (filename: string) => `/music/${filename}`;

export const createStudioAudioActions = ({
  host,
  getState,
  replaceState,
  seekToFrame,
}: CreateStudioAudioActionsOptions) => {
  const snapshotState = (): Pick<
    VizSessionAudioState,
    'session' | 'diagnostics'
  > => ({
    session: host.getSnapshot().audioSession,
    diagnostics: host.getSnapshot().audioDiagnostics,
  });

  const actions = {
    setTrackList(trackList: string[]) {
      replaceState({ ...getState(), trackList });
    },
    setCurrentTime(currentTime: number) {
      replaceState({ ...getState(), currentTime });
    },
    setVisualTime(visualTime: number) {
      replaceState({ ...getState(), visualTime });
    },
    attachBundledTrack(filename: string, index?: number) {
      const url = bundledTrackUrl(filename);
      useAudioEngineStore.getState().loadAudioUrl(url);
      host.attachAudioSource({
        kind: 'media-element',
        id: filename,
        label: filename,
        uri: url,
      });
      seekToFrame(0);
      replaceState({
        ...getState(),
        ...snapshotState(),
        audioFile: null,
        currentTrackUrl: url,
        currentTrackIndex:
          typeof index === 'number' ? index : getState().currentTrackIndex,
        currentTime: 0,
        visualTime: 0,
      });
    },
    attachLocalFile(audioFile: File, objectUrl: string) {
      useAudioEngineStore.getState().loadAudioUrl(objectUrl);
      host.attachAudioSource({
        kind: 'file',
        id: `${audioFile.name}:${audioFile.lastModified}`,
        label: audioFile.name,
        uri: objectUrl,
      });
      seekToFrame(0);
      replaceState({
        ...getState(),
        ...snapshotState(),
        audioFile,
        currentTrackUrl: objectUrl,
        currentTrackIndex: -1,
        currentTime: 0,
        visualTime: 0,
      });
    },
    attachCapturedStream(label: string) {
      host.attachAudioSource({
        kind: 'stream',
        id: 'captured-tab-audio',
        label,
      });
      seekToFrame(0);
      replaceState({
        ...getState(),
        ...snapshotState(),
        currentTime: 0,
        visualTime: 0,
      });
    },
    detachCapturedStream() {
      const { currentTrackUrl } = getState();
      host.clearAudioSource();
      host.setLiveInputAvailable(false);
      host.setAudioAnalyzerState('idle');
      seekToFrame(0);
      replaceState({
        ...getState(),
        ...snapshotState(),
        currentTime: 0,
        visualTime: 0,
      });

      if (!currentTrackUrl) {
        useAudioEngineStore.getState().clearElementSource();
        return;
      }

      useAudioEngineStore.getState().restoreElementUrl(currentTrackUrl);
      const audioFile = getState().audioFile;
      host.attachAudioSource({
        kind: audioFile ? 'file' : 'media-element',
        id: audioFile
          ? `${audioFile.name}:${audioFile.lastModified}`
          : currentTrackUrl,
        label: audioFile?.name ?? getState().session.source?.label,
        uri: currentTrackUrl,
      });
      replaceState({
        ...getState(),
        ...snapshotState(),
      });
    },
    setAnalyzerState(analyzerState: VizEditorAudioAnalyzerState) {
      host.setAudioAnalyzerState(analyzerState);
    },
    setLiveInputAvailable(liveInputAvailable: boolean) {
      host.setLiveInputAvailable(liveInputAvailable);
    },
    skipToNext() {
      const { trackList, currentTrackIndex } = getState();
      if (trackList.length === 0) {
        return;
      }
      const nextIndex = (currentTrackIndex + 1) % trackList.length;
      actions.attachBundledTrack(trackList[nextIndex], nextIndex);
    },
    skipToPrevious() {
      const { trackList, currentTrackIndex } = getState();
      if (trackList.length === 0) {
        return;
      }
      if (useAudioEngineStore.getState().getElementCurrentTime() > 3) {
        actions.restartTrack();
        return;
      }
      const previousIndex =
        currentTrackIndex <= 0 ? trackList.length - 1 : currentTrackIndex - 1;
      actions.attachBundledTrack(trackList[previousIndex], previousIndex);
    },
    restartTrack() {
      useAudioEngineStore.getState().seekElementToTime(0);
      seekToFrame(0);
      replaceState({
        ...getState(),
        currentTime: 0,
        visualTime: 0,
      });
    },
    clearSelection() {
      host.clearAudioSource();
      host.setLiveInputAvailable(false);
      host.setAudioAnalyzerState('idle');
      useAudioEngineStore.getState().clearElementSource();
      seekToFrame(0);
      replaceState({
        ...getState(),
        ...snapshotState(),
        audioFile: null,
        currentTrackUrl: null,
        currentTrackIndex: -1,
        currentTime: 0,
        visualTime: 0,
      });
    },
    reset() {
      host.clearAudioSource();
      host.setLiveInputAvailable(false);
      host.setAudioAnalyzerState('idle');
      replaceState({
        ...snapshotState(),
        audioFile: null,
        currentTrackUrl: null,
        trackList: [],
        currentTrackIndex: -1,
        currentTime: 0,
        visualTime: 0,
      });
    },
    attachSource(source: VizEditorAudioSource) {
      host.attachAudioSource(source);
      replaceState({
        ...getState(),
        ...snapshotState(),
      });
    },
    clearSource() {
      host.clearAudioSource();
      replaceState({
        ...getState(),
        ...snapshotState(),
      });
    },
    setState(partial: Partial<VizSessionAudioState>) {
      replaceState({
        ...getState(),
        ...partial,
      });
    },
  };

  return actions;
};
