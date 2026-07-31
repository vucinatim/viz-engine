import { getProjectedLayers } from '@/lib/projected-layers';
import { getVizSessionState } from '@/lib/viz-session';
import { create } from 'zustand';

// Performance metrics interfaces
export interface FPSMetrics {
  current: number;
  average: number;
  min: number;
  max: number;
  samples: number[];
}

export interface MemoryMetrics {
  usedJSHeapSize: number; // in MB
  totalJSHeapSize: number; // in MB
  jsHeapSizeLimit: number; // in MB
  percentage: number;
}

export interface GPUMetrics {
  available: boolean;
  vendor: string;
  renderer: string;
  maxTextureSize: number;
  drawCalls: number;
  triangles: number;
}

export interface IndexedDBMetrics {
  usage: number; // in MB
  quota: number; // in MB
  percentage: number;
}

export interface LayerFPSMetrics {
  layerId: string;
  layerName: string;
  fps: FPSMetrics;
  renderTime: number; // in ms
  drawCalls: number; // WebGL draw calls per frame
  lastUpdate: number;
}

export interface MainThreadMetrics {
  longTaskShare: number; // percentage of the sample window occupied by long tasks
  longestLongTask: number; // longest observed long task in ms
}

export interface NodeNetworkMetrics {
  parameterId: string;
  parameterName: string;
  computeTime: number | null; // per-graph timing is unavailable in the canonical runtime
  nodeCount: number;
  issueCount: number;
  lastUpdate: number;
}

export interface RuntimeMetrics {
  fps: FPSMetrics;
  framePlanTime: number;
  attachmentTime: number;
  totalTime: number;
  renderCycle: number;
  issueCount: number;
}

export interface ProfilerState {
  // Enabled state
  enabled: boolean;
  visible: boolean;

  // FPS Metrics
  editorFPS: FPSMetrics;
  layerFPSMap: Map<string, LayerFPSMetrics>;

  // Frame time tracking
  frameTimes: number[];
  maxFrameTime: number;
  meanFrameTime: number;

  // System Metrics
  memory: MemoryMetrics;
  gpu: GPUMetrics;
  indexedDB: IndexedDBMetrics;
  mainThread: MainThreadMetrics;

  // Node Network Metrics
  nodeNetworkMap: Map<string, NodeNetworkMetrics>;
  runtime: RuntimeMetrics;

  // Update timestamp
  lastUpdate: number;

  // Actions
  setEnabled: (enabled: boolean) => void;
  setVisible: (visible: boolean) => void;
  updateEditorFPS: (fps: number) => void;
  updateLayerFPS: (
    layerId: string,
    layerName: string,
    fps: number,
    renderTime: number,
    drawCalls: number,
  ) => void;
  removeLayerFPS: (layerId: string) => void;
  updateMemory: (memory: MemoryMetrics) => void;
  updateGPU: (gpu: Partial<GPUMetrics>) => void;
  updateIndexedDB: (indexedDB: IndexedDBMetrics) => void;
  updateMainThread: (metrics: MainThreadMetrics) => void;
  updateNodeNetworks: (
    networks: Omit<NodeNetworkMetrics, 'lastUpdate'>[],
  ) => void;
  updateRuntime: (
    metrics: Omit<RuntimeMetrics, 'fps'> & { fps: number },
  ) => void;
  updateFrameTimes: (
    frameTimes: number[],
    maxFrameTime: number,
    meanFrameTime: number,
  ) => void;
  reset: () => void;
  initializeExistingLayersAndNetworks: () => void;
}

// Helper to create initial FPS metrics
const createInitialFPSMetrics = (): FPSMetrics => ({
  current: 0,
  average: 0,
  min: Infinity,
  max: 0,
  samples: [],
});

const createInitialRuntimeMetrics = (): RuntimeMetrics => ({
  fps: createInitialFPSMetrics(),
  framePlanTime: 0,
  attachmentTime: 0,
  totalTime: 0,
  renderCycle: 0,
  issueCount: 0,
});

// Helper to update FPS metrics with new sample
const updateFPSMetrics = (metrics: FPSMetrics, newFPS: number): FPSMetrics => {
  const samples = [...metrics.samples, newFPS];
  // Keep only last 60 samples (1 second at 60fps)
  if (samples.length > 60) samples.shift();

  const average = samples.reduce((a, b) => a + b, 0) / samples.length;
  const min = Math.min(metrics.min, newFPS);
  const max = Math.max(metrics.max, newFPS);

  return {
    current: newFPS,
    average,
    min,
    max,
    samples,
  };
};

