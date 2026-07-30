import type {
  VizComponentAuthoring,
  VizComponentPreset,
} from '@viz-engine/contracts';
import type { NodeNetworkPreset } from '../node-network/presets';

export interface Comp {
  id: string;
  componentId?: string;
  name: string;
  description: string;
  authoring: VizComponentAuthoring;
  defaultValues: Record<string, unknown>;
  presets?: VizComponentPreset[];
  defaultNetworks?: Record<string, NodeNetworkPreset | string>;
}
