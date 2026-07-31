import type {
  VizComponentImplementation,
  VizRenderThreeProgramNode,
} from '@viz-engine/contracts';
import { instancedSupercubeAuthoring } from './authoring/instanced-supercube.js';
import { asNumber, asString } from './shared.js';

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const resolveSmoothedExplosionShift = ({
  frame,
  settings,
  sampleSettings,
}: {
  frame: number;
  settings: Readonly<Record<string, unknown>>;
  sampleSettings: (frame: number) => Readonly<Record<string, unknown>>;
}): number => {
  const target = clamp01(asNumber(settings.explosionShift, 0));
  const speed = clamp01(asNumber(settings.animationSpeed, 0.08));

  if (frame <= 0) {
    return target * speed;
  }

  if (sampleSettings(frame - 1) === settings) {
    return target * (1 - Math.pow(1 - speed, frame + 1));
  }

  let shift = 0;
  for (let sampledFrame = 0; sampledFrame <= frame; sampledFrame += 1) {
    const sampled = sampleSettings(sampledFrame);
    const sampledTarget = clamp01(asNumber(sampled.explosionShift, 0));
    const sampledSpeed = clamp01(asNumber(sampled.animationSpeed, 0.08));
    shift += (sampledTarget - shift) * sampledSpeed;
  }
  return shift;
};

export const instancedSupercubeComponent: VizComponentImplementation = {
  id: 'instanced-supercube',
  name: 'Instanced Supercube',
  rendererFamily: 'three',
  implementationVersion: '1.0.0',
  authoring: instancedSupercubeAuthoring,
  description: 'Interactive instanced cubes with an explosion response.',
  render: ({ frameContext, layer, settings, sampleSettings }) =>
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
        explosionShift: resolveSmoothedExplosionShift({
          frame: frameContext.frame,
          settings,
          sampleSettings,
        }),
        rotation:
          frameContext.timeInSeconds *
          Math.max(0, asNumber(settings.rotationSpeed, 0.2)),
      },
    }) satisfies VizRenderThreeProgramNode,
};
