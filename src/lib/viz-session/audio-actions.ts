import { audioPresentationClock } from '@/lib/audio-presentation-clock';
import { probeAudioUrl } from '@/lib/audio-source-loader';
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
  let sourceRequest = 0;
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
    async attachBundledTrack(filename: string, index?: number) {
      const url = bundledTrackUrl(filename);
      const request = ++sourceRequest;
      const engine = useAudioEngineStore.getState();
      engine.beginSourceLoad(filename);
      try {
        await probeAudioUrl(url);
      } catch (cause) {
        if (request === sourceRequest) {
          engine.failSourceLoad(
            filename,
            cause instanceof Error ? cause.message : 'Audio loading failed.',
          );
        }
        return false;
      }
      if (request !== sourceRequest) return false;
      engine.loadAudioUrl(url);
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
      });
      audioPresentationClock.reset();
      engine.finishSourceLoad();
      return true;
    },
    async attachLocalFile(audioFile: File, objectUrl: string) {
      const request = ++sourceRequest;
      const engine = useAudioEngineStore.getState();
      engine.beginSourceLoad(audioFile.name);
      try {
        await probeAudioUrl(objectUrl);
      } catch (cause) {
        URL.revokeObjectURL(objectUrl);
        if (request === sourceRequest) {
          engine.failSourceLoad(
            audioFile.name,
            cause instanceof Error ? cause.message : 'Audio loading failed.',
          );
        }
        return false;
      }
      if (request !== sourceRequest) {
        URL.revokeObjectURL(objectUrl);
        return false;
      }
      engine.loadAudioUrl(objectUrl, objectUrl);
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
      });
      audioPresentationClock.reset();
      engine.finishSourceLoad();
      return true;
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
      });
      audioPresentationClock.reset();
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
      });
      audioPresentationClock.reset();

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
    async skipToNext() {
      const { trackList, currentTrackIndex } = getState();
      if (trackList.length === 0) {
        return;
      }
      const nextIndex = (currentTrackIndex + 1) % trackList.length;
      return actions.attachBundledTrack(trackList[nextIndex], nextIndex);
    },
    async skipToPrevious() {
      const { trackList, currentTrackIndex } = getState();
      if (trackList.length === 0) {
        return false;
      }
      if (useAudioEngineStore.getState().getElementCurrentTime() > 3) {
        actions.restartTrack();
        return true;
      }
      const previousIndex =
        currentTrackIndex <= 0 ? trackList.length - 1 : currentTrackIndex - 1;
      return actions.attachBundledTrack(
        trackList[previousIndex],
        previousIndex,
      );
    },
    restartTrack() {
      useAudioEngineStore.getState().seekElementToTime(0);
      seekToFrame(0);
      audioPresentationClock.reset();
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
      });
      audioPresentationClock.reset();
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
      });
      audioPresentationClock.reset();
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
