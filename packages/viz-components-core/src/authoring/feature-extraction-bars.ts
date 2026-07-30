import { defineVizComponentAuthoring, field, v } from './schema.js';

export const featureExtractionBarsAuthoring = defineVizComponentAuthoring({
  componentId: 'feature-extraction-bars',
  compatibility: 'render-safe',
  config: v.config({
    kick: field.number('Kick', 0, [0, 1, 0.01], 'Kick drum energy (0..1)'),
    snare: field.number(
      'Snare/Clap',
      0,
      [0, 1, 0.01],
      'Snare or clap energy (0..1)',
    ),
    bass: field.number('Bass', 0, [0, 1, 0.01], 'Bass energy (0..1)'),
    melody: field.number(
      'Melody/Vocal',
      0,
      [0, 1, 0.01],
      'Melody/Vocal energy (0..1)',
    ),
    percussion: field.number(
      'Percussion',
      0,
      [0, 1, 0.01],
      'Percussion energy (0..1)',
    ),
  }),
  defaultNetworks: {
    kick: 'kick-adaptive',
    snare: 'snare-adaptive',
    bass: 'bass-adaptive',
    melody: 'melody-harmonic',
    percussion: 'percussion-adaptive',
  },
});
