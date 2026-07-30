import { defineVizComponentAuthoring, field, v } from './schema.js';

export const instancedSupercubeAuthoring = defineVizComponentAuthoring({
  componentId: 'instanced-supercube',
  compatibility: 'render-safe',
  config: v.config({
    color: field.color('Color', 'rgb(255, 0, 0)', 'Cube color (CSS)'),
    explosionFactor: field.number(
      'Explosion Factor',
      1.67,
      [1, 3, 0.1],
      'How far the cubes explode from the center',
    ),
    rotationSpeed: field.number(
      'Rotation Speed',
      0.2,
      [0, 1, 0.1],
      'Speed of the overall rotation',
    ),
    animationSpeed: field.number(
      'Animation Speed',
      0.08,
      [0.01, 0.2, 0.01],
      'Speed of the explosion/implosion animation',
    ),
    gridSize: field.number(
      'Grid Size',
      5,
      [3, 8, 1],
      'Number of cubes per side of each sub-cube',
    ),
    spacing: field.number(
      'Spacing',
      4,
      [2, 8, 0.5],
      'Distance between the hollow cubes',
    ),
    explosionShift: field.number(
      'Explosion Shift',
      0,
      [0, 1, 0.01],
      'Continuous control of explosion state (0 = imploded, 1 = exploded)',
    ),
  }),
});
