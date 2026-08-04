import {
  STAGE_MODEL_ASSET_DEFINITIONS,
  createVizSettingDefaults,
  stageSceneAuthoring,
} from '@viz-engine/components-core';
import {
  VIZ_PROJECT_SCHEMA_VERSION,
  type VizArtifactRef,
  type VizAssetRef,
  type VizGraphNodeInputBinding,
  type VizNodeGraphDocument,
  type VizNodeGraphNode,
  type VizProjectDocument,
} from '@viz-engine/contracts';

export const AFTERLIGHT_ASSEMBLY_AUDIO_ASSET_ID =
  'asset-afterlight-dancefloor-dnb';
export const AFTERLIGHT_ASSEMBLY_AUDIO_ARTIFACT_ID =
  'artifact-afterlight-audio-standard';
export const AFTERLIGHT_ASSEMBLY_GRAPH_ID = 'graph-afterlight-stage-reactivity';
export const AFTERLIGHT_ASSEMBLY_LAYER_ID = 'layer-afterlight-stage';

const literal = (value: unknown): VizGraphNodeInputBinding => ({
  kind: 'literal',
  value,
});

const output = (
  nodeId: string,
  outputKey = 'value',
): VizGraphNodeInputBinding => ({
  kind: 'node-output',
  nodeId,
  output: outputKey,
});

const node = (
  id: string,
  type: string,
  x: number,
  y: number,
  inputs: Record<string, VizGraphNodeInputBinding>,
): VizNodeGraphNode => ({ id, type, position: { x, y }, inputs });

const graphInput = (feature: string, artifactId: string) => ({
  kind: 'artifact-feature' as const,
  artifactId,
  feature,
});

const createSourceLane = (
  key: string,
  row: number,
): { input: VizNodeGraphNode; y: number } => {
  const y = row * 170;
  return {
    y,
    input: node(`input-${key}`, 'graph-input', 0, y, {
      inputKey: literal(key),
    }),
  };
};

const createScaledOutput = ({
  key,
  sourceId,
  sourceOutput,
  factor,
  offset,
  y,
}: {
  key: string;
  sourceId: string;
  sourceOutput?: string;
  factor: number;
  offset: number;
  y: number;
}): { nodes: VizNodeGraphNode[]; outputNodeId: string } => {
  const scaleId = `${key}-scale`;
  const addId = `${key}-offset`;
  return {
    outputNodeId: addId,
    nodes: [
      node(scaleId, 'multiply', 520, y, {
        value: output(sourceId, sourceOutput),
        factor: literal(factor),
      }),
      node(addId, 'add', 780, y, {
        a: output(scaleId),
        b: literal(offset),
      }),
    ],
  };
};

const createEnvelope = ({
  key,
  sourceId,
  attackMs,
  releaseMs,
  y,
}: {
  key: string;
  sourceId: string;
  attackMs: number;
  releaseMs: number;
  y: number;
}): VizNodeGraphNode =>
  node(`${key}-envelope`, 'Envelope Follower', 260, y, {
    value: output(sourceId),
    attackMs: literal(attackMs),
    releaseMs: literal(releaseMs),
  });

