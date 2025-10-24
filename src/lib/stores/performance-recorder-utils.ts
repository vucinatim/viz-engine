// Performance Recorder Utility Functions

import type {
  LayerSnapshot,
  NodeNetworkSnapshot,
  PerformanceSnapshot,
  RecordingSession,
  SessionMetadata,
  SessionStatistics,
} from './performance-recorder-types';
import type { ProfilerState } from './profiler-store';

// ============================================
// Snapshot Creation
// ============================================

/**
 * Creates a performance snapshot from the current profiler state
 * Flattens the nested structures for easier storage and analysis
 */
export function createSnapshotFromProfiler(
  profilerState: ProfilerState,
): PerformanceSnapshot {
  // Read memory directly for fresh values (not from cached profiler state)
  let memoryUsedMB = profilerState.memory.usedJSHeapSize;
  let memoryTotalMB = profilerState.memory.totalJSHeapSize;
  let memoryLimitMB = profilerState.memory.jsHeapSizeLimit;
  let memoryPercentage = profilerState.memory.percentage;

  // Try to get fresh memory reading directly from performance API
  if (typeof window !== 'undefined' && (performance as any).memory) {
    const perfMemory = (performance as any).memory;
    memoryUsedMB = perfMemory.usedJSHeapSize / (1024 * 1024);
    memoryTotalMB = perfMemory.totalJSHeapSize / (1024 * 1024);
    memoryLimitMB = perfMemory.jsHeapSizeLimit / (1024 * 1024);
    memoryPercentage = (memoryUsedMB / memoryLimitMB) * 100;
  }

  return {
    timestamp: performance.now(),

    // Editor FPS (flatten FPSMetrics)
    editorFPS: profilerState.editorFPS.current,
    editorAvgFPS: profilerState.editorFPS.average,
    editorMinFPS:
      profilerState.editorFPS.min === Infinity
        ? 0
        : profilerState.editorFPS.min,
    editorMaxFPS: profilerState.editorFPS.max,

    // Frame time metrics
    frameTimes: profilerState.frameTimes,
    maxFrameTime: profilerState.maxFrameTime,
    meanFrameTime: profilerState.meanFrameTime,

    // Memory (use fresh readings from above)
    memoryUsedMB,
    memoryTotalMB,
    memoryLimitMB,
    memoryPercentage,

    // CPU
    cpuUsage: profilerState.cpu.usage,
    cpuTaskDuration: profilerState.cpu.taskDuration,

    // IndexedDB
    indexedDBUsageMB: profilerState.indexedDB.usage,
    indexedDBQuotaMB: profilerState.indexedDB.quota,
    indexedDBPercentage: profilerState.indexedDB.percentage,

    // Layers (convert Map → Array, focus on actionable metrics)
    layers: Array.from(profilerState.layerFPSMap.values()).map(
      (layer): LayerSnapshot => ({
        layerId: layer.layerId,
        layerName: layer.layerName,
        renderTime: layer.renderTime,
        drawCalls: layer.drawCalls,
        // Note: FPS metrics removed as they are redundant with editor FPS
      }),
    ),

    // Node Networks (convert Map → Array)
    nodeNetworks: Array.from(profilerState.nodeNetworkMap.values()).map(
      (network): NodeNetworkSnapshot => ({
        parameterId: network.parameterId,
        parameterName: network.parameterName,
        computeTime: network.computeTime,
        nodeCount: network.nodeCount,
      }),
    ),

    // Counts
    activeLayerCount: profilerState.layerFPSMap.size,
    activeNodeNetworkCount: profilerState.nodeNetworkMap.size,
  };
}

// ============================================
// System Information
// ============================================

/**
 * Gets current browser information
 */
export function getBrowserInfo(): string {
  const ua = navigator.userAgent;
  let browserName = 'Unknown';
  let version = '';

  // Detect browser
  if (ua.includes('Firefox/')) {
    browserName = 'Firefox';
    version = ua.match(/Firefox\/([0-9.]+)/)?.[1] || '';
  } else if (ua.includes('Edg/')) {
    browserName = 'Edge';
    version = ua.match(/Edg\/([0-9.]+)/)?.[1] || '';
  } else if (ua.includes('Chrome/')) {
    browserName = 'Chrome';
    version = ua.match(/Chrome\/([0-9.]+)/)?.[1] || '';
  } else if (ua.includes('Safari/')) {
    browserName = 'Safari';
    version = ua.match(/Version\/([0-9.]+)/)?.[1] || '';
  }

  return version ? `${browserName} ${version}` : browserName;
}

