import type {
  VizComponentImplementation,
  VizRenderThreeProgramNode,
} from '@viz-engine/contracts';
import { instancedSupercubeAuthoring } from './authoring/instanced-supercube.js';
import { asNumber, asString } from './shared.js';

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

export const instancedSupercubeComponent: VizComponentImplementation = {
  id: 'instanced-supercube',
  name: 'Instanced Supercube',
  rendererFamily: 'three',
  implementationVersion: '1.0.0',
  authoring: instancedSupercubeAuthoring,
  description: 'Interactive instanced cubes with an explosion response.',
  temporal: {
    step: ({ settings }, previousState) => {
      const previous =
        typeof previousState === 'number' && Number.isFinite(previousState)
          ? previousState
          : 0;
      const target = clamp01(asNumber(settings.explosionShift, 0));
      const speed = clamp01(asNumber(settings.animationSpeed, 0.08));
      return previous + (target - previous) * speed;
    },
  },
  render: ({ frameContext, layer, settings, temporalState }) =>
    ({
      kind: 'three-program',
      id: layer.id,
      programId: 'viz-core/instanced-supercube/v1',
      parameters: {
        color: asString(settings.color, 'rgb(255, 0, 0)'),
        explosionFactor: Math.max(1, asNumber(settings.explosionFactor, 1.67)),
        gridSize: Math.min(
          8,
          Math.max(3, Math.round(asNumber(settings.gridSize, 5))),
        ),
        spacing: Math.max(0, asNumber(settings.spacing, 4)),
        explosionShift:
          typeof temporalState === 'number' && Number.isFinite(temporalState)
            ? temporalState
            : 0,
        rotation:
          frameContext.timeInSeconds *
          Math.max(0, asNumber(settings.rotationSpeed, 0.2)),
      },
    }) satisfies VizRenderThreeProgramNode,
};
