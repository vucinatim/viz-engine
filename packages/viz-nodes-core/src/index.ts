import type { VizNodeImplementation } from "@viz-engine/contracts";

const asNumber = (value: unknown, fallback: number): number => {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const asString = (value: unknown, fallback = ""): string => {
  return typeof value === "string" ? value : fallback;
};

export const graphInputNode: VizNodeImplementation = {
  type: "graph-input",
  name: "Graph Input",
  category: "pure",
  description: "Reads one named graph input value into the node graph.",
  inputs: [
    {
      key: "inputKey",
      label: "Input Key",
      required: true,
    },
  ],
  outputs: [
    {
      key: "value",
      label: "Value",
    },
  ],
  evaluate: ({ inputs, graphInputs }) => {
    const inputKey = asString(inputs.inputKey);
    return {
      value: graphInputs[inputKey]?.value,
    };
  },
};

export const multiplyNode: VizNodeImplementation = {
  type: "multiply",
  name: "Multiply",
  category: "pure",
  description: "Multiplies two numeric inputs.",
  inputs: [
    {
      key: "value",
      label: "Value",
      required: true,
    },
    {
      key: "factor",
      label: "Factor",
      required: true,
    },
  ],
  outputs: [
    {
      key: "value",
      label: "Value",
    },
  ],
  evaluate: ({ inputs }) => ({
    value: asNumber(inputs.value, 0) * asNumber(inputs.factor, 1),
  }),
};

export const clampNode: VizNodeImplementation = {
  type: "clamp",
  name: "Clamp",
  category: "pure",
  description: "Clamps a numeric input between min and max.",
  inputs: [
    {
      key: "value",
      label: "Value",
      required: true,
    },
    {
      key: "min",
      label: "Min",
      required: true,
    },
    {
      key: "max",
      label: "Max",
      required: true,
    },
  ],
  outputs: [
    {
      key: "value",
      label: "Value",
    },
  ],
  evaluate: ({ inputs }) => {
    const value = asNumber(inputs.value, 0);
    const min = asNumber(inputs.min, 0);
    const max = asNumber(inputs.max, 1);
    return {
      value: Math.min(Math.max(value, min), max),
    };
  },
};

export const addNode: VizNodeImplementation = {
  type: "add",
  name: "Add",
  category: "pure",
  description: "Adds two numeric inputs.",
  inputs: [
    {
      key: "a",
      label: "A",
      required: true,
    },
    {
      key: "b",
      label: "B",
      required: true,
    },
  ],
  outputs: [
    {
      key: "value",
      label: "Value",
    },
  ],
  evaluate: ({ inputs }) => ({
    value: asNumber(inputs.a, 0) + asNumber(inputs.b, 0),
  }),
};

export const decayNode: VizNodeImplementation = {
  type: "decay",
  name: "Decay",
  category: "temporal",
  description:
    "Tracks incoming peaks immediately, then decays toward zero at a fixed per-second falloff.",
  inputs: [
    {
      key: "value",
      label: "Value",
      required: true,
    },
    {
      key: "falloffPerSecond",
      label: "Falloff / s",
      required: true,
    },
  ],
  outputs: [
    {
      key: "value",
      label: "Value",
    },
  ],
  createInitialState: () => 0,
  step: ({ inputs, previousState, deltaTimeSeconds }) => {
    const incomingValue = asNumber(inputs.value, 0);
    const previousValue = asNumber(previousState, 0);
    const falloffPerSecond = Math.max(0, asNumber(inputs.falloffPerSecond, 0));
    const decayedValue = Math.max(0, previousValue - falloffPerSecond * deltaTimeSeconds);
    const nextValue = Math.max(incomingValue, decayedValue);

    return {
      state: nextValue,
      outputs: {
        value: nextValue,
      },
    };
  },
};

export const createCoreNodeRegistry = () => {
  const nodes = [graphInputNode, multiplyNode, clampNode, addNode, decayNode];
  const nodeMap = new Map(nodes.map((node) => [node.type, node]));

  return {
    get: (type: string) => nodeMap.get(type),
    list: () => nodes,
  };
};
