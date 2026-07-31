import type {
  VizFramePlanIssue,
  VizGraphEvaluationResult,
  VizLayerRenderPlanEntry,
  VizMaterializedAsset,
  VizProjectDocument,
  VizRuntimeAudioFrameSnapshot,
} from '@viz-engine/contracts';
import type {
  VizEditorAudioAnalyzerState,
  VizEditorAudioSessionState,
  VizEditorLiveInputDiagnostics,
  VizEditorTransportState,
} from '@viz-engine/editor-session';

export interface VizSessionProjectState {
  initialized: boolean;
  revision: number;
  sourceProject: VizProjectDocument | null;
  workingProject: VizProjectDocument;
}

export type VizSessionRuntimePreviewMode = 'live' | 'export';

export interface VizSessionRuntimePreviewFrame {
  currentFrame: number;
  time: number;
  dt: number;
  fps: number;
  mode: VizSessionRuntimePreviewMode;
}

export type VizSessionRuntimePreviewAudioFrameData = Pick<
  VizRuntimeAudioFrameSnapshot,
  'frequencyData' | 'timeDomainData' | 'sampleRate' | 'fftSize'
> &
  Partial<
    Pick<
      VizRuntimeAudioFrameSnapshot,
      | 'minDecibels'
      | 'maxDecibels'
      | 'provenance'
      | 'sourceAssetId'
      | 'artifactId'
      | 'artifactFrame'
    >
  >;

export interface VizSessionRuntimePreviewError {
  message: string;
  frame: VizSessionRuntimePreviewFrame;
}

export interface VizSessionRuntimeInspectionState {
  status: 'idle' | 'failed';
  lastRequestedFrame: VizSessionRuntimePreviewFrame | null;
  lastCompletedFrame: VizSessionRuntimePreviewFrame | null;
  renderCycle: number;
  lastRenderedLayerIds: string[];
  runtimeBackedLayerIds: string[];
  lastGraphResults: VizGraphEvaluationResult[];
  lastLayerSnapshots: VizLayerRenderPlanEntry[];
  lastMaterializedAssets: VizMaterializedAsset[];
  lastPlanIssues: VizFramePlanIssue[];
  lastError: VizSessionRuntimePreviewError | null;
}

export interface VizSessionPreviewState {
  transport: VizEditorTransportState;
}

export interface VizSessionAudioState {
  session: VizEditorAudioSessionState;
  diagnostics: VizEditorLiveInputDiagnostics;
  audioFile: File | null;
  currentTrackUrl: string | null;
  trackList: string[];
  currentTrackIndex: number;
  currentTime: number;
  visualTime: number;
}

export interface VizSessionHistoryState {
  isNodeEditorFocused: boolean;
  activeGestureId: string | null;
}

export interface VizSessionState {
  project: VizSessionProjectState;
  preview: VizSessionPreviewState;
  audio: VizSessionAudioState;
  history: VizSessionHistoryState;
}

export type SessionAudioAnalyzerState = VizEditorAudioAnalyzerState;
