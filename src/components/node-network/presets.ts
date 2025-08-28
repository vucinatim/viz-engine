import { Edge } from '@xyflow/react';
import {
  AnimNode,
  InputNode,
  NodeDefinitionMap,
  createOutputNode,
} from '../config/animation-nodes';
import { NodeHandleType } from '../config/node-types';
import { GraphNode } from './node-network-store';

// Aliases used inside presets to reference the network I/O nodes
export const INPUT_ALIAS = 'INPUT';
export const OUTPUT_ALIAS = 'OUTPUT';

export type PresetNodeSpec = {
  id: string;
  label: string; // AnimNode label
  position: { x: number; y: number };
  inputValues?: { [inputId: string]: any };
  state?: { [key: string]: any };
};

export type PresetEdgeSpec = {
  source: string; // node id or INPUT_ALIAS
  sourceHandle?: string; // optional for object outputs
  target: string; // node id or OUTPUT_ALIAS
  targetHandle: string; // required
};

export type NodeNetworkPreset = {
  id: string;
  name: string;
  description?: string;
  outputType: NodeHandleType;
  autoPlace?: boolean;
  nodes: PresetNodeSpec[];
  edges: PresetEdgeSpec[];
};

// Registry for presets, grouped by output type
const presetRegistry: Record<NodeHandleType, NodeNetworkPreset[]> = {
  number: [],
  string: [],
  boolean: [],
  color: [],
  file: [],
  vector3: [],
  Uint8Array: [],
  FrequencyAnalysis: [],
  object: [],
};

export const registerPreset = (preset: NodeNetworkPreset) => {
  (presetRegistry[preset.outputType] ||= []).push(preset);
};

export const getPresetsForType = (
  type: NodeHandleType,
): NodeNetworkPreset[] => {
  return presetRegistry[type] || [];
};

// Instantiate a preset into concrete nodes/edges for a given parameter/network
export const instantiatePreset = (
  preset: NodeNetworkPreset,
  parameterId: string,
  outputType?: NodeHandleType,
): { nodes: GraphNode[]; edges: Edge[] } => {
  const actualOutputType = outputType ?? preset.outputType;

  const inputNode: GraphNode = {
    id: `${parameterId}-input-node`,
    type: 'NodeRenderer',
    position: { x: -300, y: 0 },
    data: {
      definition: InputNode as AnimNode,
      inputValues: {},
      state: {},
    },
  };

  const outputNode: GraphNode = {
    id: `${parameterId}-output-node`,
    type: 'NodeRenderer',
    position: { x: 500, y: 0 },
    data: {
      definition: createOutputNode(actualOutputType),
      inputValues: {},
      state: {},
    },
  };

  const nodeIdMap = new Map<string, string>();
  nodeIdMap.set(INPUT_ALIAS, inputNode.id);
  nodeIdMap.set(OUTPUT_ALIAS, outputNode.id);

  const nodes: GraphNode[] = [inputNode];
  preset.nodes.forEach((spec, index) => {
    const id = `${parameterId}-preset-${index}-${spec.id}`;
    nodeIdMap.set(spec.id, id);
    const nodeDef = NodeDefinitionMap.get(spec.label);
    if (!nodeDef) return; // skip unknown definitions defensively
    nodes.push({
      id,
      type: 'NodeRenderer',
      position: spec.position, // will be replaced by auto layout
      data: {
        definition: nodeDef,
        inputValues: spec.inputValues || {},
        state: spec.state || {},
      },
    });
  });

  // place Output last
  nodes.push(outputNode);

  const edges: Edge[] = preset.edges.map((e, i) => ({
    id: `${parameterId}-edge-${i}`,
    source: nodeIdMap.get(e.source) || e.source,
    sourceHandle: e.sourceHandle,
    target: nodeIdMap.get(e.target) || e.target,
    targetHandle: e.targetHandle,
  }));

  return { nodes, edges };
};

// Example presets for number output
registerPreset({
  id: 'number-sine-osc',
  name: 'Sine Oscillator (time)',
  description: 'Maps Input.time -> Sine -> Output',
  outputType: 'number',
  autoPlace: true,
  nodes: [
    {
      id: 'sine',
      label: 'Sine',
      position: { x: 150, y: 0 },
      inputValues: { frequency: 1, phase: 0, amplitude: 1 },
    },
  ],
  edges: [
    {
      source: INPUT_ALIAS,
      sourceHandle: 'time',
      target: 'sine',
      targetHandle: 'time',
    },
    {
      source: 'sine',
      sourceHandle: 'value',
      target: OUTPUT_ALIAS,
      targetHandle: 'output',
    },
  ],
});

registerPreset({
  id: 'number-average-volume',
  name: 'Average Volume -> Normalize',
  description:
    'Input.audioSignal -> Average Volume -> Normalize(0..1) -> Output',
  outputType: 'number',
  autoPlace: true,
  nodes: [
    { id: 'avg', label: 'Average Volume', position: { x: 0, y: -80 } },
    {
      id: 'norm',
      label: 'Normalize',
      position: { x: 250, y: -80 },
      inputValues: { inputMin: 0, inputMax: 255, outputMin: 0, outputMax: 1 },
    },
  ],
  edges: [
    {
      source: INPUT_ALIAS,
      sourceHandle: 'audioSignal',
      target: 'avg',
      targetHandle: 'data',
    },
    {
      source: 'avg',
      sourceHandle: 'average',
      target: 'norm',
      targetHandle: 'value',
    },
    {
      source: 'norm',
      sourceHandle: 'result',
      target: OUTPUT_ALIAS,
      targetHandle: 'output',
    },
  ],
});

// Kick drum focused, time-smoothed amplitude
registerPreset({
  id: 'number-kick-band-smoothed',
  name: 'Kick Band (40–120Hz) → Avg → Normalize → Smooth',
  description:
    'Input.frequencyAnalysis → Frequency Band (40–120Hz) → Average → Normalize(30..200→0..4) → Smoothing(time) → Output',
  outputType: 'number',
  autoPlace: true,
  nodes: [
    {
      id: 'band',
      label: 'Frequency Band',
      position: { x: -300, y: 0 },
      inputValues: { startFrequency: 40, endFrequency: 120 },
    },
    {
      id: 'avg',
      label: 'Average Volume',
      position: { x: 0, y: -80 },
    },
    {
      id: 'norm',
      label: 'Normalize',
      position: { x: 260, y: -80 },
      inputValues: { inputMin: 30, inputMax: 200, outputMin: 0, outputMax: 4 },
    },
    {
      id: 'smooth',
      label: 'Smoothing',
      position: { x: 520, y: 0 },
      inputValues: { smoothing: 0.8, timeConstantMs: 100 },
    },
  ],
  edges: [
    {
      source: INPUT_ALIAS,
      sourceHandle: 'frequencyAnalysis',
      target: 'band',
      targetHandle: 'frequencyAnalysis',
    },
    {
      source: 'band',
      sourceHandle: 'bandData',
      target: 'avg',
      targetHandle: 'data',
    },
    {
      source: 'avg',
      sourceHandle: 'average',
      target: 'norm',
      targetHandle: 'value',
    },
    {
      source: 'norm',
      sourceHandle: 'result',
      target: 'smooth',
      targetHandle: 'value',
    },
    {
      source: INPUT_ALIAS,
      sourceHandle: 'time',
      target: 'smooth',
      targetHandle: 'time',
    },
    {
      source: 'smooth',
      sourceHandle: 'result',
      target: OUTPUT_ALIAS,
      targetHandle: 'output',
    },
  ],
});
