import { NodeNetworkPreset } from '../node-network/presets';
import { InferValues, VConfig } from './config';

export type UnknownConfig = VConfig<Record<string, any>>;

export type UnknownConfigValues = InferValues<UnknownConfig>;

// Define Preset to use InferValues instead of z.infer
type Preset<T> = {
  name: string;
  values: T; // Infer the values from the VConfig
  networks?: Record<string, string>; // Optional map of parameter paths to network preset IDs
};

export interface Comp {
  id: string;
  componentId?: string;
  name: string;
  description: string;
  config: UnknownConfig;
  defaultValues: UnknownConfigValues;
  presets?: Preset<UnknownConfigValues>[];
  // Map of config parameter path (e.g., "size" or "groupA.height") to a default node network preset
  defaultNetworks?: Record<string, NodeNetworkPreset | string>;
}
