import { Comp, UnknownConfig } from '@/components/config/create-component';
import { LayerSettings } from '@/components/editor/layer-settings';
import type {
  VizSessionRuntimePreviewAudioFrameData,
  VizSessionRuntimePreviewFrame,
} from '@/lib/viz-session/types';
import type { VizRenderPlan } from '@viz-engine/contracts';

export interface LayerData {
  id: string;
  comp: Comp;
  config: UnknownConfig;
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
}
