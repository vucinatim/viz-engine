import type {
  VizArtifactRef,
  VizAssetRef,
  VizNodeGraphDocument,
  VizProjectDocument,
} from '@viz-engine/contracts';
import { VIZ_PROJECT_SCHEMA_VERSION } from '@viz-engine/contracts';

export const SIGNAL_CATHEDRAL_AUDIO_ASSET_ID =
  'asset-signal-cathedral-progressive-house';
export const SIGNAL_CATHEDRAL_AUDIO_ARTIFACT_ID =
  'artifact-signal-cathedral-audio-standard';
export const SIGNAL_CATHEDRAL_GRAPH_ID = 'graph-signal-cathedral-reactivity';
export const SIGNAL_CATHEDRAL_LAYER_ID = 'layer-signal-cathedral';

const featureInput = (
  feature: string,
  artifactId: string,
): {
  kind: 'artifact-feature';
  artifactId: string;
  feature: string;
} => ({
  kind: 'artifact-feature',
  artifactId,
  feature,
});

const graphInputNode = (id: string, inputKey: string) => ({
  id,
  type: 'graph-input',
  inputs: {
    inputKey: {
      kind: 'literal' as const,
      value: inputKey,
    },
  },
});

const multiplyNode = (id: string, nodeId: string, factor: number) => ({
  id,
  type: 'multiply',
  inputs: {
    value: {
      kind: 'node-output' as const,
      nodeId,
      output: 'value',
    },
    factor: {
      kind: 'literal' as const,
      value: factor,
    },
  },
});

const clampNode = (id: string, nodeId: string) => ({
  id,
  type: 'clamp',
  inputs: {
    value: {
      kind: 'node-output' as const,
      nodeId,
      output: 'value',
    },
    min: {
      kind: 'literal' as const,
      value: 0,
    },
    max: {
      kind: 'literal' as const,
      value: 1,
    },
  },
});

export const createSignalCathedralReactivityGraph = (
  artifactId = SIGNAL_CATHEDRAL_AUDIO_ARTIFACT_ID,
): VizNodeGraphDocument => ({
  id: SIGNAL_CATHEDRAL_GRAPH_ID,
  name: 'Signal Cathedral Music Reactivity',
  inputs: {
    bass: featureInput('bass-energy', artifactId),
    mids: featureInput('mid-energy', artifactId),
    loudness: featureInput('loudness', artifactId),
    treble: featureInput('treble-energy', artifactId),
    onset: featureInput('onset-strength', artifactId),
    flux: featureInput('spectral-flux', artifactId),
  },
  nodes: [
    graphInputNode('input-bass', 'bass'),
    multiplyNode('scale-bass', 'input-bass', 1.24),
    clampNode('clamp-bass', 'scale-bass'),
    graphInputNode('input-mids', 'mids'),
    multiplyNode('scale-mids', 'input-mids', 0.72),
    graphInputNode('input-loudness', 'loudness'),
    multiplyNode('scale-loudness', 'input-loudness', 0.32),
    {
      id: 'combine-core',
      type: 'add',
      inputs: {
        a: {
          kind: 'node-output',
          nodeId: 'scale-mids',
          output: 'value',
        },
        b: {
          kind: 'node-output',
          nodeId: 'scale-loudness',
          output: 'value',
        },
      },
    },
    clampNode('clamp-core', 'combine-core'),
    graphInputNode('input-treble', 'treble'),
    multiplyNode('scale-treble', 'input-treble', 1.34),
    clampNode('clamp-treble', 'scale-treble'),
    graphInputNode('input-onset', 'onset'),
    multiplyNode('scale-onset', 'input-onset', 1.7),
    clampNode('clamp-onset', 'scale-onset'),
    graphInputNode('input-flux', 'flux'),
    multiplyNode('scale-flux', 'input-flux', 1.45),
    clampNode('clamp-flux', 'scale-flux'),
  ],
  outputs: [
    {
      key: 'structurePulse',
      nodeId: 'clamp-bass',
      output: 'value',
    },
    {
      key: 'coreEnergy',
      nodeId: 'clamp-core',
      output: 'value',
    },
    {
      key: 'spectralShimmer',
      nodeId: 'clamp-treble',
      output: 'value',
    },
    {
      key: 'shockwaveTrigger',
      nodeId: 'clamp-onset',
      output: 'value',
    },
    {
      key: 'bloomAccent',
      nodeId: 'clamp-flux',
      output: 'value',
    },
  ],
  metadata: {
    production: 'signal-cathedral',
    intent:
      'Readable feature-to-visual mapping for the first agent-authored production.',
  },
});

export const signalCathedralReactivityGraph =
  createSignalCathedralReactivityGraph();

export const signalCathedralAudioAssetRef: VizAssetRef = {
  id: SIGNAL_CATHEDRAL_AUDIO_ASSET_ID,
  kind: 'audio',
  source: 'generated',
  label: 'Signal Cathedral — Progressive House 48–60s',
  mimeType: 'audio/mpeg',
  originalFileName: 'signal-cathedral-progressive-house-48s-60s.mp3',
  metadata: {
    derivation: {
      sourcePath: 'public/music/[House] Progressive House.mp3',
      sourceStartSeconds: 48,
      durationSeconds: 12,
    },
  },
};

