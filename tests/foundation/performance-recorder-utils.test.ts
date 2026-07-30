import { describe, expect, it } from 'vitest';

import type { RecordingSession } from '../../src/lib/stores/performance-recorder-types';
import { computePerformanceBreakdown } from '../../src/lib/stores/performance-recorder-utils';

const session = {
  id: 'recording-1',
  name: 'Performance fixture',
  description: '',
  tags: [],
  startTime: 0,
  endTime: 1_000,
  duration: 1_000,
  sampleRate: 500,
  metadata: {
    browser: 'Test',
    userAgent: 'Test',
    gpu: 'Test',
    timestamp: '2026-07-31T00:00:00.000Z',
    platform: 'Test',
    screenResolution: '1920x1080',
    devicePixelRatio: 1,
    physicalResolution: '1920x1080',
  },
  snapshots: [
    {
      timestamp: 1_000,
      editorFPS: 50,
      editorAvgFPS: 55,
      memoryUsedMB: 100,
      cpuUsage: 25,
      activeLayerCount: 1,
      activeNodeNetworkCount: 1,
      layers: [
        {
          layerId: 'layer-1',
          layerName: 'Stage',
          renderTime: 10,
          drawCalls: 4,
        },
      ],
      nodeNetworks: [
        {
          parameterId: 'layer-Stage-123:intensity',
          parameterName: 'Intensity',
          computeTime: 0.2,
          nodeCount: 3,
        },
      ],
    },
    {
      timestamp: 2_000,
      editorFPS: 25,
      editorAvgFPS: 40,
      memoryUsedMB: 110,
      cpuUsage: 50,
      activeLayerCount: 1,
      activeNodeNetworkCount: 1,
      layers: [
        {
          layerId: 'layer-1',
          layerName: 'Stage',
          renderTime: 50,
          drawCalls: 6,
        },
      ],
      nodeNetworks: [
        {
          parameterId: 'layer-Stage-123:intensity',
          parameterName: 'Intensity',
          computeTime: 0.4,
          nodeCount: 5,
        },
      ],
    },
  ],
} as RecordingSession;

describe('performance report projection', () => {
  it('builds one canonical time-series and aggregate projection', () => {
    expect(computePerformanceBreakdown(session)).toEqual({
      timeSeries: [
        {
          time: 0,
          timeLabel: '0.0s',
          fps: 50,
          avgFps: 55,
          memory: 100,
          frameBudget: 25,
          layers: 1,
          nodeNetworks: 1,
        },
        {
          time: 1,
          timeLabel: '1.0s',
          fps: 25,
          avgFps: 40,
          memory: 110,
          frameBudget: 50,
          layers: 1,
          nodeNetworks: 1,
        },
      ],
      layers: [
        {
          layerId: 'layer-1',
          name: 'Stage',
          avgRenderTime: 30,
          maxRenderTime: 40,
          rawAvgRenderTime: 30,
          rawMaxRenderTime: 50,
          avgDrawCalls: 5,
        },
      ],
      nodeNetworks: [
        {
          parameterId: 'layer-Stage-123:intensity',
          name: 'Intensity',
          layerName: 'Stage',
          avgComputeTime: 0.3,
          maxComputeTime: 0.4,
          rawAvgComputeTime: 0.30000000000000004,
          nodeCount: 4,
        },
      ],
    });
  });

  it('handles an empty recording without inventing report data', () => {
    expect(computePerformanceBreakdown({ ...session, snapshots: [] })).toEqual({
      layers: [],
      nodeNetworks: [],
      timeSeries: [],
    });
  });
});
