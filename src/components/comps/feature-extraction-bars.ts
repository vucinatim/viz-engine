import { v } from '../config/config';
import { createComponent } from '../config/create-component';

const FeatureExtractionBars = createComponent({
  name: 'Feature Extraction Bars',
  description:
    'Demo of five feature channels (kick, snare, bass, melody, percussion) as animated bars.',
  config: v.config({
    kick: v.number({
      label: 'Kick',
      description: 'Kick drum energy (0..1)',
      defaultValue: 0,
      min: 0,
      max: 1,
      step: 0.01,
    }),
    snare: v.number({
      label: 'Snare/Clap',
      description: 'Snare or clap energy (0..1)',
      defaultValue: 0,
      min: 0,
      max: 1,
      step: 0.01,
    }),
    bass: v.number({
      label: 'Bass',
      description: 'Bass energy (0..1)',
      defaultValue: 0,
      min: 0,
      max: 1,
      step: 0.01,
    }),
    melody: v.number({
      label: 'Melody/Vocal',
      description: 'Melody/Vocal energy (0..1)',
      defaultValue: 0,
      min: 0,
      max: 1,
      step: 0.01,
    }),
    percussion: v.number({
      label: 'Percussion',
      description: 'Percussion energy (0..1)',
      defaultValue: 0,
      min: 0,
      max: 1,
      step: 0.01,
    }),
  }),
  defaultNetworks: {
    kick: 'kick-adaptive',
    snare: 'snare-adaptive',
    bass: 'bass-adaptive',
    melody: 'melody-harmonic',
    percussion: 'percussion-adaptive',
  },
});

export default FeatureExtractionBars;
