import { defineVizComponentAuthoring, field, v } from './schema.js';

export const neuralNetworkAuthoring = defineVizComponentAuthoring({
  componentId: 'neural-network',
  compatibility: 'render-safe',
  config: v.config({
    neuronCount: field.number(
      'Neuron Count',
      30,
      [1, 50, 1],
      'Number of neurons to display',
    ),
    seed: field.number(
      'Neuron Seed',
      42,
      [1, 10000, 1],
      'Seed for procedural neuron generation',
    ),
    tubeRadius: field.number(
      'Tube Thickness',
      0.25,
      [0.05, 1, 0.05],
      'Radius of the dendrite tubes',
    ),
    neuronColor: field.color(
      'Neuron Color',
      '#00CED1',
      'Base color of the neuron',
    ),
    somaEmission: field.color(
      'Soma Glow',
      'rgb(255, 138, 201)',
      'Emission color of the cell body',
    ),
    emissiveIntensity: field.number(
      'Glow Intensity',
      2,
      [0, 5, 0.1],
      'How much the soma glows',
    ),
    metalness: field.number(
      'Metalness',
      0,
      [0, 1, 0.05],
      'Metallic appearance',
    ),
    roughness: field.number(
      'Roughness',
      0.9,
      [0, 1, 0.05],
      'Surface roughness',
    ),
    fresnelPower: field.number(
      'Rim Glow',
      3,
      [0.5, 8, 0.5],
      'Fresnel rim lighting intensity',
    ),
    growth: field.number(
      'Growth',
      1,
      [0, 1, 0.01],
      'Dendrite growth animation (0 = just soma, 1 = fully grown)',
    ),
    dendriteReach: field.number(
      'Dendrite Reach',
      20,
      [5, 40, 1],
      'How far dendrites extend from soma (15+ to connect neurons)',
    ),
    trigger: field.toggle(
      'Fire Neurons',
      false,
      'Toggle on to fire neural signals through the network',
    ),
    signalSpeed: field.number(
      'Signal Speed',
      30,
      [1, 40, 0.5],
      'How fast signals travel along dendrites',
    ),
    signalSize: field.number(
      'Signal Orb Size',
      0.2,
      [0.1, 2, 0.1],
      'Radius of traveling signal orbs',
    ),
    activationDecay: field.number(
      'Activation Decay',
      0.4,
      [0, 10, 0.5],
      'How quickly neurons fade after activation',
    ),
    postProcessing: field.group(
      'Post Processing',
      'Bloom and depth of field effects',
      {
        bloom: field.toggle('Bloom Enabled', false, 'Enable bloom glow effect'),
        bloomStrength: field.number(
          'Bloom Strength',
          0.2,
          [0, 3, 0.01],
          'Intensity of the bloom glow effect',
        ),
        bloomRadius: field.number(
          'Bloom Radius',
          0.8,
          [0, 1, 0.01],
          'Size of the bloom glow spread',
        ),
        bloomThreshold: field.number(
          'Bloom Threshold',
          0.3,
          [0, 1, 0.01],
          'Brightness threshold for bloom effect',
        ),
        depthOfField: field.toggle(
          'Depth of Field',
          true,
          'Enable cinematic shallow focus effect',
        ),
        dofFocus: field.number(
          'DOF Focus Distance',
          10,
          [1, 50, 0.5],
          'Distance where objects are in focus',
        ),
        dofAperture: field.number(
          'DOF Aperture',
          0.0005,
          [0.0001, 0.002, 0.0001],
          'Blur amount (lower = more blur)',
        ),
      },
    ),
  }),
  defaultNetworks: {
    'postProcessing.dofFocus': 'dof-focus-slow-sine',
    trigger: 'neural-fire-on-kick',
    seed: 'neural-seed-snare-cycle',
  },
});
