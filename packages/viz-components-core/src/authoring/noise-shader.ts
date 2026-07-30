import {
  defineVizComponentAuthoring,
  field,
  settingCondition,
  v,
} from './schema.js';

type NoisePreset = [
  name: string,
  noise: [
    type: string,
    scale: number,
    octaves: number,
    lacunarity: number,
    gain: number,
  ],
  animation: [
    speed: number,
    flowX: number,
    flowY: number,
    rotationSpeed: number,
  ],
  distortion: [enabled: boolean, amount: number, scale: number],
  color: [
    mode: string,
    color1: string,
    color2: string,
    color3: string,
    hueShift: number,
    saturation: number,
  ],
  output: [
    brightness: number,
    contrast: number,
    invert: boolean,
    posterize: number,
  ],
];

const preset = ([
  name,
  [type, scale, octaves, lacunarity, gain],
  [speed, flowX, flowY, rotationSpeed],
  [enabled, amount, distortionScale],
  [mode, color1, color2, color3, hueShift, saturation],
  [brightness, contrast, invert, posterize],
]: NoisePreset) => ({
  name,
  values: {
    noise: { type, scale, octaves, lacunarity, gain },
    animation: { speed, flowX, flowY, rotationSpeed },
    distortion: { enabled, amount, scale: distortionScale },
    color: { mode, color1, color2, color3, hueShift, saturation },
    output: { brightness, contrast, invert, posterize },
  },
});

