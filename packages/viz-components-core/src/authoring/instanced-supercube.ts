import { defineVizComponentAuthoring, v } from './schema.js';

export const instancedSupercubeAuthoring = defineVizComponentAuthoring({
  componentId: 'instanced-supercube',
  compatibility: 'render-safe',
  config: v.config({
    color: v.color({
      label: 'Color',
      description: 'Cube color (CSS)',
      defaultValue: 'rgb(255, 0, 0)',
    }),
    explosionFactor: v.number({
      label: 'Explosion Factor',
      description: 'How far the cubes explode from the center',
      defaultValue: 1.67,
      min: 1,
      max: 3,
      step: 0.1,
    }),
    rotationSpeed: v.number({
      label: 'Rotation Speed',
      description: 'Speed of the overall rotation',
      defaultValue: 0.2,
      min: 0,
      max: 1,
      step: 0.1,
    }),
    animationSpeed: v.number({
      label: 'Animation Speed',
      description: 'Speed of the explosion/implosion animation',
      defaultValue: 0.08,
      min: 0.01,
      max: 0.2,
      step: 0.01,
    }),
    gridSize: v.number({
      label: 'Grid Size',
      description: 'Number of cubes per side of each sub-cube',
      defaultValue: 5,
      min: 3,
      max: 8,
      step: 1,
    }),
    spacing: v.number({
      label: 'Spacing',
      description: 'Distance between the hollow cubes',
      defaultValue: 4,
      min: 2,
      max: 8,
      step: 0.5,
    }),
    explosionShift: v.number({
      label: 'Explosion Shift',
      description:
        'Continuous control of explosion state (0 = imploded, 1 = exploded)',
      defaultValue: 0,
      min: 0,
      max: 1,
      step: 0.01,
    }),
  }),
});
