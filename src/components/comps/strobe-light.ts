import { v } from '../config/config';
import { createComponent } from '../config/create-component';

const StrobeLight = createComponent({
  name: 'Strobe Light',
  description: 'Fullscreen strobe flash effect with intensity and manual modes',
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
    mode: v.select({
      label: 'Mode',
      description:
        'Strobe mode: Intensity (automatic), Manual (triggered), or Random Flashes',
      defaultValue: 'Intensity',
      options: ['Intensity', 'Manual', 'Random Flashes'],
    }),
    color: v.color({
      label: 'Strobe Color',
      description: 'Color of the strobe flash',
      defaultValue: '#ffffff',
    }),
    intensity: v.number({
      label: 'Intensity',
      description:
        'Flash frequency (higher = faster flashing). Only used in Intensity mode.',
      defaultValue: 1.0,
      min: 0.0,
      max: 20.0,
      step: 0.1,
      visibleIf: (vals) => vals.mode === 'Intensity',
    }),
    strength: v.number({
      label: 'Strength',
      description:
        'Flash brightness. In Manual mode, automate 0-1 for flashing.',
      defaultValue: 1.0,
      min: 0.0,
      max: 1.0,
      step: 0.01,
    }),
    dutyCycle: v.number({
      label: 'Duty Cycle',
      description:
        'Percentage of time flash is ON (0-1). Only used in Intensity mode.',
      defaultValue: 0.5,
      min: 0.1,
      max: 0.9,
      step: 0.05,
      visibleIf: (vals) => vals.mode === 'Intensity',
    }),
    flashRate: v.number({
      label: 'Flash Rate',
      description:
        'How often strobes flash (0 = never, 1 = constant). Only used in Random Flashes mode.',
      defaultValue: 0.3,
      min: 0,
      max: 1,
      step: 0.01,
      visibleIf: (vals) => vals.mode === 'Random Flashes',
    }),
  }),
  defaultNetworks: {
    strength: 'overhead-blinder-big-impact',
  },
});

export default StrobeLight;
