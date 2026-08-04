import type {
  VizComponentImplementation,
  VizRenderProgramValue,
  VizRenderThreeProgramNode,
} from '@viz-engine/contracts';
import { morphShapesAuthoring } from './authoring/morph-shapes.js';
import { asBoolean, asNumber, asRecord, asString } from './shared.js';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const readVector = (
  value: unknown,
  fallback: readonly [number, number, number],
): [number, number, number] => {
  const record = asRecord(value);
  return [
    asNumber(record.x, fallback[0]),
    asNumber(record.y, fallback[1]),
    asNumber(record.z, fallback[2]),
  ];
};

const readShape = (
  value: unknown,
  fallbackShape: string,
): Record<string, VizRenderProgramValue> => {
  const shape = asRecord(value);
  return {
    shape: asString(shape.shape, fallbackShape),
    modelUrl: asString(shape.modelUrl, ''),
    text: asString(shape.text, ''),
    textSize: Math.max(0.1, asNumber(shape.textSize, 1)),
    textDepth: Math.max(0.01, asNumber(shape.textDepth, 0.2)),
    textFontUrl: asString(shape.textFontUrl, ''),
    position: readVector(shape.position, [0, 0, 0]),
    rotationDegrees: readVector(shape.rotation, [0, 0, 0]),
  };
};

const readMorphSample = (
  settings: Readonly<Record<string, unknown>>,
): [number, number, number] => [
  clamp(asNumber(settings.morphT, 0), 0, 1),
  clamp(asNumber(settings.explosionShift, 0), 0, 100),
  clamp(asNumber(settings.animationSpeed, 0.08), 0.01, 0.2),
];

const multiplyQuaternions = (
  left: readonly [number, number, number, number],
  right: readonly [number, number, number, number],
): [number, number, number, number] => {
  const [ax, ay, az, aw] = left;
  const [bx, by, bz, bw] = right;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
};

const axisAngleQuaternion = (
  axis: readonly [number, number, number],
  angle: number,
): [number, number, number, number] => {
  const length = Math.hypot(axis[0], axis[1], axis[2]);
  if (length <= 1e-8 || angle === 0) {
    return [0, 0, 0, 1];
  }

  const halfAngle = angle / 2;
  const scale = Math.sin(halfAngle) / length;
  return [
    axis[0] * scale,
    axis[1] * scale,
    axis[2] * scale,
    Math.cos(halfAngle),
  ];
};

const readRotation = (
  settings: Readonly<Record<string, unknown>>,
): {
  axis: [number, number, number];
  speed: number;
} => {
  const rotation = asRecord(settings.rotation);
  return {
    axis: readVector(rotation.axis, [0, 1, 0]),
    speed: clamp(asNumber(rotation.speed, 0.5), -5, 5),
  };
};

interface MorphShapesTemporalState {
  rotationQuaternion: [number, number, number, number];
  morphHistory?: Array<[number, number, number]>;
}

const readTemporalState = (value: unknown): MorphShapesTemporalState => {
  if (!value || typeof value !== 'object') {
    return { rotationQuaternion: [0, 0, 0, 1] };
  }
  const state = value as Partial<MorphShapesTemporalState>;
  const quaternion = state.rotationQuaternion;
  return {
    rotationQuaternion:
      Array.isArray(quaternion) &&
      quaternion.length === 4 &&
      quaternion.every(
        (entry) => typeof entry === 'number' && Number.isFinite(entry),
      )
        ? [...quaternion]
        : [0, 0, 0, 1],
    ...(Array.isArray(state.morphHistory)
      ? { morphHistory: state.morphHistory.map((sample) => [...sample]) }
      : {}),
  };
};

export const morphShapesComponent: VizComponentImplementation = {
  id: 'morph-shapes',
  name: 'Morph Shapes',
  rendererFamily: 'three',
  implementationVersion: '1.0.0',
  authoring: morphShapesAuthoring,
  description: 'Morph point clouds between procedural, model, and text shapes.',
  temporal: {
    step: ({ frameContext, layer, settings }, previousState) => {
      const state = readTemporalState(previousState);
      const rotation = readRotation(settings);
      const rotationQuaternion =
        frameContext.frame === 0
          ? ([0, 0, 0, 1] as const)
          : multiplyQuaternions(
              state.rotationQuaternion,
              axisAngleQuaternion(
                rotation.axis,
                rotation.speed / frameContext.fps,
              ),
            );
      const hasTemporalInputs = Object.values(layer.inputs ?? {}).some(
        (source) =>
          source.kind === 'graph-output' || source.kind === 'artifact-feature',
      );
      return {
        rotationQuaternion: [...rotationQuaternion],
        ...(hasTemporalInputs
          ? {
              morphHistory: [
                ...(state.morphHistory ?? []),
                readMorphSample(settings),
              ],
            }
          : {}),
      } satisfies MorphShapesTemporalState;
    },
  },
  render: ({
    frameContext,
    layer,
    settings,
    temporalState,
    materializedAssets,
  }) => {
    const state = readTemporalState(temporalState);
    const morphSample = readMorphSample(settings);
    const morphHistory =
      frameContext.frame > 0 ? state.morphHistory : undefined;
    const shapeA = readShape(settings.shapeASettings, 'cube');
    const shapeB = readShape(settings.shapeBSettings, 'pyramid');

    const resolveModelSource = (
      shape: Record<string, VizRenderProgramValue>,
    ): Record<string, VizRenderProgramValue> => {
      const modelUrl = asString(shape.modelUrl, '');
      if (modelUrl.startsWith('asset:')) {
        return {
          ...shape,
          modelUrl: '',
          modelAssetId: modelUrl.slice('asset:'.length),
        };
      }
      const assetId = modelUrl;
      const asset = materializedAssets.get(assetId);
      if (asset?.kind === 'binary' || asset?.kind === 'model') {
        return {
          ...shape,
          modelUrl: '',
          modelAssetId: asset.id,
        };
      }
      return shape;
    };

    return {
      kind: 'three-program',
      id: layer.id,
      programId: 'viz-core/morph-shapes/v1',
      parameters: {
        frame: frameContext.frame,
        seed: frameContext.seed,
        shapeA: resolveModelSource(shapeA),
        shapeB: resolveModelSource(shapeB),
        morphT: morphSample[0],
        explosionShift: morphSample[1],
        animationSpeed: morphSample[2],
        ...(morphHistory ? { morphHistory } : {}),
        color: asString(settings.color, 'rgb(0, 200, 255)'),
        gridSize: Math.round(clamp(asNumber(settings.gridSize, 5), 1, 100)),
        modelPointCount: Math.round(
          clamp(asNumber(settings.modelPointCount, 15_000), 1, 60_000),
        ),
        modelEvenness: clamp(asNumber(settings.modelEvenness, 0.7), 0.2, 1),
        sphereSize: clamp(asNumber(settings.sphereSize, 0.15), 0.01, 1),
        additiveGlow: asBoolean(settings.additiveGlow, false),
        glowIntensity: clamp(asNumber(settings.glowIntensity, 1), 0.2, 5),
        rotationQuaternion: state.rotationQuaternion,
      },
    } satisfies VizRenderThreeProgramNode;
  },
};
