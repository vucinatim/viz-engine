import { fullscreenShaderNames } from '@viz-engine/components-core';
import { v } from '../config/config';
import { createComponent } from '../config/create-component';

const FullscreenShader = createComponent({
  name: 'Fullscreen Shader',
  description: 'Audio-reactive fullscreen GLSL shaders',
  config: v.config({
    shader: v.select({
      label: 'Shader',
      description: 'Choose shader effect',
      defaultValue: 'Radial Ripple Grid',
      options: fullscreenShaderNames,
    }),
    color: v.color({
      label: 'Primary Color',
      description: 'Main color for the shader',
      defaultValue: '#00ffff',
    }),
    speed: v.number({
      label: 'Animation Speed',
      description: 'Speed multiplier for animations',
      defaultValue: 1,
      min: 0.1,
      max: 5,
      step: 0.1,
    }),
    scale: v.number({
      label: 'Pattern Scale',
      description: 'Scale of the pattern',
      defaultValue: 0.5,
      min: 0.1,
      max: 5,
      step: 0.1,
    }),
    intensity: v.number({
      label: 'Intensity',
      description: 'Pattern intensity multiplier',
      defaultValue: 0.8,
      min: 0,
      max: 3,
      step: 0.1,
    }),
    offsetX: v.number({
      label: 'Offset X',
      description: 'Horizontal offset',
      defaultValue: 0,
      min: -2,
      max: 2,
      step: 0.01,
      visibleIf: (config) => config.shader !== 'Neon Grid',
    }),
    offsetY: v.number({
      label: 'Offset Y',
      description: 'Vertical offset',
      defaultValue: 0,
      min: -2,
      max: 2,
      step: 0.01,
      visibleIf: (config) => config.shader !== 'Neon Grid',
    }),
    seed: v.number({
      label: 'Seed',
      description: 'Random seed for pattern variation',
      defaultValue: 0,
      min: 0,
      max: 1000,
      step: 1,
      visibleIf: (config) => config.shader === 'Neon Grid',
    }),
    scanIntensity: v.number({
      label: 'Scan Intensity',
      description: 'Intensity of horizontal scan line',
      defaultValue: 0.7,
      min: 0,
      max: 2,
      step: 0.1,
      visibleIf: (config) => config.shader === 'Neon Grid',
    }),
    waveIntensity: v.number({
      label: 'Wave Intensity',
      description: 'Intensity of energy wave brightness boost',
      defaultValue: 0.6,
      min: 0,
      max: 2,
      step: 0.1,
      visibleIf: (config) => config.shader === 'Neon Grid',
    }),
  }),
});

export default FullscreenShader;
