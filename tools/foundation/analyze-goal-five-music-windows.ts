import { decodeVizAudioFileToPcm } from '@viz-engine/bake/node';
import {
  analyzeStandardAudioFrames,
  beatTrack,
  STANDARD_AUDIO_FRAME_ANALYSIS_VERSION,
  tempo,
  type AudioSignal,
  type StandardAudioFrameAnalysisResult,
} from '@viz-engine/rhythm-core';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const GOAL_FIVE_MUSIC_ANALYSIS_VERSION =
  'viz-engine.goal-five-music-window-analysis.v1' as const;

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const implementationBaseline = 'bd43c717600d9385ef6858ee502587d55e05686f';
const inputAuditRevision = '9fdc0712c0e1e67ef7ebbaf5ed4e1c192e005a9c';
const inventoryRelativePath =
  'docs/parity/evidence/artifacts/2026-09-04-goal-five-authorized-input-inventory.json';
const artifactRelativePath =
  'docs/parity/evidence/artifacts/2026-09-04-goal-five-music-window-analysis.json';
const expectedArtifactIdentity =
  'sha256:e94ef2932f0ddd28f730711111e14d6d35ff952bc3328905f1e89dd6bb6657cc';
const algorithmSourceRoots = [
  'packages/viz-bake/package.json',
  'packages/viz-bake/src',
  'packages/rhythm-core/package.json',
  'packages/rhythm-core/src',
  'tools/foundation/analyze-goal-five-music-windows.ts',
] as const;
const algorithmSourceIdentityPolicy =
  'Hash every tracked or non-ignored untracked source under the declared Bake, Rhythm Core, and observation-tool roots. Normalize only the observation tool expectedArtifactIdentity declaration to break its content-address cycle.';

export const GOAL_FIVE_MUSIC_ANALYSIS_CONFIG = {
  analysisFps: 20,
  timelineFps: 60,
  fftSize: 2048,
  spectrumBinCount: 64,
  waveformSampleCount: 64,
  minDecibels: -90,
  maxDecibels: -10,
  minimumWindowSeconds: 45,
  maximumWindowSeconds: 60,
  candidateDurationsSeconds: [48, 52, 56, 60],
  phraseBeats: 8,
  sectionContextSeconds: 3,
  sectionNoveltyQuantile: 0.6,
  sectionMinimumSpacingSeconds: 6,
  maximumSectionsPerTrack: 18,
  maximumWindowsPerTrack: 3,
} as const;

type NumericSeriesName =
  | 'rms'
  | 'loudness'
  | 'bass-energy'
  | 'mid-energy'
  | 'treble-energy'
  | 'spectral-centroid'
  | 'spectral-flux'
  | 'onset-strength'
  | 'waveform-peak';

export interface InventoryEntry {
  path: string;
  contentIdentity: string;
  byteLength: number;
  availability: string;
  kind: string;
  role: string;
  goalFiveUse: string;
  authority: string;
  licenseStatus: string;
  provenance: { kind: string; sourcePaths: string[] };
}

interface InputInventory {
  auditRevision: string;
  entries: InventoryEntry[];
}

export interface TimelineLandmark {
  sourceSample: number;
  sourceFrame: number;
  seconds: number;
  strength?: number;
}

export interface AnalysisBin {
  sourceFrameStart: number;
  sourceFrameEnd: number;
  startSeconds: number;
  endSeconds: number;
  loudness: number;
  bassEnergy: number;
  midEnergy: number;
  trebleEnergy: number;
  spectralCentroidHz: number;
  onsetStrength: number;
  waveformPeak: number;
}

export interface WindowMetrics {
  acts: number;
  internalSectionCount: number;
  phraseCount: number;
  beatCount: number;
  transientCount: number;
  transientDensityPerSecond: number;
  energy: {
    mean: number;
    p10: number;
    p90: number;
    dynamicRange: number;
    quartileMeans: number[];
    arcShape: 'flat' | 'rising' | 'falling' | 'rise-and-release' | 'mixed';
    peakQuartile: number;
    restrainedQuartile: number;
  };
  spectrum: {
    bassMean: number;
    midMean: number;
    trebleMean: number;
    centroidMeanHz: number;
    centroidP10Hz: number;
    centroidP90Hz: number;
  };
  silence: {
    threshold: number;
    ratio: number;
    longestRunSeconds: number;
    intervals: Array<{
      sourceFrameStart: number;
      sourceFrameEndExclusive: number;
      startSeconds: number;
      durationSeconds: number;
    }>;
  };
  clipping: {
    threshold: number;
    ratio: number;
  };
}

export interface CandidateWindow {
  id: string;
  rank: number;
  source: {
    startSample: number;
    endSampleExclusive: number;
    startFrame: number;
    endFrameExclusive: number;
    startSeconds: number;
    durationSeconds: number;
  };
  score: number;
  scoreComponents: {
    multiActStructure: number;
    dynamicRange: number;
    energyArc: number;
    directorialArc: number;
    beatDefinition: number;
    transientDetail: number;
    spectralContrast: number;
    boundaryAlignment: number;
    silencePenalty: number;
    clippingPenalty: number;
  };
  metrics: WindowMetrics;
}

interface TrackAnalysis {
  id: string;
  source: InventoryEntry;
  decode: {
    decoder: string;
    arguments: string[];
    sourceSampleRate: number;
    sourceChannelCount: number;
    decodedSampleRate: number;
    decodedChannelCount: number;
    decodedSampleCount: number;
    decodedDurationSeconds: number;
    probedDurationSeconds: number | null;
    probeDecodeDurationDeltaSeconds: number | null;
    pcm: {
      encoding: 'f32le-interleaved';
      contentIdentity: string;
      samplePeak: number;
      clippedSampleThreshold: number;
      clippedSampleCount: number;
      clippedSampleRatio: number;
    };
  };
  rhythm: {
    interpretation: string;
    tempoBpm: number;
    refinedTempoBpm: number | null;
    tempoCandidatesBpm: number[];
    beatConfidence: number;
    beatGridHypothesis: TimelineLandmark[];
    phraseBoundaryHypotheses: TimelineLandmark[];
  };
  structure: {
    method: string;
    interpretation: string;
    sectionBoundaryHypotheses: TimelineLandmark[];
  };
  transients: {
    threshold: number;
    events: TimelineLandmark[];
  };
  analysisBins: AnalysisBin[];
  candidateSearch: {
    completeTrackSearched: true;
    evaluatedCandidateCount: number;
    retainedCandidateCount: number;
    nearDuplicateRejectedCount: number;
    lowerRankRejectedCount: number;
    unavailableDurationSeconds: number[];
    policy: string;
  };
  candidateWindows: CandidateWindow[];
}