export const createAfterlightAssemblyReactivityGraph = (
  artifactId = AFTERLIGHT_ASSEMBLY_AUDIO_ARTIFACT_ID,
): VizNodeGraphDocument => {
  const sources = [
    ['bass', 'bass-energy'],
    ['treble', 'treble-energy'],
    ['loudness', 'loudness'],
    ['onset', 'onset-strength'],
    ['flux', 'spectral-flux'],
  ] as const;
  const lanes = Object.fromEntries(
    sources.map(([key], index) => [key, createSourceLane(key, index)]),
  ) as Record<(typeof sources)[number][0], ReturnType<typeof createSourceLane>>;
  const envelopes = {
    bass: createEnvelope({
      key: 'bass',
      sourceId: lanes.bass.input.id,
      attackMs: 45,
      releaseMs: 240,
      y: lanes.bass.y,
    }),
    treble: createEnvelope({
      key: 'treble',
      sourceId: lanes.treble.input.id,
      attackMs: 30,
      releaseMs: 180,
      y: lanes.treble.y,
    }),
    loudness: createEnvelope({
      key: 'loudness',
      sourceId: lanes.loudness.input.id,
      attackMs: 80,
      releaseMs: 360,
      y: lanes.loudness.y,
    }),
    flux: createEnvelope({
      key: 'flux',
      sourceId: lanes.flux.input.id,
      attackMs: 35,
      releaseMs: 260,
      y: lanes.flux.y,
    }),
  } as const;
  const targets = [
    ['wallScale', 'bass', 0.7, 1.45, 0],
    ['beamIntensity', 'treble', 0.8, 0.28, 0],
    ['movingIntensity', 'loudness', 4, 1, -25],
    ['washIntensity', 'loudness', 6, 1, 30],
    ['wallBrightness', 'flux', 0.75, 1.1, -30],
    ['bloomStrength', 'flux', 0.3, 0.35, 25],
  ] as const;
  const targetLanes = targets.map(([key, source, factor, offset, deltaY]) => ({
    key,
    lane: createScaledOutput({
      key,
      sourceId: envelopes[source].id,
      sourceOutput: 'env',
      factor,
      offset,
      y: lanes[source].y + deltaY,
    }),
  }));
  const onsetScale = node('onset-scale', 'multiply', 260, lanes.onset.y, {
    value: output(lanes.onset.input.id),
    factor: literal(0.75),
  });
  const onsetClamp = node('onset-clamp', 'clamp', 520, lanes.onset.y, {
    value: output(onsetScale.id),
    min: literal(0),
    max: literal(1),
  });
  const onsetDecay = node('onset-decay', 'decay', 780, lanes.onset.y, {
    value: output(onsetClamp.id),
    falloffPerSecond: literal(2.8),
  });
  const overheadScale = node(
    'overhead-intensity-scale',
    'multiply',
    1_040,
    lanes.onset.y + 50,
    {
      value: output(onsetDecay.id),
      factor: literal(45),
    },
  );
  const strobeScale = node(
    'strobe-intensity-scale',
    'multiply',
    1_040,
    lanes.onset.y - 50,
    {
      value: output(onsetDecay.id),
      factor: literal(180),
    },
  );

  return {
    id: AFTERLIGHT_ASSEMBLY_GRAPH_ID,
    name: 'Afterlight Assembly Stage Reactivity',
    inputs: Object.fromEntries(
      sources.map(([key, feature]) => [key, graphInput(feature, artifactId)]),
    ),
    nodes: [
      ...sources.map(([key]) => lanes[key].input),
      ...Object.values(envelopes),
      ...targetLanes.flatMap(({ lane }) => lane.nodes),
      onsetScale,
      onsetClamp,
      onsetDecay,
      strobeScale,
      overheadScale,
    ],
    outputs: [
      ...targetLanes.map(({ key, lane }, index) => ({
        key,
        nodeId: lane.outputNodeId,
        output: 'value',
        position: {
          x: 1_050,
          y: targets[index]![4] + lanes[targets[index]![1]].y,
        },
      })),
      {
        key: 'strobeIntensity',
        nodeId: strobeScale.id,
        output: 'value',
        position: { x: 1_300, y: lanes.onset.y - 50 },
      },
      {
        key: 'overheadIntensity',
        nodeId: overheadScale.id,
        output: 'value',
        position: { x: 1_300, y: lanes.onset.y + 50 },
      },
    ],
    metadata: {
      production: 'afterlight-assembly',
      intent:
        'Smoothed music-feature envelopes control visual amplitudes while authored rates preserve continuous motion phase.',
    },
  };
};

export const afterlightAssemblyAudioAssetRef: VizAssetRef = {
  id: AFTERLIGHT_ASSEMBLY_AUDIO_ASSET_ID,
  kind: 'audio',
  source: 'generated',
  label: 'Afterlight Assembly — Dancefloor DnB 60–72s',
  mimeType: 'audio/mpeg',
  originalFileName: 'afterlight-dancefloor-dnb-60s-72s.mp3',
  metadata: {
    derivation: {
      sourcePath: 'public/music/[DnB] Dancefloor DnB.mp3',
      sourceStartSeconds: 60,
      durationSeconds: 12,
    },
  },
};

export const afterlightAssemblyAudioArtifactRef: VizArtifactRef = {
  id: AFTERLIGHT_ASSEMBLY_AUDIO_ARTIFACT_ID,
  kind: 'audio-feature-timeline',
  label: 'Afterlight Assembly Standard Audio Features',
  sourceAssetId: AFTERLIGHT_ASSEMBLY_AUDIO_ASSET_ID,
  metadata: { profile: 'standard', fps: 60, durationSeconds: 12 },
};

const defaults = createVizSettingDefaults(stageSceneAuthoring.settings);

