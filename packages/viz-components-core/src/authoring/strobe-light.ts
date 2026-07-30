import {
  defineVizComponentAuthoring,
  field,
  settingCondition,
  v,
} from './schema.js';

export const strobeLightAuthoring = defineVizComponentAuthoring({
  componentId: 'strobe-light',
  compatibility: 'render-safe',
  presets: [
    {
      name: 'Stage Scene Strobe',
      values: {
        mode: 'Random Flashes',
        color: '#ffffff',
        intensity: 1.0,
        strength: 1.0, // Full brightness when flashing
        dutyCycle: 0.5,
        flashRate: 0.3, // Same as stage scene default
      },
    },
    {
      name: 'High Energy Strobe',
      values: {
        mode: 'Intensity',
        color: '#ffffff',
        intensity: 8.0, // Will be modulated by kick/bass energy
        strength: 1.0, // Will be modulated by bass
        dutyCycle: 0.3, // Short, punchy flashes
        flashRate: 0.3, // Not used in Intensity mode
      },
      networks: {
        intensity: 'kick-bass-smooth-intensity',
      },
    },
    {
      name: 'Bass Pulse Strobe',
      values: {
        mode: 'Intensity',
        color: '#ffffff',
        intensity: 10.0, // Will be modulated by bass
        strength: 1.0, // Will be modulated by kick/bass
        dutyCycle: 0.25, // Very short, intense flashes
        flashRate: 0.3, // Not used in Intensity mode
      },
      networks: {
        intensity: 'bass-adaptive',
        strength: 'kick-bass-smooth-intensity',
      },
    },
  ],
  config: v.config({
    mode: field.select(
      'Mode',
      'Intensity',
      ['Intensity', 'Manual', 'Random Flashes'],
      'Strobe mode: Intensity (automatic), Manual (triggered), or Random Flashes',
    ),
    color: field.color('Strobe Color', '#ffffff', 'Color of the strobe flash'),
    intensity: field.number(
      'Intensity',
      1,
      [0, 20, 0.1],
      'Flash frequency (higher = faster flashing). Only used in Intensity mode.',
      { visibleWhen: settingCondition('mode', 'equals', 'Intensity') },
    ),
    strength: field.number(
      'Strength',
      1.0,
      [0.0, 1.0, 0.01],
      'Flash brightness. In Manual mode, automate 0-1 for flashing.',
    ),
    dutyCycle: field.number(
      'Duty Cycle',
      0.5,
      [0.1, 0.9, 0.05],
      'Percentage of time flash is ON (0-1). Only used in Intensity mode.',
      { visibleWhen: settingCondition('mode', 'equals', 'Intensity') },
    ),
    flashRate: field.number(
      'Flash Rate',
      0.3,
      [0, 1, 0.01],
      'How often strobes flash (0 = never, 1 = constant). Only used in Random Flashes mode.',
      { visibleWhen: settingCondition('mode', 'equals', 'Random Flashes') },
    ),
  }),
  defaultNetworks: {
    strength: 'overhead-blinder-big-impact',
  },
});
