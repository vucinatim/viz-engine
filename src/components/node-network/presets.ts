import { Edge } from '@xyflow/react';
import { NodeHandleType } from '../config/node-types';
import {
  AnimNode,
  InputNode,
  NodeDefinitionMap,
  createOutputNode,
} from './animation-nodes';
import { autoLayoutNodes } from './auto-layout';
import { GraphNode } from './node-network-store';

// Aliases used inside presets to reference the network I/O nodes
export const INPUT_ALIAS = 'INPUT';
export const OUTPUT_ALIAS = 'OUTPUT';

export type PresetNodeSpec = {
  id: string;
  label: string; // AnimNode label
  position?: { x: number; y: number };
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
  'math-op': [],
};

export const registerPreset = (preset: NodeNetworkPreset) => {
  (presetRegistry[preset.outputType] ||= []).push(preset);
};

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

// ===== SIMPLE STARTER PRESETS =====

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
    { id: 'avg', label: 'Average Volume' },
    {
      id: 'norm',
      label: 'Normalize',
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

// ===== FEATURE EXTRACTION PRESETS =====
// High-quality, tuned networks for extracting musical features

// Kick Drum Detection
registerPreset({
  id: 'kick-adaptive',
  name: '🥁 Kick Drum (Adaptive)',
  description:
    'Kick energy: Frequency Band(80-150Hz) → Band Info → Smoothing → Adaptive Normalize (Quantile) → Hysteresis Gate → Output',
  outputType: 'number',
  autoPlace: true,
  nodes: [
    {
      id: 'band',
      label: 'Frequency Band',
      inputValues: { startFrequency: 80, endFrequency: 150 },
    },
    {
      id: 'info',
      label: 'Band Info',
    },
    {
      id: 'env',
      label: 'Envelope Follower',
      inputValues: { attackMs: 6, releaseMs: 120 },
    },
    {
      id: 'adapt',
      label: 'Adaptive Normalize (Quantile)',
      inputValues: {
        windowMs: 4000,
        qLow: 0.5,
        qHigh: 0.98,
        freezeBelow: 140,
      },
    },
    {
      id: 'gate',
      label: 'Hysteresis Gate',
      inputValues: { low: 0.33, high: 0.45 },
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
      target: 'info',
      targetHandle: 'data',
    },
    {
      source: 'info',
      sourceHandle: 'average',
      target: 'env',
      targetHandle: 'value',
    },
    {
      source: 'env',
      sourceHandle: 'env',
      target: 'adapt',
      targetHandle: 'value',
    },
    {
      source: 'adapt',
      sourceHandle: 'result',
      target: 'gate',
      targetHandle: 'value',
    },
    {
      source: 'gate',
      sourceHandle: 'gated',
      target: OUTPUT_ALIAS,
      targetHandle: 'output',
    },
  ],
});

// Snare/Clap Detection
registerPreset({
  id: 'snare-adaptive',
  name: '🥁 Snare/Clap (Adaptive)',
  description:
    'Snare/Clap energy: Frequency Band(180-4000Hz) → Band Info → Smoothing → Adaptive Normalize (Quantile) → Hysteresis Gate → Output',
  outputType: 'number',
  autoPlace: true,
  nodes: [
    {
      id: 'band',
      label: 'Frequency Band',
      inputValues: { startFrequency: 180, endFrequency: 4000 },
    },
    {
      id: 'info',
      label: 'Band Info',
    },
    {
      id: 'env',
      label: 'Envelope Follower',
      inputValues: { attackMs: 4, releaseMs: 140 },
    },
    {
      id: 'adapt',
      label: 'Adaptive Normalize (Quantile)',
      inputValues: {
        windowMs: 4000,
        qLow: 0.5,
        qHigh: 0.95,
        freezeBelow: 90,
      },
    },
    {
      id: 'gate',
      label: 'Hysteresis Gate',
      inputValues: { low: 0.06, high: 0.14 },
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
      target: 'info',
      targetHandle: 'data',
    },
    {
      source: 'info',
      sourceHandle: 'average',
      target: 'env',
      targetHandle: 'value',
    },
    {
      source: 'env',
      sourceHandle: 'env',
      target: 'adapt',
      targetHandle: 'value',
    },
    {
      source: 'adapt',
      sourceHandle: 'result',
      target: 'gate',
      targetHandle: 'value',
    },
    {
      source: 'gate',
      sourceHandle: 'gated',
      target: OUTPUT_ALIAS,
      targetHandle: 'output',
    },
  ],
});

// Bass Presence
registerPreset({
  id: 'bass-adaptive',
  name: '🎸 Bass Presence',
  description:
    'Bass presence: Frequency Band(20–163Hz) → Band Info (average) → Adaptive Normalize (Quantile) → Envelope Follower → Output',
  outputType: 'number',
  autoPlace: true,
  nodes: [
    {
      id: 'band',
      label: 'Frequency Band',
      inputValues: {
        startFrequency: 20,
        endFrequency: 163,
      },
    },
    {
      id: 'info',
      label: 'Band Info',
    },
    {
      id: 'adapt',
      label: 'Adaptive Normalize (Quantile)',
      inputValues: {
        windowMs: 4000,
        qLow: 0.3,
        qHigh: 0.9,
        freezeBelow: 130,
      },
    },
    {
      id: 'env_follow',
      label: 'Envelope Follower',
      inputValues: { attackMs: 100, releaseMs: 400 },
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
      target: 'info',
      targetHandle: 'data',
    },
    {
      source: 'info',
      sourceHandle: 'average',
      target: 'adapt',
      targetHandle: 'value',
    },
    {
      source: 'adapt',
      sourceHandle: 'result',
      target: 'env_follow',
      targetHandle: 'value',
    },
    {
      source: 'env_follow',
      sourceHandle: 'env',
      target: OUTPUT_ALIAS,
      targetHandle: 'output',
    },
  ],
});

// Melody/Vocal Detection
registerPreset({
  id: 'melody-harmonic',
  name: '🎵 Melody/Vocal (Harmonic)',
  description:
    'Melodic/voiced presence using harmonic series scoring, smoothed by an envelope follower and mapped to 0–1.',
  outputType: 'number',
  autoPlace: true,
  nodes: [
    {
      id: 'band',
      label: 'Frequency Band',
      inputValues: {
        startFrequency: 212,
        endFrequency: 3762,
      },
    },
    {
      id: 'harm',
      label: 'Harmonic Presence',
      inputValues: {
        maxHarmonics: 3,
        toleranceCents: 50,
        smoothMs: 100,
        minSNR: 0.6,
      },
    },
    {
      id: 'env',
      label: 'Envelope Follower',
      inputValues: { attackMs: 6, releaseMs: 300 },
    },
    {
      id: 'norm',
      label: 'Normalize',
      inputValues: {
        inputMin: 0.2,
        inputMax: 0.4,
        outputMin: 0,
        outputMax: 1,
      },
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
      target: 'harm',
      targetHandle: 'data',
    },
    {
      source: 'band',
      sourceHandle: 'bandStartBin',
      target: 'harm',
      targetHandle: 'bandStartBin',
    },
    {
      source: 'band',
      sourceHandle: 'frequencyPerBin',
      target: 'harm',
      targetHandle: 'frequencyPerBin',
    },
    {
      source: 'harm',
      sourceHandle: 'presence',
      target: 'env',
      targetHandle: 'value',
    },
    {
      source: 'env',
      sourceHandle: 'env',
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

// Percussion Detection
registerPreset({
  id: 'percussion-adaptive',
  name: '🥁 Percussion (Hi-Freq)',
  description:
    'Percussive energy: Frequency Band (4–10kHz) → Band Info → Adaptive Normalize (Quantile) → Hysteresis Gate → Output',
  outputType: 'number',
  autoPlace: true,
  nodes: [
    {
      id: 'band',
      label: 'Frequency Band',
      inputValues: {
        startFrequency: 4000,
        endFrequency: 10000,
      },
    },
    {
      id: 'info',
      label: 'Band Info',
    },
    {
      id: 'adapt',
      label: 'Adaptive Normalize (Quantile)',
      inputValues: {
        windowMs: 4000,
        qLow: 0.5,
        qHigh: 0.9,
        freezeBelow: 40,
      },
    },
    {
      id: 'gate',
      label: 'Hysteresis Gate',
      inputValues: { low: 0.4, high: 0.5 },
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
      target: 'info',
      targetHandle: 'data',
    },
    {
      source: 'info',
      sourceHandle: 'average',
      target: 'adapt',
      targetHandle: 'value',
    },
    {
      source: 'adapt',
      sourceHandle: 'result',
      target: 'gate',
      targetHandle: 'value',
    },
    {
      source: 'gate',
      sourceHandle: 'gated',
      target: OUTPUT_ALIAS,
      targetHandle: 'output',
    },
  ],
});

// Hi-Hat Detection (higher frequency, tighter response)
registerPreset({
  id: 'hihat-adaptive',
  name: '🎩 Hi-Hat Detection',
  description:
    'Hi-hat hits: Frequency Band (6–14kHz) → Band Info → Adaptive Normalize → Hysteresis Gate → Output. Tuned for crisp, transient hi-hat hits.',
  outputType: 'number',
  autoPlace: true,
  nodes: [
    {
      id: 'band',
      label: 'Frequency Band',
      inputValues: {
        startFrequency: 6000,
        endFrequency: 14000,
      },
    },
    {
      id: 'info',
      label: 'Band Info',
    },
    {
      id: 'adapt',
      label: 'Adaptive Normalize (Quantile)',
      inputValues: {
        windowMs: 3000, // Shorter window for faster response
        qLow: 0.6, // Higher threshold to catch transients
        qHigh: 0.92,
        freezeBelow: 35,
      },
    },
    {
      id: 'gate',
      label: 'Hysteresis Gate',
      inputValues: {
        low: 0.45, // Tighter gate for crisp hits
        high: 0.55,
      },
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
      target: 'info',
      targetHandle: 'data',
    },
    {
      source: 'info',
      sourceHandle: 'average',
      target: 'adapt',
      targetHandle: 'value',
    },
    {
      source: 'adapt',
      sourceHandle: 'result',
      target: 'gate',
      targetHandle: 'value',
    },
    {
      source: 'gate',
      sourceHandle: 'gated',
      target: OUTPUT_ALIAS,
      targetHandle: 'output',
    },
  ],
});

// Kick + Bass Combined Intensity with Smooth Decay
registerPreset({
  id: 'kick-bass-smooth-intensity',
  name: '💥 Kick + Bass (Smooth Decay)',
  description:
    'Combines kick and bass energy with smooth decay. Kick Band + Bass Band → Take Maximum → Envelope Follower (smooth release) → Scaled Output. Perfect for beam/light intensity.',
  outputType: 'number',
  autoPlace: true,
  nodes: [
    {
      id: 'kick_band',
      label: 'Frequency Band',
      inputValues: { startFrequency: 80, endFrequency: 150 },
    },
    {
      id: 'kick_info',
      label: 'Band Info',
    },
    {
      id: 'kick_adapt',
      label: 'Adaptive Normalize (Quantile)',
      inputValues: {
        windowMs: 4000,
        qLow: 0.5,
        qHigh: 0.98,
        freezeBelow: 140,
      },
    },
    {
      id: 'bass_band',
      label: 'Frequency Band',
      inputValues: { startFrequency: 20, endFrequency: 163 },
    },
    {
      id: 'bass_info',
      label: 'Band Info',
    },
    {
      id: 'bass_adapt',
      label: 'Adaptive Normalize (Quantile)',
      inputValues: {
        windowMs: 4000,
        qLow: 0.3,
        qHigh: 0.9,
        freezeBelow: 130,
      },
    },
    {
      id: 'combine',
      label: 'Math',
      inputValues: { operation: 'max' },
    },
    {
      id: 'envelope',
      label: 'Envelope Follower',
      inputValues: { attackMs: 5, releaseMs: 150 },
    },
    {
      id: 'scale',
      label: 'Math',
      inputValues: { a: 1, b: 2.5, operation: 'multiply' },
    },
  ],
  edges: [
    // Kick chain
    {
      source: INPUT_ALIAS,
      sourceHandle: 'frequencyAnalysis',
      target: 'kick_band',
      targetHandle: 'frequencyAnalysis',
    },
    {
      source: 'kick_band',
      sourceHandle: 'bandData',
      target: 'kick_info',
      targetHandle: 'data',
    },
    {
      source: 'kick_info',
      sourceHandle: 'average',
      target: 'kick_adapt',
      targetHandle: 'value',
    },
    // Bass chain
    {
      source: INPUT_ALIAS,
      sourceHandle: 'frequencyAnalysis',
      target: 'bass_band',
      targetHandle: 'frequencyAnalysis',
    },
    {
      source: 'bass_band',
      sourceHandle: 'bandData',
      target: 'bass_info',
      targetHandle: 'data',
    },
    {
      source: 'bass_info',
      sourceHandle: 'average',
      target: 'bass_adapt',
      targetHandle: 'value',
    },
    // Combine (take max of kick and bass)
    {
      source: 'kick_adapt',
      sourceHandle: 'result',
      target: 'combine',
      targetHandle: 'a',
    },
    {
      source: 'bass_adapt',
      sourceHandle: 'result',
      target: 'combine',
      targetHandle: 'b',
    },
    // Smooth decay
    {
      source: 'combine',
      sourceHandle: 'result',
      target: 'envelope',
      targetHandle: 'value',
    },
    // Scale to desired range (multiply by 2.5 for 0-2.5 output)
    {
      source: 'envelope',
      sourceHandle: 'env',
      target: 'scale',
      targetHandle: 'a',
    },
    {
      source: 'scale',
      sourceHandle: 'result',
      target: OUTPUT_ALIAS,
      targetHandle: 'output',
    },
  ],
});

// Strobe Flash Rate based on Spectral Flux (Energy Changes)
registerPreset({
  id: 'strobe-buildup-detector',
  name: '⚡ Strobe Buildup Detector',
  description:
    'Controls strobe flash rate based on energy changes. Spectral Flux (detects buildups/drops) → Envelope Follower (smooth transitions) → Normalize → Output. Fast flashing during buildups and drops, slower during steady sections.',
  outputType: 'number',
  autoPlace: true,
  nodes: [
    {
      id: 'flux',
      label: 'Spectral Flux',
      inputValues: { smoothMs: 30 },
    },
    {
      id: 'env',
      label: 'Envelope Follower',
      inputValues: { attackMs: 50, releaseMs: 800 },
    },
    {
      id: 'norm',
      label: 'Normalize',
      inputValues: {
        inputMin: 30,
        inputMax: 50,
        outputMin: 0.01,
        outputMax: 0.9,
      },
    },
  ],
  edges: [
    {
      source: INPUT_ALIAS,
      sourceHandle: 'frequencyAnalysis',
      target: 'flux',
      targetHandle: 'frequencyAnalysis',
    },
    {
      source: 'flux',
      sourceHandle: 'flux',
      target: 'env',
      targetHandle: 'value',
    },
    {
      source: 'env',
      sourceHandle: 'env',
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

// Laser Mode Cycling based on Sub-Bass Presence (0-120 Hz)
registerPreset({
  id: 'laser-mode-section-cycle',
  name: '🎨 Laser Mode (Sub-Bass)',
  description:
    'Laser mode switching based on sub-bass (0-120 Hz) presence. Monitors kick drum fundamentals with static threshold - simple, focused, and reliable!',
  outputType: 'string',
  autoPlace: true,
  nodes: [
    {
      id: 'bass_band',
      label: 'Frequency Band',
      inputValues: {
        startFrequency: 0,
        endFrequency: 120,
      },
    },
    {
      id: 'bass_info',
      label: 'Band Info',
      inputValues: {},
    },
    {
      id: 'detector',
      label: 'Section Change Detector',
      inputValues: {
        threshold: 30,
        cooldownMs: 100,
        holdMs: 150,
      },
    },
    {
      id: 'counter',
      label: 'Threshold Counter',
      inputValues: {
        threshold: 0.5,
        maxValue: 5,
      },
    },
    {
      id: 'mapper',
      label: 'Value Mapper',
      inputValues: {
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
    },
  ],
  edges: [
    {
      source: INPUT_ALIAS,
      sourceHandle: 'frequencyAnalysis',
      target: 'bass_band',
      targetHandle: 'frequencyAnalysis',
    },
    // Extract sub-bass band data
    {
      source: 'bass_band',
      sourceHandle: 'bandData',
      target: 'bass_info',
      targetHandle: 'data',
    },
    // Feed average sub-bass to section detector
    {
      source: 'bass_info',
      sourceHandle: 'average',
      target: 'detector',
      targetHandle: 'flux',
    },
    // Count triggers
    {
      source: 'detector',
      sourceHandle: 'trigger',
      target: 'counter',
      targetHandle: 'value',
    },
    // Map to mode strings
    {
      source: 'counter',
      sourceHandle: 'count',
      target: 'mapper',
      targetHandle: 'input',
    },
    {
      source: 'mapper',
      sourceHandle: 'output',
      target: OUTPUT_ALIAS,
      targetHandle: 'output',
    },
  ],
});

// Overhead Blinder - Big Impact Flash
registerPreset({
  id: 'overhead-blinder-big-impact',
  name: '💥 Overhead Blinder (Big Impact Flash)',
  description:
    'Flashes overhead blinder only on very big bass impacts/drops. Bass-focused analysis with aggressive normalization to trigger only on the biggest moments!',
  outputType: 'number',
  autoPlace: true,
  nodes: [
    // Bass-focused analysis for big impacts
    {
      id: 'full_band',
      label: 'Frequency Band',
      inputValues: {
        startFrequency: 20,
        endFrequency: 200, // Bass frequencies only
      },
    },
    {
      id: 'band_info',
      label: 'Band Info',
      inputValues: {},
    },
    // Aggressive normalization - only the top 2% of energy triggers
    {
      id: 'normalize',
      label: 'Adaptive Normalize (Quantile)',
      inputValues: {
        windowMs: 4000, // Medium window for quicker adaptation
        qLow: 0.6,
        qHigh: 0.98, // Very high threshold
        freezeBelow: 100, // Lower freeze threshold
      },
    },
    // Fast attack, medium decay for flash effect
    {
      id: 'envelope',
      label: 'Envelope Follower',
      inputValues: {
        attackMs: 1, // Instant flash
        releaseMs: 400, // Medium decay
      },
    },
    // Gate to only trigger on very strong signals
    {
      id: 'gate',
      label: 'Hysteresis Gate',
      inputValues: {
        low: 0.8725, // Extremely high threshold for rare triggers
        high: 0.9625,
      },
    },
    // Scale to intensity range (subtle flash)
    {
      id: 'scale',
      label: 'Math',
      inputValues: {
        a: 0, // Will receive gated signal (0 or 1)
        b: 10, // Subtle max intensity
        operation: 'multiply',
      },
    },
  ],
  edges: [
    {
      source: INPUT_ALIAS,
      sourceHandle: 'frequencyAnalysis',
      target: 'full_band',
      targetHandle: 'frequencyAnalysis',
    },
    {
      source: 'full_band',
      sourceHandle: 'bandData',
      target: 'band_info',
      targetHandle: 'data',
    },
    {
      source: 'band_info',
      sourceHandle: 'average',
      target: 'normalize',
      targetHandle: 'value',
    },
    {
      source: 'normalize',
      sourceHandle: 'result',
      target: 'envelope',
      targetHandle: 'value',
    },
    {
      source: 'envelope',
      sourceHandle: 'env',
      target: 'gate',
      targetHandle: 'value',
    },
    {
      source: 'gate',
      sourceHandle: 'gated',
      target: 'scale',
      targetHandle: 'a',
    },
    {
      source: 'scale',
      sourceHandle: 'result',
      target: OUTPUT_ALIAS,
      targetHandle: 'output',
    },
  ],
});

// Mode Cycling based on Bassline Melody
registerPreset({
  id: 'beam-mode-melody-cycle',
  name: '🔄 Beam Mode Cycling (Bassline Melody)',
  description:
    'Cycles through beam modes (0-6) based on bassline melody changes. Detects bass melody shifts with rate limiting to prevent twitchy switching. Smooth and impactful!',
  outputType: 'string',
  autoPlace: true,
  nodes: [
    // Bassline melody frequency range
    {
      id: 'band',
      label: 'Frequency Band',
      inputValues: {
        startFrequency: 80,
        endFrequency: 400,
      },
    },
    {
      id: 'band_info',
      label: 'Band Info',
      inputValues: {},
    },
    // Detect changes in bassline
    {
      id: 'env',
      label: 'Envelope Follower',
      inputValues: { attackMs: 10, releaseMs: 200 },
    },
    {
      id: 'adapt',
      label: 'Adaptive Normalize (Quantile)',
      inputValues: {
        windowMs: 3000,
        qLow: 0.3,
        qHigh: 0.99,
        freezeBelow: 50,
      },
    },
    {
      id: 'gate',
      label: 'Hysteresis Gate',
      inputValues: {
        low: 0.8,
        high: 0.9,
      },
    },
    // Count the changes
    {
      id: 'counter',
      label: 'Threshold Counter',
      inputValues: {
        threshold: 0.5,
        maxValue: 7,
      },
    },
    // Rate limit to prevent rapid switching
    {
      id: 'limiter',
      label: 'Rate Limiter',
      inputValues: {
        minIntervalMs: 500, // Minimum 500ms between mode changes
      },
    },
    // Map to mode strings
    {
      id: 'mapper',
      label: 'Value Mapper',
      inputValues: {
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
      target: 'band_info',
      targetHandle: 'data',
    },
    {
      source: 'band_info',
      sourceHandle: 'average',
      target: 'env',
      targetHandle: 'value',
    },
    {
      source: 'env',
      sourceHandle: 'env',
      target: 'adapt',
      targetHandle: 'value',
    },
    {
      source: 'adapt',
      sourceHandle: 'result',
      target: 'gate',
      targetHandle: 'value',
    },
    {
      source: 'gate',
      sourceHandle: 'gated',
      target: 'counter',
      targetHandle: 'value',
    },
    {
      source: 'counter',
      sourceHandle: 'count',
      target: 'limiter',
      targetHandle: 'value',
    },
    {
      source: 'limiter',
      sourceHandle: 'limited',
      target: 'mapper',
      targetHandle: 'input',
    },
    {
      source: 'mapper',
      sourceHandle: 'output',
      target: OUTPUT_ALIAS,
      targetHandle: 'output',
    },
  ],
});

// ========================================
// 🎯 HIGH ENERGY GATE
// ========================================

registerPreset({
  id: 'laser-high-energy-gate',
  name: '⚡ High Energy Gate',
  description:
    'Enables lasers only during high energy sections. Uses adaptive normalization to handle varying energy levels with hysteresis to prevent flickering!',
  outputType: 'boolean',
  autoPlace: true,
  nodes: [
    {
      id: 'full_band',
      label: 'Frequency Band',
      inputValues: {
        startFrequency: 20,
        endFrequency: 20000,
      },
    },
    {
      id: 'energy',
      label: 'Band Info',
      inputValues: {},
    },
    {
      id: 'normalize',
      label: 'Adaptive Normalize (Quantile)',
      inputValues: {
        windowMs: 2000,
        qLow: 0.05,
        qHigh: 0.95,
        freezeBelow: 50,
      },
    },
    {
      id: 'gate',
      label: 'Hysteresis Gate',
      inputValues: {
        low: 0.2, // Turn off below 50% normalized energy
        high: 0.65, // Turn on above 65% normalized energy
      },
    },
  ],
  edges: [
    {
      source: INPUT_ALIAS,
      sourceHandle: 'frequencyAnalysis',
      target: 'full_band',
      targetHandle: 'frequencyAnalysis',
    },
    {
      source: 'full_band',
      sourceHandle: 'bandData',
      target: 'energy',
      targetHandle: 'data',
    },
    {
      source: 'energy',
      sourceHandle: 'average',
      target: 'normalize',
      targetHandle: 'value',
    },
    {
      source: 'normalize',
      sourceHandle: 'result',
      target: 'gate',
      targetHandle: 'value',
    },
    {
      source: 'gate',
      sourceHandle: 'state',
      target: OUTPUT_ALIAS,
      targetHandle: 'output',
    },
  ],
});

// ========================================
// 🎤 MOVING LIGHTS MODE CYCLE
// ========================================

registerPreset({
  id: 'moving-lights-kick-cycle',
  name: '🎤 Moving Lights (Kick Cycle)',
  description:
    'Cycles through moving light modes on each kick hit. Creates dynamic variation in movement patterns!',
  outputType: 'string',
  autoPlace: true,
  nodes: [
    {
      id: 'kick_band',
      label: 'Frequency Band',
      inputValues: {
        startFrequency: 20,
        endFrequency: 150,
      },
    },
    {
      id: 'kick_info',
      label: 'Band Info',
      inputValues: {},
    },
    {
      id: 'spike',
      label: 'Spike',
      inputValues: {
        threshold: 50,
        attack: 10,
        release: 150,
      },
    },
    {
      id: 'counter',
      label: 'Threshold Counter',
      inputValues: {
        threshold: 130,
        maxValue: 5,
      },
    },
    {
      id: 'mapper',
      label: 'Value Mapper',
      inputValues: {
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
    },
  ],
  edges: [
    {
      source: INPUT_ALIAS,
      sourceHandle: 'frequencyAnalysis',
      target: 'kick_band',
      targetHandle: 'frequencyAnalysis',
    },
    {
      source: 'kick_band',
      sourceHandle: 'bandData',
      target: 'kick_info',
      targetHandle: 'data',
    },
    {
      source: 'kick_info',
      sourceHandle: 'average',
      target: 'spike',
      targetHandle: 'value',
    },
    {
      source: 'spike',
      sourceHandle: 'result',
      target: 'counter',
      targetHandle: 'value',
    },
    {
      source: 'counter',
      sourceHandle: 'count',
      target: 'mapper',
      targetHandle: 'input',
    },
    {
      source: 'mapper',
      sourceHandle: 'output',
      target: OUTPUT_ALIAS,
      targetHandle: 'output',
    },
  ],
});

// ========================================
// 🌀 SHADER WALL ANIMATIONS
// ========================================

registerPreset({
  id: 'shader-wall-bass-pulse',
  name: '🌀 Shader Wall (Bass Pulse + Slow Wave)',
  description:
    'Combines a slow sine wave (0-4, 1 cycle/min) with a small bass shake. Creates a breathing effect with audio-reactive details!',
  outputType: 'number',
  autoPlace: true,
  nodes: [
    // Slow sine wave (1 cycle per minute)
    {
      id: 'slow_sine',
      label: 'Sine',
      inputValues: {
        frequency: 0.01667, // 1/60 Hz = 1 cycle per minute
        phase: 0,
        amplitude: 2, // Range will be -2 to +2
      },
    },
    {
      id: 'sine_offset',
      label: 'Math',
      inputValues: {
        a: 3, // Offset to 1
        b: 0, // Will receive sine output
        operation: 'add',
      },
    },
    // Bass shake chain
    {
      id: 'bass_band',
      label: 'Frequency Band',
      inputValues: {
        startFrequency: 20,
        endFrequency: 200,
      },
    },
    {
      id: 'bass_info',
      label: 'Band Info',
      inputValues: {},
    },
    {
      id: 'normalize',
      label: 'Adaptive Normalize (Quantile)',
      inputValues: {
        windowMs: 1000,
        qLow: 0.1,
        qHigh: 0.95,
        freezeBelow: 30,
      },
    },
    {
      id: 'envelope',
      label: 'Envelope Follower',
      inputValues: {
        attackMs: 10,
        releaseMs: 300,
      },
    },
    {
      id: 'bass_scale',
      label: 'Math',
      inputValues: {
        a: 0, // Will receive bass pulse
        b: 0.3, // Scale factor for small shake
        operation: 'multiply',
      },
    },
    // Combine both signals
    {
      id: 'combine',
      label: 'Math',
      inputValues: {
        a: 0, // Will receive slow sine
        b: 0, // Will receive bass shake
        operation: 'add',
      },
    },
  ],
  edges: [
    // Slow sine wave chain
    {
      source: INPUT_ALIAS,
      sourceHandle: 'time',
      target: 'slow_sine',
      targetHandle: 'time',
    },
    {
      source: 'slow_sine',
      sourceHandle: 'value',
      target: 'sine_offset',
      targetHandle: 'b',
    },
    // Bass shake chain
    {
      source: INPUT_ALIAS,
      sourceHandle: 'frequencyAnalysis',
      target: 'bass_band',
      targetHandle: 'frequencyAnalysis',
    },
    {
      source: 'bass_band',
      sourceHandle: 'bandData',
      target: 'bass_info',
      targetHandle: 'data',
    },
    {
      source: 'bass_info',
      sourceHandle: 'average',
      target: 'normalize',
      targetHandle: 'value',
    },
    {
      source: 'normalize',
      sourceHandle: 'result',
      target: 'envelope',
      targetHandle: 'value',
    },
    {
      source: 'envelope',
      sourceHandle: 'env',
      target: 'bass_scale',
      targetHandle: 'a',
    },
    // Combine both
    {
      source: 'sine_offset',
      sourceHandle: 'result',
      target: 'combine',
      targetHandle: 'a',
    },
    {
      source: 'bass_scale',
      sourceHandle: 'result',
      target: 'combine',
      targetHandle: 'b',
    },
    {
      source: 'combine',
      sourceHandle: 'result',
      target: OUTPUT_ALIAS,
      targetHandle: 'output',
    },
  ],
});

registerPreset({
  id: 'shader-wall-kick-flash',
  name: '🌀 Shader Wall (Energy Brightness)',
  description:
    'Brightness adapts to overall song energy (1-3 range). Uses medium averaging window for quick response to energy changes!',
  outputType: 'number',
  autoPlace: true,
  nodes: [
    {
      id: 'full_band',
      label: 'Frequency Band',
      inputValues: {
        startFrequency: 20,
        endFrequency: 20000,
      },
    },
    {
      id: 'band_info',
      label: 'Band Info',
      inputValues: {},
    },
    {
      id: 'normalize',
      label: 'Adaptive Normalize (Quantile)',
      inputValues: {
        windowMs: 2500, // Medium window for quick adaptation
        qLow: 0.1,
        qHigh: 0.95,
        freezeBelow: 50,
      },
    },
    {
      id: 'envelope',
      label: 'Envelope Follower',
      inputValues: {
        attackMs: 50,
        releaseMs: 200,
      },
    },
    {
      id: 'scale',
      label: 'Math',
      inputValues: {
        a: 0, // Will receive normalized energy (0-1)
        b: 2, // Multiply by 2 to get 0-2 range
        operation: 'multiply',
      },
    },
    {
      id: 'offset',
      label: 'Math',
      inputValues: {
        a: 1, // Base brightness of 1
        b: 0, // Will receive scaled energy
        operation: 'add',
      },
    },
  ],
  edges: [
    {
      source: INPUT_ALIAS,
      sourceHandle: 'frequencyAnalysis',
      target: 'full_band',
      targetHandle: 'frequencyAnalysis',
    },
    {
      source: 'full_band',
      sourceHandle: 'bandData',
      target: 'band_info',
      targetHandle: 'data',
    },
    {
      source: 'band_info',
      sourceHandle: 'average',
      target: 'normalize',
      targetHandle: 'value',
    },
    {
      source: 'normalize',
      sourceHandle: 'result',
      target: 'envelope',
      targetHandle: 'value',
    },
    {
      source: 'envelope',
      sourceHandle: 'env',
      target: 'scale',
      targetHandle: 'a',
    },
    {
      source: 'scale',
      sourceHandle: 'result',
      target: 'offset',
      targetHandle: 'b',
    },
    {
      source: 'offset',
      sourceHandle: 'result',
      target: OUTPUT_ALIAS,
      targetHandle: 'output',
    },
  ],
});

registerPreset({
  id: 'shader-wall-rotation-kick-vocal',
  name: '🌀 Shader Wall (Rotation - Kick Cycle)',
  description:
    'Cycles through discrete rotation speeds (0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0) on each kick hit. Creates varying rotation patterns!',
  outputType: 'number',
  autoPlace: true,
  nodes: [
    // Kick detection chain
    {
      id: 'kick_band',
      label: 'Frequency Band',
      inputValues: {
        startFrequency: 80,
        endFrequency: 150,
      },
    },
    {
      id: 'kick_info',
      label: 'Band Info',
      inputValues: {},
    },
    {
      id: 'kick_env',
      label: 'Envelope Follower',
      inputValues: { attackMs: 6, releaseMs: 120 },
    },
    {
      id: 'kick_adapt',
      label: 'Adaptive Normalize (Quantile)',
      inputValues: {
        windowMs: 4000,
        qLow: 0.5,
        qHigh: 0.98,
        freezeBelow: 140,
      },
    },
    {
      id: 'gate',
      label: 'Hysteresis Gate',
      inputValues: { low: 0.33, high: 0.45 },
    },
    // Counter to cycle through values
    {
      id: 'counter',
      label: 'Threshold Counter',
      inputValues: {
        threshold: 0.5,
        maxValue: 6, // Counts 0-6 (7 values)
      },
    },
    // Scale to get 0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0
    {
      id: 'scale',
      label: 'Math',
      inputValues: {
        a: 0, // Will receive count 0-6
        b: 0.5, // Multiply by 0.5
        operation: 'multiply',
      },
    },
  ],
  edges: [
    // Kick detection chain
    {
      source: INPUT_ALIAS,
      sourceHandle: 'frequencyAnalysis',
      target: 'kick_band',
      targetHandle: 'frequencyAnalysis',
    },
    {
      source: 'kick_band',
      sourceHandle: 'bandData',
      target: 'kick_info',
      targetHandle: 'data',
    },
    {
      source: 'kick_info',
      sourceHandle: 'average',
      target: 'kick_env',
      targetHandle: 'value',
    },
    {
      source: 'kick_env',
      sourceHandle: 'env',
      target: 'kick_adapt',
      targetHandle: 'value',
    },
    {
      source: 'kick_adapt',
      sourceHandle: 'result',
      target: 'gate',
      targetHandle: 'value',
    },
    // Count the kicks
    {
      source: 'gate',
      sourceHandle: 'gated',
      target: 'counter',
      targetHandle: 'value',
    },
    // Scale to get discrete steps
    {
      source: 'counter',
      sourceHandle: 'count',
      target: 'scale',
      targetHandle: 'a',
    },
    {
      source: 'scale',
      sourceHandle: 'result',
      target: OUTPUT_ALIAS,
      targetHandle: 'output',
    },
  ],
});

registerPreset({
  id: 'shader-wall-travel-snare-cycle',
  name: '🌀 Shader Wall (Travel - Snare Cycle)',
  description:
    'Cycles through discrete travel speeds (0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0) on each snare hit. Creates varying forward motion patterns!',
  outputType: 'number',
  autoPlace: true,
  nodes: [
    // Snare detection chain
    {
      id: 'snare_band',
      label: 'Frequency Band',
      inputValues: { startFrequency: 180, endFrequency: 4000 },
    },
    {
      id: 'snare_info',
      label: 'Band Info',
    },
    {
      id: 'env',
      label: 'Envelope Follower',
      inputValues: { attackMs: 4, releaseMs: 140 },
    },
    {
      id: 'adapt',
      label: 'Adaptive Normalize (Quantile)',
      inputValues: {
        windowMs: 4000,
        qLow: 0.5,
        qHigh: 0.95,
        freezeBelow: 90,
      },
    },
    {
      id: 'gate',
      label: 'Hysteresis Gate',
      inputValues: { low: 0.06, high: 0.14 },
    },
    // Counter to cycle through values
    {
      id: 'counter',
      label: 'Threshold Counter',
      inputValues: {
        threshold: 0.5,
        maxValue: 6, // Counts 0-6 (7 values)
      },
    },
    // Scale to get 0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0
    {
      id: 'scale',
      label: 'Math',
      inputValues: {
        a: 0, // Will receive count 0-6
        b: 0.5, // Multiply by 0.5
        operation: 'multiply',
      },
    },
  ],
  edges: [
    // Snare detection chain
    {
      source: INPUT_ALIAS,
      sourceHandle: 'frequencyAnalysis',
      target: 'snare_band',
      targetHandle: 'frequencyAnalysis',
    },
    {
      source: 'snare_band',
      sourceHandle: 'bandData',
      target: 'snare_info',
      targetHandle: 'data',
    },
    {
      source: 'snare_info',
      sourceHandle: 'average',
      target: 'env',
      targetHandle: 'value',
    },
    {
      source: 'env',
      sourceHandle: 'env',
      target: 'adapt',
      targetHandle: 'value',
    },
    {
      source: 'adapt',
      sourceHandle: 'result',
      target: 'gate',
      targetHandle: 'value',
    },
    // Count the snares
    {
      source: 'gate',
      sourceHandle: 'gated',
      target: 'counter',
      targetHandle: 'value',
    },
    // Scale to get discrete steps
    {
      source: 'counter',
      sourceHandle: 'count',
      target: 'scale',
      targetHandle: 'a',
    },
    {
      source: 'scale',
      sourceHandle: 'result',
      target: OUTPUT_ALIAS,
      targetHandle: 'output',
    },
  ],
});

// ========================================
// 💡 STAGE LIGHTS COLOR CYCLING
// ========================================

registerPreset({
  id: 'stage-lights-snare-color-cycle',
  name: '💡 Stage Lights (Snare Color Cycle)',
  description:
    'Cycles through colors on each snare hit. Snare Detection → Threshold Counter → Value Mapper (Color Mode) → Output. Perfect for creating dynamic color changes with the beat!',
  outputType: 'color',
  autoPlace: true,
  nodes: [
    {
      id: 'snare_band',
      label: 'Frequency Band',
      inputValues: { startFrequency: 180, endFrequency: 4000 },
    },
    {
      id: 'snare_info',
      label: 'Band Info',
    },
    {
      id: 'env',
      label: 'Envelope Follower',
      inputValues: { attackMs: 4, releaseMs: 140 },
    },
    {
      id: 'adapt',
      label: 'Adaptive Normalize (Quantile)',
      inputValues: {
        windowMs: 4000,
        qLow: 0.5,
        qHigh: 0.95,
        freezeBelow: 90,
      },
    },
    {
      id: 'gate',
      label: 'Hysteresis Gate',
      inputValues: { low: 0.06, high: 0.14 },
    },
    {
      id: 'counter',
      label: 'Threshold Counter',
      inputValues: {
        threshold: 0.5,
        maxValue: 5,
      },
    },
    {
      id: 'mapper',
      label: 'Value Mapper',
      inputValues: {
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
    },
  ],
  edges: [
    // Snare detection chain
    {
      source: INPUT_ALIAS,
      sourceHandle: 'frequencyAnalysis',
      target: 'snare_band',
      targetHandle: 'frequencyAnalysis',
    },
    {
      source: 'snare_band',
      sourceHandle: 'bandData',
      target: 'snare_info',
      targetHandle: 'data',
    },
    {
      source: 'snare_info',
      sourceHandle: 'average',
      target: 'env',
      targetHandle: 'value',
    },
    {
      source: 'env',
      sourceHandle: 'env',
      target: 'adapt',
      targetHandle: 'value',
    },
    {
      source: 'adapt',
      sourceHandle: 'result',
      target: 'gate',
      targetHandle: 'value',
    },
    // Count the hits
    {
      source: 'gate',
      sourceHandle: 'gated',
      target: 'counter',
      targetHandle: 'value',
    },
    // Map to colors
    {
      source: 'counter',
      sourceHandle: 'count',
      target: 'mapper',
      targetHandle: 'input',
    },
    {
      source: 'mapper',
      sourceHandle: 'output',
      target: OUTPUT_ALIAS,
      targetHandle: 'output',
    },
  ],
});

// Pitch Detection → MIDI Modulo
registerPreset({
  id: 'pitch-detection-midi-mod',
  name: '🎵 Pitch Detection → MIDI (Mod 12)',
  description:
    'Detects pitch from melodic content using YIN algorithm, outputs MIDI note modulo 12 (chromatic scale index 0-11). Perfect for mapping melodies to 12 modes/colors! Low latency.',
  outputType: 'number',
  autoPlace: true,
  nodes: [
    {
      id: 'pitch',
      label: 'Pitch Detection',
      inputValues: {
        sampleRate: 44100,
        minHz: 80,
        maxHz: 1200,
        threshold: 0.15,
        smoothMs: 50,
        stabilityCents: 80,
      },
    },
    {
      id: 'modulo',
      label: 'Math',
      inputValues: {
        a: 0,
        b: 12,
        operation: 'modulo', // MathOperation.Modulo
      },
    },
  ],
  edges: [
    {
      source: INPUT_ALIAS,
      sourceHandle: 'audioSignal',
      target: 'pitch',
      targetHandle: 'audioSignal',
    },
    {
      source: 'pitch',
      sourceHandle: 'midi',
      target: 'modulo',
      targetHandle: 'a',
    },
    {
      source: 'modulo',
      sourceHandle: 'result',
      target: OUTPUT_ALIAS,
      targetHandle: 'output',
    },
  ],
});

// ========================================
// 🎥 DEPTH OF FIELD FOCUS
// ========================================

registerPreset({
  id: 'dof-focus-slow-sine',
  name: '🎥 DOF Focus (Slow Sine Wave)',
  description:
    'Slow sine wave oscillating between 1-40 over 5 seconds. Creates a breathing focus effect for depth of field, smoothly sweeping from near to far focus.',
  outputType: 'number',
  autoPlace: true,
  nodes: [
    {
      id: 'sine',
      label: 'Sine',
      inputValues: {
        frequency: 0.2, // 1/20 Hz = 5 second period
        phase: 0,
        amplitude: 1, // -1 to 1 range
      },
    },
    {
      id: 'normalize',
      label: 'Math',
      inputValues: {
        a: 1, // Add 1
        b: 0, // Will receive sine output (-1 to 1)
        operation: 'add',
      },
    },
    {
      id: 'scale',
      label: 'Math',
      inputValues: {
        a: 0, // Will receive normalized value (0 to 2)
        b: 19.5, // Multiply by 19.5 to get 0 to 39
        operation: 'multiply',
      },
    },
    {
      id: 'offset',
      label: 'Math',
      inputValues: {
        a: 1, // Base offset
        b: 0, // Will receive scaled value (0 to 39)
        operation: 'add',
      },
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
      target: 'normalize',
      targetHandle: 'b',
    },
    {
      source: 'normalize',
      sourceHandle: 'result',
      target: 'scale',
      targetHandle: 'a',
    },
    {
      source: 'scale',
      sourceHandle: 'result',
      target: 'offset',
      targetHandle: 'b',
    },
    {
      source: 'offset',
      sourceHandle: 'result',
      target: OUTPUT_ALIAS,
      targetHandle: 'output',
    },
  ],
});

// ========================================
// 🧠 NEURAL NETWORK TRIGGERS
// ========================================

registerPreset({
  id: 'neural-seed-snare-cycle',
  name: '🧠 Neuron Seed (Snare Cycle)',
  description:
    'Cycles neuron seed 0-1000 on snare hits, rate-limited to once per 2 seconds for smooth transitions.',
  outputType: 'number',
  autoPlace: true,
  nodes: [
    {
      id: 'snare_band',
      label: 'Frequency Band',
      inputValues: { startFrequency: 50, endFrequency: 150 },
    },
    {
      id: 'snare_info',
      label: 'Band Info',
    },
    {
      id: 'env',
      label: 'Envelope Follower',
      inputValues: { attackMs: 4, releaseMs: 140 },
    },
    {
      id: 'adapt',
      label: 'Adaptive Normalize (Quantile)',
      inputValues: {
        windowMs: 4000,
        qLow: 0.5,
        qHigh: 0.95,
        freezeBelow: 90,
      },
    },
    {
      id: 'gate',
      label: 'Hysteresis Gate',
      inputValues: { low: 0.06, high: 0.14 },
    },
    {
      id: 'counter',
      label: 'Threshold Counter',
      inputValues: {
        threshold: 0.5,
        maxValue: 1000,
      },
    },
    {
      id: 'limiter',
      label: 'Rate Limiter',
      inputValues: {
        minIntervalMs: 4000, // Minimum 2 seconds between changes
      },
    },
  ],
  edges: [
    {
      source: INPUT_ALIAS,
      sourceHandle: 'frequencyAnalysis',
      target: 'snare_band',
      targetHandle: 'frequencyAnalysis',
    },
    {
      source: 'snare_band',
      sourceHandle: 'bandData',
      target: 'snare_info',
      targetHandle: 'data',
    },
    {
      source: 'snare_info',
      sourceHandle: 'average',
      target: 'env',
      targetHandle: 'value',
    },
    {
      source: 'env',
      sourceHandle: 'env',
      target: 'adapt',
      targetHandle: 'value',
    },
    {
      source: 'adapt',
      sourceHandle: 'result',
      target: 'gate',
      targetHandle: 'value',
    },
    {
      source: 'gate',
      sourceHandle: 'gated',
      target: 'counter',
      targetHandle: 'value',
    },
    {
      source: 'counter',
      sourceHandle: 'count',
      target: 'limiter',
      targetHandle: 'value',
    },
    {
      source: 'limiter',
      sourceHandle: 'limited',
      target: OUTPUT_ALIAS,
      targetHandle: 'output',
    },
  ],
});

registerPreset({
  id: 'neural-fire-on-kick',
  name: '🧠 Fire Neurons (Kick Trigger)',
  description:
    'Triggers neural network firing on every kick drum hit. Kick detection with hysteresis gate for clean boolean pulses.',
  outputType: 'boolean',
  autoPlace: true,
  nodes: [
    {
      id: 'kick_band',
      label: 'Frequency Band',
      inputValues: {
        startFrequency: 80,
        endFrequency: 150,
      },
    },
    {
      id: 'kick_info',
      label: 'Band Info',
    },
    {
      id: 'env',
      label: 'Envelope Follower',
      inputValues: { attackMs: 6, releaseMs: 120 },
    },
    {
      id: 'adapt',
      label: 'Adaptive Normalize (Quantile)',
      inputValues: {
        windowMs: 4000,
        qLow: 0.5,
        qHigh: 0.98,
        freezeBelow: 140,
      },
    },
    {
      id: 'gate',
      label: 'Hysteresis Gate',
      inputValues: { low: 0.33, high: 0.45 },
    },
  ],
  edges: [
    {
      source: INPUT_ALIAS,
      sourceHandle: 'frequencyAnalysis',
      target: 'kick_band',
      targetHandle: 'frequencyAnalysis',
    },
    {
      source: 'kick_band',
      sourceHandle: 'bandData',
      target: 'kick_info',
      targetHandle: 'data',
    },
    {
      source: 'kick_info',
      sourceHandle: 'average',
      target: 'env',
      targetHandle: 'value',
    },
    {
      source: 'env',
      sourceHandle: 'env',
      target: 'adapt',
      targetHandle: 'value',
    },
    {
      source: 'adapt',
      sourceHandle: 'result',
      target: 'gate',
      targetHandle: 'value',
    },
    {
      source: 'gate',
      sourceHandle: 'state',
      target: OUTPUT_ALIAS,
      targetHandle: 'output',
    },
  ],
});
