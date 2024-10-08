import * as THREE from 'three';
import { InferValues, v, VConfig } from './config';

export type UnknownConfig = VConfig<Record<string, any>>;

export type UnknownConfigValues = InferValues<UnknownConfig>;

// Define Preset to use InferValues instead of z.infer
type Preset<T> = {
  name: string;
  values: T; // Infer the values from the VConfig
};

type AudioDrawData = {
  dataArray: Uint8Array;
  analyzer: AnalyserNode;
};

type ThreeContext = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.Camera;
};

type DrawFunction<T, UT> = (params: {
  canvasCtx: CanvasRenderingContext2D;
  audioData: AudioDrawData;
  config: T;
  dt: number;
  state: UT;
  debugEnabled: boolean;
}) => void;

type Init3DFunction<T, UT> = (params: {
  threeCtx: ThreeContext;
  config: T;
  state: UT;
  debugEnabled: boolean;
}) => void;

type Draw3DFunction<T, UT> = (params: {
  threeCtx: ThreeContext;
  audioData: AudioDrawData;
  config: T;
  dt: number;
  state: UT;
  debugEnabled: boolean;
}) => void;

export interface Comp {
  id: string;
  name: string;
  description: string;
  config: UnknownConfig;
  defaultValues: UnknownConfigValues;
  presets?: Preset<UnknownConfigValues>[];
  state?: unknown;
  draw?: DrawFunction<UnknownConfigValues, unknown>;
  init3D?: Init3DFunction<UnknownConfigValues, unknown>;
  draw3D?: Draw3DFunction<UnknownConfigValues, unknown>;
}

// Create the component
export function createComponent<TConfig extends VConfig<any>, UT>(definition: {
  name: string;
  description: string;
  config: TConfig; // VConfig with options
  presets?: Preset<InferValues<TConfig>>[]; // Optional array of presets
  state?: UT; // Optional state
  draw?: DrawFunction<InferValues<TConfig>, UT>; // Draw function using inferred config values
  init3D?: Init3DFunction<InferValues<TConfig>, UT>; // Optional init3D function
  draw3D?: Draw3DFunction<InferValues<TConfig>, UT>; // Optional draw3D function
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
  draw: ({ config, state }) => {
    console.log('Drawing with config', config);
    config.appearance.color;
  },
  init3D: ({ config, state }) => {
    console.log('Initializing 3D with config', config);
  },
  draw3D: ({ config, state }) => {
    console.log('Drawing 3D with config', config);
  },
});
