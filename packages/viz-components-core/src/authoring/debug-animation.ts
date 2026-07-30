import { defineVizComponentAuthoring, field, v } from './schema.js';

export const debugAnimationAuthoring = defineVizComponentAuthoring({
  componentId: 'debug-animation',
  compatibility: 'render-safe',
  config: v.config({
    value: field.number(
      'Value',
      50,
      [0, 100, 1],
      'The value to be animated and displayed.',
    ),
    midi: field.number('MIDI', 60, [0, 127, 1], 'MIDI note number to display.'),
    text: field.text('Text', '', 'Text to display (e.g. note name)'),
    color: field.color('Bar Color', '#60a5fa', 'Color of the filled bar.'),
  }),
  defaultNetworks: {
    midi: 'pitch-detection-midi-mod',
  },
});
