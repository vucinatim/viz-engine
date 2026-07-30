import type {
  VizGraphNodeInputBinding,
  VizNodeGraphDocument,
} from '@viz-engine/contracts';
import { Edge } from '@xyflow/react';
import { NodeHandleType } from '../config/node-types';
import {
  AnimNode,
  InputNode,
  NodeDefinitionMap,
  createOutputNode,
} from './animation-nodes';
import { autoLayoutNodes } from './auto-layout';
import { GraphNode } from './graph-types';

// Aliases used inside presets to reference the network I/O nodes
const INPUT_ALIAS = 'INPUT';
const OUTPUT_ALIAS = 'OUTPUT';

type PresetNodeSpec = {
  id: string;
  label: string; // AnimNode label
  position?: { x: number; y: number };
  inputValues?: { [inputId: string]: any };
  state?: { [key: string]: any };
};

type PresetEdgeSpec = {
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

type PresetNodeTuple = readonly [
  id: string,
  label: string,
  inputValues?: Record<string, any>,
  ports?: { input?: string; output?: string },
];

type PresetEdgeTuple = readonly [
  source: string,
  sourceHandle: string,
  target: string,
  targetHandle: string,
];

type CompactPreset = Omit<NodeNetworkPreset, 'nodes' | 'edges'> & {
  nodes: PresetNodeTuple[];
  edges: PresetEdgeTuple[];
};

type PipelinePreset = Omit<CompactPreset, 'edges'> & {
  source: string;
  finalOutput?: string;
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
  'math-op': [],
};

const registerPreset = (preset: NodeNetworkPreset) => {
  (presetRegistry[preset.outputType] ||= []).push(preset);
};

const definePreset = ({ nodes, edges, ...preset }: CompactPreset) =>
  registerPreset({
    ...preset,
    nodes: nodes.map(([id, label, inputValues]) => ({
      id,
      label,
      ...(inputValues === undefined ? {} : { inputValues }),
    })),
    edges: edges.map(([source, sourceHandle, target, targetHandle]) => ({
      source,
      sourceHandle,
      target,
      targetHandle,
    })),
  });

const pipelinePorts: Record<string, readonly [input: string, output: string]> =
  {
    'Adaptive Normalize (Quantile)': ['value', 'result'],
    'Average Volume': ['data', 'average'],
    'Band Info': ['data', 'average'],
    'Envelope Follower': ['value', 'env'],
    'Frequency Band': ['frequencyAnalysis', 'bandData'],
    'HSL Color': ['h', 'color'],
    'Hysteresis Gate': ['value', 'gated'],
    Math: ['a', 'result'],
    Normalize: ['value', 'result'],
    'Pitch Detection': ['audioSignal', 'midi'],
    'Rate Limiter': ['value', 'limited'],
    'Section Change Detector': ['flux', 'trigger'],
    Sine: ['time', 'value'],
    'Spectral Centroid': ['frequencyAnalysis', 'normalized'],
    'Spectral Flux': ['frequencyAnalysis', 'flux'],
    Spike: ['value', 'result'],
    'Threshold Counter': ['value', 'count'],
    'Value Mapper': ['input', 'output'],
  };

const definePipelinePreset = ({
  nodes,
  source,
  finalOutput = 'output',
  ...preset
}: PipelinePreset) => {
  const port = (node: PresetNodeTuple) => {
    const defaults = pipelinePorts[node[1]];
    if (!defaults) {
      throw new Error(`No pipeline ports declared for "${node[1]}".`);
    }
    return {
      input: node[3]?.input ?? defaults[0],
      output: node[3]?.output ?? defaults[1],
    };
  };
  const edges: PresetEdgeTuple[] = nodes.map((node, index) => {
    const previous = nodes[index - 1];
    return [
      previous?.[0] ?? INPUT_ALIAS,
      previous ? port(previous).output : source,
      node[0],
      port(node).input,
    ];
  });
  const last = nodes.at(-1);
  if (!last) {
    throw new Error(`Pipeline preset "${preset.id}" must contain a node.`);
  }
  edges.push([last[0], port(last).output, OUTPUT_ALIAS, finalOutput]);
  definePreset({ ...preset, nodes, edges });
};

type DetectorNodeIds = readonly [
  band: string,
  info: string,
  envelope: string,
  normalize: string,
  gate: string,
];

const detectorNodes = (
  ids: DetectorNodeIds,
  band: { startFrequency: number; endFrequency: number },
  envelope: { attackMs: number; releaseMs: number },
  normalize: {
    windowMs: number;
    qLow: number;
    qHigh: number;
    freezeBelow: number;
  },
  gate: { low: number; high: number },
  gateOutput: 'gated' | 'state' = 'gated',
  infoValues?: Record<string, any>,
): PresetNodeTuple[] => [
  [ids[0], 'Frequency Band', band],
  [ids[1], 'Band Info', infoValues],
  [ids[2], 'Envelope Follower', envelope],
  [ids[3], 'Adaptive Normalize (Quantile)', normalize],
  [
    ids[4],
    'Hysteresis Gate',
    gate,
    gateOutput === 'state' ? { output: 'state' } : undefined,
  ],
];

const kickDetectorNodes = (
  ids: DetectorNodeIds = ['band', 'info', 'env', 'adapt', 'gate'],
  gateOutput: 'gated' | 'state' = 'gated',
  infoValues?: Record<string, any>,
) =>
  detectorNodes(
    ids,
    { startFrequency: 80, endFrequency: 150 },
    { attackMs: 6, releaseMs: 120 },
    { windowMs: 4000, qLow: 0.5, qHigh: 0.98, freezeBelow: 140 },
    { low: 0.33, high: 0.45 },
    gateOutput,
    infoValues,
  );

const snareDetectorNodes = (
  ids: DetectorNodeIds = ['band', 'info', 'env', 'adapt', 'gate'],
  band = { startFrequency: 180, endFrequency: 4000 },
) =>
  detectorNodes(
    ids,
    band,
    { attackMs: 4, releaseMs: 140 },
    { windowMs: 4000, qLow: 0.5, qHigh: 0.95, freezeBelow: 90 },
    { low: 0.06, high: 0.14 },
  );

export const getPresetsForType = (
  type: NodeHandleType,
): NodeNetworkPreset[] => {
  return presetRegistry[type] || [];
};

export const getPresetById = (id: string): NodeNetworkPreset | null => {
  for (const presets of Object.values(presetRegistry)) {
    const found = presets.find((p) => p.id === id);
    if (found) return found;
  }
  return null;
};

// Instantiate a preset into concrete nodes/edges for a given parameter/network
const instantiatePreset = (
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
      position: { x: 0, y: 0 }, // will be replaced by auto layout
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

  // Apply auto-layout if requested
  const finalNodes = preset.autoPlace ? autoLayoutNodes(nodes, edges) : nodes;

  return { nodes: finalNodes, edges };
};

export const instantiateCanonicalPreset = (
  preset: NodeNetworkPreset,
  graphId: string,
  outputType: NodeHandleType = preset.outputType,
): VizNodeGraphDocument => {
  const { nodes, edges } = instantiatePreset(preset, graphId, outputType);
  const outputNode = nodes.find(
    (node) => node.data.definition.label === 'Output',
  );
  const outputEdge = outputNode
    ? edges.find((edge) => edge.target === outputNode.id)
    : undefined;
  const runtimeNodes = nodes.filter((node) => node !== outputNode);

  return {
    id: graphId,
    name: graphId,
    enabled: true,
    nodes: runtimeNodes.map((node) => {
      const inputs: Record<string, VizGraphNodeInputBinding> =
        Object.fromEntries(
          Object.entries(node.data.inputValues ?? {}).map(
            ([inputKey, value]) => [
              inputKey,
              { kind: 'literal' as const, value: structuredClone(value) },
            ],
          ),
        );

      for (const edge of edges.filter((edge) => edge.target === node.id)) {
        inputs[edge.targetHandle ?? '__viz_default_input__'] = {
          kind: 'node-output',
          nodeId: edge.source,
          output: edge.sourceHandle ?? '__viz_default_output__',
          edgeId: edge.id,
        };
      }

      return {
        id: node.id,
        type: node.data.portableNodeType ?? node.data.definition.label,
        position: structuredClone(node.position),
        ...(Object.keys(inputs).length > 0 ? { inputs } : {}),
      };
    }),
    outputs: [
      {
        key: 'value',
        valueType: outputType,
        ...(outputNode
          ? { position: structuredClone(outputNode.position) }
          : {}),
        ...(outputEdge
          ? {
              nodeId: outputEdge.source,
              output: outputEdge.sourceHandle ?? '__viz_default_output__',
            }
          : {}),
      },
    ],
  };
};

// ===== SIMPLE STARTER PRESETS =====

definePipelinePreset({
  id: 'number-sine-osc',
  name: 'Sine Oscillator (time)',
  description: 'Maps Input.time -> Sine -> Output',
  outputType: 'number',
  autoPlace: true,
  source: 'time',
  nodes: [['sine', 'Sine', { frequency: 1, phase: 0, amplitude: 1 }]],
});

definePipelinePreset({
  id: 'number-average-volume',
  name: 'Average Volume -> Normalize',
  description:
    'Input.audioSignal -> Average Volume -> Normalize(0..1) -> Output',
  outputType: 'number',
  autoPlace: true,
  source: 'audioSignal',
  nodes: [
    ['avg', 'Average Volume'],
    [
      'norm',
      'Normalize',
      { inputMin: 0, inputMax: 255, outputMin: 0, outputMax: 1 },
    ],
  ],
});

// ===== FEATURE EXTRACTION PRESETS =====
// High-quality, tuned networks for extracting musical features

// Kick Drum Detection
definePipelinePreset({
  id: 'kick-adaptive',
  name: '🥁 Kick Drum (Adaptive)',
  description:
    'Kick energy: Frequency Band(80-150Hz) → Band Info → Smoothing → Adaptive Normalize (Quantile) → Hysteresis Gate → Output',
  outputType: 'number',
  autoPlace: true,
  source: 'frequencyAnalysis',
  nodes: kickDetectorNodes(),
});

// Snare/Clap Detection
definePipelinePreset({
  id: 'snare-adaptive',
  name: '🥁 Snare/Clap (Adaptive)',
  description:
    'Snare/Clap energy: Frequency Band(180-4000Hz) → Band Info → Smoothing → Adaptive Normalize (Quantile) → Hysteresis Gate → Output',
  outputType: 'number',
  autoPlace: true,
  source: 'frequencyAnalysis',
  nodes: snareDetectorNodes(),
});

// Bass Presence
definePipelinePreset({
  id: 'bass-adaptive',
  name: '🎸 Bass Presence',
  description:
    'Bass presence: Frequency Band(20–163Hz) → Band Info (average) → Adaptive Normalize (Quantile) → Envelope Follower → Output',
  outputType: 'number',
  autoPlace: true,
  source: 'frequencyAnalysis',
  nodes: [
    [
      'band',
      'Frequency Band',
      {
        startFrequency: 20,
        endFrequency: 163,
      },
    ],
    ['info', 'Band Info'],
    [
      'adapt',
      'Adaptive Normalize (Quantile)',
      {
        windowMs: 4000,
        qLow: 0.3,
        qHigh: 0.9,
        freezeBelow: 130,
      },
    ],
    ['env_follow', 'Envelope Follower', { attackMs: 100, releaseMs: 400 }],
  ],
});

// Melody/Vocal Detection
definePreset({
  id: 'melody-harmonic',
  name: '🎵 Melody/Vocal (Harmonic)',
  description:
    'Melodic/voiced presence using harmonic series scoring, smoothed by an envelope follower and mapped to 0–1.',
  outputType: 'number',
  autoPlace: true,
  nodes: [
    [
      'band',
      'Frequency Band',
      {
        startFrequency: 212,
        endFrequency: 3762,
      },
    ],
    [
      'harm',
      'Harmonic Presence',
      {
        maxHarmonics: 3,
        toleranceCents: 50,
        smoothMs: 100,
        minSNR: 0.6,
      },
    ],
    ['env', 'Envelope Follower', { attackMs: 6, releaseMs: 300 }],
    [
      'norm',
      'Normalize',
      {
        inputMin: 0.2,
        inputMax: 0.4,
        outputMin: 0,
        outputMax: 1,
      },
    ],
  ],
  edges: [
    [INPUT_ALIAS, 'frequencyAnalysis', 'band', 'frequencyAnalysis'],
    ['band', 'bandData', 'harm', 'data'],
    ['band', 'bandStartBin', 'harm', 'bandStartBin'],
    ['band', 'frequencyPerBin', 'harm', 'frequencyPerBin'],
    ['harm', 'presence', 'env', 'value'],
    ['env', 'env', 'norm', 'value'],
    ['norm', 'result', OUTPUT_ALIAS, 'output'],
  ],
});

// Percussion Detection
definePipelinePreset({
  id: 'percussion-adaptive',
  name: '🥁 Percussion (Hi-Freq)',
  description:
    'Percussive energy: Frequency Band (4–10kHz) → Band Info → Adaptive Normalize (Quantile) → Hysteresis Gate → Output',
  outputType: 'number',
  autoPlace: true,
  source: 'frequencyAnalysis',
  nodes: [
    [
      'band',
      'Frequency Band',
      {
        startFrequency: 4000,
        endFrequency: 10000,
      },
    ],
    ['info', 'Band Info'],
    [
      'adapt',
      'Adaptive Normalize (Quantile)',
      {
        windowMs: 4000,
        qLow: 0.5,
        qHigh: 0.9,
        freezeBelow: 40,
      },
    ],
    ['gate', 'Hysteresis Gate', { low: 0.4, high: 0.5 }],
  ],
});

// Hi-Hat Detection (higher frequency, tighter response)
definePipelinePreset({
  id: 'hihat-adaptive',
  name: '🎩 Hi-Hat Detection',
  description:
    'Hi-hat hits: Frequency Band (6–14kHz) → Band Info → Adaptive Normalize → Hysteresis Gate → Output. Tuned for crisp, transient hi-hat hits.',
  outputType: 'number',
  autoPlace: true,
  source: 'frequencyAnalysis',
  nodes: [
    [
      'band',
      'Frequency Band',
      {
        startFrequency: 6000,
        endFrequency: 14000,
      },
    ],
    ['info', 'Band Info'],
    [
      'adapt',
      'Adaptive Normalize (Quantile)',
      {
        windowMs: 3000, // Shorter window for faster response
        qLow: 0.6, // Higher threshold to catch transients
        qHigh: 0.92,
        freezeBelow: 35,
      },
    ],
    [
      'gate',
      'Hysteresis Gate',
      {
        low: 0.45, // Tighter gate for crisp hits
        high: 0.55,
      },
    ],
  ],
});

// Kick + Bass Combined Intensity with Smooth Decay
definePreset({
  id: 'kick-bass-smooth-intensity',
  name: '💥 Kick + Bass (Smooth Decay)',
  description:
    'Combines kick and bass energy with smooth decay. Kick Band + Bass Band → Take Maximum → Envelope Follower (smooth release) → Scaled Output. Perfect for beam/light intensity.',
  outputType: 'number',
  autoPlace: true,
  nodes: [
    ['kick_band', 'Frequency Band', { startFrequency: 80, endFrequency: 150 }],
    ['kick_info', 'Band Info'],
    [
      'kick_adapt',
      'Adaptive Normalize (Quantile)',
      {
        windowMs: 4000,
        qLow: 0.5,
        qHigh: 0.98,
        freezeBelow: 140,
      },
    ],
    ['bass_band', 'Frequency Band', { startFrequency: 20, endFrequency: 163 }],
    ['bass_info', 'Band Info'],
    [
      'bass_adapt',
      'Adaptive Normalize (Quantile)',
      {
        windowMs: 4000,
        qLow: 0.3,
        qHigh: 0.9,
        freezeBelow: 130,
      },
    ],
    ['combine', 'Math', { operation: 'max' }],
    ['envelope', 'Envelope Follower', { attackMs: 5, releaseMs: 150 }],
    ['scale', 'Math', { a: 1, b: 2.5, operation: 'multiply' }],
  ],
  edges: [
    [INPUT_ALIAS, 'frequencyAnalysis', 'kick_band', 'frequencyAnalysis'],
    ['kick_band', 'bandData', 'kick_info', 'data'],
    ['kick_info', 'average', 'kick_adapt', 'value'],
    [INPUT_ALIAS, 'frequencyAnalysis', 'bass_band', 'frequencyAnalysis'],
    ['bass_band', 'bandData', 'bass_info', 'data'],
    ['bass_info', 'average', 'bass_adapt', 'value'],
    ['kick_adapt', 'result', 'combine', 'a'],
    ['bass_adapt', 'result', 'combine', 'b'],
    ['combine', 'result', 'envelope', 'value'],
    ['envelope', 'env', 'scale', 'a'],
    ['scale', 'result', OUTPUT_ALIAS, 'output'],
  ],
});

// Strobe Flash Rate based on Spectral Flux (Energy Changes)
definePipelinePreset({
  id: 'strobe-buildup-detector',
  name: '⚡ Strobe Buildup Detector',
  description:
    'Controls strobe flash rate based on energy changes. Spectral Flux (detects buildups/drops) → Envelope Follower (smooth transitions) → Normalize → Output. Fast flashing during buildups and drops, slower during steady sections.',
  outputType: 'number',
  autoPlace: true,
  source: 'frequencyAnalysis',
  nodes: [
    ['flux', 'Spectral Flux', { smoothMs: 30 }],
    ['env', 'Envelope Follower', { attackMs: 50, releaseMs: 800 }],
    [
      'norm',
      'Normalize',
      {
        inputMin: 30,
        inputMax: 50,
        outputMin: 0.01,
        outputMax: 0.9,
      },
    ],
  ],
});

// Laser Mode Cycling based on Sub-Bass Presence (0-120 Hz)
definePipelinePreset({
  id: 'laser-mode-section-cycle',
  name: '🎨 Laser Mode (Sub-Bass)',
  description:
    'Laser mode switching based on sub-bass (0-120 Hz) presence. Monitors kick drum fundamentals with static threshold - simple, focused, and reliable!',
  outputType: 'string',
  autoPlace: true,
  source: 'frequencyAnalysis',
  nodes: [
    [
      'bass_band',
      'Frequency Band',
      {
        startFrequency: 0,
        endFrequency: 120,
      },
    ],
    ['bass_info', 'Band Info', {}],
    [
      'detector',
      'Section Change Detector',
      {
        threshold: 30,
        cooldownMs: 100,
        holdMs: 150,
      },
    ],
    [
      'counter',
      'Threshold Counter',
      {
        threshold: 0.5,
        maxValue: 5,
      },
    ],
    [
      'mapper',
      'Value Mapper',
      {
        mode: 'string',
        mapping: {
          '0': '0',
          '1': '1',
          '2': '2',
          '3': '3',
          '4': '4',
        },
        default: 'auto',
      },
    ],
  ],
});

// Overhead Blinder - Big Impact Flash
definePipelinePreset({
  id: 'overhead-blinder-big-impact',
  name: '💥 Overhead Blinder (Big Impact Flash)',
  description:
    'Flashes overhead blinder only on very big bass impacts/drops. Bass-focused analysis with aggressive normalization to trigger only on the biggest moments!',
  outputType: 'number',
  autoPlace: true,
  source: 'frequencyAnalysis',
  nodes: [
    [
      'full_band',
      'Frequency Band',
      {
        startFrequency: 20,
        endFrequency: 200, // Bass frequencies only
      },
    ],
    ['band_info', 'Band Info', {}],
    [
      'normalize',
      'Adaptive Normalize (Quantile)',
      {
        windowMs: 4000, // Medium window for quicker adaptation
        qLow: 0.6,
        qHigh: 0.98, // Very high threshold
        freezeBelow: 100, // Lower freeze threshold
      },
    ],
    [
      'envelope',
      'Envelope Follower',
      {
        attackMs: 1, // Instant flash
        releaseMs: 400, // Medium decay
      },
    ],
    [
      'gate',
      'Hysteresis Gate',
      {
        low: 0.8725, // Extremely high threshold for rare triggers
        high: 0.9625,
      },
    ],
    [
      'scale',
      'Math',
      {
        a: 0, // Will receive gated signal (0 or 1)
        b: 10, // Subtle max intensity
        operation: 'multiply',
      },
    ],
  ],
});

// Mode Cycling based on Bassline Melody
definePipelinePreset({
  id: 'beam-mode-melody-cycle',
  name: '🔄 Beam Mode Cycling (Bassline Melody)',
  description:
    'Cycles through beam modes (0-6) based on bassline melody changes. Detects bass melody shifts with rate limiting to prevent twitchy switching. Smooth and impactful!',
  outputType: 'string',
  autoPlace: true,
  source: 'frequencyAnalysis',
  nodes: [
    [
      'band',
      'Frequency Band',
      {
        startFrequency: 80,
        endFrequency: 400,
      },
    ],
    ['band_info', 'Band Info', {}],
    ['env', 'Envelope Follower', { attackMs: 10, releaseMs: 200 }],
    [
      'adapt',
      'Adaptive Normalize (Quantile)',
      {
        windowMs: 3000,
        qLow: 0.3,
        qHigh: 0.99,
        freezeBelow: 50,
      },
    ],
    [
      'gate',
      'Hysteresis Gate',
      {
        low: 0.8,
        high: 0.9,
      },
    ],
    [
      'counter',
      'Threshold Counter',
      {
        threshold: 0.5,
        maxValue: 7,
      },
    ],
    [
      'limiter',
      'Rate Limiter',
      {
        minIntervalMs: 500, // Minimum 500ms between mode changes
      },
    ],
    [
      'mapper',
      'Value Mapper',
      {
        mode: 'string',
        mapping: {
          '0': '0',
          '1': '1',
          '2': '2',
          '3': '3',
          '4': '4',
          '5': '5',
          '6': '6',
        },
        default: '0',
      },
    ],
  ],
});

// ========================================
// 🎯 HIGH ENERGY GATE
// ========================================

definePipelinePreset({
  id: 'laser-high-energy-gate',
  name: '⚡ High Energy Gate',
  description:
    'Enables lasers only during high energy sections. Uses adaptive normalization to handle varying energy levels with hysteresis to prevent flickering!',
  outputType: 'boolean',
  autoPlace: true,
  source: 'frequencyAnalysis',
  nodes: [
    [
      'full_band',
      'Frequency Band',
      {
        startFrequency: 20,
        endFrequency: 20000,
      },
    ],
    ['energy', 'Band Info', {}],
    [
      'normalize',
      'Adaptive Normalize (Quantile)',
      {
        windowMs: 2000,
        qLow: 0.05,
        qHigh: 0.95,
        freezeBelow: 50,
      },
    ],
    [
      'gate',
      'Hysteresis Gate',
      {
        low: 0.2, // Turn off below 50% normalized energy
        high: 0.65, // Turn on above 65% normalized energy
      },
      { output: 'state' },
    ],
  ],
});

// ========================================
// 🎤 MOVING LIGHTS MODE CYCLE
// ========================================

definePipelinePreset({
  id: 'moving-lights-kick-cycle',
  name: '🎤 Moving Lights (Kick Cycle)',
  description:
    'Cycles through moving light modes on each kick hit. Creates dynamic variation in movement patterns!',
  outputType: 'string',
  autoPlace: true,
  source: 'frequencyAnalysis',
  nodes: [
    [
      'kick_band',
      'Frequency Band',
      {
        startFrequency: 20,
        endFrequency: 150,
      },
    ],
    ['kick_info', 'Band Info', {}],
    [
      'spike',
      'Spike',
      {
        threshold: 50,
        attack: 10,
        release: 150,
      },
    ],
    [
      'counter',
      'Threshold Counter',
      {
        threshold: 130,
        maxValue: 5,
      },
    ],
    [
      'mapper',
      'Value Mapper',
      {
        mode: 'string',
        mapping: {
          '0': '0',
          '1': '1',
          '2': '2',
          '3': '3',
          '4': '4',
        },
        default: '0',
      },
    ],
  ],
});

// ========================================
// 🌀 SHADER WALL ANIMATIONS
// ========================================

definePreset({
  id: 'shader-wall-bass-pulse',
  name: '🌀 Shader Wall (Bass Pulse + Slow Wave)',
  description:
    'Combines a slow sine wave (0-4, 1 cycle/min) with a small bass shake. Creates a breathing effect with audio-reactive details!',
  outputType: 'number',
  autoPlace: true,
  nodes: [
    [
      'slow_sine',
      'Sine',
      {
        frequency: 0.01667, // 1/60 Hz = 1 cycle per minute
        phase: 0,
        amplitude: 2, // Range will be -2 to +2
      },
    ],
    [
      'sine_offset',
      'Math',
      {
        a: 3, // Offset to 1
        b: 0, // Will receive sine output
        operation: 'add',
      },
    ],
    [
      'bass_band',
      'Frequency Band',
      {
        startFrequency: 20,
        endFrequency: 200,
      },
    ],
    ['bass_info', 'Band Info', {}],
    [
      'normalize',
      'Adaptive Normalize (Quantile)',
      {
        windowMs: 1000,
        qLow: 0.1,
        qHigh: 0.95,
        freezeBelow: 30,
      },
    ],
    [
      'envelope',
      'Envelope Follower',
      {
        attackMs: 10,
        releaseMs: 300,
      },
    ],
    [
      'bass_scale',
      'Math',
      {
        a: 0, // Will receive bass pulse
        b: 0.3, // Scale factor for small shake
        operation: 'multiply',
      },
    ],
    [
      'combine',
      'Math',
      {
        a: 0, // Will receive slow sine
        b: 0, // Will receive bass shake
        operation: 'add',
      },
    ],
  ],
  edges: [
    [INPUT_ALIAS, 'time', 'slow_sine', 'time'],
    ['slow_sine', 'value', 'sine_offset', 'b'],
    [INPUT_ALIAS, 'frequencyAnalysis', 'bass_band', 'frequencyAnalysis'],
    ['bass_band', 'bandData', 'bass_info', 'data'],
    ['bass_info', 'average', 'normalize', 'value'],
    ['normalize', 'result', 'envelope', 'value'],
    ['envelope', 'env', 'bass_scale', 'a'],
    ['sine_offset', 'result', 'combine', 'a'],
    ['bass_scale', 'result', 'combine', 'b'],
    ['combine', 'result', OUTPUT_ALIAS, 'output'],
  ],
});

definePipelinePreset({
  id: 'shader-wall-kick-flash',
  name: '🌀 Shader Wall (Energy Brightness)',
  description:
    'Brightness adapts to overall song energy (1-3 range). Uses medium averaging window for quick response to energy changes!',
  outputType: 'number',
  autoPlace: true,
  source: 'frequencyAnalysis',
  nodes: [
    [
      'full_band',
      'Frequency Band',
      {
        startFrequency: 20,
        endFrequency: 20000,
      },
    ],
    ['band_info', 'Band Info', {}],
    [
      'normalize',
      'Adaptive Normalize (Quantile)',
      {
        windowMs: 2500, // Medium window for quick adaptation
        qLow: 0.1,
        qHigh: 0.95,
        freezeBelow: 50,
      },
    ],
    [
      'envelope',
      'Envelope Follower',
      {
        attackMs: 50,
        releaseMs: 200,
      },
    ],
    [
      'scale',
      'Math',
      {
        a: 0, // Will receive normalized energy (0-1)
        b: 2, // Multiply by 2 to get 0-2 range
        operation: 'multiply',
      },
    ],
    [
      'offset',
      'Math',
      {
        a: 1, // Base brightness of 1
        b: 0, // Will receive scaled energy
        operation: 'add',
      },
      { input: 'b' },
    ],
  ],
});

definePipelinePreset({
  id: 'shader-wall-rotation-kick-vocal',
  name: '🌀 Shader Wall (Rotation - Kick Cycle)',
  description:
    'Cycles through discrete rotation speeds (0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0) on each kick hit. Creates varying rotation patterns!',
  outputType: 'number',
  autoPlace: true,
  source: 'frequencyAnalysis',
  nodes: [
    ...kickDetectorNodes(
      ['kick_band', 'kick_info', 'kick_env', 'kick_adapt', 'gate'],
      'gated',
      {},
    ),
    [
      'counter',
      'Threshold Counter',
      {
        threshold: 0.5,
        maxValue: 6, // Counts 0-6 (7 values)
      },
    ],
    [
      'scale',
      'Math',
      {
        a: 0, // Will receive count 0-6
        b: 0.5, // Multiply by 0.5
        operation: 'multiply',
      },
    ],
  ],
});

definePipelinePreset({
  id: 'shader-wall-travel-snare-cycle',
  name: '🌀 Shader Wall (Travel - Snare Cycle)',
  description:
    'Cycles through discrete travel speeds (0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0) on each snare hit. Creates varying forward motion patterns!',
  outputType: 'number',
  autoPlace: true,
  source: 'frequencyAnalysis',
  nodes: [
    ...snareDetectorNodes(['snare_band', 'snare_info', 'env', 'adapt', 'gate']),
    [
      'counter',
      'Threshold Counter',
      {
        threshold: 0.5,
        maxValue: 6, // Counts 0-6 (7 values)
      },
    ],
    [
      'scale',
      'Math',
      {
        a: 0, // Will receive count 0-6
        b: 0.5, // Multiply by 0.5
        operation: 'multiply',
      },
    ],
  ],
});

// ========================================
// 💡 STAGE LIGHTS COLOR CYCLING
// ========================================

definePipelinePreset({
  id: 'stage-lights-snare-color-cycle',
  name: '💡 Stage Lights (Snare Color Cycle)',
  description:
    'Cycles through colors on each snare hit. Snare Detection → Threshold Counter → Value Mapper (Color Mode) → Output. Perfect for creating dynamic color changes with the beat!',
  outputType: 'color',
  autoPlace: true,
  source: 'frequencyAnalysis',
  nodes: [
    ...snareDetectorNodes(['snare_band', 'snare_info', 'env', 'adapt', 'gate']),
    [
      'counter',
      'Threshold Counter',
      {
        threshold: 0.5,
        maxValue: 5,
      },
    ],
    [
      'mapper',
      'Value Mapper',
      {
        mode: 'color',
        mapping: {
          '0': '#ff0000', // Red
          '1': '#00ff00', // Green
          '2': '#0000ff', // Blue
          '3': '#ffff00', // Yellow
          '4': '#ff00ff', // Magenta
        },
        default: '#ffffff',
      },
    ],
  ],
});

// ========================================
// 🌈 SPECTRAL CENTROID HUE
// ========================================

definePipelinePreset({
  id: 'spectral-centroid-hue',
  name: '🌈 Spectral Centroid Hue',
  description:
    'Maps spectral centroid (timbral brightness) to hue. Bass-heavy = blue/purple, treble-heavy = red/orange. Creates smooth color shifts that follow the tonal character of the music.',
  outputType: 'color',
  autoPlace: true,
  source: 'frequencyAnalysis',
  nodes: [
    ['centroid', 'Spectral Centroid', { smoothMs: 200 }],
    [
      'norm',
      'Normalize',
      {
        inputMin: 0,
        inputMax: 1,
        outputMin: 0,
        outputMax: 360,
      },
    ],
    [
      'hsl',
      'HSL Color',
      {
        h: 0,
        s: 70,
        l: 40,
      },
    ],
  ],
});

// ========================================
// 🎹 HARMONIC PITCH TO COLOR
// ========================================

definePreset({
  id: 'harmonic-pitch-color',
  name: '🎹 Harmonic Pitch → 12 Colors',
  description:
    'Detects harmonic content in a frequency band and maps the MIDI pitch class (0-11) to 12 distinct hues. Each chromatic note gets a unique color! Great for melodic/vocal content.',
  outputType: 'color',
  autoPlace: true,
  nodes: [
    [
      'band',
      'Frequency Band',
      {
        startFrequency: 550,
        endFrequency: 1850,
      },
    ],
    [
      'harmonic',
      'Harmonic Presence',
      {
        toleranceCents: 40,
        smoothMs: 0.1,
      },
    ],
    [
      'mod12',
      'Math',
      {
        a: 0,
        b: 12,
        operation: 'modulo',
      },
    ],
    [
      'norm',
      'Normalize',
      {
        inputMin: 0,
        inputMax: 12,
        outputMin: 0,
        outputMax: 360,
      },
    ],
    [
      'hsl',
      'HSL Color',
      {
        h: 0,
        s: 100,
        l: 50,
      },
    ],
  ],
  edges: [
    [INPUT_ALIAS, 'frequencyAnalysis', 'band', 'frequencyAnalysis'],
    ['band', 'bandData', 'harmonic', 'data'],
    ['band', 'bandStartBin', 'harmonic', 'bandStartBin'],
    ['band', 'frequencyPerBin', 'harmonic', 'frequencyPerBin'],
    ['harmonic', 'midi', 'mod12', 'a'],
    ['mod12', 'result', 'norm', 'value'],
    ['norm', 'result', 'hsl', 'h'],
    ['hsl', 'color', OUTPUT_ALIAS, 'output'],
  ],
});

// Pitch Detection → MIDI Modulo
definePipelinePreset({
  id: 'pitch-detection-midi-mod',
  name: '🎵 Pitch Detection → MIDI (Mod 12)',
  description:
    'Detects pitch from melodic content using YIN algorithm, outputs MIDI note modulo 12 (chromatic scale index 0-11). Perfect for mapping melodies to 12 modes/colors! Low latency.',
  outputType: 'number',
  autoPlace: true,
  source: 'audioSignal',
  nodes: [
    [
      'pitch',
      'Pitch Detection',
      {
        sampleRate: 44100,
        minHz: 80,
        maxHz: 1200,
        threshold: 0.15,
        smoothMs: 50,
        stabilityCents: 80,
      },
    ],
    [
      'modulo',
      'Math',
      {
        a: 0,
        b: 12,
        operation: 'modulo', // MathOperation.Modulo
      },
    ],
  ],
});

// ========================================
// 🎥 DEPTH OF FIELD FOCUS
// ========================================

definePipelinePreset({
  id: 'dof-focus-slow-sine',
  name: '🎥 DOF Focus (Slow Sine Wave)',
  description:
    'Slow sine wave oscillating between 1-40 over 5 seconds. Creates a breathing focus effect for depth of field, smoothly sweeping from near to far focus.',
  outputType: 'number',
  autoPlace: true,
  source: 'time',
  nodes: [
    [
      'sine',
      'Sine',
      {
        frequency: 0.2, // 1/20 Hz = 5 second period
        phase: 0,
        amplitude: 1, // -1 to 1 range
      },
    ],
    [
      'normalize',
      'Math',
      {
        a: 1, // Add 1
        b: 0, // Will receive sine output (-1 to 1)
        operation: 'add',
      },
      { input: 'b' },
    ],
    [
      'scale',
      'Math',
      {
        a: 0, // Will receive normalized value (0 to 2)
        b: 19.5, // Multiply by 19.5 to get 0 to 39
        operation: 'multiply',
      },
    ],
    [
      'offset',
      'Math',
      {
        a: 1, // Base offset
        b: 0, // Will receive scaled value (0 to 39)
        operation: 'add',
      },
      { input: 'b' },
    ],
  ],
});

// ========================================
// 🧠 NEURAL NETWORK TRIGGERS
// ========================================

definePipelinePreset({
  id: 'neural-seed-snare-cycle',
  name: '🧠 Neuron Seed (Snare Cycle)',
  description:
    'Cycles neuron seed 0-1000 on snare hits, rate-limited to once per 2 seconds for smooth transitions.',
  outputType: 'number',
  autoPlace: true,
  source: 'frequencyAnalysis',
  nodes: [
    ...snareDetectorNodes(
      ['snare_band', 'snare_info', 'env', 'adapt', 'gate'],
      { startFrequency: 50, endFrequency: 150 },
    ),
    [
      'counter',
      'Threshold Counter',
      {
        threshold: 0.5,
        maxValue: 1000,
      },
    ],
    [
      'limiter',
      'Rate Limiter',
      {
        minIntervalMs: 4000, // Minimum 2 seconds between changes
      },
    ],
  ],
});

definePipelinePreset({
  id: 'neural-fire-on-kick',
  name: '🧠 Fire Neurons (Kick Trigger)',
  description:
    'Triggers neural network firing on every kick drum hit. Kick detection with hysteresis gate for clean boolean pulses.',
  outputType: 'boolean',
  autoPlace: true,
  source: 'frequencyAnalysis',
  nodes: kickDetectorNodes(
    ['kick_band', 'kick_info', 'env', 'adapt', 'gate'],
    'state',
  ),
});
