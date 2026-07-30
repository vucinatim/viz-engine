import type { VizArtifactId, VizExecutionMode } from '@viz-engine/contracts';

export interface VizEditorTransportState {
  fps: number;
  durationFrames: number;
  currentFrame: number;
  isPlaying: boolean;
  loop: boolean;
  mode: VizExecutionMode;
}

export interface CreateVizEditorTransportControllerOptions {
  fps: number;
  durationFrames: number;
  currentFrame?: number;
  isPlaying?: boolean;
  loop?: boolean;
  mode?: VizExecutionMode;
  onStateChange?: (state: VizEditorTransportState) => void;
}

export interface VizEditorTransportController {
  getState(): VizEditorTransportState;
  play(): VizEditorTransportState;
  pause(): VizEditorTransportState;
  togglePlayback(): VizEditorTransportState;
  seekToFrame(frame: number): VizEditorTransportState;
  setDurationFrames(durationFrames: number): VizEditorTransportState;
  setLoop(loop: boolean): VizEditorTransportState;
  setMode(mode: VizExecutionMode): VizEditorTransportState;
  advanceBySeconds(seconds: number): VizEditorTransportState;
}

export type VizEditorAudioSourceKind = 'file' | 'media-element' | 'stream';
export type VizEditorAudioAnalyzerState =
  'idle' | 'active' | 'error' | 'unavailable';
export type VizEditorPreviewInputMode =
  'none' | 'baked-only' | 'live-only' | 'hybrid';

export interface VizEditorAudioSource {
  kind: VizEditorAudioSourceKind;
  id: string;
  label?: string;
  uri?: string;
  durationSeconds?: number;
}

export interface VizEditorAudioSessionState {
  source: VizEditorAudioSource | undefined;
  analyzerState: VizEditorAudioAnalyzerState;
  bakedArtifactId: VizArtifactId | undefined;
  bakedArtifactAvailable: boolean;
  liveInputAvailable: boolean;
}

export interface VizEditorLiveInputDiagnostics {
  inputMode: VizEditorPreviewInputMode;
  usesLiveAudio: boolean;
  usesBakedArtifacts: boolean;
  issues: string[];
}

export interface CreateVizEditorAudioSessionControllerOptions {
  source?: VizEditorAudioSource;
  analyzerState?: VizEditorAudioAnalyzerState;
  bakedArtifactId?: VizArtifactId;
  bakedArtifactAvailable?: boolean;
  liveInputAvailable?: boolean;
  onStateChange?: (state: VizEditorAudioSessionState) => void;
}

export interface VizEditorAudioSessionController {
  getState(): VizEditorAudioSessionState;
  attachSource(source: VizEditorAudioSource): VizEditorAudioSessionState;
  clearSource(): VizEditorAudioSessionState;
  setAnalyzerState(
    state: VizEditorAudioAnalyzerState,
  ): VizEditorAudioSessionState;
  setBakedArtifactId(
    artifactId: VizArtifactId | undefined,
  ): VizEditorAudioSessionState;
  setBakedArtifactAvailable(available: boolean): VizEditorAudioSessionState;
  setLiveInputAvailable(available: boolean): VizEditorAudioSessionState;
  getDiagnostics(): VizEditorLiveInputDiagnostics;
}

const cloneTransportState = (
  state: VizEditorTransportState,
): VizEditorTransportState => ({
  ...state,
});

const cloneAudioSource = (
  source: VizEditorAudioSource | undefined,
): VizEditorAudioSource | undefined => {
  return source ? { ...source } : undefined;
};

const cloneAudioSessionState = (
  state: VizEditorAudioSessionState,
): VizEditorAudioSessionState => ({
  ...state,
  source: cloneAudioSource(state.source),
});

const clampFrame = (frame: number, durationFrames: number): number => {
  if (!Number.isFinite(frame)) {
    return 0;
  }

  return Math.max(0, Math.min(durationFrames - 1, Math.trunc(frame)));
};