interface MusicWindowArtifact {
  schemaVersion: 1;
  kind: 'viz-engine-goal-five-music-window-analysis';
  analysisVersion: typeof GOAL_FIVE_MUSIC_ANALYSIS_VERSION;
  identityScope: {
    implementationBaseline: string;
    inputAuditRevision: string;
    inventoryPath: string;
    inventoryContentIdentity: string;
    sourceSelection: string;
  };
  ownership: {
    canonicalInputs: string[];
    observationOwner: string;
    forbiddenOwners: string[];
  };
  determinism: {
    scope: string;
    environment: {
      node: string;
      platform: string;
      architecture: string;
      ffmpeg: string;
      ffprobe: string;
    };
    algorithmIdentities: string[];
    algorithmSourceIdentities: Array<{
      path: string;
      contentIdentity: string;
    }>;
    algorithmSourceIdentityPolicy: string;
    decodeArguments: string[];
    config: typeof GOAL_FIVE_MUSIC_ANALYSIS_CONFIG;
  };
  summary: {
    eligibleTrackCount: number;
    analyzedTrackCount: number;
    failedTrackCount: number;
    candidateWindowCount: number;
    minimumWindowSeconds: number;
    maximumWindowSeconds: number;
  };
  tracks: TrackAnalysis[];
  recommendation: {
    basis: string;
    provisionalWindowId: string;
    alternativeWindowIds: string[];
    rankedWindowIds: string[];
    humanBoundary: string;
  };
}

const round = (value: number, digits = 6): number => {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
};

const clamp = (value: number, minimum = 0, maximum = 1): number =>
  Math.max(minimum, Math.min(maximum, value));

const mean = (values: readonly number[]): number =>
  values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;

const percentile = (values: readonly number[], quantile: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const position = clamp(quantile) * (sorted.length - 1);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const ratio = position - lower;
  return sorted[lower]! * (1 - ratio) + sorted[upper]! * ratio;
};

const standardDeviation = (values: readonly number[]): number => {
  const average = mean(values);
  return Math.sqrt(
    mean(values.map((value) => (value - average) * (value - average))),
  );
};

const contentIdentity = (bytes: Buffer | string): string =>
  `sha256:${createHash('sha256').update(bytes).digest('hex')}`;

export const readAlgorithmSourceIdentities = (): Array<{
  path: string;
  contentIdentity: string;
}> => {
  const paths = execFileSync(
    'git',
    [
      'ls-files',
      '--cached',
      '--others',
      '--exclude-standard',
      '--',
      ...algorithmSourceRoots,
    ],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
    },
  )
    .trim()
    .split('\n')
    .filter(Boolean)
    .sort();
  if (paths.length === 0) {
    throw new Error('Music analysis algorithm source set is empty.');
  }
  return paths.map((path) => {
    const bytes = readFileSync(resolve(repositoryRoot, path));
    const identityInput =
      path === 'tools/foundation/analyze-goal-five-music-windows.ts'
        ? bytes
            .toString('utf8')
            .replace(
              /const expectedArtifactIdentity =\s*\n\s*'sha256:[0-9a-f]{64}';/u,
              "const expectedArtifactIdentity = '<content-address-cycle-normalized>';",
            )
        : bytes;
    return { path, contentIdentity: contentIdentity(identityInput) };
  });
};

export const validateAlgorithmSourceIdentities = (
  expected: ReadonlyArray<{ path: string; contentIdentity: string }>,
): void => {
  const actual = readAlgorithmSourceIdentities();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      'Music analysis algorithm source identities drifted from the pinned evidence.',
    );
  }
};

export const observeDecodedPcm = (
  channels: readonly Float32Array[],
): {
  encoding: 'f32le-interleaved';
  contentIdentity: string;
  samplePeak: number;
  clippedSampleThreshold: number;
  clippedSampleCount: number;
  clippedSampleRatio: number;
} => {
  if (channels.length !== 1 && channels.length !== 2) {
    throw new Error('Decoded PCM observation requires one or two channels.');
  }
  const sampleCount = channels[0]?.length ?? 0;
  if (channels.some((channel) => channel.length !== sampleCount)) {
    throw new Error('Decoded PCM channels must have equal sample counts.');
  }
  const hash = createHash('sha256');
  const clippedSampleThreshold = 0.999;
  let samplePeak = 0;
  let clippedSampleCount = 0;
  const blockFrames = 16_384;
  for (let start = 0; start < sampleCount; start += blockFrames) {
    const frameCount = Math.min(blockFrames, sampleCount - start);
    const bytes = Buffer.allocUnsafe(
      frameCount * channels.length * Float32Array.BYTES_PER_ELEMENT,
    );
    let offset = 0;
    for (let frame = 0; frame < frameCount; frame += 1) {
      for (const channel of channels) {
        const sample = channel[start + frame]!;
        const magnitude = Math.abs(sample);
        samplePeak = Math.max(samplePeak, magnitude);
        if (magnitude >= clippedSampleThreshold) clippedSampleCount += 1;
        bytes.writeFloatLE(sample, offset);
        offset += Float32Array.BYTES_PER_ELEMENT;
      }
    }
    hash.update(bytes);
  }
  const scalarSampleCount = sampleCount * channels.length;
  return {
    encoding: 'f32le-interleaved',
    contentIdentity: `sha256:${hash.digest('hex')}`,
    samplePeak: round(samplePeak),
    clippedSampleThreshold,
    clippedSampleCount,
    clippedSampleRatio: round(
      clippedSampleCount / Math.max(1, scalarSampleCount),
    ),
  };
};

export interface ExactClippingObservation {
  threshold: number;
  ratioForRange(startSample: number, endSampleExclusive: number): number;
}

export const createExactClippingObservation = (
  channels: readonly Float32Array[],
  threshold = 0.999,
): ExactClippingObservation => {
  if (channels.length !== 1 && channels.length !== 2) {
    throw new Error('Exact clipping observation requires one or two channels.');
  }
  const sampleCount = channels[0]?.length ?? 0;
  if (channels.some((channel) => channel.length !== sampleCount)) {
    throw new Error('Exact clipping channels must have equal sample counts.');
  }
  const blockSize = 4_096;
  const blockCount = Math.ceil(sampleCount / blockSize);
  const cumulativeClippedSamples = new Uint32Array(blockCount + 1);
  const countRange = (start: number, end: number): number => {
    let count = 0;
    for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
      for (const channel of channels) {
        if (Math.abs(channel[sampleIndex]!) >= threshold) count += 1;
      }
    }
    return count;
  };
  for (let block = 0; block < blockCount; block += 1) {
    cumulativeClippedSamples[block + 1] =
      cumulativeClippedSamples[block]! +
      countRange(
        block * blockSize,
        Math.min(sampleCount, (block + 1) * blockSize),
      );
  }
  return {
    threshold,
    ratioForRange(startSample, endSampleExclusive) {
      const start = Math.max(0, Math.min(sampleCount, Math.floor(startSample)));
      const end = Math.max(
        start,
        Math.min(sampleCount, Math.floor(endSampleExclusive)),
      );
      const firstFullBlock = Math.ceil(start / blockSize);
      const lastFullBlockExclusive = Math.floor(end / blockSize);
      const clippedSampleCount =
        firstFullBlock < lastFullBlockExclusive
          ? countRange(start, firstFullBlock * blockSize) +
            cumulativeClippedSamples[lastFullBlockExclusive]! -
            cumulativeClippedSamples[firstFullBlock]! +
            countRange(lastFullBlockExclusive * blockSize, end)
          : countRange(start, end);
      return round(
        clippedSampleCount / Math.max(1, (end - start) * channels.length),
      );
    },
  };
};

