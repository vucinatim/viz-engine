import type { VizActionActor } from "./actions.js";
import type {
  VizArtifactId,
  VizJobId,
  VizProjectId,
} from "./ids.js";
import type { VizJobEvent, VizJobRecord } from "./jobs.js";

export const VIZ_RENDER_REQUEST_SCHEMA_VERSION = 1 as const;
export const VIZ_RENDER_RESULT_SCHEMA_VERSION = 1 as const;

export type VizRenderIntent =
  | "preview"
  | "candidate"
  | "final"
  | "integration";

export type VizRenderQuality = "draft" | "standard" | "high";

export interface VizRenderProjectSource {
  projectId: VizProjectId;
  expectedRevision?: number;
  expectedContentIdentity?: string;
}

export interface VizRenderViewport {
  width: number;
  height: number;
  backgroundColor?: string;
}

export interface VizRenderRequestBase {
  schemaVersion: typeof VIZ_RENDER_REQUEST_SCHEMA_VERSION;
  source: VizRenderProjectSource;
  intent: VizRenderIntent;
  executorId: string;
  outputLabel: string;
  viewport: VizRenderViewport;
  quality: VizRenderQuality;
}

export interface VizStillRenderRequest extends VizRenderRequestBase {
  kind: "still";
  frame: number;
  format: "svg" | "png" | "jpeg" | "webp";
}

export interface VizContactSheetRenderRequest
  extends VizRenderRequestBase {
  kind: "contact-sheet";
  frames: number[];
  columns?: number;
  gap?: number;
  format: "svg" | "png" | "jpeg" | "webp";
}

export interface VizClipRenderRequest extends VizRenderRequestBase {
  kind: "clip";
  startFrame: number;
  frameCount: number;
  fps: number;
  format: "mp4" | "webm";
  includeAudio: boolean;
}

export interface VizVideoRenderRequest extends VizRenderRequestBase {
  kind: "video";
  startFrame: number;
  frameCount: number;
  fps: number;
  format: "mp4" | "webm";
  includeAudio: boolean;
}

export type VizRenderRequest =
  | VizStillRenderRequest
  | VizContactSheetRenderRequest
  | VizClipRenderRequest
  | VizVideoRenderRequest;

export type VizRenderOutputRole =
  | "still"
  | "contact-sheet"
  | "preview-clip"
  | "final-video"
  | "frame-sample"
  | "diagnostic";

export interface VizRenderOutputArtifact {
  id: VizArtifactId;
  kind: "render-output";
  role: VizRenderOutputRole;
  label: string;
  format: VizRenderRequest["format"];
  mimeType: string;
  uri: string;
  contentIdentity: string;
  byteLength: number;
  width?: number;
  height?: number;
  frameCount?: number;
  fps?: number;
  durationSeconds?: number;
}

export interface VizMediaStreamProbe {
  kind: "video" | "audio";
  codec: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
  frameRate?: number;
  sampleRate?: number;
  channelCount?: number;
}

export interface VizMediaProbe {
  container: string;
  durationSeconds?: number;
  byteLength: number;
  streams: VizMediaStreamProbe[];
}

export interface VizRenderFrameVisualMetric {
  frame: number;
  averageLuminance: number;
  darkPixelRatio: number;
  contentDifferenceFromPrevious?: number;
}

export interface VizRenderVisualFeedback {
  sampledFrames: VizRenderFrameVisualMetric[];
  blankOrNearBlackFrames: number[];
  frozenFramePairs: Array<{
    previousFrame: number;
    frame: number;
  }>;
}

export interface VizRenderPerformanceFeedback {
  evaluatedFrameCount: number;
  renderedFrameCount: number;
  totalRenderMilliseconds: number;
  averageRenderMilliseconds: number;
  p95RenderMilliseconds: number;
  maximumRenderMilliseconds: number;
  encodeMilliseconds?: number;
  peakResidentBytes?: number;
}

export interface VizRenderDiagnostic {
  severity: "info" | "warning" | "error";
  code: string;
  message: string;
  frame?: number;
  layerId?: string;
  details?: Record<string, unknown>;
}

export interface VizRenderExecutionIdentity {
  executorId: string;
  executorVersion: string;
  projectContentIdentity: string;
  projectRevision?: number;
  rendererIdentity: string;
}

export interface VizRenderSuccess {
  schemaVersion: typeof VIZ_RENDER_RESULT_SCHEMA_VERSION;
  ok: true;
  status: "succeeded";
  executionIdentity: VizRenderExecutionIdentity;
  outputs: VizRenderOutputArtifact[];
  diagnostics: VizRenderDiagnostic[];
  performance: VizRenderPerformanceFeedback;
  mediaProbe?: VizMediaProbe;
  visualFeedback?: VizRenderVisualFeedback;
}

export type VizRenderJobRecord = VizJobRecord<
  VizRenderRequest,
  VizRenderSuccess
>;

export type VizRenderJobEvent = VizJobEvent<
  VizRenderRequest,
  VizRenderSuccess
>;

export interface VizRenderJobSummary {
  id: VizJobId;
  kind: string;
  status: VizRenderJobRecord["status"];
  requestedBy: VizActionActor;
  requestedAt: string;
  updatedAt: string;
  inputIdentity?: string;
  outputArtifactIds?: VizArtifactId[];
}
