import { defineVizComponentAuthoring, v } from './schema.js';

const INPUT_ALIAS = 'INPUT';
const OUTPUT_ALIAS = 'OUTPUT';

export const orbitingCubesAuthoring = defineVizComponentAuthoring({
  componentId: 'orbiting-cubes',
  compatibility: 'render-safe',
  config: v.config({
    seed: v.number({
      label: 'Structure Seed',
      description: 'Seed for procedural generation',
      defaultValue: 3499,
      min: 1,
      max: 10000,
      step: 1,
    }),
    maxCubes: v.number({
      label: 'Max Cubes',
      description: 'Maximum number of cubes in structure',
      defaultValue: 150,
      min: 8,
      max: 150,
      step: 8,
    }),
    fractalDepth: v.number({
      label: 'Fractal Depth',
      description:
        'Recursion depth for fractal generation (higher = more intricate)',
      defaultValue: 5,
      min: 1,
      max: 5,
      step: 1,
    }),
    cubeColor: v.color({
      label: 'Cube Color',
      description: 'Color of the cubes',
      defaultValue: '#1a1a2e',
    }),
    cubeSize: v.number({
      label: 'Cube Size',
      description: 'Size of each individual cube',
      defaultValue: 0.45,
      min: 0.1,
      max: 1,
      step: 0.05,
    }),
    metalness: v.number({
      label: 'Metalness',
      description: 'How metallic the cubes appear',
      defaultValue: 0.95,
      min: 0,
      max: 1,
      step: 0.05,
    }),
    roughness: v.number({
      label: 'Roughness',
      description: 'Surface roughness (0 = mirror-like, 1 = matte)',
      defaultValue: 0.5,
      min: 0,
      max: 1,
      step: 0.05,
    }),
    light1Color: v.color({
      label: 'Light 1 Color',
      description: 'Color of the first spotlight',
      defaultValue: '#FF00FF',
    }),
    light2Color: v.color({
      label: 'Light 2 Color',
      description: 'Color of the second spotlight',
      defaultValue: '#00FFFF',
    }),
    light3Color: v.color({
      label: 'Light 3 Color',
      description: 'Color of the third spotlight',
      defaultValue: '#FFFF00',
    }),
    lightIntensity: v.number({
      label: 'Light Intensity',
      description: 'Intensity of the colored lights',
      defaultValue: 500,
      min: 0,
      max: 500,
      step: 10,
    }),
    ambientBrightness: v.number({
      label: 'Ambient Brightness',
      description: 'Overall scene brightness/ambient light',
      defaultValue: 185,
      min: 0,
      max: 300,
      step: 5,
    }),
    spacing: v.number({
      label: 'Spacing',
      description: 'Space between cubes',
      defaultValue: 0.65,
      min: 0.1,
      max: 2,
      step: 0.05,
    }),
    orbitSpeed: v.number({
      label: 'Orbit Speed',
      description: 'Speed of camera orbit',
      defaultValue: 0.3,
      min: 0,
      max: 2,
      step: 0.05,
    }),
    orbitRadius: v.number({
      label: 'Orbit Radius',
      description: 'Distance of camera from center',
      defaultValue: 8,
      min: 3,
      max: 20,
      step: 0.5,
    }),
    rotationSpeed: v.number({
      label: 'Rotation Speed',
      description: 'Speed of structure rotation',
      defaultValue: 0.1,
      min: 0,
      max: 3,
      step: 0.1,
    }),
  }),
  defaultNetworks: {
    // Spacing: Audio-reactive with kick and bass frequency bands
    spacing: {
      id: 'spacing-network',
      name: 'Spacing - Kick & Bass Reactive',
      description:
        'Responds to kick (80-150Hz) and bass (20-163Hz) frequencies',
      outputType: 'number',
      autoPlace: false,
      nodes: [
        {
          id: 'kick_band',
          label: 'Frequency Band',
          position: { x: -20, y: -84 },
          inputValues: {
            startFrequency: 80,
            endFrequency: 150,
          },
        },
        {
          id: 'kick_info',
          label: 'Band Info',
          position: { x: 430, y: -230 },
        },
        {
          id: 'kick_adapt',
          label: 'Adaptive Normalize (Quantile)',
          position: { x: 648, y: -216 },
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
          position: { x: -524, y: 195 },
          inputValues: {
            startFrequency: 20,
            endFrequency: 163,
          },
        },
        {
          id: 'bass_info',
          label: 'Band Info',
          position: { x: -72, y: 414 },
        },
        {
          id: 'bass_adapt',
          label: 'Adaptive Normalize (Quantile)',
          position: { x: 305, y: 241 },
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
          position: { x: 936, y: -204 },
          inputValues: {
            operation: 'max',
          },
        },
        {
          id: 'envelope',
          label: 'Envelope Follower',
          position: { x: 838, y: 194 },
          inputValues: {
            attackMs: 5,
            releaseMs: 150,
          },
        },
        {
          id: 'scale',
          label: 'Math',
          position: { x: 1272, y: 4 },
          inputValues: {
            a: 1,
            b: 1,
            operation: 'multiply',
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
          target: 'kick_adapt',
          targetHandle: 'value',
        },
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
        {
          source: 'combine',
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
          target: OUTPUT_ALIAS,
          targetHandle: 'output',
        },
      ],
    },
    // Seed: Changes neuron structure on frequency peaks
    seed: {
      id: 'seed-network',
      name: 'Seed - Frequency Trigger',
      description: 'Counts frequency peaks to change structure (180-4000Hz)',
      outputType: 'number',
      autoPlace: false,
      nodes: [
        {
          id: 'band',
          label: 'Frequency Band',
          position: { x: -329, y: 53 },
          inputValues: {
            startFrequency: 180,
            endFrequency: 4000,
          },
        },
        {
          id: 'info',
          label: 'Band Info',
          position: { x: 0, y: 0 },
        },
        {
          id: 'env',
          label: 'Envelope Follower',
          position: { x: 0, y: 0 },
          inputValues: {
            attackMs: 4,
            releaseMs: 140,
          },
        },
        {
          id: 'adapt',
          label: 'Adaptive Normalize (Quantile)',
          position: { x: 40, y: 76 },
          inputValues: {
            windowMs: 4000,
            qLow: 0.5,
            qHigh: 0.95,
            freezeBelow: 90,
          },
        },
        {
          id: 'counter',
          label: 'Threshold Counter',
          position: { x: 339, y: 83 },
          inputValues: {
            threshold: 0.5,
            maxValue: 1000,
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
          target: 'counter',
          targetHandle: 'value',
        },
        {
          source: 'counter',
          sourceHandle: 'count',
          target: OUTPUT_ALIAS,
          targetHandle: 'output',
        },
      ],
    },
  },
});
