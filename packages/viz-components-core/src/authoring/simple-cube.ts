import { defineVizComponentAuthoring, v } from './schema.js';

export const simpleCubeAuthoring = defineVizComponentAuthoring({
  componentId: 'simple-cube',
  compatibility: 'render-safe',
  config: v.config({
    color: v.color({
      label: 'Cube Color',
      description: 'Color of the cube',
      defaultValue: '#FF00FF',
    }),
    size: v.number({
      label: 'Cube Size',
      description: 'Size of the cube',
      defaultValue: 1.5,
      min: 0.1,
      max: 5,
      step: 0.1,
    }),
    rotationSpeedX: v.number({
      label: 'Rotation Speed X',
      description: 'Rotation speed around X axis',
      defaultValue: 1.0,
      min: -10,
      max: 10,
      step: 0.1,
    }),
    rotationSpeedY: v.number({
      label: 'Rotation Speed Y',
      description: 'Rotation speed around Y axis',
      defaultValue: 1.0,
      min: -10,
      max: 10,
      step: 0.1,
    }),
  }),
});
