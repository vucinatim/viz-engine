import {
  createCoreComponentRegistry,
  createVizSettingDefaults,
  STAGE_MODEL_ASSET_DEFINITIONS,
} from '@viz-engine/components-core';
import {
  VIZ_PROJECT_SCHEMA_VERSION,
  type VizBlendMode,
  type VizComponentGroupSetting,
  type VizProjectDocument,
} from '@viz-engine/contracts';
import {
  createHumanSignalAudioRecipe,
  createHumanSignalModelAssets,
} from './assets.js';
import { createHumanSignalDirection } from './direction.js';
import {
  humanSignalProductionIdentity,
  humanSignalProvenance,
} from './identity.js';

// Apply authored overrides through the canonical schema's group structure;
// vectors/lists remain values rather than being recursively merged as groups.
const applySettings = (
  schema: VizComponentGroupSetting,
  base: Record<string, unknown>,
  overrides: Record<string, unknown>,
): Record<string, unknown> => {
  const result = structuredClone(base);
  for (const [key, value] of Object.entries(overrides)) {
    const field = schema.fields[key];
    if (!field)
      throw new Error(
        `Human Signal setting is absent from component schema: ${key}`,
      );
    result[key] =
      field.kind === 'group'
        ? applySettings(
            field,
            result[key] as Record<string, unknown>,
            value as Record<string, unknown>,
          )
        : structuredClone(value);
  }
  return result;
};

export const createHumanSignalProductionMetadata = () => ({
  ...humanSignalProductionIdentity,
  provenance: structuredClone(humanSignalProvenance),
  realization: {
    status: 'ownership-foundation',
    composition: 'static-initial-layer-selection',
    audio: 'source-provenance-outside-project-assets',
    implementedGraphs: 0,
    remaining: [
      'exact-audio-derivative-and-bake',
      'component-reactivity-graphs',
      'portable-macro-direction',
      'graph-driven-compositor',
      'full-window-skeleton-validation',
    ],
  },
  direction: createHumanSignalDirection(),
  audioRecipe: createHumanSignalAudioRecipe(),
  renderSettings: {
    width: 1920,
    height: 1080,
    fps: 60,
    format: 'mp4',
    videoCodec: 'h264',
    audioCodec: 'aac',
    quality: 'high',
    qualityMapping:
      'Treatment quality 2 maps to the current highest named quality, high; visual and performance qualification remain pending.',
  },
});

/** Canonical authored foundation; no local timeline/cue evaluator lives here. */
export const createHumanSignalProject = (): VizProjectDocument => {
  const direction = createHumanSignalDirection();
  const registry = createCoreComponentRegistry();
  return {
    schemaVersion: VIZ_PROJECT_SCHEMA_VERSION,
    projectId: 'project-human-signal',
    name: 'Human Signal',
    timeline: {
      fps: direction.music.timelineFps,
      durationInFrames: direction.music.local.frameEndExclusive,
    },
    viewport: { width: 1920, height: 1080, backgroundColor: '#05060B' },
    layerOrder: direction.layers.map((layer) => layer.id),
    layers: direction.layers.map((layer) => {
      const component = registry.get(layer.componentId);
      const authoring = component?.authoring;
      if (!authoring)
        throw new Error(
          `Missing Human Signal component authoring: ${layer.componentId}`,
        );
      let settings = createVizSettingDefaults(authoring.settings);
      if (layer.authoringPresetId) {
        const preset = authoring.presets?.find(
          (candidate) => candidate.id === layer.authoringPresetId,
        );
        if (!preset)
          throw new Error(
            `Missing Human Signal preset: ${layer.authoringPresetId}`,
          );
        settings = applySettings(authoring.settings, settings, preset.values);
      }
      settings = applySettings(
        authoring.settings,
        settings,
        layer.baselineSettings,
      );
      const isStage = layer.componentId === 'stage-scene';
      return {
        id: layer.id,
        name: layer.role,
        componentId: layer.componentId,
        enabled: layer.activeRanges.some(
          (range) => range.localFrameStart === 0,
        ),
        opacity: layer.compositor.baselineOpacity,
        blendMode: layer.compositor.blendMode as VizBlendMode,
        transform: { ...layer.compositor.transform },
        settings,
        ...(isStage
          ? {
              inputs: Object.fromEntries(
                STAGE_MODEL_ASSET_DEFINITIONS.map((definition) => [
                  definition.inputKey,
                  { kind: 'asset-ref' as const, assetId: definition.asset.id },
                ]),
              ),
              requiredAssetIds: STAGE_MODEL_ASSET_DEFINITIONS.map(
                (definition) => definition.asset.id,
              ),
            }
          : {}),
      };
    }),
    assetRefs: createHumanSignalModelAssets(),
    artifactRefs: [],
    graphs: [],
    metadata: createHumanSignalProductionMetadata(),
  };
};