export const afterlightAssemblyStageSettings = {
  ...defaults,
  camera: {
    ...(defaults.camera as Record<string, unknown>),
    cinematicMode: true,
    cinematicPath: 'Crowd Flyover',
    cinematicDuration: 32,
    cinematicLookAt: { x: 0, y: 6, z: 0 },
    cinematicLerpSpeed: 0.08,
  },
  shaderWall: {
    ...(defaults.shaderWall as Record<string, unknown>),
    enabled: true,
    scale: 1.5,
    rotationSpeed: 0.18,
    colorSpeed: 0.65,
    travelSpeed: 0.28,
    brightness: 1.35,
  },
  lighting: {
    ...(defaults.lighting as Record<string, unknown>),
    hemisphereIntensity: 0.85,
    ambientIntensity: 0.28,
  },
  postProcessing: {
    ...(defaults.postProcessing as Record<string, unknown>),
    bloom: true,
    bloomStrength: 0.45,
    bloomRadius: 0.72,
    bloomThreshold: 0.28,
  },
  lasers: {
    ...(defaults.lasers as Record<string, unknown>),
    enabled: true,
    colorMode: 'single',
    singleColor: '#ff315f',
    maxConcurrentLasers: 10,
  },
  movingLights: {
    ...(defaults.movingLights as Record<string, unknown>),
    enabled: true,
    colorMode: 'single',
    singleColor: '#7b61ff',
    speed: 0.68,
  },
  beams: {
    ...(defaults.beams as Record<string, unknown>),
    enabled: true,
    colorMode: 'single',
    singleColor: '#33e6ff',
  },
  stageLights: {
    ...(defaults.stageLights as Record<string, unknown>),
    enabled: true,
    color: '#ff315f',
  },
  strobes: {
    ...(defaults.strobes as Record<string, unknown>),
    enabled: true,
    intensity: 0,
    flashRate: 0.09,
  },
  blinders: {
    ...(defaults.blinders as Record<string, unknown>),
    enabled: false,
    mode: 'controlled',
    intensity: 0,
  },
  accentLights: {
    ...(defaults.accentLights as Record<string, unknown>),
    enabled: true,
    light1Color: '#ff315f',
    light2Color: '#33e6ff',
    djSpotIntensity: 1.4,
  },
  characters: {
    ...(defaults.characters as Record<string, unknown>),
    showDj: true,
    animationSpeed: 0.78,
    crowdCount: 420,
  },
};

const graphOutput = (outputKey: string) => ({
  kind: 'graph-output' as const,
  graphId: AFTERLIGHT_ASSEMBLY_GRAPH_ID,
  output: outputKey,
});

export const createAfterlightAssemblyProject = ({
  audioAssetRef = afterlightAssemblyAudioAssetRef,
  audioArtifactRef = afterlightAssemblyAudioArtifactRef,
}: {
  audioAssetRef?: VizAssetRef;
  audioArtifactRef?: VizArtifactRef;
} = {}): VizProjectDocument => ({
  schemaVersion: VIZ_PROJECT_SCHEMA_VERSION,
  projectId: 'project-afterlight-assembly',
  name: 'Afterlight Assembly',
  timeline: { fps: 60, durationInFrames: 720 },
  viewport: {
    width: 1920,
    height: 1080,
    backgroundColor: '#030108',
  },
  layerOrder: [AFTERLIGHT_ASSEMBLY_LAYER_ID],
  layers: [
    {
      id: AFTERLIGHT_ASSEMBLY_LAYER_ID,
      name: 'Afterlight Festival Stage',
      componentId: 'stage-scene',
      enabled: true,
      opacity: 1,
      blendMode: 'normal',
      rendererFamily: 'three',
      settings: structuredClone(afterlightAssemblyStageSettings),
      inputs: {
        ...Object.fromEntries(
          STAGE_MODEL_ASSET_DEFINITIONS.map((definition) => [
            definition.inputKey,
            { kind: 'asset-ref' as const, assetId: definition.asset.id },
          ]),
        ),
        'shaderWall:scale': graphOutput('wallScale'),
        'shaderWall:brightness': graphOutput('wallBrightness'),
        'beams:intensity': graphOutput('beamIntensity'),
        'movingLights:intensity': graphOutput('movingIntensity'),
        'stageWash:intensity': graphOutput('washIntensity'),
        'strobes:intensity': graphOutput('strobeIntensity'),
        'overheadBlinder:intensity': graphOutput('overheadIntensity'),
        'postProcessing:bloomStrength': graphOutput('bloomStrength'),
      },
      requiredAssetIds: [
        audioAssetRef.id,
        ...STAGE_MODEL_ASSET_DEFINITIONS.map(
          (definition) => definition.asset.id,
        ),
      ],
      requiredArtifactIds: [audioArtifactRef.id],
      renderPolicy: {
        supportedModes: ['live', 'render'],
        requiresBake: true,
        preferredRendererFamily: 'three',
      },
    },
  ],
  assetRefs: [
    audioAssetRef,
    ...STAGE_MODEL_ASSET_DEFINITIONS.map((definition) => definition.asset),
  ],
  artifactRefs: [audioArtifactRef],
  graphs: [createAfterlightAssemblyReactivityGraph(audioArtifactRef.id)],
  metadata: {
    authoringMode: 'agent-authored-production',
    production: 'afterlight-assembly',
    creativeDirection:
      'A crowd-level cinematic festival performance moving from sustained energy through a breakdown into a color-saturated drop.',
    capabilityPacks: [
      { id: '@viz-engine/components-core', version: '0.0.1' },
      {
        id: '@viz-engine/production-afterlight-assembly',
        version: '0.0.1',
      },
    ],
    selectedAudioWindow: { sourceStartSeconds: 60, durationSeconds: 12 },
  },
});
