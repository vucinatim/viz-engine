import { defineVizComponentAuthoring, v } from './schema.js';

export const debugAnimationAuthoring = defineVizComponentAuthoring({
  componentId: 'debug-animation',
  compatibility: 'render-safe',
  config: v.config({
    value: v.number({
      label: 'Value',
      description: 'The value to be animated and displayed.',
      defaultValue: 50,
      min: 0,
      max: 100,
      step: 1,
    }),
    midi: v.number({
      label: 'MIDI',
      description: 'MIDI note number to display.',
      defaultValue: 60,
      min: 0,
      max: 127,
      step: 1,
    }),
    text: v.text({
      label: 'Text',
      description: 'Text to display (e.g. note name)',
      defaultValue: '',
    }),
    color: v.color({
      label: 'Bar Color',
      description: 'Color of the filled bar.',
      defaultValue: '#60a5fa',
    }),
  }),
  defaultNetworks: {
    midi: 'pitch-detection-midi-mod',
  },
});