const commandVersion = (command: string): string =>
  execFileSync(command, ['-version'], { encoding: 'utf8' })
    .split('\n')[0]!
    .trim();

const toTrackId = (path: string): string =>
  path
    .split('/')
    .at(-1)!
    .replace(/\.mp3$/u, '')
    .replace(/^\[([^\]]+)\]\s*/u, '$1-')
    .replace(/\([^)]*\)/gu, '')
    .replace(/[^A-Za-z0-9]+/gu, '-')
    .replace(/^-|-$/gu, '')
    .toLowerCase();

const toLandmark = (
  seconds: number,
  sampleRate: number,
  strength?: number,
): TimelineLandmark => ({
  sourceSample: Math.round(seconds * sampleRate),
  sourceFrame: Math.round(
    seconds * GOAL_FIVE_MUSIC_ANALYSIS_CONFIG.timelineFps,
  ),
  seconds: round(seconds),
  ...(strength === undefined ? {} : { strength: round(strength) }),
});

const getSeries = (
  analysis: StandardAudioFrameAnalysisResult,
  name: NumericSeriesName,
): Float32Array => {
  const series = analysis.featureSeries.find(
    (candidate) => candidate.name === name,
  );
  if (!series) throw new Error(`Audio analysis omitted ${name}.`);
  return series.values;
};

const rangeValues = (
  values: Float32Array,
  startFrame: number,
  endFrame: number,
): number[] =>
  Array.from(
    values.subarray(
      Math.max(0, Math.floor(startFrame)),
      Math.min(values.length, Math.ceil(endFrame)),
    ),
  );

const windowMean = (values: Float32Array, start: number, end: number): number =>
  mean(rangeValues(values, start, end));

const buildAnalysisBins = (
  analysis: StandardAudioFrameAnalysisResult,
): AnalysisBin[] => {
  const series = new Map(
    analysis.featureSeries.map((entry) => [entry.name, entry.values]),
  );
  const durationSeconds = analysis.sampleCount / analysis.sampleRate;
  const bins: AnalysisBin[] = [];
  for (let second = 0; second < Math.ceil(durationSeconds); second += 1) {
    const endSeconds = Math.min(durationSeconds, second + 1);
    const start = second * analysis.fps;
    const end = endSeconds * analysis.fps;
    const average = (name: NumericSeriesName) =>
      round(windowMean(series.get(name)!, start, end));
    bins.push({
      sourceFrameStart: second * GOAL_FIVE_MUSIC_ANALYSIS_CONFIG.timelineFps,
      sourceFrameEnd: Math.round(
        endSeconds * GOAL_FIVE_MUSIC_ANALYSIS_CONFIG.timelineFps,
      ),
      startSeconds: round(second),
      endSeconds: round(endSeconds),
      loudness: average('loudness'),
      bassEnergy: average('bass-energy'),
      midEnergy: average('mid-energy'),
      trebleEnergy: average('treble-energy'),
      spectralCentroidHz: average('spectral-centroid'),
      onsetStrength: average('onset-strength'),
      waveformPeak: average('waveform-peak'),
    });
  }
  return bins;
};

export const detectStructuralLandmarks = (
  bins: readonly AnalysisBin[],
  sampleRate: number,
): TimelineLandmark[] => {
  const context = GOAL_FIVE_MUSIC_ANALYSIS_CONFIG.sectionContextSeconds;
  if (bins.length < context * 2 + 1) return [];
  const keys: Array<
    keyof Pick<
      AnalysisBin,
      | 'loudness'
      | 'bassEnergy'
      | 'midEnergy'
      | 'trebleEnergy'
      | 'spectralCentroidHz'
      | 'onsetStrength'
    >
  > = [
    'loudness',
    'bassEnergy',
    'midEnergy',
    'trebleEnergy',
    'spectralCentroidHz',
    'onsetStrength',
  ];
  const scales = new Map(
    keys.map((key) => [
      key,
      Math.max(standardDeviation(bins.map((bin) => bin[key])), 1e-9),
    ]),
  );
  const novelty = bins.map((_, index) => {
    if (index < context || index + context >= bins.length) return 0;
    let sumSquares = 0;
    for (const key of keys) {
      const before = mean(
        bins.slice(index - context, index).map((bin) => bin[key]),
      );
      const after = mean(
        bins.slice(index, index + context).map((bin) => bin[key]),
      );
      const delta = (after - before) / scales.get(key)!;
      sumSquares += delta * delta;
    }
    return Math.sqrt(sumSquares / keys.length);
  });
  const threshold = percentile(
    novelty.filter((value) => value > 0),
    GOAL_FIVE_MUSIC_ANALYSIS_CONFIG.sectionNoveltyQuantile,
  );
  const localMaxima = novelty
    .map((strength, index) => ({ index, strength }))
    .filter(
      ({ index, strength }) =>
        strength >= threshold &&
        strength > 0 &&
        strength >= (novelty[index - 1] ?? -Infinity) &&
        strength > (novelty[index + 1] ?? -Infinity),
    )
    .sort(
      (left, right) =>
        right.strength - left.strength || left.index - right.index,
    );
  const selected: typeof localMaxima = [];
  for (const candidate of localMaxima) {
    if (
      selected.every(
        (entry) =>
          Math.abs(entry.index - candidate.index) >=
          GOAL_FIVE_MUSIC_ANALYSIS_CONFIG.sectionMinimumSpacingSeconds,
      )
    ) {
      selected.push(candidate);
    }
    if (
      selected.length >= GOAL_FIVE_MUSIC_ANALYSIS_CONFIG.maximumSectionsPerTrack
    ) {
      break;
    }
  }
  const maximum = Math.max(...selected.map((entry) => entry.strength), 1);
  return selected
    .sort((left, right) => left.index - right.index)
    .map((entry) =>
      toLandmark(
        bins[entry.index]!.startSeconds,
        sampleRate,
        entry.strength / maximum,
      ),
    );
};

