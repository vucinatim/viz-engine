import { openVizBrowserRenderSession } from '@/lib/utils/browser-render-session';
import {
  studioComponentRegistry,
  studioNodeRegistry,
  studioThreeProgramRegistry,
} from '@/lib/viz-capabilities';
import { executeVizAudioFeatureBake } from '@viz-engine/bake';
import { VIZ_PROJECT_SCHEMA_VERSION } from '@viz-engine/contracts';
import { sampleProjectAudioFrameSnapshot } from '@viz-engine/runtime';
import { expect, it, vi } from 'vitest';

it.each([
  'missing',
  'analysis-removed',
  'frames-removed',
  'null-frames',
  'invalid-bytes',
  'wrong-source',
] as const)(
  'rejects %s declared audio without loading/rebaking browser audio, and restores exact sampling',
  async (corruption) => {
    const bake = executeVizAudioFeatureBake(
      {
        kind: 'audio-feature-timeline',
        sourceAssetId: 'audio',
        sourceContentIdentity: 'fixture',
        profile: 'standard',
        fps: 60,
        fftSize: 256,
      },
      { sampleRate: 8000, channels: [new Float32Array(800)] },
    );
    if (!bake.ok) throw new Error('Fixture bake failed.');
    const project = {
      schemaVersion: VIZ_PROJECT_SCHEMA_VERSION,
      projectId: 'baked-dependency',
      name: 'Baked Dependency',
      timeline: { fps: 60, durationInFrames: 6 },
      viewport: { width: 64, height: 48 },
      layerOrder: [],
      layers: [],
      artifactRefs: [bake.artifact],
    };
    const payload = structuredClone(bake.artifact);
    if (corruption === 'analysis-removed') delete payload.analysis;
    if (corruption === 'frames-removed') delete payload.packedFrames;
    if (corruption === 'null-frames')
      Object.assign(payload, { packedFrames: null });
    if (corruption === 'invalid-bytes')
      payload.packedFrames!.frequency.data = 'AA==';
    if (corruption === 'wrong-source')
      payload.sourceAssetId = 'different-source';
    const resolvedArtifacts =
      corruption === 'missing' ? [] : [{ ...bake.resolvedArtifact, payload }];
    const load = vi.fn(async () => undefined);
    await expect(
      openVizBrowserRenderSession(
        {
          source: {
            project,
            resolvedAssets: [],
            resolvedArtifacts,
            contentIdentity: 'fixture',
          },
          request: {
            schemaVersion: 1,
            kind: 'still',
            source: { projectId: project.projectId },
            executorId: 'browser-webgl',
            intent: 'preview',
            outputLabel: 'dependency',
            quality: 'high',
            format: 'png',
            frame: 0,
            viewport: project.viewport,
          },
          signal: new AbortController().signal,
          onProgress() {},
          audio: { load, decodedBytes: () => 0, dispose() {} },
        },
        {
          componentRegistry: studioComponentRegistry,
          nodeRegistry: studioNodeRegistry,
          programRegistry: studioThreeProgramRegistry,
        },
      ),
    ).rejects.toMatchObject({
      code:
        corruption === 'missing'
          ? 'audio-artifact-missing'
          : 'audio-artifact-invalid',
      artifactId: bake.artifact.id,
    });
    expect(load).not.toHaveBeenCalled();
    expect(
      sampleProjectAudioFrameSnapshot(project, [bake.resolvedArtifact], 0),
    ).toMatchObject({ provenance: 'baked', artifactId: bake.artifact.id });
  },
);
