import {
  defineVizComponentAuthoring,
  field,
  settingCondition,
  v,
} from './schema.js';

export const particleSystemAuthoring = defineVizComponentAuthoring({
  componentId: 'particle-system',
  compatibility: 'render-safe',
  config: v.config({
    appearance: field.group('Appearance', undefined, {
      startColor: field.color(
        'Start Color',
        '#ff00ff',
        'Particle color at birth',
      ),
      endColor: field.color('End Color', '#00ffff', 'Particle color at death'),
      particleSize: field.number(
        'Particle Size',
        0.2,
        [0.1, 5, 0.1],
        'Size of individual particles',
      ),
      blending: field.select(
        'Blending Mode',
        'additive',
        ['additive', 'normal', 'multiply'],
        'How particles blend together',
      ),
    }),
    physics: field.group('Physics', undefined, {
      emissionRate: field.number(
        'Emission Rate',
        100,
        [0, 1000, 10],
        'Particles emitted per second',
      ),
      lifetime: field.number(
        'Lifetime (s)',
        2,
        [0.1, 10, 0.1],
        'How long each particle lives',
      ),
      useGravity: field.toggle(
        'Use Gravity',
        true,
        'Apply gravitational force to particles',
      ),
      gravityStrength: field.number(
        'Gravity Strength',
        9.8,
        [0, 50, 0.1],
        'Strength of gravitational pull',
        {
          visibleWhen: settingCondition('physics.useGravity', 'equals', true),
        },
      ),
      initialSpeed: field.number(
        'Initial Speed',
        2,
        [0, 10, 0.1],
        'Initial velocity magnitude',
      ),
      spread: field.number(
        'Spread',
        0.5,
        [0, 1, 0.01],
        'Angular spread of particle emission (0-1)',
      ),
    }),
    emission: field.group('Emission', undefined, {
      emitterShape: field.select(
        'Emitter Shape',
        'point',
        ['point', 'sphere', 'box'],
        'Shape of the particle emitter',
      ),
      emitterSize: field.number(
        'Emitter Size',
        0.5,
        [0, 5, 0.1],
        'Size of the emitter volume',
      ),
    }),
    rotation: field.group('Rotation', undefined, {
      rotationSpeedX: field.number(
        'Rotation Speed X',
        0,
        [-5, 5, 0.1],
        'Rotation speed around X axis',
      ),
      rotationSpeedY: field.number(
        'Rotation Speed Y',
        1,
        [-5, 5, 0.1],
        'Rotation speed around Y axis',
      ),
      rotationSpeedZ: field.number(
        'Rotation Speed Z',
        0,
        [-5, 5, 0.1],
        'Rotation speed around Z axis',
      ),
    }),
  }),
});