export const detectTransientLandmarks = (
  onsetStrength: Float32Array,
  analysisFps: number,
  sampleRate: number,
): { threshold: number; events: TimelineLandmark[] } => {
  const values = Array.from(onsetStrength);
  const threshold = percentile(values, 0.9);
  const minimumSpacingFrames = Math.max(1, Math.round(analysisFps * 0.15));
  const candidates = values
    .map((strength, index) => ({ index, strength }))
    .filter(
      ({ index, strength }) =>
        strength >= threshold &&
        strength > 0 &&
        strength >= (values[index - 1] ?? -Infinity) &&
        strength > (values[index + 1] ?? -Infinity),
    )
    .sort(
      (left, right) =>
        right.strength - left.strength || left.index - right.index,
    );
  const selected: typeof candidates = [];
  for (const candidate of candidates) {
    if (
      selected.every(
        (entry) =>
          Math.abs(entry.index - candidate.index) >= minimumSpacingFrames,
      )
    ) {
      selected.push(candidate);
    }
  }
  return {
    threshold: round(threshold),
    events: selected
      .sort((left, right) => left.index - right.index)
      .map(({ index, strength }) =>
        toLandmark((index + 0.5) / analysisFps, sampleRate, strength),
      ),
  };
};

const landmarksWithin = (
  landmarks: readonly TimelineLandmark[],
  startSeconds: number,
  endSeconds: number,
): TimelineLandmark[] =>
  landmarks.filter(
    (landmark) =>
      landmark.seconds >= startSeconds && landmark.seconds < endSeconds,
  );

const computeWindowMetrics = (
  analysis: StandardAudioFrameAnalysisResult,
  startSeconds: number,
  durationSeconds: number,
  clippingObservation: ExactClippingObservation,
  landmarks: {
    sections: readonly TimelineLandmark[];
    phrases: readonly TimelineLandmark[];
    beats: readonly TimelineLandmark[];
    transients: readonly TimelineLandmark[];
  },
): WindowMetrics => {
  const start = startSeconds * analysis.fps;
  const end = (startSeconds + durationSeconds) * analysis.fps;
  const values = (name: NumericSeriesName) =>
    rangeValues(getSeries(analysis, name), start, end);
  const loudness = values('loudness');
  const bass = values('bass-energy');
  const mid = values('mid-energy');
  const treble = values('treble-energy');
  const centroid = values('spectral-centroid');
  const quartileMeans = Array.from({ length: 4 }, (_, index) =>
    round(
      windowMean(
        getSeries(analysis, 'loudness'),
        start + (index * (end - start)) / 4,
        start + ((index + 1) * (end - start)) / 4,
      ),
    ),
  );
  const sections = landmarksWithin(
    landmarks.sections,
    startSeconds + 1,
    startSeconds + durationSeconds - 1,
  );
  const silenceThreshold = 0.05;
  let longestSilenceFrames = 0;
  let currentSilenceFrames = 0;
  let currentSilenceStart = 0;
  const silenceIntervals: WindowMetrics['silence']['intervals'] = [];
  const finishSilence = (endIndex: number): void => {
    if (currentSilenceFrames < Math.ceil(analysis.fps * 0.25)) return;
    const intervalStartSeconds =
      startSeconds + currentSilenceStart / analysis.fps;
    const intervalEndSeconds = startSeconds + endIndex / analysis.fps;
    silenceIntervals.push({
      sourceFrameStart: Math.round(
        intervalStartSeconds * GOAL_FIVE_MUSIC_ANALYSIS_CONFIG.timelineFps,
      ),
      sourceFrameEndExclusive: Math.round(
        intervalEndSeconds * GOAL_FIVE_MUSIC_ANALYSIS_CONFIG.timelineFps,
      ),
      startSeconds: round(intervalStartSeconds),
      durationSeconds: round(intervalEndSeconds - intervalStartSeconds),
    });
  };
  for (let index = 0; index < loudness.length; index += 1) {
    const value = loudness[index]!;
    if (value <= silenceThreshold) {
      if (currentSilenceFrames === 0) currentSilenceStart = index;
      currentSilenceFrames += 1;
      longestSilenceFrames = Math.max(
        longestSilenceFrames,
        currentSilenceFrames,
      );
    } else {
      finishSilence(index);
      currentSilenceFrames = 0;
    }
  }
  finishSilence(loudness.length);
  const transientCount = landmarksWithin(
    landmarks.transients,
    startSeconds,
    startSeconds + durationSeconds,
  ).length;
  const peakQuartile = quartileMeans.indexOf(Math.max(...quartileMeans)) + 1;
  const restrainedQuartile =
    quartileMeans.indexOf(Math.min(...quartileMeans)) + 1;
  const energySpan = Math.max(...quartileMeans) - Math.min(...quartileMeans);
  const arcShape: WindowMetrics['energy']['arcShape'] =
    energySpan < 0.04
      ? 'flat'
      : peakQuartile >= 3 && restrainedQuartile === 1
        ? quartileMeans[3]! < Math.max(...quartileMeans) - 0.04
          ? 'rise-and-release'
          : 'rising'
        : peakQuartile === 1 && restrainedQuartile >= 3
          ? 'falling'
          : quartileMeans[3]! - quartileMeans[0]! > 0.04
            ? 'rising'
            : quartileMeans[0]! - quartileMeans[3]! > 0.04
              ? 'falling'
              : 'mixed';
  return {
    acts: sections.length + 1,
    internalSectionCount: sections.length,
    phraseCount: landmarksWithin(
      landmarks.phrases,
      startSeconds,
      startSeconds + durationSeconds,
    ).length,
    beatCount: landmarksWithin(
      landmarks.beats,
      startSeconds,
      startSeconds + durationSeconds,
    ).length,
    transientCount,
    transientDensityPerSecond: round(transientCount / durationSeconds),
    energy: {
      mean: round(mean(loudness)),
      p10: round(percentile(loudness, 0.1)),
      p90: round(percentile(loudness, 0.9)),
      dynamicRange: round(
        percentile(loudness, 0.9) - percentile(loudness, 0.1),
      ),
      quartileMeans,
      arcShape,
      peakQuartile,
      restrainedQuartile,
    },
    spectrum: {
      bassMean: round(mean(bass)),
      midMean: round(mean(mid)),
      trebleMean: round(mean(treble)),
      centroidMeanHz: round(mean(centroid)),
      centroidP10Hz: round(percentile(centroid, 0.1)),
      centroidP90Hz: round(percentile(centroid, 0.9)),
    },
    silence: {
      threshold: silenceThreshold,
      ratio: round(
        loudness.filter((value) => value <= silenceThreshold).length /
          Math.max(1, loudness.length),
      ),
      longestRunSeconds: round(longestSilenceFrames / analysis.fps),
      intervals: silenceIntervals,
    },
    clipping: {
      threshold: clippingObservation.threshold,
      ratio: clippingObservation.ratioForRange(
        Math.round(startSeconds * analysis.sampleRate),
        Math.min(
          analysis.sampleCount,
          Math.round((startSeconds + durationSeconds) * analysis.sampleRate),
        ),
      ),
    },
  };
};

