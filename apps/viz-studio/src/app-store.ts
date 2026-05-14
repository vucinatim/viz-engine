import {
  createVizEditorControl,
  type VizEditorComponentSummary,
  type VizEditorControl,
  type VizEditorControlDebugSnapshot,
  type VizEditorControlMutationResult,
  type VizEditorControlSnapshot,
  type VizEditorGraphRuntimeInspection,
} from "@viz-engine/editor-control";
import type {
  VizEditorAudioAnalyzerState,
  VizEditorAudioSource,
} from "@viz-engine/editor-session";
import type { VizProjectAction } from "@viz-engine/contracts";

export interface VizEditorAppAudioState {
  fileName: string | undefined;
  sourceKind: VizEditorAudioSource["kind"] | undefined;
  currentTimeSeconds: number;
  durationSeconds: number;
  hasBoundElement: boolean;
  hasAudioSource: boolean;
  error: string | undefined;
}

export interface VizEditorAppState {
  snapshot: VizEditorControlSnapshot;
  debugSnapshot: VizEditorControlDebugSnapshot;
  graphRuntime: VizEditorGraphRuntimeInspection;
  components: VizEditorComponentSummary[];
  audio: VizEditorAppAudioState;
}

export interface VizEditorAppStore {
  subscribe(listener: () => void): () => void;
  getState(): VizEditorAppState;
  dispose(): void;
  openExampleProject(): VizEditorAppState;
  setActivePanel(panel: VizEditorControlSnapshot["session"]["uiState"]["activePanel"]): VizEditorAppState;
  selectLayer(layerId: string | undefined): VizEditorAppState;
  selectGraph(graphId: string | undefined): VizEditorAppState;
  play(): Promise<VizEditorAppState>;
  pause(): VizEditorAppState;
  togglePlayback(): Promise<VizEditorAppState>;
  seekToFrame(frame: number): VizEditorAppState;
  seekToTime(seconds: number): VizEditorAppState;
  setLoop(loop: boolean): VizEditorAppState;
  setPreviewMode(mode: VizEditorControlSnapshot["transport"]["mode"]): VizEditorAppState;
  applyAction(action: VizProjectAction): VizEditorControlMutationResult;
  loadAudioFile(file: File): VizEditorAppState;
  loadBundledAudioTrack(fileName: string): VizEditorAppState;
  bindAudioElement(element: HTMLAudioElement | null): VizEditorAppState;
  setAudioAnalyzerState(state: VizEditorAudioAnalyzerState): VizEditorAppState;
}

type Listener = () => void;
const PLAYBACK_TICK_MS = 25;

const createInitialState = (control: VizEditorControl): VizEditorAppState => {
  return {
    snapshot: control.getSnapshot(),
    debugSnapshot: control.createDebugSnapshot(),
    graphRuntime: control.inspectGraphRuntime(),
    components: control.inspectComponents(),
    audio: {
      fileName: undefined,
      sourceKind: undefined,
      currentTimeSeconds: 0,
      durationSeconds: 0,
      hasBoundElement: false,
      hasAudioSource: false,
      error: undefined,
    },
  };
};

