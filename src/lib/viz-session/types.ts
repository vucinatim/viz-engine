import type { NodeNetwork } from '@/components/node-network/graph-types';
import type { VizProjectDocument } from '@viz-engine/contracts';
import type {
  VizEditorAudioAnalyzerState,
  VizEditorAudioSessionState,
  VizEditorLiveInputDiagnostics,
  VizEditorTransportState,
} from '@viz-engine/editor-session';

export interface LayerEditorHistoryState {
  project: VizProjectDocument;
}

export interface LayerEditorHistory {
  past: LayerEditorHistoryState[];
  present: LayerEditorHistoryState;
  future: LayerEditorHistoryState[];
}

export interface NodeNetworkHistoryState {
  nodes: any[];
  edges: any[];
}

export interface NodeNetworkHistory {
  past: NodeNetworkHistoryState[];
  present: NodeNetworkHistoryState;
  future: NodeNetworkHistoryState[];
}

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

export interface VizSessionRuntimePreviewLayerResult {
  runtimeBacked: boolean;
}

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
  lastError: VizSessionRuntimePreviewError | null;
}

export interface VizSessionPreviewState {
  transport: VizEditorTransportState;
  runtimeInspection: VizSessionRuntimeInspectionState;
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

export interface VizSessionGraphState {
  /**
   * Executable editor projection of `project.workingProject.graphs`.
   * Canonical graph documents live only in VizProjectDocument.
   */
  networks: Record<string, NodeNetwork>;
}

export interface VizSessionHistoryState {
  layerHistory: LayerEditorHistory;
  nodeHistories: Record<string, NodeNetworkHistory>;
  isNodeEditorFocused: boolean;
  isBypassingHistory: boolean;
  nodeDragBypass: Record<string, boolean>;
  debounceTimer: number | null;
}

export interface VizSessionState {
  project: VizSessionProjectState;
  preview: VizSessionPreviewState;
  audio: VizSessionAudioState;
  graph: VizSessionGraphState;
  history: VizSessionHistoryState;
}

export type SessionAudioAnalyzerState = VizEditorAudioAnalyzerState;
