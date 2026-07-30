import type {
  VizComponentImplementation,
  VizRenderThreeProgramNode,
} from '@viz-engine/contracts';
import { stageSceneAuthoring } from './authoring/stage-scene.js';
import { asBoolean, asNumber, asRecord, asString } from './shared.js';
import { STAGE_MODEL_ASSET_DEFINITIONS } from './stage-model-assets.js';

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const readVector3 = (
  value: unknown,
  fallback: readonly [number, number, number],
): [number, number, number] => {
  const vector = asRecord(value);
  return [
    asNumber(vector.x, fallback[0]),
    asNumber(vector.y, fallback[1]),
    asNumber(vector.z, fallback[2]),
  ];
};

const readMode = (value: unknown, maximum: number): string => {
  const mode = asString(value, 'auto');
  if (mode === 'auto') {
    return mode;
  }

  const parsed = Number.parseInt(mode, 10);
  return Number.isFinite(parsed) ? String(clamp(parsed, 0, maximum)) : 'auto';
};

export const stageSceneComponent: VizComponentImplementation = {
  id: 'stage-scene',
  name: 'Stage Scene',
  rendererFamily: 'three',
  implementationVersion: '1.0.0',
  authoring: stageSceneAuthoring,
  description:
    'Deterministic retained EDM stage with a cinematic camera, crowd, lighting, lasers, beams, and shader wall.',
  inputs: STAGE_MODEL_ASSET_DEFINITIONS.map((definition) => ({
    key: definition.inputKey,
    label: definition.asset.label,
    supportedSources: ['asset-ref'],
    required: true,
    defaultAsset: definition.asset,
    description: `Production Stage ${definition.role} model.`,
  })),
  render: ({ frameContext, layer, settings, resolvedInputs }) => {
    const camera = asRecord(settings.camera);
    const shaderWall = asRecord(settings.shaderWall);
    const lighting = asRecord(settings.lighting);
    const postProcessing = asRecord(settings.postProcessing);
    const lasers = asRecord(settings.lasers);
    const movingLights = asRecord(settings.movingLights);
    const beams = asRecord(settings.beams);
    const stageLights = asRecord(settings.stageLights);
    const stageWash = asRecord(settings.stageWash);
    const strobes = asRecord(settings.strobes);
    const blinders = asRecord(settings.blinders);
    const overheadBlinder = asRecord(settings.overheadBlinder);
    const accentLights = asRecord(settings.accentLights);
    const characters = asRecord(settings.characters);
    const debug = asRecord(settings.debug);
    const modelAssetIds = Object.fromEntries(
      STAGE_MODEL_ASSET_DEFINITIONS.map((definition) => {
        const input = resolvedInputs[definition.inputKey];
        const asset = asRecord(input?.value);
        return [
          definition.role,
          input?.status === 'resolved' && asset.kind === 'model'
            ? asString(asset.id, '')
            : '',
        ];
      }),
    );

    return {
      kind: 'three-program',
      id: layer.id,
      programId: 'viz-core/stage-scene/v1',
      parameters: {
        frame: frameContext.frame,
        fps: frameContext.fps,
        time: frameContext.timeInSeconds,
        seed: frameContext.seed,
        cameraPosition: readVector3(camera.position, [0, 8, 40]),
        cameraRotation: readVector3(camera.rotation, [0, 0, 0]),
        cinematicMode: asBoolean(camera.cinematicMode, true),
        cinematicPath: asString(camera.cinematicPath, 'Panoramic Sweep'),
        cinematicDuration: clamp(
          asNumber(camera.cinematicDuration, 60),
          0.001,
          300,
        ),
        cinematicLookAt: readVector3(camera.cinematicLookAt, [0, 5, 0]),
        cinematicLerpSpeed: clamp(
          asNumber(camera.cinematicLerpSpeed, 0.05),
          0.01,
          1,
        ),
        shaderWallEnabled: asBoolean(shaderWall.enabled, true),
        shaderWallScale: clamp(asNumber(shaderWall.scale, 2), 0.5, 4),
        shaderWallRotationSpeed: clamp(
          asNumber(shaderWall.rotationSpeed, 1),
          0,
          3,
        ),
        shaderWallColorSpeed: clamp(asNumber(shaderWall.colorSpeed, 3), 0, 3),
        shaderWallTravelSpeed: clamp(asNumber(shaderWall.travelSpeed, 1), 0, 3),
        shaderWallBrightness: clamp(asNumber(shaderWall.brightness, 2), 0, 5),
        hemisphereIntensity: clamp(
          asNumber(lighting.hemisphereIntensity, 2),
          0,
          5,
        ),
        ambientIntensity: clamp(asNumber(lighting.ambientIntensity, 1), 0, 5),
        bloomEnabled: asBoolean(postProcessing.bloom, true),
        bloomStrength: clamp(asNumber(postProcessing.bloomStrength, 0.5), 0, 3),
        bloomRadius: clamp(asNumber(postProcessing.bloomRadius, 0.8), 0, 1),
        bloomThreshold: clamp(
          asNumber(postProcessing.bloomThreshold, 0.6),
          0,
          1,
        ),
        lasersEnabled: asBoolean(lasers.enabled, true),
        laserMode: readMode(lasers.mode, 4),
        laserColorMode: asString(lasers.colorMode, 'multi'),
        laserColor: asString(lasers.singleColor, '#ff0000'),
        laserRotationSpeed: clamp(asNumber(lasers.rotationSpeed, 1), 0, 3),
        maximumLaserCount: Math.round(
          clamp(asNumber(lasers.maxConcurrentLasers, 12), 1, 12),
        ),
        movingLightsEnabled: asBoolean(movingLights.enabled, true),
        movingLightMode: readMode(movingLights.mode, 4),
        movingLightColorMode: asString(movingLights.colorMode, 'multi'),
        movingLightColor: asString(movingLights.singleColor, '#ffffff'),
        movingLightIntensity: clamp(asNumber(movingLights.intensity, 5), 0, 20),
        movingLightSpeed: clamp(asNumber(movingLights.speed, 1), 0, 3),
        beamsEnabled: asBoolean(beams.enabled, true),
        beamMode: readMode(beams.mode, 6),
        beamColorMode: asString(beams.colorMode, 'multi'),
        beamColor: asString(beams.singleColor, '#88aaff'),
        beamIntensity: clamp(asNumber(beams.intensity, 1), 0, 3),
        stageLightsEnabled: asBoolean(stageLights.enabled, true),
        stageLightColor: asString(stageLights.color, '#8888ff'),
        stageWashEnabled: asBoolean(stageWash.enabled, true),
        stageWashIntensity: clamp(asNumber(stageWash.intensity, 5), 0, 50),
        strobesEnabled: asBoolean(strobes.enabled, true),
        strobeIntensity: clamp(asNumber(strobes.intensity, 500), 0, 1_000),
        strobeFlashRate: clamp(asNumber(strobes.flashRate, 0.3), 0, 1),
        blindersEnabled: asBoolean(blinders.enabled, true),
        blinderMode: asString(blinders.mode, 'controlled'),
        blinderIntensity: clamp(asNumber(blinders.intensity, 0), 0, 1),
        overheadBlinderEnabled: asBoolean(overheadBlinder.enabled, true),
        overheadBlinderIntensity: clamp(
          asNumber(overheadBlinder.intensity, 0),
          0,
          200,
        ),
        accentLightsEnabled: asBoolean(accentLights.enabled, true),
        accentLight1Color: asString(accentLights.light1Color, '#ff00ff'),
        accentLight2Color: asString(accentLights.light2Color, '#00ffff'),
        djSpotIntensity: clamp(
          asNumber(accentLights.djSpotIntensity, 0.8),
          0,
          5,
        ),
        showDj: asBoolean(characters.showDj, true),
        djModelAssetId: asString(modelAssetIds.dj, ''),
        crowdModelAssetIds: [
          asString(modelAssetIds.femaleDancer, ''),
          asString(modelAssetIds.maleDancer, ''),
          asString(modelAssetIds.maleCheer, ''),
        ].filter(Boolean),
        characterAnimationSpeed: clamp(
          asNumber(characters.animationSpeed, 1),
          0,
          4,
        ),
        crowdCount: Math.round(
          clamp(asNumber(characters.crowdCount, 500), 0, 1_000),
        ),
        showHelpers: asBoolean(debug.showHelpers, false),
      },
    } satisfies VizRenderThreeProgramNode;
  },
};
