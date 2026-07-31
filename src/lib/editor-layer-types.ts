import type { Comp } from '@/components/config/create-component';
import { LayerSettings } from '@/components/editor/layer-settings';
import type {
  VizSessionRuntimePreviewAudioFrameData,
  VizSessionRuntimePreviewFrame,
} from '@/lib/viz-session/types';
import type {
  VizLayerRenderPlanEntry,
  VizRenderPlan,
} from '@viz-engine/contracts';
import type { VizThreePreviewResourceStats } from '@viz-engine/renderer-three';

export interface LayerData {
  id: string;
  comp: Comp;
  values: Record<string, unknown>;
  isExpanded: boolean;
  isDebugEnabled: boolean;
  layerSettings: LayerSettings;
}

export interface LayerRuntimePreviewAttachment {
  getViewport: () => {
    width: number;
    height: number;
  };
  render: (input: {
    frame: VizSessionRuntimePreviewFrame;
    audioFrameData: VizSessionRuntimePreviewAudioFrameData;
    renderPlan: VizRenderPlan;
  }) => LayerRuntimePreviewRenderResult | void;
  invokeLayerAction?: (layerId: string, actionId: string) => boolean;
  requiresContinuousRendering?: () => boolean;
  whenReady?: () => Promise<void>;
  getResourceStats?: () => VizThreePreviewResourceStats | null;
}

export interface LayerRuntimePreviewRenderStats {
  milliseconds: number;
  drawCalls: number;
}

export interface LayerRuntimePreviewRenderResult {
  layerStats: Record<string, LayerRuntimePreviewRenderStats>;
}

export interface LayerRuntimeDebugAttachment {
  render: (input: {
    frame: VizSessionRuntimePreviewFrame;
    audioFrameData: VizSessionRuntimePreviewAudioFrameData;
    layerPlan: VizLayerRenderPlanEntry;
    stats: LayerRuntimePreviewRenderStats | undefined;
  }) => void;
}