export const noiseShaderAuthoring = defineVizComponentAuthoring({
  componentId: 'noise-shader',
  compatibility: 'render-safe',
  presets: [
    preset([
      'Init',
      ['fbm', 3.0, 4, 2.0, 0.5],
      [1.0, 0.0, 0.0, 0.0],
      [false, 1.0, 2.0],
      ['gradient', '#000000', '#ffffff', '#ff0000', 1.0, 1.0],
      [1.0, 1.0, false, 0],
    ]),
    preset([
      'White Tiger (Monochrome)',
      ['simplex', 0.6, 2, 3.0, 0.3],
      [2.8, 0.02, 0.02, 0.0],
      [true, 3.5, 1.0],
      ['monochrome', '#ffffff', '#ffffff', '#ffffff', 1.0, 0.0],
      [1.99, 3.0, true, 1],
    ]),
    preset([
      'Flowing Ink (Monochrome)',
      ['perlin', 1.9, 2, 3.0, 0.3],
      [2.8, 0.0, 0.0, 0.0],
      [true, 4.0, 1.5],
      ['monochrome', '#ffffff', '#ffffff', '#ffffff', 1.0, 0.0],
      [1.99, 3.0, false, 1],
    ]),
    preset([
      'Flowing Liquid (Monochrome)',
      ['perlin', 8.0, 2, 3.0, 0.3],
      [2.5, 0.0, 0.2, 0.0],
      [true, 4.0, 1.5],
      ['monochrome', '#ffffff', '#ffffff', '#ffffff', 1.0, 0.0],
      [1.5, 4.0, true, 3],
    ]),
    preset([
      'Smoke (Monochrome)',
      ['perlin', 0.6, 2, 3, 0.3],
      [7, 0, 0, 0],
      [true, 4, 1.5],
      ['monochrome', '#ffffff', '#ffffff', '#ffffff', 1, 0],
      [1.49, 3, true, 0],
    ]),
    preset([
      'Plasma Wave',
      ['simplex', 4.0, 4, 2.0, 0.5],
      [1.8, 0.15, 0.15, 0.4],
      [true, 2.0, 2.5],
      ['hue-shift', '#ff0000', '#00ff00', '#0000ff', 4.0, 1.9],
      [1.7, 1.6, false, 0],
    ]),
    preset([
      'Lava Lamp',
      ['fbm', 0.8, 5, 2.0, 0.6],
      [0.8, 0.0, 0.12, 0.08],
      [true, 2.5, 1.2],
      ['palette', '#ff0000', '#ff6600', '#ffff00', 1.0, 1.8],
      [1.5, 1.3, false, 0],
    ]),
    preset([
      'Aurora Borealis',
      ['fbm', 0.4, 3, 2.0, 0.5],
      [0.2, 0.15, 0.03, 0.0],
      [true, 0.5, 1.0],
      ['palette', '#001a33', '#00ff88', '#8800ff', 1.0, 1.6],
      [1.4, 1.2, false, 0],
    ]),
    preset([
      'Fire',
      ['fbm', 1.2, 4, 2.0, 0.5],
      [1.0, 0.0, -0.2, 0.0],
      [true, 1.0, 1.5],
      ['palette', '#000000', '#ff3300', '#ffff00', 1.0, 2.0],
      [2.0, 2.0, false, 0],
    ]),
    preset([
      'Clouds',
      ['fbm', 0.6, 5, 2.0, 0.5],
      [0.15, 0.02, 0.008, 0.0],
      [false, 1.0, 2.0],
      ['gradient', '#4a90e2', '#ffffff', '#0000ff', 1.0, 0.8],
      [1.2, 0.9, false, 0],
    ]),
    preset([
      'Marble',
      ['perlin', 2.0, 4, 2.0, 0.5],
      [0.1, 0.0, 0.0, 0.05],
      [true, 2.0, 1.0],
      ['gradient', '#1a1a1a', '#f0f0f0', '#0000ff', 1.0, 0.3],
      [1.1, 1.8, false, 0],
    ]),
    preset([
      'Oil Slick',
      ['simplex', 2.5, 4, 2.0, 0.5],
      [0.3, 0.0, 0.0, 0.08],
      [true, 0.8, 2.0],
      ['hue-shift', '#ff0000', '#00ff00', '#0000ff', 1.5, 1.8],
      [1.3, 1.5, false, 0],
    ]),
    preset([
      'Hard Edge Balls',
      ['cellular', 8.0, 4, 2.0, 0.5],
      [3.0, 0.0, 0.0, 0.0],
      [false, 1.0, 2.0],
      ['monochrome', '#ffffff', '#ffffff', '#0000ff', 1.0, 1.0],
      [1.0, 2.0, false, 2],
    ]),
    preset([
      'Watercolor',
      ['fbm', 1.8, 5, 1.8, 0.65],
      [0.6, 0.05, -0.08, 0.03],
      [true, 1.5, 2.5],
      ['palette', '#ff6b9d', '#c44569', '#4a69bd', 1.0, 1.3],
      [1.3, 1.1, false, 0],
    ]),
  ],
  config: v.config({
    noise: field.group('Noise Settings', 'Core noise generation parameters', {
      type: field.select(
        'Noise Type',
        'fbm',
        ['perlin', 'simplex', 'fbm', 'voronoi', 'cellular'],
        'Type of noise algorithm',
      ),
      scale: field.number(
        'Scale',
        3.0,
        [0.1, 20.0, 0.1],
        'Zoom level of the noise pattern',
      ),
      octaves: field.number(
        'Octaves',
        4,
        [1, 8, 1],
        'Detail layers (for FBM)',
        { visibleWhen: settingCondition('noise.type', 'equals', 'fbm') },
      ),
      lacunarity: field.number(
        'Lacunarity',
        2,
        [1, 4, 0.1],
        'Frequency multiplier per octave',
        { visibleWhen: settingCondition('noise.type', 'equals', 'fbm') },
      ),
      gain: field.number(
        'Gain',
        0.5,
        [0, 1, 0.01],
        'Amplitude multiplier per octave',
        { visibleWhen: settingCondition('noise.type', 'equals', 'fbm') },
      ),
    }),
    animation: field.group('Animation', 'Motion and time-based effects', {
      speed: field.number(
        'Speed',
        1.0,
        [0.0, 10.0, 0.1],
        'Animation speed multiplier',
      ),
      flowX: field.number(
        'Flow X',
        0.0,
        [-2.0, 2.0, 0.01],
        'Horizontal flow/drift speed',
      ),
      flowY: field.number(
        'Flow Y',
        0.0,
        [-2.0, 2.0, 0.01],
        'Vertical flow/drift speed',
      ),
      rotationSpeed: field.number(
        'Rotation Speed',
        0.0,
        [-2.0, 2.0, 0.01],
        'Rotation animation speed',
      ),
    }),
    distortion: field.group('Distortion', 'Warping and distortion effects', {
      enabled: field.toggle(
        'Enable Distortion',
        false,
        'Apply domain distortion to noise',
      ),
      amount: field.number('Amount', 1, [0, 5, 0.1], 'Strength of distortion', {
        visibleWhen: settingCondition('distortion.enabled', 'equals', true),
      }),
      scale: field.number(
        'Scale',
        2,
        [0.1, 10, 0.1],
        'Frequency of distortion pattern',
        {
          visibleWhen: settingCondition('distortion.enabled', 'equals', true),
        },
      ),
    }),
    color: field.group('Color', 'Color mapping and palette', {
      mode: field.select(
        'Color Mode',
        'gradient',
        ['gradient', 'palette', 'hue-shift', 'monochrome'],
        'How to map noise to colors',
      ),
      color1: field.color(
        'Color 1',
        '#000000',
        'First color (gradient start, or monochrome)',
        {
          visibleWhen: settingCondition('color.mode', 'in', [
            'gradient',
            'palette',
            'monochrome',
          ]),
        },
      ),
      color2: field.color('Color 2', '#ffffff', 'Second color (gradient end)', {
        visibleWhen: settingCondition('color.mode', 'in', [
          'gradient',
          'palette',
        ]),
      }),
      color3: field.color('Color 3', '#ff0000', 'Third color (palette mode)', {
        visibleWhen: settingCondition('color.mode', 'equals', 'palette'),
      }),
      hueShift: field.number(
        'Hue Shift Speed',
        1,
        [0, 5, 0.1],
        'Hue rotation speed',
        {
          visibleWhen: settingCondition('color.mode', 'equals', 'hue-shift'),
        },
      ),
      saturation: field.number(
        'Saturation',
        1,
        [0, 2, 0.01],
        'Color saturation',
        {
          visibleWhen: settingCondition('color.mode', 'in', [
            'gradient',
            'palette',
            'hue-shift',
          ]),
        },
      ),
    }),
    output: field.group('Output', 'Final output adjustments', {
      brightness: field.number(
        'Brightness',
        1.0,
        [0.0, 3.0, 0.01],
        'Overall brightness',
      ),
      contrast: field.number(
        'Contrast',
        1.0,
        [0.0, 3.0, 0.01],
        'Contrast adjustment',
      ),
      invert: field.toggle('Invert', false, 'Invert the output colors'),
      posterize: field.number(
        'Posterize Levels',
        0,
        [0, 16, 1],
        'Color banding effect (0 = off)',
      ),
    }),
  }),
});
