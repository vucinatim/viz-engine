import { decodeVizAudioFileToPcm } from '@viz-engine/bake/node';
import { createCoreComponentRegistry } from '@viz-engine/components-core';
import {
  VIZ_PROJECT_SCHEMA_VERSION,
  type VizProjectDocument,
} from '@viz-engine/contracts';
import { inspectBundleFrame, runVizCli } from '@viz-engine/dev-cli';
import { createCoreNodeRegistry } from '@viz-engine/nodes-core';
import {
  loadLocalVizProjectBundle,
  writeLocalVizProjectBundle,
} from '@viz-engine/project-bundle/node';
import { createVizRemotionRenderPlan } from '@viz-engine/remotion-adapter';
import { sampleAudioFrameSnapshot } from '@viz-engine/runtime';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const ffmpegAvailable =
  spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0 &&
  spawnSync('ffprobe', ['-version'], { stdio: 'ignore' }).status === 0;

const temporaryDirectories: string[] = [];

const createMonoWav = (sampleRate: number, durationSeconds: number): Buffer => {
  const sampleCount = Math.floor(sampleRate * durationSeconds);
  const dataLength = sampleCount * 2;
  const buffer = Buffer.alloc(44 + dataLength);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);
  for (let index = 0; index < sampleCount; index += 1) {
    const sample = Math.sin((2 * Math.PI * 220 * index) / sampleRate);
    buffer.writeInt16LE(Math.round(sample * 24_000), 44 + index * 2);
  }
  return buffer;
};

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe.skipIf(!ffmpegAvailable)('Node audio decode and bundle bake', () => {
  it('decodes real media and emits a portable reopenable baked bundle', async () => {
    const root = mkdtempSync(join(tmpdir(), 'viz-audio-bake-'));
    temporaryDirectories.push(root);
    const audioPath = join(root, 'tone.wav');
    const sourceBundle = join(root, 'source');
    const outputBundle = join(root, 'output');
    writeFileSync(audioPath, createMonoWav(8_000, 0.5));

    const decoded = await decodeVizAudioFileToPcm(audioPath);
    expect(decoded).toMatchObject({
      sourceContentIdentity: expect.stringMatching(/^sha256:/),
      metadata: {
        sourceSampleRate: 8_000,
        sourceChannelCount: 1,
        decodedChannelCount: 1,
        decodedSampleCount: 4_000,
      },
    });

    const project: VizProjectDocument = {
      schemaVersion: VIZ_PROJECT_SCHEMA_VERSION,
      projectId: 'node-audio-bake',
      name: 'Node Audio Bake',
      timeline: { fps: 10, durationInFrames: 5 },
      viewport: { width: 320, height: 180 },
      layerOrder: ['spectrum'],
      layers: [
        {
          id: 'spectrum',
          name: 'Spectrum',
          componentId: 'curve-spectrum',
          enabled: true,
          opacity: 1,
          blendMode: 'normal',
        },
      ],
      assetRefs: [
        {
          id: 'tone',
          kind: 'audio',
          source: 'local',
          label: 'Tone',
          mimeType: 'audio/wav',
        },
      ],
      artifactRefs: [],
    };
    const sourceWrite = writeLocalVizProjectBundle({
      bundleDirectory: sourceBundle,
      project,
      resolvedAssets: [
        {
          id: 'tone',
          kind: 'audio',
          source: 'local',
          uri: pathToFileURL(audioPath).href,
          mimeType: 'audio/wav',
        },
      ],
      resolvedArtifacts: [],
    });
    expect(sourceWrite.issues).toEqual([]);

    const cli = await runVizCli([
      'bundle',
      'bake-audio',
      '--dir',
      sourceBundle,
      '--out',
      outputBundle,
      '--fft-size',
      '256',
      '--duration',
      '0.2',
    ]);
    expect(cli).toMatchObject({
      ok: true,
      command: 'bundle bake-audio',
      payload: {
        job: {
          status: 'succeeded',
          metrics: { frameCount: 2 },
        },
      },
    });

    const reopened = loadLocalVizProjectBundle(outputBundle);
    expect(reopened.issues).toEqual([]);
    expect(reopened.project.artifactRefs).toHaveLength(1);
    const artifact = reopened.resolvedArtifacts[0]?.payload;
    expect(artifact).toMatchObject({
      kind: 'audio-feature-timeline',
      frameAlignment: { frameCount: 2 },
    });
    expect(
      sampleAudioFrameSnapshot(
        artifact as Parameters<typeof sampleAudioFrameSnapshot>[0],
        1,
        10,
      ),
    ).toMatchObject({
      provenance: 'baked',
      artifactFrame: 1,
    });

    const frameInspection = inspectBundleFrame(outputBundle, 1);
    expect(frameInspection.ok).toBe(true);
    const framePlan = (
      frameInspection.payload as {
        framePlan: {
          layers: Array<{
            resolvedInputs: Record<string, { value?: unknown }>;
          }>;
        };
      }
    ).framePlan;
    expect(framePlan.layers[0]?.resolvedInputs.spectrum?.value).toBeInstanceOf(
      Uint8Array,
    );
    expect(framePlan.layers[0]?.resolvedInputs.spectrum?.value).toHaveLength(
      128,
    );

    const remotionPlan = createVizRemotionRenderPlan({
      project: reopened.project,
      frame: 1,
      resolvedAssets: reopened.resolvedAssets,
      resolvedArtifacts: reopened.resolvedArtifacts,
      registry: createCoreComponentRegistry(),
      nodeRegistry: createCoreNodeRegistry(),
    });
    expect(remotionPlan.layers[0]?.resolvedInputs.spectrum?.value).toEqual(
      framePlan.layers[0]?.resolvedInputs.spectrum?.value,
    );
  });
});
