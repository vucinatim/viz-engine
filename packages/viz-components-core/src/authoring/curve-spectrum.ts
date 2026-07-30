import { defineVizComponentAuthoring, v } from './schema.js';

const commonSettingsConfig = v.group(
  {
    label: 'Scaling Settings',
    description: 'Settings related to scaling and frequency display',
  },
  {
    scaleY: v.number({
      label: 'Y Scale',
      description: 'Scale factor for amplitude visualization',
      defaultValue: 0.8,
      step: 0.1,
      min: 0,
      max: 1,
    }),
    minFrequency: v.number({
      label: 'Min Frequency',
      description: 'Minimum frequency displayed',
      defaultValue: 20,
      step: 1,
      min: 20,
      max: 22050,
    }),
    maxFrequency: v.number({
      label: 'Max Frequency',
      description: 'Maximum frequency displayed',
      defaultValue: 22050,
      step: 1,
      min: 20,
      max: 22050,
    }),
  },
);

const gridSettingsConfig = v.group(
  {
    label: 'Grid Settings',
    description: 'Settings for the grid lines',
  },
  {
    color: v.color({
      label: 'Color',
      description: 'Color of the grid lines',
      defaultValue: '#ccc',
    }),
    freqLines: v.number({
      label: 'Frequency Lines',
      description: 'Number of frequency lines',
      defaultValue: 10,
      step: 1,
      min: 0,
      max: 50,
    }),
    ampLines: v.number({
      label: 'Amplitude Lines',
      description: 'Number of amplitude lines',
      defaultValue: 5,
      step: 1,
      min: 0,
      max: 10,
    }),
  },
);

const lineSettingsConfig = v.group(
  {
    label: 'Line Settings',
    description: 'Settings for the curve',
  },
  {
    smoothing: v.toggle({
      label: 'Smoothing',
      description: 'Apply smoothing to the audio data',
      defaultValue: true,
    }),
    color: v.color({
      label: 'Line Color',
      description: 'Color of the curve',
      defaultValue: 'white',
    }),
    thickness: v.number({
      label: 'Line Thickness',
      description: 'Thickness of the curve',
      defaultValue: 1,
      step: 1,
      min: 0,
      max: 10,
    }),
    gradientHeight: v.number({
      label: 'Gradient Height',
      description: 'Height of the gradient',
      defaultValue: 0.8,
      step: 0.1,
      min: 0,
      max: 1,
    }),
  },
);

const pointSettingsConfig = v.group(
  {
    label: 'Point Settings',
    description: 'Settings for the points',
  },
  {
    pointColor: v.color({
      label: 'Point Color',
      description: 'Color of the points',
      defaultValue: 'white',
    }),
    pointSize: v.number({
      label: 'Point Size',
      description: 'Size of the points',
      defaultValue: 3,
      step: 1,
      min: 0,
      max: 10,
    }),
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
