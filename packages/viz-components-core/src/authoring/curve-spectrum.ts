import { defineVizComponentAuthoring, field, v } from './schema.js';

const commonSettingsConfig = field.group(
  'Scaling Settings',
  'Settings related to scaling and frequency display',
  {
    scaleY: field.number(
      'Y Scale',
      0.8,
      [0, 1, 0.1],
      'Scale factor for amplitude visualization',
    ),
    minFrequency: field.number(
      'Min Frequency',
      20,
      [20, 22050, 1],
      'Minimum frequency displayed',
    ),
    maxFrequency: field.number(
      'Max Frequency',
      22050,
      [20, 22050, 1],
      'Maximum frequency displayed',
    ),
  },
);

const gridSettingsConfig = field.group(
  'Grid Settings',
  'Settings for the grid lines',
  {
    color: field.color('Color', '#ccc', 'Color of the grid lines'),
    freqLines: field.number(
      'Frequency Lines',
      10,
      [0, 50, 1],
      'Number of frequency lines',
    ),
    ampLines: field.number(
      'Amplitude Lines',
      5,
      [0, 10, 1],
      'Number of amplitude lines',
    ),
  },
);

const lineSettingsConfig = field.group(
  'Line Settings',
  'Settings for the curve',
  {
    smoothing: field.toggle(
      'Smoothing',
      true,
      'Apply smoothing to the audio data',
    ),
    color: field.color('Line Color', 'white', 'Color of the curve'),
    thickness: field.number(
      'Line Thickness',
      1,
      [0, 10, 1],
      'Thickness of the curve',
    ),
    gradientHeight: field.number(
      'Gradient Height',
      0.8,
      [0, 1, 0.1],
      'Height of the gradient',
    ),
  },
);

const pointSettingsConfig = field.group(
  'Point Settings',
  'Settings for the points',
  {
    pointColor: field.color('Point Color', 'white', 'Color of the points'),
    pointSize: field.number('Point Size', 3, [0, 10, 1], 'Size of the points'),
  },
);

export const curveSpectrumAuthoring = defineVizComponentAuthoring({
  componentId: 'curve-spectrum',
  compatibility: 'render-safe',
  config: v.config({
    appearance: commonSettingsConfig,
    grid: gridSettingsConfig,
    line: lineSettingsConfig,
    points: pointSettingsConfig,
  }),
  presets: [
    {
      name: 'Default',
      values: {
        appearance: {
          scaleY: 0.8,
          minFrequency: 20,
          maxFrequency: 20000,
        },
        grid: {
          color: 'rgba(204, 204, 204, 0.5)',
          freqLines: 10,
          ampLines: 5,
        },
        line: {
          smoothing: true,
          color: '#ffffff',
          thickness: 1,
          gradientHeight: 0.8,
        },
        points: {
          pointColor: '#ffffff',
          pointSize: 3,
        },
      },
    },
    {
      name: 'Neon',
      values: {
        appearance: {
          scaleY: 0.8,
          minFrequency: 20,
          maxFrequency: 22050,
        },
        grid: {
          color: 'rgba(204, 204, 204, 0.2)',
          freqLines: 10,
          ampLines: 5,
        },
        line: {
          smoothing: true,
          color: '#ff41ca',
          thickness: 2,
          gradientHeight: 0.8,
        },
        points: {
          pointColor: '#ffffff',
          pointSize: 0,
        },
      },
    },
    {
      name: 'Matrix',
      values: {
        appearance: {
          scaleY: 0.7,
          minFrequency: 30,
          maxFrequency: 16000,
        },
        grid: {
          color: 'rgba(0, 255, 0, 0.5)',
          freqLines: 6,
          ampLines: 3,
        },
        line: {
          smoothing: false,
          color: '#00ff00',
          thickness: 0,
          gradientHeight: 1.0,
        },
        points: {
          pointColor: '#00ff00',
          pointSize: 1,
        },
      },
    },
  ],
});