export const scoreWindowMetrics = (
  metrics: WindowMetrics,
  beatConfidence: number,
  boundaryAlignment: number,
): CandidateWindow['scoreComponents'] & { total: number } => {
  const energySpan =
    Math.max(...metrics.energy.quartileMeans) -
    Math.min(...metrics.energy.quartileMeans);
  const centroidRange =
    metrics.spectrum.centroidP90Hz - metrics.spectrum.centroidP10Hz;
  const multiActStructure = clamp(1 - Math.abs(metrics.acts - 5) / 4);
  const dynamicRange = clamp(metrics.energy.dynamicRange / 0.3);
  const energyArc = clamp(energySpan / 0.18);
  const directorialArc = {
    'rise-and-release': 1,
    rising: 0.9,
    mixed: 0.6,
    falling: 0.4,
    flat: 0.2,
  }[metrics.energy.arcShape];
  const beatDefinition = clamp(beatConfidence / 0.2);
  const transientDetail = clamp(metrics.transientDensityPerSecond / 0.8);
  const spectralContrast = clamp(centroidRange / 4_000);
  const silencePenalty = clamp(metrics.silence.ratio / 0.15);
  const clippingPenalty = clamp(metrics.clipping.ratio / 0.05);
  const total = clamp(
    multiActStructure * 0.22 +
      dynamicRange * 0.2 +
      energyArc * 0.1 +
      directorialArc * 0.1 +
      beatDefinition * 0.13 +
      transientDetail * 0.1 +
      spectralContrast * 0.08 +
      boundaryAlignment * 0.07 -
      silencePenalty * 0.12 -
      clippingPenalty * 0.08,
  );
  return {
    multiActStructure: round(multiActStructure),
    dynamicRange: round(dynamicRange),
    energyArc: round(energyArc),
    directorialArc: round(directorialArc),
    beatDefinition: round(beatDefinition),
    transientDetail: round(transientDetail),
    spectralContrast: round(spectralContrast),
    boundaryAlignment: round(boundaryAlignment),
    silencePenalty: round(silencePenalty),
    clippingPenalty: round(clippingPenalty),
    total: round(total * 100),
  };
};

const buildCandidateWindows = (
  trackId: string,
  analysis: StandardAudioFrameAnalysisResult,
  sampleRate: number,
  beatConfidence: number,
  clippingObservation: ExactClippingObservation,
  landmarks: {
    sections: readonly TimelineLandmark[];
    phrases: readonly TimelineLandmark[];
    beats: readonly TimelineLandmark[];
    transients: readonly TimelineLandmark[];
  },
): {
  evaluatedCandidateCount: number;
  nearDuplicateRejectedCount: number;
  lowerRankRejectedCount: number;
  unavailableDurationSeconds: number[];
  windows: CandidateWindow[];
} => {
  const durationSeconds = analysis.sampleCount / sampleRate;
  const timelineFps = GOAL_FIVE_MUSIC_ANALYSIS_CONFIG.timelineFps;
  const maximumStartFrame = (windowSeconds: number) =>
    Math.max(0, Math.floor((durationSeconds - windowSeconds) * timelineFps));
  const anchorFrames = [
    0,
    Math.floor(durationSeconds * timelineFps),
    ...landmarks.sections.map((entry) => entry.sourceFrame),
    ...landmarks.phrases.map((entry) => entry.sourceFrame),
  ];
  const candidates = new Map<string, CandidateWindow>();
  const unavailableDurationSeconds: number[] = [];
  for (const duration of GOAL_FIVE_MUSIC_ANALYSIS_CONFIG.candidateDurationsSeconds) {
    if (duration > durationSeconds) {
      unavailableDurationSeconds.push(duration);
      continue;
    }
    const durationFrames = duration * timelineFps;
    for (const anchorFrame of anchorFrames) {
      for (const offsetRatio of [0, -0.25, -0.5, -1]) {
        const startFrame = Math.max(
          0,
          Math.min(
            maximumStartFrame(duration),
            Math.round(anchorFrame + durationFrames * offsetRatio),
          ),
        );
        const startSeconds = startFrame / timelineFps;
        const endSeconds = startSeconds + duration;
        const startSample = Math.round(startSeconds * sampleRate);
        const endSampleExclusive = Math.min(
          analysis.sampleCount,
          Math.round(endSeconds * sampleRate),
        );
        const metrics = computeWindowMetrics(
          analysis,
          startSeconds,
          duration,
          clippingObservation,
          landmarks,
        );
        const alignedToSection = landmarks.sections.some(
          (entry) =>
            Math.abs(entry.sourceFrame - startFrame) <= timelineFps ||
            Math.abs(entry.sourceFrame - (startFrame + durationFrames)) <=
              timelineFps,
        );
        const alignedToPhrase = landmarks.phrases.some(
          (entry) =>
            Math.abs(entry.sourceFrame - startFrame) <= 2 ||
            Math.abs(entry.sourceFrame - (startFrame + durationFrames)) <= 2,
        );
        const boundaryAlignment = alignedToSection
          ? 1
          : alignedToPhrase
            ? 0.75
            : startFrame === 0 || startFrame === maximumStartFrame(duration)
              ? 0.5
              : 0;
        const score = scoreWindowMetrics(
          metrics,
          beatConfidence,
          boundaryAlignment,
        );
        const id = `${trackId}-f${startFrame}-d${durationFrames}`;
        candidates.set(id, {
          id,
          rank: 0,
          source: {
            startSample,
            endSampleExclusive,
            startFrame,
            endFrameExclusive: startFrame + durationFrames,
            startSeconds: round(startSeconds),
            durationSeconds: duration,
          },
          score: score.total,
          scoreComponents: {
            multiActStructure: score.multiActStructure,
            dynamicRange: score.dynamicRange,
            energyArc: score.energyArc,
            directorialArc: score.directorialArc,
            beatDefinition: score.beatDefinition,
            transientDetail: score.transientDetail,
            spectralContrast: score.spectralContrast,
            boundaryAlignment: score.boundaryAlignment,
            silencePenalty: score.silencePenalty,
            clippingPenalty: score.clippingPenalty,
          },
          metrics,
        });
      }
    }
  }
  const disposition = selectDiverseCandidateWindows([...candidates.values()]);
  return {
    evaluatedCandidateCount: candidates.size,
    nearDuplicateRejectedCount: disposition.nearDuplicateRejectedCount,
    lowerRankRejectedCount: disposition.lowerRankRejectedCount,
    unavailableDurationSeconds,
    windows: disposition.windows,
  };
};

