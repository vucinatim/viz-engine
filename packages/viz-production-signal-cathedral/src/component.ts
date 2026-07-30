import type {
  VizComponentImplementation,
  VizRenderThreeProgramNode,
} from '@viz-engine/contracts';
import { signalCathedralAuthoring } from './authoring.js';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const asRecord = (value: unknown): Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : {};

const asNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const asString = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.length > 0 ? value : fallback;

const asNumberArray = (value: unknown): number[] => {
  if (value instanceof Uint8Array) {
    return Array.from(value);
  }
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (entry): entry is number =>
      typeof entry === 'number' && Number.isFinite(entry),
  );
};

const getTrigger = (settings: Readonly<Record<string, unknown>>): number =>
  asNumber(asRecord(settings.reactivity).shockwaveTrigger, 0);

const resolveShockwaveAges = ({
  frame,
  fps,
  settings,
  sampleSettings,
}: {
  frame: number;
  fps: number;
  settings: Readonly<Record<string, unknown>>;
  sampleSettings: (frame: number) => Readonly<Record<string, unknown>>;
}): number[] => {
  const lifetimeSeconds = 2.4;
  const threshold = 0.48;
  const firstFrame = Math.max(0, frame - Math.ceil(lifetimeSeconds * fps) - 1);
  let previous =
    firstFrame > 0 ? getTrigger(sampleSettings(firstFrame - 1)) : 0;
  const ages: number[] = [];

  for (
    let sampledFrame = firstFrame;
    sampledFrame <= frame;
    sampledFrame += 1
  ) {
    const current =
      sampledFrame === frame
        ? getTrigger(settings)
        : getTrigger(sampleSettings(sampledFrame));
    if (current >= threshold && previous < threshold) {
      ages.push((frame - sampledFrame) / fps);
    }
    previous = current;
  }

  return ages.slice(-8);
};

