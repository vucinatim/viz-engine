import type {
  VizAudioFeatureTimelineArtifact,
  VizNodeGraphDocument,
  VizProjectDocument,
  VizResolvedArtifact,
  VizResolvedAsset,
} from "@viz-engine/contracts";
import { VIZ_PROJECT_SCHEMA_VERSION } from "@viz-engine/contracts";

const createFeatureSeries = (
  length: number,
  generator: (index: number) => number,
): number[] => {
  return Array.from({ length }, (_, index) => Number(generator(index).toFixed(4)));
};

const frameCount = 180;

const exampleCoverSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 720">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0c2030" />
      <stop offset="60%" stop-color="#152d43" />
      <stop offset="100%" stop-color="#1e6f9e" />
    </linearGradient>
    <radialGradient id="pulse" cx="50%" cy="42%" r="56%">
      <stop offset="0%" stop-color="#8ff8ff" stop-opacity="0.92" />
      <stop offset="38%" stop-color="#3bd4ff" stop-opacity="0.54" />
      <stop offset="100%" stop-color="#07111b" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="720" height="720" fill="url(#bg)" />
  <circle cx="360" cy="260" r="220" fill="url(#pulse)" />
  <path d="M100 520C180 430 260 400 340 430C420 460 470 560 560 560C610 560 650 540 690 500V720H0V590C30 580 60 560 100 520Z" fill="#08121d" fill-opacity="0.84" />
  <circle cx="205" cy="190" r="42" fill="#9ef8ff" fill-opacity="0.28" />
  <circle cx="515" cy="168" r="28" fill="#9ef8ff" fill-opacity="0.2" />
  <text x="86" y="600" fill="#eafcff" font-size="64" font-family="Arial, sans-serif" font-weight="700">VIZ SIGNAL</text>
  <text x="90" y="654" fill="#9fd9ea" font-size="24" font-family="Arial, sans-serif" letter-spacing="6">MEDIA PROOF</text>
</svg>
`.trim();

const exampleCoverDataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(exampleCoverSvg)}`;
const exampleAudioPlaceholderBytes = new TextEncoder().encode("viz-engine-audio-placeholder").buffer;

export const exampleAudioTimelineArtifact: VizAudioFeatureTimelineArtifact = {
  schemaVersion: 1,
  id: "artifact-audio-standard-main",
  kind: "audio-feature-timeline",
  label: "Main Song Standard Features",
  sourceAssetId: "asset-audio-main",
  profile: "standard",
  sourceWindow: {
    startSample: 0,
    sampleCount: frameCount * 1470,
    startSeconds: 0,
    durationSeconds: frameCount / 30,
  },
  frameAlignment: {
    fps: 30,
    frameCount,
    alignment: "frame-centered",
  },
  featureSeries: [
    {
      name: "bass-energy",
      unit: "unit",
      normalization: "custom",
      values: createFeatureSeries(frameCount, (index) => 0.3 + Math.abs(Math.sin(index / 9)) * 0.7),
    },
    {
      name: "loudness",
      unit: "unit",
      normalization: "custom",
      values: createFeatureSeries(frameCount, (index) => 0.2 + Math.abs(Math.sin(index / 16)) * 0.6),
    },
    {
      name: "spectral-flux",
      unit: "unit",
      normalization: "custom",
      values: createFeatureSeries(frameCount, (index) => 0.15 + Math.abs(Math.cos(index / 11)) * 0.5),
    },
  ],
};