export const selectDiverseCandidateWindows = (
  candidates: readonly CandidateWindow[],
): {
  windows: CandidateWindow[];
  nearDuplicateRejectedCount: number;
  lowerRankRejectedCount: number;
} => {
  const timelineFps = GOAL_FIVE_MUSIC_ANALYSIS_CONFIG.timelineFps;
  const ranked = [...candidates].sort(
    (left, right) =>
      right.score - left.score ||
      left.source.startFrame - right.source.startFrame ||
      right.source.durationSeconds - left.source.durationSeconds,
  );
  const selected: CandidateWindow[] = [];
  let nearDuplicateRejectedCount = 0;
  let lowerRankRejectedCount = 0;
  for (const candidate of ranked) {
    const isDiverse = selected.every(
      (entry) =>
        Math.abs(entry.source.startFrame - candidate.source.startFrame) >=
        timelineFps * 4,
    );
    if (
      selected.length <
        GOAL_FIVE_MUSIC_ANALYSIS_CONFIG.maximumWindowsPerTrack &&
      isDiverse
    ) {
      selected.push({ ...candidate, rank: selected.length + 1 });
    } else if (!isDiverse) {
      nearDuplicateRejectedCount += 1;
    } else {
      lowerRankRejectedCount += 1;
    }
  }
  return {
    windows: selected,
    nearDuplicateRejectedCount,
    lowerRankRejectedCount,
  };
};

export const analyzeCompleteDecodedTrack = (
  trackId: string,
  channels: readonly Float32Array[],
  sampleRate: number,
) => {
  const signal: AudioSignal =
    channels.length === 1 ? channels[0]! : [channels[0]!, channels[1]!];
  const analysis = analyzeStandardAudioFrames(signal, {
    sampleRate,
    fps: GOAL_FIVE_MUSIC_ANALYSIS_CONFIG.analysisFps,
    fftSize: GOAL_FIVE_MUSIC_ANALYSIS_CONFIG.fftSize,
    spectrumBinCount: GOAL_FIVE_MUSIC_ANALYSIS_CONFIG.spectrumBinCount,
    waveformSampleCount: GOAL_FIVE_MUSIC_ANALYSIS_CONFIG.waveformSampleCount,
    minDecibels: GOAL_FIVE_MUSIC_ANALYSIS_CONFIG.minDecibels,
    maxDecibels: GOAL_FIVE_MUSIC_ANALYSIS_CONFIG.maxDecibels,
  });
  const onset = getSeries(analysis, 'onset-strength');
  const tempoResult = tempo(onset, {
    sr: analysis.fps,
    hopLength: 1,
    minBpm: 60,
    maxBpm: 190,
    method: 'ac',
    preferHigher: true,
    candidateCount: 5,
    snapToHalf: true,
  });
  const beatResult = beatTrack(onset, {
    sr: analysis.fps,
    hopLength: 1,
    minBpm: 60,
    maxBpm: 190,
    method: 'ac',
    tempo: tempoResult.tempo,
    optimizePhase: true,
  });
  const beats = Array.from(beatResult.beatsTimes ?? []).map((seconds) =>
    toLandmark(seconds, sampleRate),
  );
  const phrases = beats.filter(
    (_, index) => index % GOAL_FIVE_MUSIC_ANALYSIS_CONFIG.phraseBeats === 0,
  );
  const bins = buildAnalysisBins(analysis);
  const sections = detectStructuralLandmarks(bins, sampleRate);
  const transients = detectTransientLandmarks(onset, analysis.fps, sampleRate);
  const candidates = buildCandidateWindows(
    trackId,
    analysis,
    sampleRate,
    beatResult.confidence,
    createExactClippingObservation(channels),
    { sections, phrases, beats, transients: transients.events },
  );
  return {
    analysis,
    tempoResult,
    beatResult,
    beats,
    phrases,
    bins,
    sections,
    transients,
    candidates,
  };
};

const analyzeTrack = async (entry: InventoryEntry): Promise<TrackAnalysis> => {
  const decoded = await decodeVizAudioFileToPcm(
    resolve(repositoryRoot, entry.path),
  );
  if (decoded.sourceContentIdentity !== entry.contentIdentity) {
    throw new Error(
      `Decoded source identity drifted for ${entry.path}: ${decoded.sourceContentIdentity} != ${entry.contentIdentity}.`,
    );
  }
  const channels = decoded.pcm.channels;
  const pcmObservation = observeDecodedPcm(channels);
  const observation = analyzeCompleteDecodedTrack(
    toTrackId(entry.path),
    channels,
    decoded.pcm.sampleRate,
  );
  const {
    tempoResult,
    beatResult,
    beats,
    phrases,
    bins,
    sections,
    transients,
  } = observation;
  const { candidates } = observation;
  if (candidates.windows.length === 0) {
    throw new Error(
      `No eligible candidate window was produced for ${entry.path}.`,
    );
  }
  const decodedDurationSeconds =
    decoded.metadata.decodedSampleCount / decoded.metadata.decodedSampleRate;
  return {
    id: toTrackId(entry.path),
    source: entry,
    decode: {
      decoder: '@viz-engine/bake/node.decodeVizAudioFileToPcm',
      arguments: [
        '-v',
        'error',
        '-i',
        '<source-path>',
        '-map',
        '0:a:0',
        '-vn',
        '-sn',
        '-dn',
        '-ac',
        String(decoded.metadata.decodedChannelCount),
        '-ar',
        String(decoded.metadata.decodedSampleRate),
        '-f',
        'f32le',
        '-acodec',
        'pcm_f32le',
        'pipe:1',
      ],
      sourceSampleRate: decoded.metadata.sourceSampleRate,
      sourceChannelCount: decoded.metadata.sourceChannelCount,
      decodedSampleRate: decoded.metadata.decodedSampleRate,
      decodedChannelCount: decoded.metadata.decodedChannelCount,
      decodedSampleCount: decoded.metadata.decodedSampleCount,
      decodedDurationSeconds: round(decodedDurationSeconds),
      probedDurationSeconds:
        decoded.metadata.durationSeconds === undefined
          ? null
          : round(decoded.metadata.durationSeconds),
      probeDecodeDurationDeltaSeconds:
        decoded.metadata.durationSeconds === undefined
          ? null
          : round(decoded.metadata.durationSeconds - decodedDurationSeconds),
      pcm: pcmObservation,
    },
    rhythm: {
      interpretation:
        'Tempo candidates, beat positions, and eight-beat phrase boundaries are deterministic hypotheses; BPM aliases and perceived downbeats require human review.',
      tempoBpm: round(tempoResult.tempo),
      refinedTempoBpm:
        tempoResult.refinedTempo === undefined
          ? null
          : round(tempoResult.refinedTempo),
      tempoCandidatesBpm: Array.from(tempoResult.candidates).map((value) =>
        round(value),
      ),
      beatConfidence: round(beatResult.confidence),
      beatGridHypothesis: beats,
      phraseBoundaryHypotheses: phrases,
    },
    structure: {
      method:
        'one-second standardized feature-vector novelty; 3-second bilateral context; p60 local maxima; 6-second suppression',
      interpretation:
        'Novelty peaks are section-boundary hypotheses, not asserted musical sections or labels.',
      sectionBoundaryHypotheses: sections,
    },
    transients,
    analysisBins: bins,
    candidateSearch: {
      completeTrackSearched: true,
      evaluatedCandidateCount: candidates.evaluatedCandidateCount,
      retainedCandidateCount: candidates.windows.length,
      nearDuplicateRejectedCount: candidates.nearDuplicateRejectedCount,
      lowerRankRejectedCount: candidates.lowerRankRejectedCount,
      unavailableDurationSeconds: candidates.unavailableDurationSeconds,
      policy:
        'Evaluate 48/52/56/60-second windows from every detected section and eight-beat phrase anchor at start, quarter, midpoint, and end alignment plus complete-track endpoints; snap to 60-fps frames; retain the three highest-scoring starts separated by at least four seconds with stable numeric/start/duration ordering.',
    },
    candidateWindows: candidates.windows,
  };
};

