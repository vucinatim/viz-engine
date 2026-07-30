import { fullscreenShaderNames } from '../fullscreen-shader-catalog.js';
import {
  defineVizComponentAuthoring,
  field,
  settingCondition,
  v,
} from './schema.js';

export const fullscreenShaderAuthoring = defineVizComponentAuthoring({
  componentId: 'fullscreen-shader',
  compatibility: 'render-safe',
  config: v.config({
    shader: field.select(
      'Shader',
      'Radial Ripple Grid',
      [...fullscreenShaderNames],
      'Choose shader effect',
    ),
    color: field.color('Primary Color', '#00ffff', 'Main color for the shader'),
    speed: field.number(
      'Animation Speed',
      1,
      [0.1, 5, 0.1],
      'Speed multiplier for animations',
    ),
    scale: field.number(
      'Pattern Scale',
      0.5,
      [0.1, 5, 0.1],
      'Scale of the pattern',
    ),
    intensity: field.number(
      'Intensity',
      0.8,
      [0, 3, 0.1],
      'Pattern intensity multiplier',
    ),
    offsetX: field.number('Offset X', 0, [-2, 2, 0.01], 'Horizontal offset', {
      visibleWhen: settingCondition('shader', 'not-equals', 'Neon Grid'),
    }),
    offsetY: field.number('Offset Y', 0, [-2, 2, 0.01], 'Vertical offset', {
      visibleWhen: settingCondition('shader', 'not-equals', 'Neon Grid'),
    }),
    seed: field.number(
      'Seed',
      0,
      [0, 1000, 1],
      'Random seed for pattern variation',
      { visibleWhen: settingCondition('shader', 'equals', 'Neon Grid') },
    ),
    scanIntensity: field.number(
      'Scan Intensity',
      0.7,
      [0, 2, 0.1],
      'Intensity of horizontal scan line',
      { visibleWhen: settingCondition('shader', 'equals', 'Neon Grid') },
    ),
    waveIntensity: field.number(
      'Wave Intensity',
      0.6,
      [0, 2, 0.1],
      'Intensity of energy wave brightness boost',
      { visibleWhen: settingCondition('shader', 'equals', 'Neon Grid') },
    ),
  }),
});
