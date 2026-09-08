import { createVizAudioPcmIdentity } from '@viz-engine/bake';
import * as bakeNode from '@viz-engine/bake/node';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  analyzeCompleteDecodedTrack,
  assertRecomputedMusicWindowObservations,
  createExactClippingObservation,
  detectStructuralLandmarks,
  detectTransientLandmarks,
  observeDecodedPcm,
  readAlgorithmSourceIdentities,
  reproduceMusicWindowPcm,
  scoreWindowMetrics,
  selectAuthorizedMusicCandidates,
  selectDiverseCandidateWindows,
  validateAlgorithmSourceIdentities,
  type AnalysisBin,
  type CandidateWindow,
  type InventoryEntry,
  type WindowMetrics,
} from '../../tools/foundation/analyze-goal-five-music-windows.js';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const validator = resolve(
  repositoryRoot,
  'tools/foundation/analyze-goal-five-music-windows.ts',
);
const artifactPath = resolve(
  repositoryRoot,
  'docs/parity/evidence/artifacts/2026-09-04-goal-five-music-window-analysis.json',
);
const inventoryPath = resolve(
  repositoryRoot,
  'docs/parity/evidence/artifacts/2026-09-04-goal-five-authorized-input-inventory.json',
);
const temporaryDirectories: string[] = [];

const runHistoricalValidation = (path: string) =>
  spawnSync(
    'pnpm',
    ['exec', 'tsx', validator, '--verify-historical', '--artifact', path],
    { cwd: repositoryRoot, encoding: 'utf8' },
  );

const emptyMetrics = (): WindowMetrics => ({
  acts: 5,
  internalSectionCount: 4,
  phraseCount: 12,
  beatCount: 96,
  transientCount: 48,
  transientDensityPerSecond: 0.8,
  energy: {
    mean: 0.5,
    p10: 0.2,
    p90: 0.8,
    dynamicRange: 0.6,
    quartileMeans: [0.2, 0.4, 0.8, 0.5],
    arcShape: 'rise-and-release',
    peakQuartile: 3,
    restrainedQuartile: 1,
  },
  spectrum: {
    bassMean: 0.5,
    midMean: 0.5,
    trebleMean: 0.5,
    centroidMeanHz: 4_000,
    centroidP10Hz: 2_000,
    centroidP90Hz: 6_000,
  },
  silence: { threshold: 0.05, ratio: 0, longestRunSeconds: 0, intervals: [] },
  clipping: { threshold: 0.999, ratio: 0 },
});

const candidate = (
  id: string,
  score: number,
  startFrame: number,
): CandidateWindow => ({
  id,
  rank: 0,
  source: {
    startSample: startFrame * 800,
    endSampleExclusive: (startFrame + 3_600) * 800,
    startFrame,
    endFrameExclusive: startFrame + 3_600,
    startSeconds: startFrame / 60,
    durationSeconds: 60,
  },
  score,
  scoreComponents: {
    multiActStructure: 1,
    dynamicRange: 1,
    energyArc: 1,
    directorialArc: 1,
    beatDefinition: 1,
    transientDetail: 1,
    spectralContrast: 1,
    boundaryAlignment: 1,
    silencePenalty: 0,
    clippingPenalty: 0,
  },
  metrics: emptyMetrics(),
});

afterEach(() => {
  vi.restoreAllMocks();
  temporaryDirectories
    .splice(0)
    .forEach((directory) =>
      rmSync(directory, { recursive: true, force: true }),
    );
});

