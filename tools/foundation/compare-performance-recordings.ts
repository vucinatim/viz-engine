import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';

interface RecordingMetadata {
  browser: string;
  devicePixelRatio: number;
  gpu: string;
  physicalResolution: string;
  platform: string;
  screenResolution: string;
}

interface LayerSnapshot {
  layerName: string;
}

interface PerformanceSnapshot {
  activeLayerCount: number;
  activeNodeNetworkCount: number;
  editorFPS: number;
  frameTimes: number[];
  memoryUsedMB: number;
  timestamp: number;
  layers: LayerSnapshot[];
}

interface RecordingSession {
  duration: number;
  metadata: RecordingMetadata;
  name: string;
  sampleRate: number;
  snapshots: PerformanceSnapshot[];
}

export interface PerformanceRecordingSummary {
  durationMs: number;
  environment: Omit<RecordingMetadata, 'browser'> & {
    browser: string;
  };
  fixture: {
    activeLayerCount: number;
    activeNodeNetworkCount: number;
    layerNames: string[];
  };
  fps: {
    mean: number;
    min: number;
    p05: number;
    median: number;
  };
  frameTimeMs: {
    mean: number;
    max: number;
    p95: number;
  };
  memoryMB: {
    end: number;
    growth: number;
    mean: number;
    slopePerMinute: number;
    start: number;
  };
  name: string;
  sampleCount: number;
  sampleRateMs: number;
}

export interface PerformanceComparisonBudget {
  fpsMeanRatioMin: number;
  fpsP05RatioMin: number;
  frameTimeMaxAbsoluteMs: number;
  frameTimeP95AbsoluteMs: number;
  frameTimeP95RatioMax: number;
  memoryGrowthAllowanceMB: number;
  memoryMeanAllowanceMB: number;
  memoryMeanRatioMax: number;
  memorySlopeAllowanceMBPerMinute: number;
}

export interface PerformanceComparisonCheck {
  actual: string | number;
  expected: string | number;
  id: string;
  pass: boolean;
}

export interface PerformanceComparison {
  baseline: PerformanceRecordingSummary;
  budget: PerformanceComparisonBudget;
  candidate: PerformanceRecordingSummary;
  checks: PerformanceComparisonCheck[];
  pass: boolean;
}

export const DEFAULT_PERFORMANCE_COMPARISON_BUDGET: PerformanceComparisonBudget =
  {
    fpsMeanRatioMin: 0.9,
    fpsP05RatioMin: 0.85,
    frameTimeMaxAbsoluteMs: 50,
    frameTimeP95AbsoluteMs: 20,
    frameTimeP95RatioMax: 1.15,
    memoryGrowthAllowanceMB: 32,
    memoryMeanAllowanceMB: 64,
    memoryMeanRatioMax: 1.25,
    memorySlopeAllowanceMBPerMinute: 5,
  };

function assertFiniteNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }

  return value;
}

function assertString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }

  return value;
}

