import type {
  VizAudioFeatureTimelineArtifact,
  VizComponentDefinition,
  VizProjectDocument,
  VizResolvedArtifact,
} from "@viz-engine/contracts";
import { VIZ_PROJECT_SCHEMA_VERSION } from "@viz-engine/contracts";

const createFeatureSeries = (
  length: number,
  generator: (index: number) => number,
): number[] => {
  return Array.from({ length }, (_, index) => Number(generator(index).toFixed(4)));
};

const frameCount = 180;

export const exampleAudioTimelineArtifact: VizAudioFeatureTimelineArtifact = {
  id: "artifact-audio-standard-main",
  kind: "audio-feature-timeline",
  label: "Main Song Standard Features",
  sourceAssetId: "asset-audio-main",
  profile: "standard",
  fps: 30,
  frameCount,
  featureSeries: [
    {
      name: "bass-energy",
      sampleRate: 30,
      values: createFeatureSeries(frameCount, (index) => 0.3 + Math.abs(Math.sin(index / 9)) * 0.7),
    },
    {
      name: "loudness",
      sampleRate: 30,
      values: createFeatureSeries(frameCount, (index) => 0.2 + Math.abs(Math.sin(index / 16)) * 0.6),
    },
    {
      name: "spectral-flux",
      sampleRate: 30,
      values: createFeatureSeries(frameCount, (index) => 0.15 + Math.abs(Math.cos(index / 11)) * 0.5),
    },
  ],
};

export const exampleProjectDocument: VizProjectDocument = {
  schemaVersion: VIZ_PROJECT_SCHEMA_VERSION,
  projectId: "project-example-reactive-bars",
  name: "Example Reactive Bars",
  timeline: {
    fps: 30,
    durationInFrames: frameCount,
  },
  viewport: {
    width: 1280,
    height: 720,
    backgroundColor: "#06131d",
  },
  layerOrder: ["layer-background", "layer-bars", "layer-bloom"],
  layers: [
    {
      id: "layer-background",
      name: "Background Fill",
      componentId: "solid-color",
      enabled: true,
      opacity: 1,
      blendMode: "normal",
      rendererFamily: "three",
      settings: {
        color: "#06131d",
      },
      inputs: {
        glow: {
          kind: "literal",
          value: 0.18,
        },
      },
    },
    {
      id: "layer-bars",
      name: "Reactive Bars",
      componentId: "reactive-bars",
      enabled: true,
      opacity: 1,
      blendMode: "screen",
      rendererFamily: "three",
      settings: {
        accentColor: "#88f3ff",
        barCount: 32,
      },
      inputs: {
        bass: {
          kind: "artifact-feature",
          artifactId: exampleAudioTimelineArtifact.id,
          feature: "bass-energy",
        },
        loudness: {
          kind: "artifact-feature",
          artifactId: exampleAudioTimelineArtifact.id,
          feature: "loudness",
        },
      },
      requiredAssetIds: ["asset-audio-main"],
      requiredArtifactIds: [exampleAudioTimelineArtifact.id],
      renderPolicy: {
        supportedModes: ["live", "render"],
        preferredRendererFamily: "three",
      },
    },
    {
      id: "layer-bloom",
      name: "Flux Bloom",
      componentId: "radial-bloom",
      enabled: true,
      opacity: 0.65,
      blendMode: "add",
      rendererFamily: "three",
      settings: {
        color: "#3bd4ff",
      },
      inputs: {
        intensity: {
          kind: "artifact-feature",
          artifactId: exampleAudioTimelineArtifact.id,
          feature: "spectral-flux",
        },
      },
      requiredArtifactIds: [exampleAudioTimelineArtifact.id],
    },
  ],
  assetRefs: [
    {
      id: "asset-audio-main",
      kind: "audio",
      source: "local",
      label: "Main Song",
      mimeType: "audio/mpeg",
      originalFileName: "main-song.mp3",
    },
  ],
  artifactRefs: [exampleAudioTimelineArtifact],
  graphs: [],
  metadata: {
    authoringMode: "example",
  },
};

export const exampleResolvedArtifacts: VizResolvedArtifact[] = [
  {
    id: exampleAudioTimelineArtifact.id,
    kind: exampleAudioTimelineArtifact.kind,
    uri: "memory://artifacts/audio-standard-main.json",
    payload: exampleAudioTimelineArtifact,
    metadata: {
      profile: exampleAudioTimelineArtifact.profile,
    },
  },
];

export const exampleComponents: VizComponentDefinition[] = [
  {
    id: "solid-color",
    name: "Solid Color",
    rendererFamily: "three",
    description: "Simple background fill layer.",
    inputs: [
      {
        key: "glow",
        label: "Glow",
        supportedSources: ["literal"],
      },
    ],
  },
  {
    id: "reactive-bars",
    name: "Reactive Bars",
    rendererFamily: "three",
    description: "Bars driven by precomputed music features.",
    inputs: [
      {
        key: "bass",
        label: "Bass Energy",
        supportedSources: ["artifact-feature"],
        required: true,
      },
      {
        key: "loudness",
        label: "Loudness",
        supportedSources: ["artifact-feature"],
        required: true,
      },
    ],
  },
  {
    id: "radial-bloom",
    name: "Radial Bloom",
    rendererFamily: "three",
    description: "Accent bloom driven by spectral flux.",
    inputs: [
      {
        key: "intensity",
        label: "Intensity",
        supportedSources: ["artifact-feature"],
        required: true,
      },
    ],
  },
];