export const createVizEditorAppStore = (): VizEditorAppStore => {
  const control = createVizEditorControl();
  const listeners = new Set<Listener>();

  let audioElement: HTMLAudioElement | null = null;
  let playbackIntervalHandle: number | null = null;
  let lastPlaybackTimestamp = 0;
  let audioObjectUrl: string | undefined;
  let currentAudioSource: VizEditorAudioSource | undefined;
  let state = createInitialState(control);
  const getBaseDurationFrames = () =>
    control.getWorkingProject().timeline.durationInFrames;

  const emit = (): VizEditorAppState => {
    for (const listener of listeners) {
      listener();
    }
    return state;
  };

  const refresh = (): VizEditorAppState => {
    state = {
      ...state,
      snapshot: control.getSnapshot(),
      debugSnapshot: control.createDebugSnapshot(),
      graphRuntime: control.inspectGraphRuntime(),
      components: control.inspectComponents(),
      audio: {
        ...state.audio,
        hasBoundElement: audioElement !== null,
        hasAudioSource: currentAudioSource !== undefined,
        sourceKind: currentAudioSource?.kind,
      },
    };

    return emit();
  };

  const stopPlaybackLoop = () => {
    if (playbackIntervalHandle !== null) {
      window.clearInterval(playbackIntervalHandle);
      playbackIntervalHandle = null;
    }
    lastPlaybackTimestamp = 0;
  };

  const syncFromAudioElement = () => {
    if (!audioElement) {
      return refresh();
    }

    const durationSeconds = Number.isFinite(audioElement.duration)
      ? audioElement.duration
      : state.audio.durationSeconds;
    const nextFrame = Math.floor(
      audioElement.currentTime * state.snapshot.transport.fps,
    );

    control.seekToFrame(nextFrame);
    state = {
      ...state,
      audio: {
        ...state.audio,
        currentTimeSeconds: audioElement.currentTime,
        durationSeconds,
        error: undefined,
      },
    };

    return refresh();
  };

  const ensurePlaybackLoop = () => {
    if (playbackIntervalHandle !== null) {
      return;
    }

    lastPlaybackTimestamp = Date.now();

    playbackIntervalHandle = window.setInterval(() => {
      if (!control.getSnapshot().transport.isPlaying) {
        stopPlaybackLoop();
        return;
      }

      if (audioElement && !audioElement.paused) {
        syncFromAudioElement();
        return;
      }

      const now = Date.now();
      const deltaSeconds = (now - lastPlaybackTimestamp) / 1000;
      lastPlaybackTimestamp = now;
      control.advanceBySeconds(deltaSeconds);
      refresh();
    }, PLAYBACK_TICK_MS);
  };

  const detachAudioListeners = () => {
    if (!audioElement) {
      return;
    }

    audioElement.onloadedmetadata = null;
    audioElement.ontimeupdate = null;
    audioElement.onplay = null;
    audioElement.onpause = null;
    audioElement.onended = null;
    audioElement.onerror = null;
  };

  const revokeAudioObjectUrl = () => {
    if (!audioObjectUrl) {
      return;
    }

    URL.revokeObjectURL(audioObjectUrl);
    audioObjectUrl = undefined;
  };

  const setAudioSource = (source: VizEditorAudioSource | undefined) => {
    currentAudioSource = source;

    if (source) {
      control.attachAudioSource(source);
    } else {
      control.clearAudioSource();
      control.setTransportDurationFrames(getBaseDurationFrames());
    }
  };

  const syncPreviewDurationFromAudio = (durationSeconds: number | undefined) => {
    if (!durationSeconds || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      control.setTransportDurationFrames(getBaseDurationFrames());
      return;
    }

    const audioDurationFrames = Math.max(
      1,
      Math.ceil(durationSeconds * state.snapshot.transport.fps),
    );
    control.setTransportDurationFrames(
      Math.max(getBaseDurationFrames(), audioDurationFrames),
    );
  };

  const loadAudioSource = (source: VizEditorAudioSource) => {
    setAudioSource(source);
    control.setAudioAnalyzerState("unavailable");
    control.setLiveInputAvailable(false);

    state = {
      ...state,
      audio: {
        ...state.audio,
        fileName: source.label,
        sourceKind: source.kind,
        currentTimeSeconds: 0,
        durationSeconds: source.durationSeconds ?? 0,
        error: undefined,
      },
    };

    if (audioElement) {
      audioElement.src = source.uri ?? "";
      audioElement.currentTime = 0;
      audioElement.loop = control.getSnapshot().transport.loop;
      audioElement.load();
    }

    syncPreviewDurationFromAudio(source.durationSeconds);
    return refresh();
  };

  control.setUiState({
    expandedLayerIds: state.snapshot.session.workingProject.layerOrder.slice(0, 3),
    selectedLayerId:
      state.snapshot.session.workingProject.layerOrder[0] ??
      state.snapshot.session.workingProject.layers[0]?.id,
  });
  state = {
    ...state,
    snapshot: control.getSnapshot(),
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getState() {
      return state;
    },
    dispose() {
      stopPlaybackLoop();
      detachAudioListeners();
      revokeAudioObjectUrl();
      if (audioElement) {
        audioElement.pause();
      }
    },
    openExampleProject() {
      stopPlaybackLoop();
      revokeAudioObjectUrl();
      currentAudioSource = undefined;
      control.openExampleProject();
      control.setUiState({
        activePanel: "layers",
        expandedLayerIds: control.getWorkingProject().layerOrder.slice(0, 3),
        selectedLayerId:
          control.getWorkingProject().layerOrder[0] ??
          control.getWorkingProject().layers[0]?.id,
      });
      control.clearAudioSource();
      state = {
        ...state,
        audio: {
          fileName: undefined,
          sourceKind: undefined,
          currentTimeSeconds: 0,
          durationSeconds: 0,
          hasBoundElement: audioElement !== null,
          hasAudioSource: false,
          error: undefined,
        },
      };
      return refresh();
    },
    setActivePanel(panel) {
      control.setUiState({ activePanel: panel });
      return refresh();
    },
    selectLayer(layerId) {
      control.setUiState({ selectedLayerId: layerId });
      return refresh();
    },
    selectGraph(graphId) {
      control.setUiState({ selectedGraphId: graphId });
      return refresh();
    },
    async play() {
      control.play();
      ensurePlaybackLoop();

      if (audioElement && audioElement.src) {
        try {
          await audioElement.play();
          syncFromAudioElement();
        } catch (error) {
          state = {
            ...state,
            audio: {
              ...state.audio,
              error: error instanceof Error ? error.message : String(error),
            },
          };
        }
      }

      return refresh();
    },
    pause() {
      control.pause();
      if (audioElement && !audioElement.paused) {
        audioElement.pause();
      }
      stopPlaybackLoop();
      return refresh();
    },
    async togglePlayback() {
      if (control.getSnapshot().transport.isPlaying) {
        return this.pause();
      }

      return this.play();
    },
    seekToFrame(frame) {
      control.seekToFrame(frame);

      if (audioElement) {
        audioElement.currentTime = frame / state.snapshot.transport.fps;
        state = {
          ...state,
          audio: {
            ...state.audio,
            currentTimeSeconds: audioElement.currentTime,
          },
        };
      }

      return refresh();
    },
    seekToTime(seconds) {
      return this.seekToFrame(Math.floor(seconds * state.snapshot.transport.fps));
    },
    setLoop(loop) {
      control.setLoop(loop);

      if (audioElement) {
        audioElement.loop = loop;
      }

      return refresh();
    },
    setPreviewMode(mode) {
      control.setPreviewMode(mode);
      return refresh();
    },
    applyAction(action) {
      const result = control.applyAction(action);
      state = {
        ...state,
        snapshot: control.getSnapshot(),
        debugSnapshot: control.createDebugSnapshot(),
        graphRuntime: control.inspectGraphRuntime(),
      };
      emit();
      return result;
    },
    loadAudioFile(file) {
      revokeAudioObjectUrl();
      audioObjectUrl = URL.createObjectURL(file);

      return loadAudioSource({
        kind: "file",
        id: `file:${file.name}`,
        label: file.name,
        uri: audioObjectUrl,
      });
    },
    loadBundledAudioTrack(fileName) {
      return loadAudioSource({
        kind: "file",
        id: `bundled:${fileName}`,
        label: fileName,
        uri: `/music/${encodeURIComponent(fileName)}`,
      });
    },
    bindAudioElement(element) {
      if (audioElement === element) {
        return refresh();
      }

      detachAudioListeners();
      audioElement = element;

      if (audioElement) {
        audioElement.loop = control.getSnapshot().transport.loop;

        audioElement.onloadedmetadata = () => {
          const durationSeconds = audioElement && Number.isFinite(audioElement.duration)
            ? audioElement.duration
            : undefined;

          if (currentAudioSource) {
            currentAudioSource =
              durationSeconds === undefined
                ? currentAudioSource
                : {
                    ...currentAudioSource,
                    durationSeconds,
                  };
          }

          syncPreviewDurationFromAudio(durationSeconds);
          state = {
            ...state,
            audio: {
              ...state.audio,
              durationSeconds: durationSeconds ?? state.audio.durationSeconds,
            },
          };
          refresh();
        };

        audioElement.ontimeupdate = () => {
          syncFromAudioElement();
        };

        audioElement.onplay = () => {
          ensurePlaybackLoop();
          refresh();
        };

        audioElement.onpause = () => {
          refresh();
        };

        audioElement.onended = () => {
          control.pause();
          control.seekToFrame(0);
          stopPlaybackLoop();
          refresh();
        };

        audioElement.onerror = () => {
          state = {
            ...state,
            audio: {
              ...state.audio,
              error: "Failed to load audio source.",
            },
          };
          refresh();
        };

        if (currentAudioSource) {
          audioElement.src = currentAudioSource.uri ?? "";
          audioElement.currentTime = 0;
          audioElement.load();
        }
      }

      return refresh();
    },
    setAudioAnalyzerState(audioAnalyzerState) {
      control.setAudioAnalyzerState(audioAnalyzerState);
      return refresh();
    },
  };
};
