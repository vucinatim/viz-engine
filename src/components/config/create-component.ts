import { NodeNetworkPreset } from '../node-network/presets';
import { InferValues, VConfig, v } from './config';

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

// Create the component
export function createComponent<TConfig extends VConfig<any>>(definition: {
  name: string;
  description: string;
  config: TConfig; // VConfig with options
  presets?: Preset<InferValues<TConfig>>[]; // Optional array of presets
  defaultNetworks?: Record<string, NodeNetworkPreset | string>; // Optional default node networks per parameter path (preset object or preset ID)
}) {
  return {
    id: `${definition.name}-${new Date().getTime()}`,
    defaultValues: definition.config.getDefaultValues(),
    ...definition,
  };
}

// Example Component Definition
export const testComp = createComponent({
  name: 'Example Component',
  description: 'An example component',
  config: v.config({
    appearance: v.group(
      {
        label: 'Appearance Settings',
        description: 'Group of appearance settings',
      },
      {
        color: v.color({
          label: 'Color',
          description: 'A color',
          defaultValue: '#ff0000',
        }),
        toggle: v.toggle({
          label: 'Show Borders',
          description: 'Show or hide borders',
          defaultValue: true,
        }),
        height: v.number({
          label: 'Height',
          description: 'Height of the component',
          defaultValue: 100,
          step: 10,
          min: 50,
          max: 200,
        }),
        additional: v.group(
          {
            label: 'Additional Settings',
            description: 'Additional settings',
          },
          {
            text: v.text({
              label: 'Text',
              description: 'Some text',
              defaultValue: 'Hello',
            }),
          },
        ),
      },
    ),
  }),
});
