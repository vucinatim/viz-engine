export type VizNodeHandleType =
  | "number"
  | "string"
  | "boolean"
  | "color"
  | "file"
  | "vector3"
  | "Uint8Array"
  | "FrequencyAnalysis"
  | "object"
  | "math-op";

export interface VizNodeFrequencyAnalysis {
  frequencyData: Uint8Array;
  sampleRate: number;
  fftSize: number;
}

export interface VizNodeAnimationInput {
  audioSignal: Uint8Array;
  frequencyAnalysis?: VizNodeFrequencyAnalysis;
  time: number;
}

export interface VizNodeAuthoringIo {
  id: string;
  label: string;
  type: VizNodeHandleType;
  defaultValue?: unknown;
}

export interface VizNodeAuthoringRuntimeRef {
  data: {
    state: Record<string, any>;
  };
}

export interface VizNodeAuthoringDefinition {
  label: string;
  description?: string;
  inputs: readonly VizNodeAuthoringIo[];
  outputs: readonly VizNodeAuthoringIo[];
  computeSignal(
    inputs: Record<string, unknown>,
    context: VizNodeAnimationInput,
    node?: VizNodeAuthoringRuntimeRef,
  ): Record<string, unknown>;
}

export const EMPTY_NODE_FREQUENCY_ANALYSIS: VizNodeFrequencyAnalysis = {
  frequencyData: new Uint8Array(),
  sampleRate: 0,
  fftSize: 0,
};

const getFallbackValue = (type: VizNodeHandleType): unknown => {
  switch (type) {
    case "number":
      return 0;
    case "string":
    case "color":
      return "";
    case "boolean":
      return false;
    case "Uint8Array":
      return new Uint8Array();
    case "FrequencyAnalysis":
      return EMPTY_NODE_FREQUENCY_ANALYSIS;
    case "object":
      return {};
    case "vector3":
      return { x: 0, y: 0, z: 0 };
    case "file":
    case "math-op":
      return undefined;
  }
};

export const createNodeAuthoringDefinition = <
  TDefinition extends Omit<VizNodeAuthoringDefinition, "computeSignal"> & {
    computeSignal(
      inputs: Record<string, any>,
      context: VizNodeAnimationInput,
      node?: VizNodeAuthoringRuntimeRef,
    ): Record<string, any>;
  },
>(
  definition: TDefinition,
): VizNodeAuthoringDefinition => ({
  ...definition,
  computeSignal(inputs, context, node) {
    const resolvedInputs = { ...inputs };

    for (const input of definition.inputs) {
      if (
        resolvedInputs[input.id] === undefined ||
        resolvedInputs[input.id] === null
      ) {
        resolvedInputs[input.id] =
          input.defaultValue ?? getFallbackValue(input.type);
      }
    }

    return definition.computeSignal(resolvedInputs, context, node);
  },
});

export enum VizNodeMathOperation {
  Add = "add",
  Subtract = "subtract",
  Multiply = "multiply",
  Divide = "divide",
  Power = "power",
  Max = "max",
  Min = "min",
  Modulo = "modulo",
}
