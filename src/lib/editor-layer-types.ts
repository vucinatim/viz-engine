import { Comp, UnknownConfig } from '@/components/config/create-component';
import { LayerSettings } from '@/components/editor/layer-settings';
import type {
  VizSessionRuntimePreviewFrame,
  VizSessionRuntimePreviewLayerResult,
} from '@/lib/viz-session/types';

export interface LayerData {
  id: string;
  comp: Comp;
  config: UnknownConfig;
  state: unknown;
  isExpanded: boolean;
  isDebugEnabled: boolean;
  layerSettings: LayerSettings;
}

export type LayerRenderFunction = (
  frame: VizSessionRuntimePreviewFrame,
) => VizSessionRuntimePreviewLayerResult;