const useProfilerStore = create<ProfilerState>((set, get) => ({
  // Initial state
  enabled: false,
  visible: false,

  editorFPS: createInitialFPSMetrics(),
  layerFPSMap: new Map(),

  // Frame time tracking
  frameTimes: [],
  maxFrameTime: 0,
  meanFrameTime: 0,

  memory: {
    usedJSHeapSize: 0,
    totalJSHeapSize: 0,
    jsHeapSizeLimit: 0,
    percentage: 0,
  },

  gpu: {
    available: false,
    vendor: 'Unknown',
    renderer: 'Unknown',
    maxTextureSize: 0,
    drawCalls: 0,
    triangles: 0,
  },

  indexedDB: {
    usage: 0,
    quota: 0,
    percentage: 0,
  },

  mainThread: {
    longTaskShare: 0,
    longestLongTask: 0,
  },

  nodeNetworkMap: new Map(),
  runtime: createInitialRuntimeMetrics(),

  lastUpdate: 0,

  // Actions
  setEnabled: (enabled) => set({ enabled }),

  setVisible: (visible) => set({ visible }),

  updateEditorFPS: (fps) =>
    set((state) => ({
      editorFPS: updateFPSMetrics(state.editorFPS, fps),
      lastUpdate: performance.now(),
    })),

  updateLayerFPS: (layerId, layerName, fps, renderTime, drawCalls) =>
    set((state) => {
      const newMap = new Map(state.layerFPSMap);
      const existing = newMap.get(layerId);

      newMap.set(layerId, {
        layerId,
        layerName,
        fps: updateFPSMetrics(existing?.fps || createInitialFPSMetrics(), fps),
        renderTime,
        drawCalls,
        lastUpdate: performance.now(),
      });

      return {
        layerFPSMap: newMap,
        lastUpdate: performance.now(),
      };
    }),

  removeLayerFPS: (layerId) =>
    set((state) => {
      const newMap = new Map(state.layerFPSMap);
      newMap.delete(layerId);
      return { layerFPSMap: newMap };
    }),

  updateMemory: (memory) =>
    set({
      memory,
      lastUpdate: performance.now(),
    }),

  updateGPU: (gpu) =>
    set((state) => ({
      gpu: { ...state.gpu, ...gpu },
      lastUpdate: performance.now(),
    })),

  updateIndexedDB: (indexedDB) =>
    set({
      indexedDB,
      lastUpdate: performance.now(),
    }),

  updateMainThread: (mainThread) =>
    set({
      mainThread,
      lastUpdate: performance.now(),
    }),

  updateFrameTimes: (frameTimes, maxFrameTime, meanFrameTime) =>
    set({
      frameTimes,
      maxFrameTime,
      meanFrameTime,
      lastUpdate: performance.now(),
    }),

  updateNodeNetworks: (networks) =>
    set(() => {
      const lastUpdate = performance.now();
      return {
        nodeNetworkMap: new Map(
          networks.map((network) => [
            network.parameterId,
            { ...network, lastUpdate },
          ]),
        ),
        lastUpdate,
      };
    }),

  updateRuntime: ({
    fps,
    framePlanTime,
    attachmentTime,
    totalTime,
    renderCycle,
    issueCount,
  }) =>
    set((state) => ({
      runtime: {
        fps: updateFPSMetrics(state.runtime.fps, fps),
        framePlanTime,
        attachmentTime,
        totalTime,
        renderCycle,
        issueCount,
      },
      lastUpdate: performance.now(),
    })),

  reset: () =>
    set({
      editorFPS: createInitialFPSMetrics(),
      layerFPSMap: new Map(),
      nodeNetworkMap: new Map(),
      runtime: createInitialRuntimeMetrics(),
      frameTimes: [],
      maxFrameTime: 0,
      meanFrameTime: 0,
      mainThread: {
        longTaskShare: 0,
        longestLongTask: 0,
      },
      lastUpdate: performance.now(),
    }),

  initializeExistingLayersAndNetworks: () => {
    if (typeof window === 'undefined') return;

    try {
      // Initialize existing layers
      const layers = getProjectedLayers();

      // Create a fresh map and only add existing layers
      const layerIds = new Set(layers.map((layer) => layer.id));
      const newLayerFPSMap = new Map<string, LayerFPSMetrics>();

      // Remove stale entries (layers that no longer exist)
      get().layerFPSMap.forEach((metrics, layerId) => {
        if (layerIds.has(layerId)) {
          newLayerFPSMap.set(layerId, metrics);
        }
      });

      // Add new layers that aren't tracked yet
      layers.forEach((layer) => {
        if (!newLayerFPSMap.has(layer.id)) {
          newLayerFPSMap.set(layer.id, {
            layerId: layer.id,
            layerName: layer.comp.name,
            fps: createInitialFPSMetrics(),
            renderTime: 0,
            drawCalls: 0,
            lastUpdate: performance.now(),
          });
        }
      });

      const graphs = getVizSessionState().project.workingProject.graphs ?? [];
      const graphIds = new Set(graphs.map((graph) => graph.id));
      const newNodeNetworkMap = new Map<string, NodeNetworkMetrics>();

      get().nodeNetworkMap.forEach((metrics, parameterId) => {
        if (graphIds.has(parameterId)) {
          newNodeNetworkMap.set(parameterId, metrics);
        }
      });

      for (const graph of graphs) {
        if (!newNodeNetworkMap.has(graph.id)) {
          newNodeNetworkMap.set(graph.id, {
            parameterId: graph.id,
            parameterName: graph.name,
            computeTime: null,
            nodeCount: graph.nodes.length,
            issueCount: 0,
            lastUpdate: performance.now(),
          });
        }
      }

      set({
        layerFPSMap: newLayerFPSMap,
        nodeNetworkMap: newNodeNetworkMap,
        lastUpdate: performance.now(),
      });
    } catch (error) {
      console.error('Error initializing existing layers and networks:', error);
    }
  },
}));

export default useProfilerStore;