export const createVizEditorTransportController = ({
  fps,
  durationFrames,
  currentFrame = 0,
  isPlaying = false,
  loop = true,
  mode = 'live',
  onStateChange,
}: CreateVizEditorTransportControllerOptions): VizEditorTransportController => {
  const normalizedFps = Math.max(1, Math.trunc(fps));
  let subframeRemainder = 0;
  let state: VizEditorTransportState = {
    fps: normalizedFps,
    durationFrames: Math.max(1, Math.trunc(durationFrames)),
    currentFrame: 0,
    isPlaying,
    loop,
    mode,
  };

  state.currentFrame = clampFrame(currentFrame, state.durationFrames);

  const emit = () => {
    const snapshot = cloneTransportState(state);
    onStateChange?.(snapshot);
    return snapshot;
  };

  const applyWholeFrameAdvance = (
    frameDelta: number,
  ): VizEditorTransportState => {
    if (frameDelta <= 0) {
      return emit();
    }

    const lastFrame = state.durationFrames - 1;

    if (state.loop) {
      state = {
        ...state,
        currentFrame: (state.currentFrame + frameDelta) % state.durationFrames,
      };
      return emit();
    }

    const nextFrame = Math.min(lastFrame, state.currentFrame + frameDelta);
    const hasReachedEnd = nextFrame >= lastFrame;

    state = {
      ...state,
      currentFrame: nextFrame,
      isPlaying: hasReachedEnd ? false : state.isPlaying,
    };

    return emit();
  };

  return {
    getState: () => cloneTransportState(state),
    play: () => {
      state = {
        ...state,
        isPlaying: true,
      };
      return emit();
    },
    pause: () => {
      state = {
        ...state,
        isPlaying: false,
      };
      return emit();
    },
    togglePlayback: () => {
      state = {
        ...state,
        isPlaying: !state.isPlaying,
      };
      return emit();
    },
    seekToFrame: (frame) => {
      subframeRemainder = 0;
      state = {
        ...state,
        currentFrame: clampFrame(frame, state.durationFrames),
      };
      return emit();
    },
    setDurationFrames: (nextDurationFrames) => {
      const normalizedDuration = Math.max(1, Math.trunc(nextDurationFrames));
      state = {
        ...state,
        durationFrames: normalizedDuration,
        currentFrame: clampFrame(state.currentFrame, normalizedDuration),
      };
      return emit();
    },
    setLoop: (nextLoop) => {
      state = {
        ...state,
        loop: nextLoop,
      };
      return emit();
    },
    setMode: (nextMode) => {
      state = {
        ...state,
        mode: nextMode,
      };
      return emit();
    },
    advanceBySeconds: (seconds) => {
      if (!Number.isFinite(seconds) || seconds <= 0) {
        return emit();
      }

      const totalFrames = seconds * state.fps + subframeRemainder;
      const wholeFrames = Math.floor(totalFrames);
      subframeRemainder = totalFrames - wholeFrames;

      return applyWholeFrameAdvance(wholeFrames);
    },
  };
};

export const getVizEditorLiveInputDiagnostics = (
  state: VizEditorAudioSessionState,
): VizEditorLiveInputDiagnostics => {
  const usesLiveAudio =
    state.source !== undefined &&
    state.liveInputAvailable &&
    state.analyzerState === 'active';
  const usesBakedArtifacts =
    state.bakedArtifactAvailable && state.bakedArtifactId !== undefined;

  let inputMode: VizEditorPreviewInputMode = 'none';

  if (usesLiveAudio && usesBakedArtifacts) {
    inputMode = 'hybrid';
  } else if (usesLiveAudio) {
    inputMode = 'live-only';
  } else if (usesBakedArtifacts) {
    inputMode = 'baked-only';
  }

  const issues: string[] = [];

  if (state.source && !usesLiveAudio && !usesBakedArtifacts) {
    issues.push(
      'Preview has an audio source attached but neither live analysis nor baked artifact inputs are currently available.',
    );
  }

  if (state.analyzerState === 'error') {
    issues.push('Live analyzer is in an error state.');
  }

  if (
    state.source &&
    state.analyzerState === 'unavailable' &&
    !usesBakedArtifacts
  ) {
    issues.push(
      'Live analyzer is unavailable and there is no baked artifact fallback.',
    );
  }

  return {
    inputMode,
    usesLiveAudio,
    usesBakedArtifacts,
    issues,
  };
};

export const createVizEditorAudioSessionController = ({
  source,
  analyzerState = 'idle',
  bakedArtifactId,
  bakedArtifactAvailable = false,
  liveInputAvailable = false,
  onStateChange,
}: CreateVizEditorAudioSessionControllerOptions = {}): VizEditorAudioSessionController => {
  let state: VizEditorAudioSessionState = {
    source: cloneAudioSource(source),
    analyzerState,
    bakedArtifactId,
    bakedArtifactAvailable,
    liveInputAvailable,
  };

  const emit = () => {
    const snapshot = cloneAudioSessionState(state);
    onStateChange?.(snapshot);
    return snapshot;
  };

  return {
    getState: () => cloneAudioSessionState(state),
    attachSource: (nextSource) => {
      state = {
        ...state,
        source: { ...nextSource },
      };
      return emit();
    },
    clearSource: () => {
      state = {
        ...state,
        source: undefined,
      };
      return emit();
    },
    setAnalyzerState: (nextAnalyzerState) => {
      state = {
        ...state,
        analyzerState: nextAnalyzerState,
      };
      return emit();
    },
    setBakedArtifactId: (artifactId) => {
      state = {
        ...state,
        bakedArtifactId: artifactId,
      };
      return emit();
    },
    setBakedArtifactAvailable: (available) => {
      state = {
        ...state,
        bakedArtifactAvailable: available,
      };
      return emit();
    },
    setLiveInputAvailable: (available) => {
      state = {
        ...state,
        liveInputAvailable: available,
      };
      return emit();
    },
    getDiagnostics: () => getVizEditorLiveInputDiagnostics(state),
  };
};