export const signalCathedralComponent: VizComponentImplementation = {
  id: 'signal-cathedral',
  name: 'Signal Cathedral',
  rendererFamily: 'three',
  implementationVersion: '1.0.0',
  authoring: signalCathedralAuthoring,
  description:
    'Cinematic retained neon architecture driven by canonical music features.',
  inputs: [
    {
      key: 'reactivity:structurePulse',
      label: 'Structure Pulse',
      supportedSources: ['literal', 'graph-output', 'artifact-feature'],
    },
    {
      key: 'reactivity:coreEnergy',
      label: 'Core Energy',
      supportedSources: ['literal', 'graph-output', 'artifact-feature'],
    },
    {
      key: 'reactivity:spectralShimmer',
      label: 'Spectral Shimmer',
      supportedSources: ['literal', 'graph-output', 'artifact-feature'],
    },
    {
      key: 'reactivity:shockwaveTrigger',
      label: 'Shockwave Trigger',
      supportedSources: ['literal', 'graph-output', 'artifact-feature'],
    },
    {
      key: 'reactivity:bloomAccent',
      label: 'Bloom Accent',
      supportedSources: ['literal', 'graph-output', 'artifact-feature'],
    },
    {
      key: 'spectrum',
      label: 'Dense Frequency Spectrum',
      supportedSources: ['literal'],
      runtimeBinding: 'audio.frequency-data',
    },
  ],
  render: ({
    frameContext,
    layer,
    settings,
    resolvedInputs,
    sampleSettings,
  }) => {
    const palette = asRecord(settings.palette);
    const structure = asRecord(settings.structure);
    const motion = asRecord(settings.motion);
    const reactivity = asRecord(settings.reactivity);
    const lighting = asRecord(settings.lighting);
    const masterResponse = clamp(
      asNumber(reactivity.masterResponse, 1),
      0,
      2.5,
    );

    return {
      kind: 'three-program',
      id: layer.id,
      programId: 'viz-production/signal-cathedral/v1',
      parameters: {
        time: frameContext.timeInSeconds,
        seed: frameContext.seed,
        backgroundColor: asString(palette.background, '#02030d'),
        primaryColor: asString(palette.primary, '#5cf5ff'),
        secondaryColor: asString(palette.secondary, '#8b5cff'),
        accentColor: asString(palette.accent, '#ff3fcf'),
        fogColor: asString(palette.fog, '#07051c'),
        archCount: Math.round(clamp(asNumber(structure.archCount, 24), 8, 32)),
        archSpacing: clamp(asNumber(structure.archSpacing, 4.2), 2, 8),
        naveWidth: clamp(asNumber(structure.naveWidth, 11), 5, 18),
        naveHeight: clamp(asNumber(structure.naveHeight, 7), 3, 12),
        segmentThickness: clamp(
          asNumber(structure.segmentThickness, 0.16),
          0.05,
          0.6,
        ),
        floorExtent: clamp(asNumber(structure.floorExtent, 120), 40, 180),
        coreSize: clamp(asNumber(structure.coreSize, 1.05), 0.2, 2.5),
        particleCount: Math.round(
          clamp(asNumber(structure.particleCount, 900), 100, 1600),
        ),
        travelSpeed: clamp(asNumber(motion.travelSpeed, 4.8), 0, 14),
        cameraSway: clamp(asNumber(motion.cameraSway, 0.32), 0, 2),
        cameraLift: clamp(asNumber(motion.cameraLift, 0.16), 0, 1.5),
        structuralTwist: clamp(
          asNumber(motion.structuralTwist, 0.055),
          -0.3,
          0.3,
        ),
        particleDrift: clamp(asNumber(motion.particleDrift, 0.7), 0, 3),
        coreRotation: clamp(asNumber(motion.coreRotation, 0.65), -3, 3),
        structurePulse:
          clamp(asNumber(reactivity.structurePulse, 0), 0, 1) *
          clamp(asNumber(reactivity.bassResponse, 1), 0, 2.5) *
          masterResponse,
        coreEnergy:
          clamp(asNumber(reactivity.coreEnergy, 0), 0, 1) *
          clamp(asNumber(reactivity.midResponse, 1), 0, 2.5) *
          masterResponse,
        spectralShimmer:
          clamp(asNumber(reactivity.spectralShimmer, 0), 0, 1) *
          clamp(asNumber(reactivity.trebleResponse, 1), 0, 2.5) *
          masterResponse,
        onsetResponse:
          clamp(asNumber(reactivity.onsetResponse, 1), 0, 2.5) * masterResponse,
        bloomAccent:
          clamp(asNumber(reactivity.bloomAccent, 0), 0, 1) *
          clamp(asNumber(reactivity.fluxResponse, 1), 0, 2.5) *
          masterResponse,
        smoothing: clamp(asNumber(reactivity.smoothing, 0.35), 0, 1),
        shockwaveAges: resolveShockwaveAges({
          frame: frameContext.frame,
          fps: frameContext.fps,
          settings,
          sampleSettings,
        }),
        spectrum: asNumberArray(resolvedInputs.spectrum?.value),
        ambientLevel: clamp(asNumber(lighting.ambientLevel, 0.12), 0, 2),
        keyLightIntensity: clamp(
          asNumber(lighting.keyLightIntensity, 18),
          0,
          60,
        ),
        bloomStrength: clamp(asNumber(lighting.bloomStrength, 0.72), 0, 3),
        bloomRadius: clamp(asNumber(lighting.bloomRadius, 0.62), 0, 1),
        bloomThreshold: clamp(asNumber(lighting.bloomThreshold, 0.18), 0, 1),
        exposure: clamp(asNumber(lighting.exposure, 1.05), 0.25, 2.5),
        fogDensity: clamp(asNumber(lighting.fogDensity, 0.014), 0, 0.08),
      },
    } satisfies VizRenderThreeProgramNode;
  },
};
