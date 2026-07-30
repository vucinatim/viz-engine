import { defineVizComponentAuthoring, field, v } from './schema.js';

export const simpleCubeAuthoring = defineVizComponentAuthoring({
  componentId: 'simple-cube',
  compatibility: 'render-safe',
  config: v.config({
    color: field.color('Cube Color', '#FF00FF', 'Color of the cube'),
    size: field.number('Cube Size', 1.5, [0.1, 5, 0.1], 'Size of the cube'),
    rotationSpeedX: field.number(
      'Rotation Speed X',
      1.0,
      [-10, 10, 0.1],
      'Rotation speed around X axis',
    ),
    rotationSpeedY: field.number(
      'Rotation Speed Y',
      1.0,
      [-10, 10, 0.1],
      'Rotation speed around Y axis',
    ),
  }),
});