export const exampleMainReactivityGraph: VizNodeGraphDocument = {
  id: "graph-main-reactivity",
  name: "Main Reactivity Graph",
  inputs: {
    bassSource: {
      kind: "artifact-feature",
      artifactId: exampleAudioTimelineArtifact.id,
      feature: "bass-energy",
    },
    loudnessSource: {
      kind: "artifact-feature",
      artifactId: exampleAudioTimelineArtifact.id,
      feature: "loudness",
    },
    fluxSource: {
      kind: "artifact-feature",
      artifactId: exampleAudioTimelineArtifact.id,
      feature: "spectral-flux",
    },
  },
  nodes: [
    {
      id: "node-bass-input",
      type: "graph-input",
      inputs: {
        inputKey: {
          kind: "literal",
          value: "bassSource",
        },
      },
    },
    {
      id: "node-loudness-input",
      type: "graph-input",
      inputs: {
        inputKey: {
          kind: "literal",
          value: "loudnessSource",
        },
      },
    },
    {
      id: "node-flux-input",
      type: "graph-input",
      inputs: {
        inputKey: {
          kind: "literal",
          value: "fluxSource",
        },
      },
    },
    {
      id: "node-bars-bass-scale",
      type: "multiply",
      inputs: {
        value: {
          kind: "node-output",
          nodeId: "node-bass-input",
          output: "value",
        },
        factor: {
          kind: "literal",
          value: 0.92,
        },
      },
    },
    {
      id: "node-bars-loudness-bias",
      type: "add",
      inputs: {
        a: {
          kind: "node-output",
          nodeId: "node-loudness-input",
          output: "value",
        },
        b: {
          kind: "literal",
          value: 0.08,
        },
      },
    },
    {
      id: "node-bars-loudness-clamp",
      type: "clamp",
      inputs: {
        value: {
          kind: "node-output",
          nodeId: "node-bars-loudness-bias",
          output: "value",
        },
        min: {
          kind: "literal",
          value: 0,
        },
        max: {
          kind: "literal",
          value: 1,
        },
      },
    },
    {
      id: "node-flux-bloom-scale",
      type: "multiply",
      inputs: {
        value: {
          kind: "node-output",
          nodeId: "node-flux-input",
          output: "value",
        },
        factor: {
          kind: "literal",
          value: 1.15,
        },
      },
    },
    {
      id: "node-flux-bloom-clamp",
      type: "clamp",
      inputs: {
        value: {
          kind: "node-output",
          nodeId: "node-flux-bloom-scale",
          output: "value",
        },
        min: {
          kind: "literal",
          value: 0,
        },
        max: {
          kind: "literal",
          value: 1,
        },
      },
    },
    {
      id: "node-flux-bloom-decay",
      type: "decay",
      inputs: {
        value: {
          kind: "node-output",
          nodeId: "node-flux-bloom-clamp",
          output: "value",
        },
        falloffPerSecond: {
          kind: "literal",
          value: 1.35,
        },
      },
    },
  ],
  outputs: [
    {
      key: "barsBass",
      nodeId: "node-bars-bass-scale",
      output: "value",
    },
    {
      key: "barsLoudness",
      nodeId: "node-bars-loudness-clamp",
      output: "value",
    },
    {
      key: "bloomIntensity",
      nodeId: "node-flux-bloom-decay",
      output: "value",
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
  layerOrder: ["layer-background", "layer-cover", "layer-bars", "layer-bloom"],
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
      id: "layer-cover",
      name: "Cover Art",
      componentId: "cover-image",
      enabled: true,
      opacity: 0.94,
      blendMode: "normal",
      rendererFamily: "three",
      settings: {
        x: 116,
        y: 102,
        width: 408,
        height: 408,
      },
      inputs: {
        image: {
          kind: "asset-ref",
          assetId: "asset-image-cover",
        },
      },
      requiredAssetIds: ["asset-image-cover"],
      renderPolicy: {
        supportedModes: ["live", "render"],
        preferredRendererFamily: "three",
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
          kind: "graph-output",
          graphId: exampleMainReactivityGraph.id,
          output: "barsBass",
        },
        loudness: {
          kind: "graph-output",
          graphId: exampleMainReactivityGraph.id,
          output: "barsLoudness",
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
          kind: "graph-output",
          graphId: exampleMainReactivityGraph.id,
          output: "bloomIntensity",
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
    {
      id: "asset-image-cover",
      kind: "image",
      source: "generated",
      label: "Example Cover",
      mimeType: "image/svg+xml",
      originalFileName: "example-cover.svg",
      metadata: {
        width: 720,
        height: 720,
      },
    },
  ],
  artifactRefs: [exampleAudioTimelineArtifact],
  graphs: [exampleMainReactivityGraph],
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

export const exampleResolvedAssets: VizResolvedAsset[] = [
  {
    id: "asset-audio-main",
    kind: "audio",
    source: "local",
    uri: "memory://assets/main-song.mp3",
    mimeType: "audio/mpeg",
    bytes: exampleAudioPlaceholderBytes,
  },
  {
    id: "asset-image-cover",
    kind: "image",
    source: "generated",
    uri: exampleCoverDataUri,
    mimeType: "image/svg+xml",
    metadata: {
      width: 720,
      height: 720,
    },
  },
];
