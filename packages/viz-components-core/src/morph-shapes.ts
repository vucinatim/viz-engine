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

const resolveRotationQuaternion = ({
  frame,
  fps,
  settings,
  sampleSettings,
}: {
  frame: number;
  fps: number;
  settings: Readonly<Record<string, unknown>>;
  sampleSettings: (frame: number) => Readonly<Record<string, unknown>>;
}): [number, number, number, number] => {
  const rotation = readRotation(settings);
  if (frame <= 0) {
    return [0, 0, 0, 1];
  }

  if (sampleSettings(frame - 1) === settings) {
    return axisAngleQuaternion(rotation.axis, rotation.speed * (frame / fps));
  }

  let result: [number, number, number, number] = [0, 0, 0, 1];
  for (let sampledFrame = 1; sampledFrame <= frame; sampledFrame += 1) {
    const sampledRotation = readRotation(sampleSettings(sampledFrame));
    result = multiplyQuaternions(
      result,
      axisAngleQuaternion(sampledRotation.axis, sampledRotation.speed / fps),
    );
  }
  return result;
};

const resolveMorphHistory = ({
  frame,
  settings,
  sampleSettings,
}: {
  frame: number;
  settings: Readonly<Record<string, unknown>>;
  sampleSettings: (frame: number) => Readonly<Record<string, unknown>>;
}): Array<[number, number, number]> | undefined => {
  if (frame <= 0 || sampleSettings(Math.max(0, frame - 1)) === settings) {
    return undefined;
  }

  const history: Array<[number, number, number]> = [];
  for (let sampledFrame = 0; sampledFrame <= frame; sampledFrame += 1) {
    history.push(readMorphSample(sampleSettings(sampledFrame)));
  }
  return history;
};

export const morphShapesComponent: VizComponentImplementation = {
  id: 'morph-shapes',
  name: 'Morph Shapes',
  rendererFamily: 'three',
  implementationVersion: '1.0.0',
  authoring: morphShapesAuthoring,
  description:
    'Deterministic retained point-cloud morphing between procedural, model, and text shapes.',
  render: ({
    frameContext,
    layer,
    settings,
    sampleSettings,
    materializedAssets,
  }) => {
    const morphSample = readMorphSample(settings);
    const morphHistory = resolveMorphHistory({
      frame: frameContext.frame,
      settings,
      sampleSettings,
    });
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
        rotationQuaternion: resolveRotationQuaternion({
          frame: frameContext.frame,
          fps: frameContext.fps,
          settings,
          sampleSettings,
        }),
      },
    } satisfies VizRenderThreeProgramNode;
  },
};
