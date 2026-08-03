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

const output = (nodeId: string): VizGraphNodeInputBinding => ({
  kind: 'node-output',
  nodeId,
  output: 'value',
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
  factor,
  offset,
  y,
}: {
  key: string;
  sourceId: string;
  factor: number;
  offset: number;
  y: number;
}): { nodes: VizNodeGraphNode[]; outputNodeId: string } => {
  const scaleId = `${key}-scale`;
  const addId = `${key}-offset`;
  return {
    outputNodeId: addId,
    nodes: [
      node(scaleId, 'multiply', 260, y, {
        value: output(sourceId),
        factor: literal(factor),
      }),
      node(addId, 'add', 520, y, {
        a: output(scaleId),
        b: literal(offset),
      }),
    ],
  };
};

export const createAfterlightAssemblyReactivityGraph = (
  artifactId = AFTERLIGHT_ASSEMBLY_AUDIO_ARTIFACT_ID,
): VizNodeGraphDocument => {
  const sources = [
    ['bass', 'bass-energy'],
    ['mids', 'mid-energy'],
    ['treble', 'treble-energy'],
    ['loudness', 'loudness'],
    ['onset', 'onset-strength'],
    ['flux', 'spectral-flux'],
  ] as const;
  const lanes = Object.fromEntries(
    sources.map(([key], index) => [key, createSourceLane(key, index)]),
  ) as Record<(typeof sources)[number][0], ReturnType<typeof createSourceLane>>;
  const targets = [
    ['wallScale', 'bass', 1.15, 1.5, -55],
    ['beamIntensity', 'bass', 1.4, 0.35, 0],
    ['characterSpeed', 'bass', 1.2, 0.72, 55],
    ['wallTravel', 'mids', 1.8, 0.5, 115],
    ['wallRotation', 'treble', 2.35, 0.25, 285],
    ['strobeRate', 'treble', 0.65, 0.03, 340],
    ['movingIntensity', 'loudness', 7, 2, 455],
    ['washIntensity', 'loudness', 10, 2, 510],
    ['wallBrightness', 'flux', 1.1, 1, 795],
    ['bloomStrength', 'flux', 0.5, 0.45, 850],
  ] as const;
  const targetLanes = targets.map(([key, source, factor, offset, deltaY]) => ({
    key,
    lane: createScaledOutput({
      key,
      sourceId: lanes[source].input.id,
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

  return {
    id: AFTERLIGHT_ASSEMBLY_GRAPH_ID,
    name: 'Afterlight Assembly Stage Reactivity',
    inputs: Object.fromEntries(
      sources.map(([key, feature]) => [key, graphInput(feature, artifactId)]),
    ),
    nodes: [
      ...sources.map(([key]) => lanes[key].input),
      ...targetLanes.flatMap(({ lane }) => lane.nodes),
      onsetScale,
      onsetClamp,
      onsetDecay,
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
        key: 'blinderIntensity',
        nodeId: onsetDecay.id,
        output: 'value',
        position: { x: 1_300, y: lanes.onset.y },
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
        'Readable music-feature lanes controlling stage light, motion, camera atmosphere, and character energy.',
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
    cinematicDuration: 12,
    cinematicLookAt: { x: 0, y: 6, z: 0 },
    cinematicLerpSpeed: 0.12,
  },
  shaderWall: {
    ...(defaults.shaderWall as Record<string, unknown>),
    enabled: true,
    scale: 1.5,
    rotationSpeed: 0.25,
    colorSpeed: 2.4,
    travelSpeed: 0.5,
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
    speed: 1.35,
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
    intensity: 300,
    flashRate: 0.2,
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
    animationSpeed: 0.72,
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
        'shaderWall:rotationSpeed': graphOutput('wallRotation'),
        'shaderWall:travelSpeed': graphOutput('wallTravel'),
        'shaderWall:brightness': graphOutput('wallBrightness'),
        'beams:intensity': graphOutput('beamIntensity'),
        'movingLights:intensity': graphOutput('movingIntensity'),
        'stageWash:intensity': graphOutput('washIntensity'),
        'strobes:flashRate': graphOutput('strobeRate'),
        'blinders:intensity': graphOutput('blinderIntensity'),
        'overheadBlinder:intensity': graphOutput('overheadIntensity'),
        'postProcessing:bloomStrength': graphOutput('bloomStrength'),
        'characters:animationSpeed': graphOutput('characterSpeed'),
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