function parseSession(value: unknown): RecordingSession {
  const candidate =
    typeof value === 'object' &&
    value !== null &&
    'session' in value &&
    typeof value.session === 'object'
      ? value.session
      : value;

  if (
    typeof candidate !== 'object' ||
    candidate === null ||
    !('metadata' in candidate) ||
    !('snapshots' in candidate) ||
    !Array.isArray(candidate.snapshots) ||
    candidate.snapshots.length === 0
  ) {
    throw new Error('recording must contain a non-empty session');
  }

  const candidateRecord = candidate as Record<string, unknown>;
  const metadata = candidateRecord.metadata;
  if (typeof metadata !== 'object' || metadata === null) {
    throw new Error('recording metadata is missing');
  }
  const metadataRecord = metadata as Record<string, unknown>;

  const snapshots = (candidateRecord.snapshots as unknown[]).map(
    (snapshot, index) => {
      if (typeof snapshot !== 'object' || snapshot === null) {
        throw new Error(`snapshot ${index} is malformed`);
      }
      const snapshotRecord = snapshot as Record<string, unknown>;

      if (
        !Array.isArray(snapshotRecord.frameTimes) ||
        !Array.isArray(snapshotRecord.layers)
      ) {
        throw new Error(`snapshot ${index} is malformed`);
      }

      return {
        activeLayerCount: assertFiniteNumber(
          snapshotRecord.activeLayerCount,
          `snapshot ${index} activeLayerCount`,
        ),
        activeNodeNetworkCount: assertFiniteNumber(
          snapshotRecord.activeNodeNetworkCount,
          `snapshot ${index} activeNodeNetworkCount`,
        ),
        editorFPS: assertFiniteNumber(
          snapshotRecord.editorFPS,
          `snapshot ${index} editorFPS`,
        ),
        frameTimes: snapshotRecord.frameTimes.map((frameTime, frameIndex) =>
          assertFiniteNumber(
            frameTime,
            `snapshot ${index} frameTimes[${frameIndex}]`,
          ),
        ),
        layers: snapshotRecord.layers.map((layer, layerIndex) => {
          if (typeof layer !== 'object' || layer === null) {
            throw new Error(
              `snapshot ${index} layer ${layerIndex} is malformed`,
            );
          }
          const layerRecord = layer as Record<string, unknown>;

          return {
            layerName: assertString(
              layerRecord.layerName,
              `snapshot ${index} layer ${layerIndex} name`,
            ),
          };
        }),
        memoryUsedMB: assertFiniteNumber(
          snapshotRecord.memoryUsedMB,
          `snapshot ${index} memoryUsedMB`,
        ),
        timestamp: assertFiniteNumber(
          snapshotRecord.timestamp,
          `snapshot ${index} timestamp`,
        ),
      };
    },
  );

  return {
    duration: assertFiniteNumber(
      candidateRecord.duration,
      'session duration',
    ),
    metadata: {
      browser: assertString(metadataRecord.browser, 'metadata browser'),
      devicePixelRatio: assertFiniteNumber(
        metadataRecord.devicePixelRatio,
        'metadata devicePixelRatio',
      ),
      gpu: assertString(metadataRecord.gpu, 'metadata gpu'),
      physicalResolution: assertString(
        metadataRecord.physicalResolution,
        'metadata physicalResolution',
      ),
      platform: assertString(metadataRecord.platform, 'metadata platform'),
      screenResolution: assertString(
        metadataRecord.screenResolution,
        'metadata screenResolution',
      ),
    },
    name: assertString(candidateRecord.name, 'session name'),
    sampleRate: assertFiniteNumber(
      candidateRecord.sampleRate,
      'session sampleRate',
    ),
    snapshots,
  };
}