export const selectAuthorizedMusicCandidates = (
  entries: readonly InventoryEntry[],
): InventoryEntry[] => {
  const candidates = entries
    .filter(
      (entry) =>
        entry.kind === 'audio' &&
        entry.role === 'source-music' &&
        entry.goalFiveUse === 'candidate' &&
        entry.availability === 'present-at-audit-revision',
    )
    .sort((left, right) => left.path.localeCompare(right.path));
  if (candidates.length !== 14) {
    throw new Error(
      `Expected 14 authorized source-music candidates, found ${candidates.length}.`,
    );
  }
  return candidates;
};

const readInventory = (): {
  inventory: InputInventory;
  bytes: Buffer;
  candidates: InventoryEntry[];
} => {
  const bytes = readFileSync(resolve(repositoryRoot, inventoryRelativePath));
  const inventory = JSON.parse(bytes.toString('utf8')) as InputInventory;
  if (inventory.auditRevision !== inputAuditRevision) {
    throw new Error(
      `Authorized input inventory revision drifted: ${inventory.auditRevision}.`,
    );
  }
  const candidates = selectAuthorizedMusicCandidates(inventory.entries);
  return { inventory, bytes, candidates };
};

const validateCurrentSourceIdentities = (
  candidates: readonly InventoryEntry[],
): void => {
  for (const entry of candidates) {
    const identity = contentIdentity(
      readFileSync(resolve(repositoryRoot, entry.path)),
    );
    if (identity !== entry.contentIdentity) {
      throw new Error(
        `Authorized source bytes drifted for ${entry.path}: ${identity} != ${entry.contentIdentity}.`,
      );
    }
  }
};

const createArtifact = async (): Promise<MusicWindowArtifact> => {
  const { bytes, candidates } = readInventory();
  validateCurrentSourceIdentities(candidates);
  const tracks: TrackAnalysis[] = [];
  for (const candidate of candidates)
    tracks.push(await analyzeTrack(candidate));
  const rankedWindows = tracks
    .flatMap((track) =>
      track.candidateWindows.map((window) => ({
        id: window.id,
        trackId: track.id,
        rank: window.rank,
        score: window.score,
      })),
    )
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.rank - right.rank ||
        left.id.localeCompare(right.id),
    );
  const provisional = rankedWindows[0];
  if (!provisional)
    throw new Error('Music analysis produced no ranked window.');
  const alternatives: typeof rankedWindows = [];
  for (const candidate of rankedWindows.slice(1)) {
    if (
      candidate.trackId !== provisional.trackId &&
      alternatives.every((entry) => entry.trackId !== candidate.trackId)
    ) {
      alternatives.push(candidate);
    }
    if (alternatives.length === 4) break;
  }
  return {
    schemaVersion: 1,
    kind: 'viz-engine-goal-five-music-window-analysis',
    analysisVersion: GOAL_FIVE_MUSIC_ANALYSIS_VERSION,
    identityScope: {
      implementationBaseline,
      inputAuditRevision,
      inventoryPath: inventoryRelativePath,
      inventoryContentIdentity: contentIdentity(bytes),
      sourceSelection:
        'entries where kind=audio, role=source-music, goalFiveUse=candidate, and availability=present-at-audit-revision',
    },
    ownership: {
      canonicalInputs: [
        '@viz-engine/bake/node.decodeVizAudioFileToPcm',
        '@viz-engine/rhythm-core.analyzeStandardAudioFrames',
        '@viz-engine/rhythm-core.tempo',
        '@viz-engine/rhythm-core.beatTrack',
      ],
      observationOwner: 'tools/foundation/analyze-goal-five-music-windows.ts',
      forbiddenOwners: [
        'VizProjectDocument',
        'VizSession',
        'runtime graph semantics',
        'React editor state',
        'production component implementations',
      ],
    },
    determinism: {
      scope:
        'Exact for the recorded source bytes, canonical decoder implementation, FFmpeg/FFprobe versions, Node runtime, analysis version, and numeric configuration.',
      environment: {
        node: process.version,
        platform: process.platform,
        architecture: process.arch,
        ffmpeg: commandVersion('ffmpeg'),
        ffprobe: commandVersion('ffprobe'),
      },
      algorithmIdentities: [
        GOAL_FIVE_MUSIC_ANALYSIS_VERSION,
        STANDARD_AUDIO_FRAME_ANALYSIS_VERSION,
        'rhythm-core.tempo.autocorrelation',
        'rhythm-core.beat-track.phase-optimized',
      ],
      algorithmSourceIdentities: readAlgorithmSourceIdentities(),
      algorithmSourceIdentityPolicy,
      decodeArguments: [
        '-v error',
        '-i <source-path>',
        '-map 0:a:0',
        '-vn -sn -dn',
        '-ac <one-or-two-source-derived-channels>',
        '-ar <source-sample-rate>',
        '-f f32le',
        '-acodec pcm_f32le',
        'pipe:1',
      ],
      config: GOAL_FIVE_MUSIC_ANALYSIS_CONFIG,
    },
    summary: {
      eligibleTrackCount: candidates.length,
      analyzedTrackCount: tracks.length,
      failedTrackCount: 0,
      candidateWindowCount: tracks.reduce(
        (sum, track) => sum + track.candidateWindows.length,
        0,
      ),
      minimumWindowSeconds:
        GOAL_FIVE_MUSIC_ANALYSIS_CONFIG.minimumWindowSeconds,
      maximumWindowSeconds:
        GOAL_FIVE_MUSIC_ANALYSIS_CONFIG.maximumWindowSeconds,
    },
    tracks,
    recommendation: {
      basis:
        'Deterministic structure, energy contrast, rhythmic definition, transient detail, spectral contrast, boundary alignment, silence, and clipping observations; not an aesthetic verdict.',
      provisionalWindowId: provisional.id,
      alternativeWindowIds: alternatives.map((entry) => entry.id),
      rankedWindowIds: rankedWindows.map((entry) => entry.id),
      humanBoundary:
        'Gate 1 must judge intended audio, emotional fit, vocal/content preference, and whether the selected window supports the approved visual treatment. Automated rank is advisory.',
    },
  };
};

