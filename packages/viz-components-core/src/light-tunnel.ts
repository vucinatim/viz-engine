import type {
  VizComponentImplementation,
  VizRenderThreeProgramNode,
} from "@viz-engine/contracts";
import {
  asBoolean,
  asNumber,
  asRecord,
  asString,
} from "./shared.js";

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const asStringArray = (
  value: unknown,
  fallback: readonly string[],
): string[] => {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const colors = value.filter(
    (entry): entry is string =>
      typeof entry === "string" && entry.length > 0,
  );
  return colors.length > 0 ? colors : [...fallback];
};

const getWaveSettings = (
  settings: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> => asRecord(settings.wave);

const resolveActiveWaveAges = ({
  frame,
  fps,
  settings,
  sampleSettings,
  tunnelDepth,
  waveSpeed,
  waveDuration,
}: {
  frame: number;
  fps: number;
  settings: Readonly<Record<string, unknown>>;
  sampleSettings: (
    frame: number,
  ) => Readonly<Record<string, unknown>>;
  tunnelDepth: number;
  waveSpeed: number;
  waveDuration: number;
}): number[] => {
  const maxAge = waveDuration + tunnelDepth / waveSpeed;
  const currentWave = getWaveSettings(settings);
  const staticTrigger = asBoolean(currentWave.triggerWave, false);

  if (frame <= 0 || sampleSettings(Math.max(0, frame - 1)) === settings) {
    const age = frame / fps;
    return staticTrigger && age <= maxAge ? [age] : [];
  }

  const firstRelevantFrame = Math.max(
    0,
    frame - Math.ceil(maxAge * fps) - 1,
  );
  let previousTrigger =
    firstRelevantFrame > 0
      ? asBoolean(
          getWaveSettings(sampleSettings(firstRelevantFrame - 1))
            .triggerWave,
          false,
        )
      : false;
  const activeWaveAges: number[] = [];

  for (
    let sampledFrame = firstRelevantFrame;
    sampledFrame <= frame;
    sampledFrame += 1
  ) {
    const trigger = asBoolean(
      getWaveSettings(sampleSettings(sampledFrame)).triggerWave,
      false,
    );

    if (trigger && !previousTrigger) {
      const age = (frame - sampledFrame) / fps;
      if (age <= maxAge) {
        activeWaveAges.push(age);
      }
    }
    previousTrigger = trigger;
  }

  return activeWaveAges;
};

export const lightTunnelComponent: VizComponentImplementation = {
  id: "light-tunnel",
  name: "Light Tunnel",
  rendererFamily: "three",
  description:
    "Deterministic retained neon cube tunnel with lights, waves, fog, bloom, and depth of field.",
  render: ({
    frameContext,
    layer,
    settings,
    sampleSettings,
  }) => {
    const structure = asRecord(settings.structure);
    const appearance = asRecord(settings.appearance);
    const edges = asRecord(settings.edges);
    const material = asRecord(settings.material);
    const lighting = asRecord(settings.lighting);
    const animation = asRecord(settings.animation);
    const wave = getWaveSettings(settings);
    const atmosphere = asRecord(settings.atmosphere);
    const postProcessing = asRecord(settings.postProcessing);
    const tunnelDepth = Math.round(
      clamp(asNumber(structure.tunnelDepth, 13), 10, 40),
    );
    const waveSpeed = clamp(asNumber(wave.waveSpeed, 8.5), 0.5, 10);
    const waveDuration = clamp(
      asNumber(wave.waveDuration, 0.4),
      0.2,
      2,
    );

    return {
      kind: "three-program",
      id: layer.id,
      programId: "viz-core/light-tunnel/v1",
      parameters: {
        time: frameContext.timeInSeconds,
        seed: frameContext.seed,
        cubeSize: clamp(asNumber(structure.cubeSize, 2.5), 0.5, 3),
        spacing: clamp(asNumber(structure.spacing, 1.3), 1, 5),
        tunnelDepth,
        renderMode: asString(appearance.renderMode, "Solid"),
        colorMode: asString(appearance.colorMode, "Alternating"),
        edgeColor: asString(appearance.edgeColor, "#00FFFF"),
        colorPalette: asStringArray(appearance.colorPalette, [
          "#FF00FF",
          "#00FFFF",
        ]),
        edgeThickness: clamp(
          asNumber(edges.edgeThickness, 5.5),
          1,
          10,
        ),
        glowIntensity: clamp(
          asNumber(edges.glowIntensity, 1.8),
          0.5,
          5,
        ),
        solidCubeColor: asString(
          material.solidCubeColor,
          "#0a0a0a",
        ),
        solidEmissiveColor: asString(
          material.solidEmissiveColor,
          "rgb(0, 0, 0)",
        ),
        solidEmissiveIntensity: clamp(
          asNumber(material.solidEmissiveIntensity, 0),
          0,
          1,
        ),
        metalness: clamp(asNumber(material.metalness, 0.7), 0, 1),
        roughness: clamp(asNumber(material.roughness, 0.77), 0, 1),
        envMapIntensity: clamp(
          asNumber(material.envMapIntensity, 0),
          0,
          5,
        ),
        enableLights: asBoolean(lighting.enableLights, true),
        lightCount: Math.round(
          clamp(asNumber(lighting.lightCount, 6), 3, 16),
        ),
        lightCircleRadius: clamp(
          asNumber(lighting.lightCircleRadius, 7),
          0.2,
          7,
        ),
        lightCircleDistance: clamp(
          asNumber(lighting.lightCircleDistance, 7),
          0.5,
          10,
        ),
        lightIntensity: clamp(
          asNumber(lighting.lightIntensity, 100),
          0,
          100,
        ),
        lightDistance: clamp(
          asNumber(lighting.lightDistance, 100),
          1,
          100,
        ),
        lightRotationSpeed: clamp(
          asNumber(lighting.lightRotationSpeed, 0.15),
          0,
          2,
        ),
        tunnelSpeed: clamp(
          asNumber(animation.tunnelSpeed, 0.5),
          0,
          3,
        ),
        rotationSpeed: clamp(
          asNumber(animation.rotationSpeed, 0.05),
          0,
          2,
        ),
        activeWaveAges: resolveActiveWaveAges({
          frame: frameContext.frame,
          fps: frameContext.fps,
          settings,
          sampleSettings,
          tunnelDepth,
          waveSpeed,
          waveDuration,
        }),
        waveSpeed,
        waveAmplitude: clamp(
          asNumber(wave.waveAmplitude, 1),
          0.5,
          5,
        ),
        waveDuration,
        fogDensity: clamp(
          asNumber(atmosphere.fogDensity, 0.095),
          0,
          0.1,
        ),
        bloomEnabled: asBoolean(postProcessing.bloom, true),
        bloomStrength: clamp(
          asNumber(postProcessing.bloomStrength, 0.5),
          0,
          3,
        ),
        bloomRadius: clamp(
          asNumber(postProcessing.bloomRadius, 0.8),
          0,
          1,
        ),
        bloomThreshold: clamp(
          asNumber(postProcessing.bloomThreshold, 0.1),
          0,
          1,
        ),
        depthOfFieldEnabled: asBoolean(
          postProcessing.depthOfField,
          false,
        ),
        depthOfFieldFocus: clamp(
          asNumber(postProcessing.dofFocus, 1),
          1,
          50,
        ),
        depthOfFieldAperture: clamp(
          asNumber(postProcessing.dofAperture, 0.0011),
          0.0001,
          0.002,
        ),
      },
    } satisfies VizRenderThreeProgramNode;
  },
};