function mean(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function percentile(values: number[], percentileValue: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  const index = (percentileValue / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function slopePerMinute(
  timestamps: number[],
  values: number[],
): number {
  if (timestamps.length < 2) {
    return 0;
  }

  const origin = timestamps[0];
  const minutes = timestamps.map((timestamp) => (timestamp - origin) / 60_000);
  const meanTime = mean(minutes);
  const meanValue = mean(values);
  let numerator = 0;
  let denominator = 0;

  for (let index = 0; index < minutes.length; index += 1) {
    const timeDelta = minutes[index] - meanTime;
    numerator += timeDelta * (values[index] - meanValue);
    denominator += timeDelta * timeDelta;
  }

  return denominator === 0 ? 0 : numerator / denominator;
}

export function summarizePerformanceRecording(
  recording: unknown,
): PerformanceRecordingSummary {
  const session = parseSession(recording);
  const fpsValues = session.snapshots.map((snapshot) => snapshot.editorFPS);
  const frameTimes = session.snapshots.flatMap(
    (snapshot) => snapshot.frameTimes,
  );
  const memoryValues = session.snapshots.map(
    (snapshot) => snapshot.memoryUsedMB,
  );
  const timestamps = session.snapshots.map((snapshot) => snapshot.timestamp);
  const firstSnapshot = session.snapshots[0];

  if (frameTimes.length === 0) {
    throw new Error('recording must contain frame-time samples');
  }

  return {
    durationMs: session.duration,
    environment: session.metadata,
    fixture: {
      activeLayerCount: firstSnapshot.activeLayerCount,
      activeNodeNetworkCount: firstSnapshot.activeNodeNetworkCount,
      layerNames: Array.from(
        new Set(firstSnapshot.layers.map((layer) => layer.layerName)),
      ).sort(),
    },
    fps: {
      mean: mean(fpsValues),
      min: Math.min(...fpsValues),
      p05: percentile(fpsValues, 5),
      median: percentile(fpsValues, 50),
    },
    frameTimeMs: {
      mean: mean(frameTimes),
      max: Math.max(...frameTimes),
      p95: percentile(frameTimes, 95),
    },
    memoryMB: {
      end: memoryValues.at(-1) ?? 0,
      growth: (memoryValues.at(-1) ?? 0) - memoryValues[0],
      mean: mean(memoryValues),
      slopePerMinute: slopePerMinute(timestamps, memoryValues),
      start: memoryValues[0],
    },
    name: session.name,
    sampleCount: session.snapshots.length,
    sampleRateMs: session.sampleRate,
  };
}

function sameValues(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

export function comparePerformanceRecordings(
  baselineRecording: unknown,
  candidateRecording: unknown,
  budget: PerformanceComparisonBudget = DEFAULT_PERFORMANCE_COMPARISON_BUDGET,
): PerformanceComparison {
  const baseline = summarizePerformanceRecording(baselineRecording);
  const candidate = summarizePerformanceRecording(candidateRecording);
  const checks: PerformanceComparisonCheck[] = [];

  const exact = (
    id: string,
    actual: string | number,
    expected: string | number,
  ) => {
    checks.push({ actual, expected, id, pass: actual === expected });
  };
  const atLeast = (id: string, actual: number, expected: number) => {
    checks.push({ actual, expected, id, pass: actual >= expected });
  };
  const atMost = (id: string, actual: number, expected: number) => {
    checks.push({ actual, expected, id, pass: actual <= expected });
  };

  exact(
    'environment.browser',
    candidate.environment.browser,
    baseline.environment.browser,
  );
  exact('environment.gpu', candidate.environment.gpu, baseline.environment.gpu);
  exact(
    'environment.platform',
    candidate.environment.platform,
    baseline.environment.platform,
  );
  exact(
    'environment.screen-resolution',
    candidate.environment.screenResolution,
    baseline.environment.screenResolution,
  );
  exact(
    'environment.device-pixel-ratio',
    candidate.environment.devicePixelRatio,
    baseline.environment.devicePixelRatio,
  );
  exact(
    'environment.physical-resolution',
    candidate.environment.physicalResolution,
    baseline.environment.physicalResolution,
  );
  exact(
    'recording.sample-rate',
    candidate.sampleRateMs,
    baseline.sampleRateMs,
  );
  atLeast(
    'recording.duration-min',
    candidate.durationMs,
    baseline.durationMs * 0.95,
  );
  atMost(
    'recording.duration-max',
    candidate.durationMs,
    baseline.durationMs * 1.05,
  );
  atLeast(
    'recording.sample-count-min',
    candidate.sampleCount,
    Math.floor(baseline.sampleCount * 0.95),
  );
  atMost(
    'recording.sample-count-max',
    candidate.sampleCount,
    Math.ceil(baseline.sampleCount * 1.05),
  );
  exact(
    'fixture.active-layer-count',
    candidate.fixture.activeLayerCount,
    baseline.fixture.activeLayerCount,
  );
  exact(
    'fixture.active-node-network-count',
    candidate.fixture.activeNodeNetworkCount,
    baseline.fixture.activeNodeNetworkCount,
  );
  checks.push({
    actual: candidate.fixture.layerNames.join(', '),
    expected: baseline.fixture.layerNames.join(', '),
    id: 'fixture.layer-names',
    pass: sameValues(
      candidate.fixture.layerNames,
      baseline.fixture.layerNames,
    ),
  });

  atLeast(
    'performance.mean-fps',
    candidate.fps.mean,
    baseline.fps.mean * budget.fpsMeanRatioMin,
  );
  atLeast(
    'performance.p05-fps',
    candidate.fps.p05,
    baseline.fps.p05 * budget.fpsP05RatioMin,
  );
  atMost(
    'performance.p95-frame-time',
    candidate.frameTimeMs.p95,
    Math.min(
      budget.frameTimeP95AbsoluteMs,
      baseline.frameTimeMs.p95 * budget.frameTimeP95RatioMax,
    ),
  );
  atMost(
    'performance.max-frame-time',
    candidate.frameTimeMs.max,
    budget.frameTimeMaxAbsoluteMs,
  );
  atMost(
    'performance.mean-memory',
    candidate.memoryMB.mean,
    Math.min(
      baseline.memoryMB.mean * budget.memoryMeanRatioMax,
      baseline.memoryMB.mean + budget.memoryMeanAllowanceMB,
    ),
  );
  atMost(
    'stability.memory-growth',
    candidate.memoryMB.growth,
    baseline.memoryMB.growth + budget.memoryGrowthAllowanceMB,
  );
  atMost(
    'stability.memory-slope',
    candidate.memoryMB.slopePerMinute,
    baseline.memoryMB.slopePerMinute +
      budget.memorySlopeAllowanceMBPerMinute,
  );

  return {
    baseline,
    budget,
    candidate,
    checks,
    pass: checks.every((check) => check.pass),
  };
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8')) as unknown;
}

export async function runPerformanceRecordingComparisonCli(): Promise<void> {
  const { values } = parseArgs({
    options: {
      baseline: { type: 'string' },
      candidate: { type: 'string' },
    },
  });

  if (!values.baseline || !values.candidate) {
    throw new Error(
      'usage: pnpm compare:runtime-performance --baseline <v1.json> --candidate <v2.json>',
    );
  }

  const comparison = comparePerformanceRecordings(
    await readJson(values.baseline),
    await readJson(values.candidate),
  );
  process.stdout.write(`${JSON.stringify(comparison, null, 2)}\n`);

  if (!comparison.pass) {
    process.exitCode = 1;
  }
}