export const signalCathedralAudioArtifactRef: VizArtifactRef = {
  id: SIGNAL_CATHEDRAL_AUDIO_ARTIFACT_ID,
  kind: 'audio-feature-timeline',
  label: 'Signal Cathedral Standard Audio Features',
  sourceAssetId: SIGNAL_CATHEDRAL_AUDIO_ASSET_ID,
  metadata: {
    profile: 'standard',
    fps: 60,
    durationSeconds: 12,
  },
};

export const createSignalCathedralProject = ({
  audioAssetRef = signalCathedralAudioAssetRef,
  audioArtifactRef = signalCathedralAudioArtifactRef,
}: {
  audioAssetRef?: VizAssetRef;
  audioArtifactRef?: VizArtifactRef;
} = {}): VizProjectDocument => ({
  schemaVersion: VIZ_PROJECT_SCHEMA_VERSION,
  projectId: 'project-signal-cathedral',
  name: 'Signal Cathedral',
  timeline: {
    fps: 60,
    durationInFrames: 720,
  },
  viewport: {
    width: 1920,
    height: 1080,
    backgroundColor: '#02030d',
  },
  layerOrder: [SIGNAL_CATHEDRAL_LAYER_ID],
  layers: [
    {
      id: SIGNAL_CATHEDRAL_LAYER_ID,
      name: 'Signal Cathedral',
      componentId: 'signal-cathedral',
      enabled: true,
      opacity: 1,
      blendMode: 'normal',
      rendererFamily: 'three',
      settings: {
        palette: {
          background: '#02030d',
          primary: '#5cf5ff',
          secondary: '#8b5cff',
          accent: '#ff3fcf',
          fog: '#07051c',
        },
        structure: {
          archCount: 24,
          archSpacing: 4.2,
          naveWidth: 11,
          naveHeight: 7,
          segmentThickness: 0.16,
          floorExtent: 120,
          coreSize: 1.05,
          particleCount: 900,
        },
        motion: {
          travelSpeed: 4.8,
          cameraSway: 0.32,
          cameraLift: 0.16,
          structuralTwist: 0.055,
          particleDrift: 0.7,
          coreRotation: 0.65,
        },
        reactivity: {
          masterResponse: 1,
          bassResponse: 1,
          midResponse: 1,
          trebleResponse: 1,
          onsetResponse: 1,
          fluxResponse: 1,
          smoothing: 0.35,
          structurePulse: 0,
          coreEnergy: 0,
          spectralShimmer: 0,
          shockwaveTrigger: 0,
          bloomAccent: 0,
        },
        lighting: {
          ambientLevel: 0.12,
          keyLightIntensity: 18,
          bloomStrength: 0.72,
          bloomRadius: 0.62,
          bloomThreshold: 0.18,
          exposure: 1.05,
          fogDensity: 0.014,
        },
      },
      inputs: {
        'reactivity:structurePulse': {
          kind: 'graph-output',
          graphId: SIGNAL_CATHEDRAL_GRAPH_ID,
          output: 'structurePulse',
        },
        'reactivity:coreEnergy': {
          kind: 'graph-output',
          graphId: SIGNAL_CATHEDRAL_GRAPH_ID,
          output: 'coreEnergy',
        },
        'reactivity:spectralShimmer': {
          kind: 'graph-output',
          graphId: SIGNAL_CATHEDRAL_GRAPH_ID,
          output: 'spectralShimmer',
        },
        'reactivity:shockwaveTrigger': {
          kind: 'graph-output',
          graphId: SIGNAL_CATHEDRAL_GRAPH_ID,
          output: 'shockwaveTrigger',
        },
        'reactivity:bloomAccent': {
          kind: 'graph-output',
          graphId: SIGNAL_CATHEDRAL_GRAPH_ID,
          output: 'bloomAccent',
        },
      },
      requiredAssetIds: [audioAssetRef.id],
      requiredArtifactIds: [audioArtifactRef.id],
      renderPolicy: {
        supportedModes: ['live', 'render'],
        requiresBake: true,
        preferredRendererFamily: 'three',
      },
    },
  ],
  assetRefs: [audioAssetRef],
  artifactRefs: [audioArtifactRef],
  graphs: [createSignalCathedralReactivityGraph(audioArtifactRef.id)],
  metadata: {
    authoringMode: 'agent-authored-production',
    production: 'signal-cathedral',
    capabilityPacks: [
      {
        id: '@viz-engine/production-signal-cathedral',
        version: '0.0.1',
      },
      {
        id: '@viz-engine/components-core',
        version: '0.0.1',
      },
    ],
    selectedAudioWindow: {
      sourceStartSeconds: 48,
      durationSeconds: 12,
    },
  },
});
