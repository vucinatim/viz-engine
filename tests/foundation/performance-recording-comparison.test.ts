import { describe, expect, it } from 'vitest';
import {
  comparePerformanceRecordings,
  summarizePerformanceRecording,
} from '../../tools/foundation/compare-performance-recordings';

function recording(
  overrides: {
    fps?: number[];
    frameTimes?: number[][];
    gpu?: string;
    memory?: number[];
  } = {},
) {
  const fps = overrides.fps ?? [60, 61, 59];
  const memory = overrides.memory ?? [100, 101, 102];
  const frameTimes = overrides.frameTimes ?? [
    [16, 17],
    [15, 16],
    [16, 18],
  ];

  return {
    session: {
      duration: 30_000,
      metadata: {
        browser: 'Chrome 150.0.0.0',
        devicePixelRatio: 2,
        gpu: overrides.gpu ?? 'Test GPU',
        physicalResolution: '2560x1440',
        platform: 'MacOS',
        screenResolution: '1280x720',
      },
      name: 'simple-example',
      sampleRate: 500,
      snapshots: fps.map((editorFPS, index) => ({
        activeLayerCount: 3,
        activeNodeNetworkCount: 3,
        editorFPS,
        frameTimes: frameTimes[index],
        layers: [
          { layerName: 'Fullscreen Shader' },
          { layerName: 'Noise Shader' },
          { layerName: 'Simple Cube' },
        ],
        memoryUsedMB: memory[index],
        timestamp: index * 15_000,
      })),
    },
  };
}

describe('performance recording comparison', () => {
  it('summarizes raw recorder samples without trusting exported statistics', () => {
    expect(summarizePerformanceRecording(recording())).toMatchObject({
      durationMs: 30_000,
      fixture: {
        activeLayerCount: 3,
        activeNodeNetworkCount: 3,
        layerNames: ['Fullscreen Shader', 'Noise Shader', 'Simple Cube'],
      },
      fps: {
        mean: 60,
        median: 60,
      },
      memoryMB: {
        end: 102,
        growth: 2,
        start: 100,
      },
      sampleCount: 3,
      sampleRateMs: 500,
    });
  });

  it('accepts an equivalent fixed-device run', () => {
    const comparison = comparePerformanceRecordings(recording(), recording());

    expect(comparison.pass).toBe(true);
    expect(comparison.checks.every((check) => check.pass)).toBe(true);
  });

  it('rejects mismatched devices and material runtime regressions', () => {
    const comparison = comparePerformanceRecordings(
      recording(),
      recording({
        fps: [30, 31, 29],
        frameTimes: [
          [30, 35],
          [31, 40],
          [32, 55],
        ],
        gpu: 'Different GPU',
        memory: [100, 160, 240],
      }),
    );

    expect(comparison.pass).toBe(false);
    expect(
      comparison.checks.filter((check) => !check.pass).map((check) => check.id),
    ).toEqual(
      expect.arrayContaining([
        'environment.gpu',
        'performance.mean-fps',
        'performance.p05-fps',
        'performance.p95-frame-time',
        'performance.max-frame-time',
        'stability.memory-growth',
        'stability.memory-slope',
      ]),
    );
  });
});
