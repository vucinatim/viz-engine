import type { Comp } from '@/components/config/create-component';
import { LayerSettings } from '@/components/editor/layer-settings';
import type {
  VizSessionRuntimePreviewAudioFrameData,
  VizSessionRuntimePreviewFrame,
} from '@/lib/viz-session/types';
import type { VizRenderPlan } from '@viz-engine/contracts';

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
  }) => void;
  actions?: Record<string, () => void>;
  whenReady?: () => Promise<void>;
}