describe('Goal Five music-window observation', () => {
  it('accepts the exact immutable analysis and rejects semantic tampering', () => {
    const exact = runHistoricalValidation(artifactPath);
    expect(exact.status).toBe(0);
    expect(exact.stdout).toContain(
      'Validated immutable historical Goal Five music-window analysis',
    );

    const directory = mkdtempSync(resolve(tmpdir(), 'viz-music-analysis-'));
    temporaryDirectories.push(directory);
    const tamperedPath = resolve(directory, 'analysis.json');
    const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));
    artifact.tracks[0].candidateWindows[0].score += 0.001;
    writeFileSync(tamperedPath, `${JSON.stringify(artifact, null, 2)}\n`);

    const tampered = runHistoricalValidation(tamperedPath);
    expect(tampered.status).not.toBe(0);
    expect(tampered.stderr).toContain(
      'The complete historical music-window analysis digest drifted:',
    );
  });

  it('selects only the exact P1-01 candidate set and rejects omissions', () => {
    const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8')) as {
      entries: InventoryEntry[];
    };
    const selected = selectAuthorizedMusicCandidates(inventory.entries);
    expect(selected).toHaveLength(14);
    expect(selected.every((entry) => entry.role === 'source-music')).toBe(true);
    expect(selected.some((entry) => entry.path.includes('[Test]'))).toBe(false);

    expect(() => selectAuthorizedMusicCandidates(selected.slice(1))).toThrow(
      'Expected 14 authorized source-music candidates, found 13.',
    );
  });

  it('content-addresses canonical interleaved PCM and exposes clipping', () => {
    const left = new Float32Array([0, 0.5, 1]);
    const right = new Float32Array([0.25, -0.5, -1]);
    const first = observeDecodedPcm([left, right]);
    const second = observeDecodedPcm([left, right]);
    const reversed = observeDecodedPcm([right, left]);

    expect(first).toEqual(second);
    expect(first.contentIdentity).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(first.contentIdentity).not.toBe(reversed.contentIdentity);
    expect(first).toMatchObject({
      encoding: 'f32le-interleaved',
      samplePeak: 1,
      clippedSampleCount: 2,
      clippedSampleRatio: 0.333333,
    });
  });

  it('binds evidence to the exact bake and rhythm algorithm source set', () => {
    const identities = readAlgorithmSourceIdentities();
    expect(identities.length).toBeGreaterThan(0);
    expect(
      identities.some(
        ({ path }) =>
          path === 'tools/foundation/analyze-goal-five-music-windows.ts',
      ),
    ).toBe(true);
    expect(() => validateAlgorithmSourceIdentities(identities)).not.toThrow();
    expect(() =>
      validateAlgorithmSourceIdentities([
        { ...identities[0]!, contentIdentity: `sha256:${'0'.repeat(64)}` },
        ...identities.slice(1),
      ]),
    ).toThrow('Music analysis algorithm source identities drifted');
  });

  it('measures candidate clipping from exact PCM ranges across block edges', () => {
    const channel = new Float32Array(9_002);
    for (const sample of [4_095, 4_096, 8_999, 9_000]) channel[sample] = 1;
    const clipping = createExactClippingObservation([channel]);

    expect(clipping.ratioForRange(4_096, 9_000)).toBe(0.000408);
    expect(clipping.ratioForRange(4_095, 4_096)).toBe(1);
    expect(clipping.ratioForRange(9_000, 9_001)).toBe(1);
  });

  it('normalizes onset once over the complete source before slicing windows', () => {
    const sampleRate = 8_000;
    const durationSeconds = 61;
    const channel = new Float32Array(sampleRate * durationSeconds);
    for (let second = 2; second < durationSeconds; second += 2) {
      const amplitude = second < 30 ? 0.05 : 0.9;
      const start = second * sampleRate;
      for (let offset = 0; offset < 256; offset += 1) {
        channel[start + offset] =
          amplitude * Math.sin((2 * Math.PI * 440 * offset) / sampleRate);
      }
    }

    const observation = analyzeCompleteDecodedTrack(
      'synthetic-full-track',
      [channel],
      sampleRate,
    );
    const onset = observation.analysis.featureSeries.find(
      ({ name }) => name === 'onset-strength',
    )!.values;
    const weakEndFrame = 29 * observation.analysis.fps;
    const strongStartFrame = 30 * observation.analysis.fps;
    const weakPeak = Math.max(...onset.subarray(0, weakEndFrame));
    const strongPeak = Math.max(...onset.subarray(strongStartFrame));

    expect(observation.analysis.sampleCount).toBe(channel.length);
    expect(observation.candidates.windows).toHaveLength(3);
    expect(strongPeak).toBe(1);
    expect(weakPeak).toBeLessThan(0.2);
  });

  it('detects bounded multiscale hypotheses in a synthetic energy arc', () => {
    const levels = [0.02, 0.28, 0.92, 0.18];
    const bins: AnalysisBin[] = Array.from({ length: 40 }, (_, index) => {
      const level = levels[Math.floor(index / 10)]!;
      return {
        sourceFrameStart: index * 60,
        sourceFrameEnd: (index + 1) * 60,
        startSeconds: index,
        endSeconds: index + 1,
        loudness: level,
        bassEnergy: level * 0.9,
        midEnergy: level * 0.7,
        trebleEnergy: level * 0.5,
        spectralCentroidHz: 500 + level * 8_000,
        onsetStrength: index % 10 === 0 ? 1 : level * 0.1,
        waveformPeak: Math.min(1, level * 1.1),
      };
    });
    const sections = detectStructuralLandmarks(bins, 48_000);
    expect(sections.some((entry) => Math.abs(entry.seconds - 10) <= 1)).toBe(
      true,
    );
    expect(sections.some((entry) => Math.abs(entry.seconds - 20) <= 1)).toBe(
      true,
    );
    expect(sections.some((entry) => Math.abs(entry.seconds - 30) <= 1)).toBe(
      true,
    );

    const onset = new Float32Array(100);
    onset[20] = 0.8;
    onset[50] = 1;
    const transients = detectTransientLandmarks(onset, 20, 48_000);
    expect(transients.events.map((entry) => entry.seconds)).toEqual([
      1.025, 2.525,
    ]);
  });

  it('keeps ranking transparent, stable, and spatially diverse', () => {
    const disposition = selectDiverseCandidateWindows([
      candidate('later-tie', 90, 600),
      candidate('best', 95, 0),
      candidate('near-best', 94, 120),
      candidate('earlier-tie', 90, 300),
      candidate('third', 80, 900),
      candidate('lower', 70, 1_200),
    ]);

    expect(disposition.windows.map(({ id, rank }) => [id, rank])).toEqual([
      ['best', 1],
      ['earlier-tie', 2],
      ['later-tie', 3],
    ]);
    expect(disposition.nearDuplicateRejectedCount).toBe(1);
    expect(disposition.lowerRankRejectedCount).toBe(2);
  });

  it('penalizes flat or clipped windows without hiding score components', () => {
    const strong = emptyMetrics();
    const weak: WindowMetrics = {
      ...emptyMetrics(),
      acts: 1,
      transientDensityPerSecond: 0,
      energy: {
        ...emptyMetrics().energy,
        dynamicRange: 0,
        quartileMeans: [0.5, 0.5, 0.5, 0.5],
        arcShape: 'flat',
      },
      spectrum: {
        ...emptyMetrics().spectrum,
        centroidP10Hz: 4_000,
        centroidP90Hz: 4_000,
      },
      silence: {
        ...emptyMetrics().silence,
        ratio: 0.2,
        longestRunSeconds: 12,
      },
      clipping: { threshold: 0.999, ratio: 0.1 },
    };

    const strongScore = scoreWindowMetrics(strong, 0.2, 1);
    const weakScore = scoreWindowMetrics(weak, 0, 0);
    expect(strongScore.total).toBeGreaterThan(weakScore.total);
    expect(weakScore.silencePenalty).toBe(1);
    expect(weakScore.clippingPenalty).toBe(1);
  });
  it('rejects decoder sample/layout drift independently of an unchanged source file identity', async () => {
    const historical = JSON.parse(readFileSync(artifactPath, 'utf8'));
    const track = structuredClone(historical.tracks[0]);
    const pcm = {
      sampleRate: 8000,
      channels: [new Float32Array([0, 0.25, -0.5])],
    };
    const identity = createVizAudioPcmIdentity(pcm);
    Object.assign(track.decode, {
      decodedSampleRate: 8000,
      decodedChannelCount: 1,
      decodedSampleCount: 3,
      pcm: { ...track.decode.pcm, contentIdentity: identity.contentIdentity },
    });
    const decoded = {
      filePath: track.source.path,
      sourceContentIdentity: track.source.contentIdentity,
      pcm,
      metadata: {
        sourceSampleRate: 8000,
        sourceChannelCount: 1,
        decodedSampleRate: 8000,
        decodedChannelCount: 1 as const,
        decodedSampleCount: 3,
        decoderIdentity: 'controlled-current-decoder',
      },
    };
    const mock = vi
      .spyOn(bakeNode, 'decodeVizAudioFileToPcm')
      .mockResolvedValue(decoded);
    await expect(reproduceMusicWindowPcm([track])).resolves.toHaveLength(1);
    for (const changed of [
      { ...pcm, channels: [new Float32Array([0, 0.250001, -0.5])] },
      { ...pcm, sampleRate: 16000 },
      { ...pcm, channels: [pcm.channels[0]!, pcm.channels[0]!] },
    ]) {
      mock.mockResolvedValue({ ...decoded, pcm: changed });
      await expect(reproduceMusicWindowPcm([track])).rejects.toThrow(
        'differs from the historical PCM',
      );
    }
  });

  it('normalizes only historical provenance while rejecting musical and algorithm drift', () => {
    const historical = JSON.parse(readFileSync(artifactPath, 'utf8'));
    const current = structuredClone(historical);
    current.determinism.environment.node = 'different-runtime';
    current.determinism.algorithmSourceIdentities = [];
    expect(() =>
      assertRecomputedMusicWindowObservations(historical, current),
    ).not.toThrow();
    const mutations = [
      (value: typeof current) => {
        value.tracks[0].candidateWindows[0].score += 0.000001;
      },
      (value: typeof current) => {
        value.tracks[0].candidateWindows[0].source.startSample += 1;
      },
      (value: typeof current) => {
        value.analysisVersion += '-changed';
      },
      (value: typeof current) => {
        value.determinism.config.fftSize *= 2;
      },
      (value: typeof current) => {
        value.determinism.algorithmIdentities.push('changed');
      },
    ];
    for (const mutate of mutations) {
      const changed = structuredClone(current);
      mutate(changed);
      expect(() =>
        assertRecomputedMusicWindowObservations(historical, changed),
      ).toThrow('observations differ');
    }
  });
});