/**
 * Gets platform information
 */
export function getPlatform(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Win')) return 'Windows';
  if (ua.includes('Mac')) return 'MacOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS')) return 'iOS';
  return 'Unknown';
}

/**
 * Gets screen resolution (CSS pixels)
 */
export function getScreenResolution(): string {
  return `${window.screen.width}x${window.screen.height}`;
}

/**
 * Gets device pixel ratio (e.g., 2 for Retina displays)
 */
export function getDevicePixelRatio(): number {
  return window.devicePixelRatio || 1;
}

/**
 * Gets physical resolution (CSS pixels * device pixel ratio)
 */
export function getPhysicalResolution(): string {
  const dpr = getDevicePixelRatio();
  const physicalWidth = Math.round(window.screen.width * dpr);
  const physicalHeight = Math.round(window.screen.height * dpr);
  return `${physicalWidth}x${physicalHeight}`;
}

/**
 * Creates session metadata from current system state
 */
export function createSessionMetadata(gpuRenderer: string): SessionMetadata {
  return {
    browser: getBrowserInfo(),
    userAgent: navigator.userAgent,
    gpu: gpuRenderer,
    timestamp: new Date().toISOString(),
    platform: getPlatform(),
    screenResolution: getScreenResolution(),
    devicePixelRatio: getDevicePixelRatio(),
    physicalResolution: getPhysicalResolution(),
  };
}

// ============================================
// ID Generation
// ============================================

/**
 * Generates a unique ID for recording sessions
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================
// Statistical Functions
// ============================================

/**
 * Calculates mean of an array of numbers
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculates median of an array of numbers
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Calculates standard deviation of an array of numbers
 */
export function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = mean(values);
  const squareDiffs = values.map((value) => Math.pow(value - avg, 2));
  const avgSquareDiff = mean(squareDiffs);
  return Math.sqrt(avgSquareDiff);
}

/**
 * Calculates percentile of an array of numbers
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Calculates coefficient of variation (CV)
 * Lower CV means more stable performance
 */
export function coefficientOfVariation(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = mean(values);
  if (avg === 0) return 0;
  const stdDev = standardDeviation(values);
  return stdDev / avg;
}

// ============================================
// Session Analysis
// ============================================

/**
 * Computes comprehensive statistics from a recording session
 */
