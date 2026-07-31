import type {
  VizComponentImplementation,
  VizRenderThreeProgramNode,
} from '@viz-engine/contracts';
import { orbitingCubesAuthoring } from './authoring/orbiting-cubes.js';
import { asNumber, asString } from './shared.js';

export const orbitingCubesComponent: VizComponentImplementation = {
  id: 'orbiting-cubes',
  name: 'Orbiting Cubes',
  rendererFamily: 'three',
  implementationVersion: '1.0.0',
  authoring: orbitingCubesAuthoring,
  description:
    'Neuron-like structures with dendrites, a soma, and an orbiting camera.',
  render: ({ frameContext, layer, settings }) =>
    ({
      kind: 'three-program',
      id: layer.id,
      programId: 'viz-core/orbiting-cubes/v1',
      parameters: {
        time: frameContext.timeInSeconds,
        seed: Math.round(asNumber(settings.seed, 3499)),
        maxCubes: Math.min(
          150,
          Math.max(8, Math.round(asNumber(settings.maxCubes, 150))),
        ),
        fractalDepth: Math.min(
          5,
          Math.max(1, Math.round(asNumber(settings.fractalDepth, 5))),
        ),
        cubeColor: asString(settings.cubeColor, '#1a1a2e'),
        cubeSize: Math.max(0.1, asNumber(settings.cubeSize, 0.45)),
        metalness: Math.min(1, Math.max(0, asNumber(settings.metalness, 0.95))),
        roughness: Math.min(1, Math.max(0, asNumber(settings.roughness, 0.5))),
        light1Color: asString(settings.light1Color, '#FF00FF'),
        light2Color: asString(settings.light2Color, '#00FFFF'),
        light3Color: asString(settings.light3Color, '#FFFF00'),
        lightIntensity: Math.max(0, asNumber(settings.lightIntensity, 500)),
        ambientBrightness: Math.max(
          0,
          asNumber(settings.ambientBrightness, 185),
        ),
        spacing: Math.max(0.1, asNumber(settings.spacing, 0.65)),
        orbitSpeed: Math.max(0, asNumber(settings.orbitSpeed, 0.3)),
        orbitRadius: Math.max(3, asNumber(settings.orbitRadius, 8)),
        rotationSpeed: Math.max(0, asNumber(settings.rotationSpeed, 0.1)),
      },
    }) satisfies VizRenderThreeProgramNode,
};