const assertArtifactShape = (artifact: MusicWindowArtifact): void => {
  if (
    artifact.schemaVersion !== 1 ||
    artifact.kind !== 'viz-engine-goal-five-music-window-analysis' ||
    artifact.analysisVersion !== GOAL_FIVE_MUSIC_ANALYSIS_VERSION
  ) {
    throw new Error('Music-window artifact contract is invalid.');
  }
  if (
    artifact.summary.eligibleTrackCount !== 14 ||
    artifact.summary.analyzedTrackCount !== 14 ||
    artifact.summary.failedTrackCount !== 0 ||
    artifact.tracks.length !== 14
  ) {
    throw new Error('Music-window artifact does not cover all 14 candidates.');
  }
  if (
    artifact.determinism.algorithmSourceIdentityPolicy !==
      algorithmSourceIdentityPolicy ||
    artifact.determinism.algorithmSourceIdentities.length === 0 ||
    artifact.determinism.algorithmSourceIdentities.some(
      ({ path, contentIdentity: identity }) =>
        path.length === 0 || !/^sha256:[0-9a-f]{64}$/u.test(identity),
    )
  ) {
    throw new Error('Music-window algorithm source identities are invalid.');
  }
  const ids = new Set<string>();
  for (const track of artifact.tracks) {
    if (
      track.candidateWindows.length !==
      GOAL_FIVE_MUSIC_ANALYSIS_CONFIG.maximumWindowsPerTrack
    ) {
      throw new Error(`${track.id} does not retain three candidate windows.`);
    }
    if (
      track.candidateSearch.evaluatedCandidateCount !==
      track.candidateSearch.retainedCandidateCount +
        track.candidateSearch.nearDuplicateRejectedCount +
        track.candidateSearch.lowerRankRejectedCount
    ) {
      throw new Error(`${track.id} candidate disposition is incomplete.`);
    }
    if (
      !/^sha256:[0-9a-f]{64}$/u.test(track.source.contentIdentity) ||
      !/^sha256:[0-9a-f]{64}$/u.test(track.decode.pcm.contentIdentity) ||
      track.decode.decodedSampleCount <= 0 ||
      track.decode.decodedSampleRate <= 0
    ) {
      throw new Error(`${track.id} has invalid source or PCM identity.`);
    }
    for (const window of track.candidateWindows) {
      if (ids.has(window.id)) throw new Error(`Duplicate window ${window.id}.`);
      ids.add(window.id);
      if (
        window.source.durationSeconds <
          GOAL_FIVE_MUSIC_ANALYSIS_CONFIG.minimumWindowSeconds ||
        window.source.durationSeconds >
          GOAL_FIVE_MUSIC_ANALYSIS_CONFIG.maximumWindowSeconds ||
        window.source.endSampleExclusive <= window.source.startSample ||
        window.source.endFrameExclusive <= window.source.startFrame ||
        window.source.endSampleExclusive > track.decode.decodedSampleCount
      ) {
        throw new Error(`${window.id} has invalid source coordinates.`);
      }
      const expectedStartSample = Math.round(
        (window.source.startFrame /
          GOAL_FIVE_MUSIC_ANALYSIS_CONFIG.timelineFps) *
          track.decode.decodedSampleRate,
      );
      const expectedEndSample = Math.round(
        (window.source.endFrameExclusive /
          GOAL_FIVE_MUSIC_ANALYSIS_CONFIG.timelineFps) *
          track.decode.decodedSampleRate,
      );
      if (
        Math.abs(window.source.startSample - expectedStartSample) > 1 ||
        Math.abs(window.source.endSampleExclusive - expectedEndSample) > 1
      ) {
        throw new Error(
          `${window.id} frame/sample coordinates disagree by more than one sample.`,
        );
      }
      for (const value of [
        window.score,
        ...Object.values(window.scoreComponents),
        ...window.metrics.energy.quartileMeans,
      ]) {
        if (!Number.isFinite(value)) {
          throw new Error(`${window.id} contains a non-finite observation.`);
        }
      }
    }
  }
  if (!ids.has(artifact.recommendation.provisionalWindowId)) {
    throw new Error('The provisional recommendation is not a retained window.');
  }
  if (artifact.recommendation.alternativeWindowIds.some((id) => !ids.has(id))) {
    throw new Error('A recommended alternative is not a retained window.');
  }
};

const formatArtifact = async (
  artifact: MusicWindowArtifact,
): Promise<string> => {
  const prettier = await import('prettier');
  return prettier.format(JSON.stringify(artifact), { parser: 'json' });
};

const artifactArgumentIndex = process.argv.indexOf('--artifact');
const artifactPath = resolve(
  repositoryRoot,
  artifactArgumentIndex === -1
    ? artifactRelativePath
    : process.argv[artifactArgumentIndex + 1]!,
);
const writeMode = process.argv.includes('--write');
const recomputeMode = process.argv.includes('--recompute');
const historicalOnlyMode = process.argv.includes('--verify-historical');

const validatePinnedArtifact = (): MusicWindowArtifact => {
  const bytes = readFileSync(artifactPath);
  const identity = contentIdentity(bytes);
  if (identity !== expectedArtifactIdentity) {
    throw new Error(
      `The complete historical music-window analysis digest drifted: ${identity} != ${expectedArtifactIdentity}.`,
    );
  }
  const artifact = JSON.parse(bytes.toString('utf8')) as MusicWindowArtifact;
  assertArtifactShape(artifact);
  if (!historicalOnlyMode) {
    validateAlgorithmSourceIdentities(
      artifact.determinism.algorithmSourceIdentities,
    );
  }
  return artifact;
};

const main = async (): Promise<void> => {
  if (writeMode) {
    const artifact = await createArtifact();
    assertArtifactShape(artifact);
    writeFileSync(artifactPath, await formatArtifact(artifact));
    process.stdout.write(
      `Wrote Goal Five music-window analysis for ${artifact.tracks.length} tracks and ${artifact.summary.candidateWindowCount} retained windows.\n`,
    );
    return;
  }
  const artifact = validatePinnedArtifact();
  if (!historicalOnlyMode) {
    const { candidates, bytes } = readInventory();
    validateCurrentSourceIdentities(candidates);
    if (
      artifact.identityScope.inventoryContentIdentity !== contentIdentity(bytes)
    ) {
      throw new Error('Music-window analysis inventory identity drifted.');
    }
  }
  if (recomputeMode) {
    const recomputed = await createArtifact();
    const expected = await formatArtifact(recomputed);
    const actual = readFileSync(artifactPath, 'utf8');
    if (actual !== expected) {
      throw new Error(
        'Recomputed music-window analysis differs from the pinned artifact.',
      );
    }
  }
  process.stdout.write(
    `Validated Goal Five music-window analysis (${artifact.summary.analyzedTrackCount} tracks, ${artifact.summary.candidateWindowCount} retained windows, provisional ${artifact.recommendation.provisionalWindowId}).\n`,
  );
};

const isEntrypoint =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isEntrypoint) void main();
