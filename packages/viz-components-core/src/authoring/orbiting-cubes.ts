import {
  defineDefaultNetwork,
  defineVizComponentAuthoring,
  field,
  v,
} from './schema.js';

const INPUT_ALIAS = 'INPUT';
const OUTPUT_ALIAS = 'OUTPUT';

export const orbitingCubesAuthoring = defineVizComponentAuthoring({
  componentId: 'orbiting-cubes',
  compatibility: 'render-safe',
  config: v.config({
    seed: field.number(
      'Structure Seed',
      3499,
      [1, 10000, 1],
      'Seed for procedural generation',
    ),
    maxCubes: field.number(
      'Max Cubes',
      150,
      [8, 150, 8],
      'Maximum number of cubes in structure',
    ),
    fractalDepth: field.number(
      'Fractal Depth',
      5,
      [1, 5, 1],
      'Recursion depth for fractal generation (higher = more intricate)',
    ),
    cubeColor: field.color('Cube Color', '#1a1a2e', 'Color of the cubes'),
    cubeSize: field.number(
      'Cube Size',
      0.45,
      [0.1, 1, 0.05],
      'Size of each individual cube',
    ),
    metalness: field.number(
      'Metalness',
      0.95,
      [0, 1, 0.05],
      'How metallic the cubes appear',
    ),
    roughness: field.number(
      'Roughness',
      0.5,
      [0, 1, 0.05],
      'Surface roughness (0 = mirror-like, 1 = matte)',
    ),
    light1Color: field.color(
      'Light 1 Color',
      '#FF00FF',
      'Color of the first spotlight',
    ),
    light2Color: field.color(
      'Light 2 Color',
      '#00FFFF',
      'Color of the second spotlight',
    ),
    light3Color: field.color(
      'Light 3 Color',
      '#FFFF00',
      'Color of the third spotlight',
    ),
    lightIntensity: field.number(
      'Light Intensity',
      500,
      [0, 500, 10],
      'Intensity of the colored lights',
    ),
    ambientBrightness: field.number(
      'Ambient Brightness',
      185,
      [0, 300, 5],
      'Overall scene brightness/ambient light',
    ),
    spacing: field.number(
      'Spacing',
      0.65,
      [0.1, 2, 0.05],
      'Space between cubes',
    ),
    orbitSpeed: field.number(
      'Orbit Speed',
      0.3,
      [0, 2, 0.05],
      'Speed of camera orbit',
    ),
    orbitRadius: field.number(
      'Orbit Radius',
      8,
      [3, 20, 0.5],
      'Distance of camera from center',
    ),
    rotationSpeed: field.number(
      'Rotation Speed',
      0.1,
      [0, 3, 0.1],
      'Speed of structure rotation',
    ),
  }),
  defaultNetworks: {
    spacing: defineDefaultNetwork({
      id: 'spacing-network',
      name: 'Spacing - Kick & Bass Reactive',
      description:
        'Responds to kick (80-150Hz) and bass (20-163Hz) frequencies',
      outputType: 'number',
      autoPlace: false,
      nodes: [
        [
          'kick_band',
          'Frequency Band',
          { x: -20, y: -84 },
          { startFrequency: 80, endFrequency: 150 },
        ],
        ['kick_info', 'Band Info', { x: 430, y: -230 }],
        [
          'kick_adapt',
          'Adaptive Normalize (Quantile)',
          { x: 648, y: -216 },
          { windowMs: 4000, qLow: 0.5, qHigh: 0.98, freezeBelow: 140 },
        ],
        [
          'bass_band',
          'Frequency Band',
          { x: -524, y: 195 },
          { startFrequency: 20, endFrequency: 163 },
        ],
        ['bass_info', 'Band Info', { x: -72, y: 414 }],
        [
          'bass_adapt',
          'Adaptive Normalize (Quantile)',
          { x: 305, y: 241 },
          { windowMs: 4000, qLow: 0.3, qHigh: 0.9, freezeBelow: 130 },
        ],
        ['combine', 'Math', { x: 936, y: -204 }, { operation: 'max' }],
        [
          'envelope',
          'Envelope Follower',
          { x: 838, y: 194 },
          { attackMs: 5, releaseMs: 150 },
        ],
        [
          'scale',
          'Math',
          { x: 1272, y: 4 },
          { a: 1, b: 1, operation: 'multiply' },
        ],
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
    }),
    seed: defineDefaultNetwork({
      id: 'seed-network',
      name: 'Seed - Frequency Trigger',
      description: 'Counts frequency peaks to change structure (180-4000Hz)',
      outputType: 'number',
      autoPlace: false,
      nodes: [
        [
          'band',
          'Frequency Band',
          { x: -329, y: 53 },
          { startFrequency: 180, endFrequency: 4000 },
        ],
        ['info', 'Band Info', { x: 0, y: 0 }],
        [
          'env',
          'Envelope Follower',
          { x: 0, y: 0 },
          { attackMs: 4, releaseMs: 140 },
        ],
        [
          'adapt',
          'Adaptive Normalize (Quantile)',
          { x: 40, y: 76 },
          { windowMs: 4000, qLow: 0.5, qHigh: 0.95, freezeBelow: 90 },
        ],
        [
          'counter',
          'Threshold Counter',
          { x: 339, y: 83 },
          { threshold: 0.5, maxValue: 1000 },
        ],
      ],
      edges: [
        [INPUT_ALIAS, 'frequencyAnalysis', 'band', 'frequencyAnalysis'],
        ['band', 'bandData', 'info', 'data'],
        ['info', 'average', 'env', 'value'],
        ['env', 'env', 'adapt', 'value'],
        ['adapt', 'result', 'counter', 'value'],
        ['counter', 'count', OUTPUT_ALIAS, 'output'],
      ],
    }),
  },
});
