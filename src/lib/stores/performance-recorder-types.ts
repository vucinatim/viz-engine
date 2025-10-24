// Performance Recording Types
// Reuses types from profiler-store.ts for consistency

import type {
  CPUMetrics,
  FPSMetrics,
  GPUMetrics,
  IndexedDBMetrics,
  LayerFPSMetrics,
  MemoryMetrics,
  NodeNetworkMetrics,
} from './profiler-store';

// ============================================
// Snapshot Types (Flattened for Storage)
// ============================================

/**
 * Simplified layer snapshot at a point in time
 * Flattens the nested FPSMetrics for easier storage and analysis
 */
export interface LayerSnapshot {
  layerId: string;
  layerName: string;
  renderTime: number; // ms - primary performance metric
  drawCalls: number;
  // Note: FPS metrics removed as they are redundant with editor FPS
  // Layer FPS is the same as editor FPS and provides no actionable information
}

/**
 * Simplified node network snapshot at a point in time
 */
export interface NodeNetworkSnapshot {
  parameterId: string;
  parameterName: string;
  computeTime: number; // ms
  nodeCount: number;
}

/**
 * Complete system performance snapshot at a specific timestamp
 * This is the core data structure that gets stored for each sample
 */
export interface PerformanceSnapshot {
  timestamp: number; // performance.now() when snapshot was taken

  // Editor FPS metrics
  editorFPS: number;
  editorAvgFPS: number;
  editorMinFPS: number;
  editorMaxFPS: number;

  // Frame time metrics (individual frame measurements)
  frameTimes: number[]; // Array of individual frame times in ms
  maxFrameTime: number; // Single worst frame time in ms
  meanFrameTime: number; // Average frame time in ms

  // Memory metrics (MB)
  memoryUsedMB: number;
  memoryTotalMB: number;
  memoryLimitMB: number;
  memoryPercentage: number;

  // CPU metrics
  cpuUsage: number; // percentage estimate
  cpuTaskDuration: number; // ms

  // IndexedDB metrics (MB)
  indexedDBUsageMB: number;
  indexedDBQuotaMB: number;
  indexedDBPercentage: number;

  // Per-layer metrics (array for easy iteration)
  layers: LayerSnapshot[];

  // Per-node-network metrics (array for easy iteration)
  nodeNetworks: NodeNetworkSnapshot[];

  // Quick reference counts
  activeLayerCount: number;
  activeNodeNetworkCount: number;
}

// ============================================
// Recording Session Types
// ============================================

/**
 * System information captured at the start of a recording session
 * Important for reproducibility and comparing results across different setups
 */
export interface SessionMetadata {
  browser: string; // e.g., "Chrome 120.0.0"
  userAgent: string; // Full user agent string
  gpu: string; // GPU renderer name
  timestamp: string; // ISO 8601 timestamp
  platform: string; // e.g., "MacOS", "Windows"
  screenResolution: string; // CSS pixels, e.g., "1920x1080"
  devicePixelRatio: number; // e.g., 2 for Retina displays
  physicalResolution: string; // Physical pixels (CSS * DPR), e.g., "3840x2160"
}

/**
 * A complete recording session with all snapshots and metadata
 */
export interface RecordingSession {
  id: string; // Unique identifier
  name: string; // User-friendly name
  description: string; // Optional description
  tags: string[]; // For filtering/grouping (e.g., ["optimization", "10-layers"])

  // Timing information
  startTime: number; // Unix timestamp (ms)
  endTime: number | null; // null if still recording
  duration: number; // Total duration in ms

  // Recording settings
  sampleRate: number; // ms between snapshots

  // Performance data
  snapshots: PerformanceSnapshot[];

  // System information for reproducibility
  metadata: SessionMetadata;
}

/**
 * Options for starting a new recording session
 */
export interface RecordingOptions {
  description?: string;
  tags?: string[];
  sampleRate?: number; // Override default sample rate
  duration?: number; // Auto-stop after this many milliseconds
}

/**
 * Statistical summary of a recording session
 * Computed from the snapshots for quick analysis
 */
export interface SessionStatistics {
  sessionId: string;

  // Editor FPS statistics
  editorFPS: {
    mean: number;
    median: number;
    stdDev: number;
    min: number;
    max: number;
    p50: number; // 50th percentile
    p75: number; // 75th percentile
    p90: number; // 90th percentile
    p95: number; // 95th percentile
    p99: number; // 99th percentile
  };

  // Memory statistics (MB)
  memory: {
    mean: number;
    median: number;
    stdDev: number;
    min: number;
    max: number;
    p95: number;
  };

  // CPU statistics
  cpu: {
    meanUsage: number;
    maxUsage: number;
    meanTaskDuration: number;
    maxTaskDuration: number;
  };

  // Frame time statistics (individual frame measurements)
  frameTimes: {
    mean: number;
    max: number;
    min: number;
    p95: number;
    stdDev: number;
  };

  // Frame analysis
  frames: {
    totalFrames: number;
    droppedFrames: number; // Frames below 30 FPS
    droppedFramePercentage: number;
    stability: number; // 1 - coefficient of variation (higher is better)
  };

  // Layer statistics (aggregated)
  layers: {
    avgLayerCount: number;
    avgRenderTime: number; // ms
    avgDrawCalls: number;
  };
}

// ============================================
// Export Types
// ============================================

/**
 * Export format options
 */
export type ExportFormat = 'json' | 'csv';

/**
 * Export configuration
 */
export interface ExportConfig {
  format: ExportFormat;
  includeMetadata: boolean;
  includeStatistics: boolean;
  prettyPrint?: boolean; // For JSON only
}

// ============================================
// Recorder State Types
// ============================================

/**
 * State for the performance recorder Zustand store
 */
export interface RecorderState {
  // Recording state
  isRecording: boolean;
  isPaused: boolean;
  currentSession: RecordingSession | null;

  // Saved sessions (loaded from IndexedDB)
  sessions: RecordingSession[];
  isLoading: boolean;

  // Settings
  sampleRate: number; // Default sample rate in ms
  autoSaveEnabled: boolean; // Auto-save to IndexedDB on stop

  // Actions - Recording control
  startRecording: (name: string, options?: RecordingOptions) => void;
  stopRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  cancelRecording: () => void;

  // Actions - Session management
  loadSessions: () => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, newName: string) => Promise<void>;
  updateSessionTags: (sessionId: string, tags: string[]) => Promise<void>;

  // Actions - Export
  exportSession: (sessionId: string, config: ExportConfig) => Promise<void>;

  // Actions - Settings
  setSampleRate: (rate: number) => void;
  setAutoSave: (enabled: boolean) => void;

  // Actions - Statistics
  computeStatistics: (sessionId: string) => SessionStatistics | null;
}

// Re-export profiler types for convenience
export type {
  CPUMetrics,
  FPSMetrics,
  GPUMetrics,
  IndexedDBMetrics,
  LayerFPSMetrics,
  MemoryMetrics,
  NodeNetworkMetrics,
};
