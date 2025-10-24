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

export interface CPUMetrics {
  usage: number; // percentage estimate
  taskDuration: number; // ms
}

export interface NodeNetworkMetrics {
  parameterId: string;
  parameterName: string;
  computeTime: number; // in ms
  nodeCount: number;
  lastUpdate: number;
}

export interface ProfilerState {
  // Enabled state
  enabled: boolean;
  visible: boolean;

  // FPS Metrics
  editorFPS: FPSMetrics;
  layerFPSMap: Map<string, LayerFPSMetrics>;

  // System Metrics
  memory: MemoryMetrics;
  gpu: GPUMetrics;
  indexedDB: IndexedDBMetrics;
  cpu: CPUMetrics;

  // Node Network Metrics
  nodeNetworkMap: Map<string, NodeNetworkMetrics>;

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
  updateCPU: (cpu: CPUMetrics) => void;
  updateNodeNetwork: (
    parameterId: string,
    parameterName: string,
    computeTime: number,
    nodeCount: number,
  ) => void;
  removeNodeNetwork: (parameterId: string) => void;
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

  cpu: {
    usage: 0,
    taskDuration: 0,
  },

  nodeNetworkMap: new Map(),

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

  updateCPU: (cpu) =>
    set({
      cpu,
      lastUpdate: performance.now(),
    }),

  updateNodeNetwork: (parameterId, parameterName, computeTime, nodeCount) =>
    set((state) => {
      const newMap = new Map(state.nodeNetworkMap);
      newMap.set(parameterId, {
        parameterId,
        parameterName,
        computeTime,
        nodeCount,
        lastUpdate: performance.now(),
      });
      return {
        nodeNetworkMap: newMap,
        lastUpdate: performance.now(),
      };
    }),

  removeNodeNetwork: (parameterId) =>
    set((state) => {
      const newMap = new Map(state.nodeNetworkMap);
      newMap.delete(parameterId);
      return { nodeNetworkMap: newMap };
    }),

  reset: () =>
    set({
      editorFPS: createInitialFPSMetrics(),
      layerFPSMap: new Map(),
      nodeNetworkMap: new Map(),
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
      cpu: {
        usage: 0,
        taskDuration: 0,
      },
      lastUpdate: performance.now(),
    }),

  initializeExistingLayersAndNetworks: () => {
    // This runs in the browser, so we can dynamically import stores
    if (typeof window === 'undefined') return;

    try {
      // Initialize existing layers
      const { default: useLayerStore } = require('./layer-store');
      const { layers } = useLayerStore.getState();

      // Create a fresh map and only add existing layers
      const layerIds = new Set(layers.map((layer: any) => layer.id));
      const newLayerFPSMap = new Map<string, LayerFPSMetrics>();

      // Remove stale entries (layers that no longer exist)
      get().layerFPSMap.forEach((metrics, layerId) => {
        if (layerIds.has(layerId)) {
          newLayerFPSMap.set(layerId, metrics);
        }
      });

      // Add new layers that aren't tracked yet
      layers.forEach((layer: any) => {
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

      // Initialize existing enabled node networks
      const {
        default: useNodeNetworkStore,
      } = require('@/components/node-network/node-network-store');
      const { networks } = useNodeNetworkStore.getState();

      // Create a fresh map and only add enabled networks
      const enabledNetworkIds = new Set(
        Object.entries(networks)
          .filter(([_, network]: [string, any]) => network.isEnabled)
          .map(([parameterId]) => parameterId),
      );
      const newNodeNetworkMap = new Map<string, NodeNetworkMetrics>();

      // Remove stale entries (networks that no longer exist or are disabled)
      get().nodeNetworkMap.forEach((metrics, parameterId) => {
        if (enabledNetworkIds.has(parameterId)) {
          newNodeNetworkMap.set(parameterId, metrics);
        }
      });

      // Add new networks that aren't tracked yet
      Object.entries(networks).forEach(
        ([parameterId, network]: [string, any]) => {
          if (network.isEnabled && !newNodeNetworkMap.has(parameterId)) {
            newNodeNetworkMap.set(parameterId, {
              parameterId,
              parameterName: network.name || parameterId,
              computeTime: 0,
              nodeCount: network.nodes?.length || 0,
              lastUpdate: performance.now(),
            });
          }
        },
      );

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