export function computeSessionStatistics(
  session: RecordingSession,
): SessionStatistics {
  const snapshots = session.snapshots;

  // Extract time series data
  const editorFPSValues = snapshots.map((s) => s.editorFPS);
  const memoryValues = snapshots.map((s) => s.memoryUsedMB);
  const cpuUsageValues = snapshots.map((s) => s.cpuUsage);
  const cpuTaskValues = snapshots.map((s) => s.cpuTaskDuration);

  // Extract frame time data (flatten all frame times from all snapshots)
  const allFrameTimes = snapshots.flatMap((s) => s.frameTimes);
  const maxFrameTimeValues = snapshots.map((s) => s.maxFrameTime);
  const meanFrameTimeValues = snapshots.map((s) => s.meanFrameTime);

  // Count dropped frames (below 30 FPS)
  const droppedFrames = editorFPSValues.filter((fps) => fps < 30).length;
  const totalFrames = editorFPSValues.length;
  const droppedFramePercentage =
    totalFrames > 0 ? (droppedFrames / totalFrames) * 100 : 0;

  // Calculate stability (1 - CV, where 1 is perfect stability)
  const cv = coefficientOfVariation(editorFPSValues);
  const stability = Math.max(0, 1 - cv);

  // Layer statistics (aggregated across all snapshots)
  const allLayerRenderTimes = snapshots.flatMap((s) =>
    s.layers.map((l) => l.renderTime),
  );
  const allLayerDrawCalls = snapshots.flatMap((s) =>
    s.layers.map((l) => l.drawCalls),
  );
  const avgLayerCount = mean(snapshots.map((s) => s.activeLayerCount));

  return {
    sessionId: session.id,

    editorFPS: {
      mean: mean(editorFPSValues),
      median: median(editorFPSValues),
      stdDev: standardDeviation(editorFPSValues),
      min: Math.min(...editorFPSValues),
      max: Math.max(...editorFPSValues),
      p50: percentile(editorFPSValues, 50),
      p75: percentile(editorFPSValues, 75),
      p90: percentile(editorFPSValues, 90),
      p95: percentile(editorFPSValues, 95),
      p99: percentile(editorFPSValues, 99),
    },

    memory: {
      mean: mean(memoryValues),
      median: median(memoryValues),
      stdDev: standardDeviation(memoryValues),
      min: Math.min(...memoryValues),
      max: Math.max(...memoryValues),
      p95: percentile(memoryValues, 95),
    },

    cpu: {
      meanUsage: mean(cpuUsageValues),
      maxUsage: Math.max(...cpuUsageValues),
      meanTaskDuration: mean(cpuTaskValues),
      maxTaskDuration: Math.max(...cpuTaskValues),
    },

    frameTimes: {
      mean: allFrameTimes.length > 0 ? mean(allFrameTimes) : 0,
      max: allFrameTimes.length > 0 ? Math.max(...allFrameTimes) : 0,
      min: allFrameTimes.length > 0 ? Math.min(...allFrameTimes) : 0,
      p95: allFrameTimes.length > 0 ? percentile(allFrameTimes, 95) : 0,
      stdDev: allFrameTimes.length > 0 ? standardDeviation(allFrameTimes) : 0,
    },

    frames: {
      totalFrames,
      droppedFrames,
      droppedFramePercentage,
      stability,
    },

    layers: {
      avgLayerCount,
      avgRenderTime:
        allLayerRenderTimes.length > 0 ? mean(allLayerRenderTimes) : 0,
      avgDrawCalls: allLayerDrawCalls.length > 0 ? mean(allLayerDrawCalls) : 0,
    },
  };
}

// ============================================
// Export Utilities
// ============================================

/**
 * Converts a recording session to CSV format
 */
export function sessionToCSV(session: RecordingSession): string {
  const snapshots = session.snapshots;
  if (snapshots.length === 0) {
    return 'No data';
  }

  // Build header
  const headers = [
    'timestamp',
    'editorFPS',
    'editorAvgFPS',
    'memoryUsedMB',
    'memoryPercentage',
    'cpuUsage',
    'cpuTaskDuration',
    'activeLayerCount',
    'activeNodeNetworkCount',
  ];

  // Add layer columns (use first snapshot to determine columns)
  const firstSnapshot = snapshots[0];
  firstSnapshot.layers.forEach((layer) => {
    headers.push(
      `layer_${layer.layerName}_renderTime`,
      `layer_${layer.layerName}_drawCalls`,
    );
  });

  // Build rows
  const rows = snapshots.map((snapshot) => {
    const row = [
      snapshot.timestamp.toFixed(2),
      snapshot.editorFPS.toFixed(2),
      snapshot.editorAvgFPS.toFixed(2),
      snapshot.memoryUsedMB.toFixed(2),
      snapshot.memoryPercentage.toFixed(2),
      snapshot.cpuUsage.toFixed(2),
      snapshot.cpuTaskDuration.toFixed(2),
      snapshot.activeLayerCount.toString(),
      snapshot.activeNodeNetworkCount.toString(),
    ];

    // Add layer data (match order from header)
    firstSnapshot.layers.forEach((headerLayer) => {
      const layer = snapshot.layers.find(
        (l) => l.layerId === headerLayer.layerId,
      );
      if (layer) {
        row.push(
          '', // FPS removed as it's redundant with editor FPS
          layer.renderTime.toFixed(2),
          layer.drawCalls.toString(),
        );
      } else {
        row.push('', '', '');
      }
    });

    return row.join(',');
  });

  // Combine header and rows
  return [headers.join(','), ...rows].join('\n');
}

/**
 * Converts a recording session to JSON format
 */
export function sessionToJSON(
  session: RecordingSession,
  prettyPrint: boolean = false,
): string {
  return prettyPrint
    ? JSON.stringify(session, null, 2)
    : JSON.stringify(session);
}

/**
 * Downloads data as a file
 */
export function downloadFile(
  filename: string,
  content: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
