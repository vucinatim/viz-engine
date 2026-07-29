import { v } from '../config/config';
import { createComponent } from '../config/create-component';

const ParticleSystem = createComponent({
  name: 'Particle System',
  description:
    'GPU-accelerated particle system with physics and color interpolation',
  config: v.config({
    appearance: v.group(
      { label: 'Appearance' },
      {
        startColor: v.color({
          label: 'Start Color',
          description: 'Particle color at birth',
          defaultValue: '#ff00ff',
        }),
        endColor: v.color({
          label: 'End Color',
          description: 'Particle color at death',
          defaultValue: '#00ffff',
        }),
        particleSize: v.number({
          label: 'Particle Size',
          description: 'Size of individual particles',
          defaultValue: 0.2,
          min: 0.1,
          max: 5,
          step: 0.1,
        }),
        blending: v.select({
          label: 'Blending Mode',
          description: 'How particles blend together',
          defaultValue: 'additive',
          options: ['additive', 'normal', 'multiply'],
        }),
      },
    ),
    physics: v.group(
      { label: 'Physics' },
      {
        emissionRate: v.number({
          label: 'Emission Rate',
          description: 'Particles emitted per second',
          defaultValue: 100,
          min: 0,
          max: 1000,
          step: 10,
        }),
        lifetime: v.number({
          label: 'Lifetime (s)',
          description: 'How long each particle lives',
          defaultValue: 2,
          min: 0.1,
          max: 10,
          step: 0.1,
        }),
        useGravity: v.toggle({
          label: 'Use Gravity',
          description: 'Apply gravitational force to particles',
          defaultValue: true,
        }),
        gravityStrength: v.number({
          label: 'Gravity Strength',
          description: 'Strength of gravitational pull',
          defaultValue: 9.8,
          min: 0,
          max: 50,
          step: 0.1,
          visibleIf: (allValues) => allValues.physics.useGravity === true,
        }),
        initialSpeed: v.number({
          label: 'Initial Speed',
          description: 'Initial velocity magnitude',
          defaultValue: 2,
          min: 0,
          max: 10,
          step: 0.1,
        }),
        spread: v.number({
          label: 'Spread',
          description: 'Angular spread of particle emission (0-1)',
          defaultValue: 0.5,
          min: 0,
          max: 1,
          step: 0.01,
        }),
      },
    ),
    emission: v.group(
      { label: 'Emission' },
      {
        emitterShape: v.select({
          label: 'Emitter Shape',
          description: 'Shape of the particle emitter',
          defaultValue: 'point',
          options: ['point', 'sphere', 'box'],
        }),
        emitterSize: v.number({
          label: 'Emitter Size',
          description: 'Size of the emitter volume',
          defaultValue: 0.5,
          min: 0,
          max: 5,
          step: 0.1,
        }),
      },
    ),
    rotation: v.group(
      { label: 'Rotation' },
      {
        rotationSpeedX: v.number({
          label: 'Rotation Speed X',
          description: 'Rotation speed around X axis',
          defaultValue: 0,
          min: -5,
          max: 5,
          step: 0.1,
        }),
        rotationSpeedY: v.number({
          label: 'Rotation Speed Y',
          description: 'Rotation speed around Y axis',
          defaultValue: 1,
          min: -5,
          max: 5,
          step: 0.1,
        }),
        rotationSpeedZ: v.number({
          label: 'Rotation Speed Z',
          description: 'Rotation speed around Z axis',
          defaultValue: 0,
          min: -5,
          max: 5,
          step: 0.1,
        }),
      },
    ),
  }),
});

export default ParticleSystem;
