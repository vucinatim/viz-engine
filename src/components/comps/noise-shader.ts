import { v } from '../config/config';
import { createComponent } from '../config/create-component';

const NoiseShader = createComponent({
  name: 'Noise Shader',
  description:
    'Fullscreen procedural noise shader with extensive customization',
  presets: [
    {
      name: 'Init',
      values: {
        noise: {
          type: 'fbm',
          scale: 3.0,
          octaves: 4,
          lacunarity: 2.0,
          gain: 0.5,
        },
        animation: {
          speed: 1.0,
          flowX: 0.0,
          flowY: 0.0,
          rotationSpeed: 0.0,
        },
        distortion: {
          enabled: false,
          amount: 1.0,
          scale: 2.0,
        },
        color: {
          mode: 'gradient',
          color1: '#000000',
          color2: '#ffffff',
          color3: '#ff0000',
          hueShift: 1.0,
          saturation: 1.0,
        },
        output: {
          brightness: 1.0,
          contrast: 1.0,
          invert: false,
          posterize: 0,
        },
      },
    },
    {
      name: 'White Tiger (Monochrome)',
      values: {
        noise: {
          type: 'simplex',
          scale: 0.6,
          octaves: 2,
          lacunarity: 3.0,
          gain: 0.3,
        },
        animation: {
          speed: 2.8,
          flowX: 0.02,
          flowY: 0.02,
          rotationSpeed: 0.0,
        },
        distortion: {
          enabled: true,
          amount: 3.5,
          scale: 1.0,
        },
        color: {
          mode: 'monochrome',
          color1: '#ffffff',
          color2: '#ffffff',
          color3: '#ffffff',
          hueShift: 1.0,
          saturation: 0.0,
        },
        output: {
          brightness: 1.99,
          contrast: 3.0,
          invert: true,
          posterize: 1,
        },
      },
    },
    {
      name: 'Flowing Ink (Monochrome)',
      values: {
        noise: {
          type: 'perlin',
          scale: 1.9,
          octaves: 2,
          lacunarity: 3.0,
          gain: 0.3,
        },
        animation: {
          speed: 2.8,
          flowX: 0.0,
          flowY: 0.0,
          rotationSpeed: 0.0,
        },
        distortion: {
          enabled: true,
          amount: 4.0,
          scale: 1.5,
        },
        color: {
          mode: 'monochrome',
          color1: '#ffffff',
          color2: '#ffffff',
          color3: '#ffffff',
          hueShift: 1.0,
          saturation: 0.0,
        },
        output: {
          brightness: 1.99,
          contrast: 3.0,
          invert: false,
          posterize: 1,
        },
      },
    },
    {
      name: 'Flowing Liquid (Monochrome)',
      values: {
        noise: {
          type: 'perlin',
          scale: 8.0,
          octaves: 2,
          lacunarity: 3.0,
          gain: 0.3,
        },
        animation: {
          speed: 2.5,
          flowX: 0.0,
          flowY: 0.2,
          rotationSpeed: 0.0,
        },
        distortion: {
          enabled: true,
          amount: 4.0,
          scale: 1.5,
        },
        color: {
          mode: 'monochrome',
          color1: '#ffffff',
          color2: '#ffffff',
          color3: '#ffffff',
          hueShift: 1.0,
          saturation: 0.0,
        },
        output: {
          brightness: 1.5,
          contrast: 4.0,
          invert: true,
          posterize: 3,
        },
      },
    },
    {
      name: 'Smoke (Monochrome)',
      values: {
        noise: {
          type: 'perlin',
          scale: 0.6,
          octaves: 2,
          lacunarity: 3,
          gain: 0.3,
        },
        animation: {
          speed: 7,
          flowX: 0,
          flowY: 0,
          rotationSpeed: 0,
        },
        distortion: {
          enabled: true,
          amount: 4,
          scale: 1.5,
        },
        color: {
          mode: 'monochrome',
          color1: '#ffffff',
          color2: '#ffffff',
          color3: '#ffffff',
          hueShift: 1,
          saturation: 0,
        },
        output: {
          brightness: 1.49,
          contrast: 3,
          invert: true,
          posterize: 0,
        },
      },
    },
    {
      name: 'Plasma Wave',
      values: {
        noise: {
          type: 'simplex',
          scale: 4.0,
          octaves: 4,
          lacunarity: 2.0,
          gain: 0.5,
        },
        animation: {
          speed: 1.8,
          flowX: 0.15,
          flowY: 0.15,
          rotationSpeed: 0.4,
        },
        distortion: {
          enabled: true,
          amount: 2.0,
          scale: 2.5,
        },
        color: {
          mode: 'hue-shift',
          color1: '#ff0000',
          color2: '#00ff00',
          color3: '#0000ff',
          hueShift: 4.0,
          saturation: 1.9,
        },
        output: {
          brightness: 1.7,
          contrast: 1.6,
          invert: false,
          posterize: 0,
        },
      },
    },
    {
      name: 'Lava Lamp',
      values: {
        noise: {
          type: 'fbm',
          scale: 0.8,
          octaves: 5,
          lacunarity: 2.0,
          gain: 0.6,
        },
        animation: {
          speed: 0.8,
          flowX: 0.0,
          flowY: 0.12,
          rotationSpeed: 0.08,
        },
        distortion: {
          enabled: true,
          amount: 2.5,
          scale: 1.2,
        },
        color: {
          mode: 'palette',
          color1: '#ff0000',
          color2: '#ff6600',
          color3: '#ffff00',
          hueShift: 1.0,
          saturation: 1.8,
        },
        output: {
          brightness: 1.5,
          contrast: 1.3,
          invert: false,
          posterize: 0,
        },
      },
    },
    {
      name: 'Aurora Borealis',
      values: {
        noise: {
          type: 'fbm',
          scale: 0.4,
          octaves: 3,
          lacunarity: 2.0,
          gain: 0.5,
        },
        animation: {
          speed: 0.2,
          flowX: 0.15,
          flowY: 0.03,
          rotationSpeed: 0.0,
        },
        distortion: {
          enabled: true,
          amount: 0.5,
          scale: 1.0,
        },
        color: {
          mode: 'palette',
          color1: '#001a33',
          color2: '#00ff88',
          color3: '#8800ff',
          hueShift: 1.0,
          saturation: 1.6,
        },
        output: {
          brightness: 1.4,
          contrast: 1.2,
          invert: false,
          posterize: 0,
        },
      },
    },
    {
      name: 'Fire',
      values: {
        noise: {
          type: 'fbm',
          scale: 1.2,
          octaves: 4,
          lacunarity: 2.0,
          gain: 0.5,
        },
        animation: {
          speed: 1.0,
          flowX: 0.0,
          flowY: -0.2,
          rotationSpeed: 0.0,
        },
        distortion: {
          enabled: true,
          amount: 1.0,
          scale: 1.5,
        },
        color: {
          mode: 'palette',
          color1: '#000000',
          color2: '#ff3300',
          color3: '#ffff00',
          hueShift: 1.0,
          saturation: 2.0,
        },
        output: {
          brightness: 2.0,
          contrast: 2.0,
          invert: false,
          posterize: 0,
        },
      },
    },
    {
      name: 'Clouds',
      values: {
        noise: {
          type: 'fbm',
          scale: 0.6,
          octaves: 5,
          lacunarity: 2.0,
          gain: 0.5,
        },
        animation: {
          speed: 0.15,
          flowX: 0.02,
          flowY: 0.008,
          rotationSpeed: 0.0,
        },
        distortion: {
          enabled: false,
          amount: 1.0,
          scale: 2.0,
        },
        color: {
          mode: 'gradient',
          color1: '#4a90e2',
          color2: '#ffffff',
          color3: '#0000ff',
          hueShift: 1.0,
          saturation: 0.8,
        },
        output: {
          brightness: 1.2,
          contrast: 0.9,
          invert: false,
          posterize: 0,
        },
      },
    },
    {
      name: 'Marble',
      values: {
        noise: {
          type: 'perlin',
          scale: 2.0,
          octaves: 4,
          lacunarity: 2.0,
          gain: 0.5,
        },
        animation: {
          speed: 0.1,
          flowX: 0.0,
          flowY: 0.0,
          rotationSpeed: 0.05,
        },
        distortion: {
          enabled: true,
          amount: 2.0,
          scale: 1.0,
        },
        color: {
          mode: 'gradient',
          color1: '#1a1a1a',
          color2: '#f0f0f0',
          color3: '#0000ff',
          hueShift: 1.0,
          saturation: 0.3,
        },
        output: {
          brightness: 1.1,
          contrast: 1.8,
          invert: false,
          posterize: 0,
        },
      },
    },
    {
      name: 'Oil Slick',
      values: {
        noise: {
          type: 'simplex',
          scale: 2.5,
          octaves: 4,
          lacunarity: 2.0,
          gain: 0.5,
        },
        animation: {
          speed: 0.3,
          flowX: 0.0,
          flowY: 0.0,
          rotationSpeed: 0.08,
        },
        distortion: {
          enabled: true,
          amount: 0.8,
          scale: 2.0,
        },
        color: {
          mode: 'hue-shift',
          color1: '#ff0000',
          color2: '#00ff00',
          color3: '#0000ff',
          hueShift: 1.5,
          saturation: 1.8,
        },
        output: {
          brightness: 1.3,
          contrast: 1.5,
          invert: false,
          posterize: 0,
        },
      },
    },
    {
      name: 'Hard Edge Balls',
      values: {
        noise: {
          type: 'cellular',
          scale: 8.0,
          octaves: 4,
          lacunarity: 2.0,
          gain: 0.5,
        },
        animation: {
          speed: 3.0,
          flowX: 0.0,
          flowY: 0.0,
          rotationSpeed: 0.0,
        },
        distortion: {
          enabled: false,
          amount: 1.0,
          scale: 2.0,
        },
        color: {
          mode: 'monochrome',
          color1: '#ffffff',
          color2: '#ffffff',
          color3: '#0000ff',
          hueShift: 1.0,
          saturation: 1.0,
        },
        output: {
          brightness: 1.0,
          contrast: 2.0,
          invert: false,
          posterize: 2,
        },
      },
    },
    {
      name: 'Watercolor',
      values: {
        noise: {
          type: 'fbm',
          scale: 1.8,
          octaves: 5,
          lacunarity: 1.8,
          gain: 0.65,
        },
        animation: {
          speed: 0.6,
          flowX: 0.05,
          flowY: -0.08,
          rotationSpeed: 0.03,
        },
        distortion: {
          enabled: true,
          amount: 1.5,
          scale: 2.5,
        },
        color: {
          mode: 'palette',
          color1: '#ff6b9d',
          color2: '#c44569',
          color3: '#4a69bd',
          hueShift: 1.0,
          saturation: 1.3,
        },
        output: {
          brightness: 1.3,
          contrast: 1.1,
          invert: false,
          posterize: 0,
        },
      },
    },
  ],
  config: v.config({
    noise: v.group(
      {
        label: 'Noise Settings',
        description: 'Core noise generation parameters',
      },
      {
        type: v.select({
          label: 'Noise Type',
          description: 'Type of noise algorithm',
          defaultValue: 'fbm',
          options: ['perlin', 'simplex', 'fbm', 'voronoi', 'cellular'],
        }),
        scale: v.number({
          label: 'Scale',
          description: 'Zoom level of the noise pattern',
          defaultValue: 3.0,
          min: 0.1,
          max: 20.0,
          step: 0.1,
        }),
        octaves: v.number({
          label: 'Octaves',
          description: 'Detail layers (for FBM)',
          defaultValue: 4,
          min: 1,
          max: 8,
          step: 1,
          visibleIf: (vals) => vals.noise?.type === 'fbm',
        }),
        lacunarity: v.number({
          label: 'Lacunarity',
          description: 'Frequency multiplier per octave',
          defaultValue: 2.0,
          min: 1.0,
          max: 4.0,
          step: 0.1,
          visibleIf: (vals) => vals.noise?.type === 'fbm',
        }),
        gain: v.number({
          label: 'Gain',
          description: 'Amplitude multiplier per octave',
          defaultValue: 0.5,
          min: 0.0,
          max: 1.0,
          step: 0.01,
          visibleIf: (vals) => vals.noise?.type === 'fbm',
        }),
      },
    ),
    animation: v.group(
      {
        label: 'Animation',
        description: 'Motion and time-based effects',
      },
      {
        speed: v.number({
          label: 'Speed',
          description: 'Animation speed multiplier',
          defaultValue: 1.0,
          min: 0.0,
          max: 10.0,
          step: 0.1,
        }),
        flowX: v.number({
          label: 'Flow X',
          description: 'Horizontal flow/drift speed',
          defaultValue: 0.0,
          min: -2.0,
          max: 2.0,
          step: 0.01,
        }),
        flowY: v.number({
          label: 'Flow Y',
          description: 'Vertical flow/drift speed',
          defaultValue: 0.0,
          min: -2.0,
          max: 2.0,
          step: 0.01,
        }),
        rotationSpeed: v.number({
          label: 'Rotation Speed',
          description: 'Rotation animation speed',
          defaultValue: 0.0,
          min: -2.0,
          max: 2.0,
          step: 0.01,
        }),
      },
    ),
    distortion: v.group(
      {
        label: 'Distortion',
        description: 'Warping and distortion effects',
      },
      {
        enabled: v.toggle({
          label: 'Enable Distortion',
          description: 'Apply domain distortion to noise',
          defaultValue: false,
        }),
        amount: v.number({
          label: 'Amount',
          description: 'Strength of distortion',
          defaultValue: 1.0,
          min: 0.0,
          max: 5.0,
          step: 0.1,
          visibleIf: (vals) => vals.distortion?.enabled === true,
        }),
        scale: v.number({
          label: 'Scale',
          description: 'Frequency of distortion pattern',
          defaultValue: 2.0,
          min: 0.1,
          max: 10.0,
          step: 0.1,
          visibleIf: (vals) => vals.distortion?.enabled === true,
        }),
      },
    ),
    color: v.group(
      {
        label: 'Color',
        description: 'Color mapping and palette',
      },
      {
        mode: v.select({
          label: 'Color Mode',
          description: 'How to map noise to colors',
          defaultValue: 'gradient',
          options: ['gradient', 'palette', 'hue-shift', 'monochrome'],
        }),
        color1: v.color({
          label: 'Color 1',
          description: 'First color (gradient start, or monochrome)',
          defaultValue: '#000000',
          visibleIf: (vals) =>
            vals.color?.mode === 'gradient' ||
            vals.color?.mode === 'palette' ||
            vals.color?.mode === 'monochrome',
        }),
        color2: v.color({
          label: 'Color 2',
          description: 'Second color (gradient end)',
          defaultValue: '#ffffff',
          visibleIf: (vals) =>
            vals.color?.mode === 'gradient' || vals.color?.mode === 'palette',
        }),
        color3: v.color({
          label: 'Color 3',
          description: 'Third color (palette mode)',
          defaultValue: '#ff0000',
          visibleIf: (vals) => vals.color?.mode === 'palette',
        }),
        hueShift: v.number({
          label: 'Hue Shift Speed',
          description: 'Hue rotation speed',
          defaultValue: 1.0,
          min: 0.0,
          max: 5.0,
          step: 0.1,
          visibleIf: (vals) => vals.color?.mode === 'hue-shift',
        }),
        saturation: v.number({
          label: 'Saturation',
          description: 'Color saturation',
          defaultValue: 1.0,
          min: 0.0,
          max: 2.0,
          step: 0.01,
          visibleIf: (vals) =>
            vals.color?.mode === 'gradient' ||
            vals.color?.mode === 'palette' ||
            vals.color?.mode === 'hue-shift',
        }),
      },
    ),
    output: v.group(
      {
        label: 'Output',
        description: 'Final output adjustments',
      },
      {
        brightness: v.number({
          label: 'Brightness',
          description: 'Overall brightness',
          defaultValue: 1.0,
          min: 0.0,
          max: 3.0,
          step: 0.01,
        }),
        contrast: v.number({
          label: 'Contrast',
          description: 'Contrast adjustment',
          defaultValue: 1.0,
          min: 0.0,
          max: 3.0,
          step: 0.01,
        }),
        invert: v.toggle({
          label: 'Invert',
          description: 'Invert the output colors',
          defaultValue: false,
        }),
        posterize: v.number({
          label: 'Posterize Levels',
          description: 'Color banding effect (0 = off)',
          defaultValue: 0,
          min: 0,
          max: 16,
          step: 1,
        }),
      },
    ),
  }),
});

export default NoiseShader;
