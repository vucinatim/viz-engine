import useNodeNetworkStore from '@/components/node-network/node-network-store';
import { toast } from 'sonner';
import { create } from 'zustand';
import { assignDeterministicIdsToConfig } from '../comp-utils/config-utils';
import useCompStore from './comp-store';
import useLayerStore, { LayerData } from './layer-store';
import useLayerValuesStore from './layer-values-store';

// ============================================================================
// TYPES
// ============================================================================

// Serializable subset of LayerData (excludes runtime-only properties)
export interface SerializableLayer {
  id: string;
  compName: string;
  layerSettings: any;
  isExpanded: boolean;
  isDebugEnabled: boolean;
}

// Layer editor history state
export interface LayerEditorHistoryState {
  layers: SerializableLayer[];
  layerValues: Record<string, any>;
  networkEnabledStates: Record<string, boolean>;
}

// Layer editor history
export interface LayerEditorHistory {
  past: LayerEditorHistoryState[];
  present: LayerEditorHistoryState;
  future: LayerEditorHistoryState[];
}

// Node editor history state for a single network
export interface NodeNetworkHistoryState {
  nodes: any[];
  edges: any[];
}

// Node editor history for a single network
export interface NodeNetworkHistory {
  past: NodeNetworkHistoryState[];
  present: NodeNetworkHistoryState;
  future: NodeNetworkHistoryState[];
}

// History context type
export type HistoryContext = 'layer-editor' | 'node-editor';

// ============================================================================
// STORE STATE
// ============================================================================

interface HistoryStore {
  // Layer editor history
  layerHistory: LayerEditorHistory;

  // Node editor histories (one per network)
  nodeHistories: Record<string, NodeNetworkHistory>;

  // Context management
  activeContext: HistoryContext;
  openNodeNetwork: string | null;
  isNodeEditorFocused: boolean;

  // Bypass flags
  isBypassingHistory: boolean;
  nodeDragBypass: Record<string, boolean>; // Per network

  // Debounce timer (stored as number to be serializable)
  debounceTimer: number | null;

  // ========================================================================
  // LAYER EDITOR ACTIONS
  // ========================================================================

  /**
   * Initialize layer history with current state if empty
   */
  initializeLayerHistory: () => void;

  /**
   * Push layer state to history
   */
  pushLayerHistory: (skipDebounce?: boolean) => void;

  /**
   * Flush pending debounced layer history
   */
  flushPendingLayerHistory: () => void;

  /**
   * Apply a layer history state to stores
   */
  applyLayerHistoryState: (state: LayerEditorHistoryState) => void;

  /**
   * Layer editor undo
   */
  undoLayerEditor: () => void;

  /**
   * Layer editor redo
   */
  redoLayerEditor: () => void;

  /**
   * Reset layer history
   */
  resetLayerHistory: () => void;

  // ========================================================================
  // NODE EDITOR ACTIONS
  // ========================================================================

  /**
   * Initialize node history for a network
   */
  initializeNodeHistory: (networkId: string) => void;

  /**
   * Push node state to history for a network
   */
  pushNodeHistory: (networkId: string, nodes: any[], edges: any[]) => void;

  /**
   * Node editor undo
   */
  undoNodeEditor: (networkId: string) => void;

  /**
   * Node editor redo
   */
  redoNodeEditor: (networkId: string) => void;

  /**
   * Start drag operation (bypass history)
   */
  startNodeDrag: (networkId: string) => void;

  /**
   * End drag operation (resume history)
   */
  endNodeDrag: (networkId: string) => void;

  // ========================================================================
  // CONTEXT MANAGEMENT
  // ========================================================================

  /**
   * Set active history context
   */
  setActiveContext: (context: HistoryContext) => void;

  /**
   * Set open node network
   */
  setOpenNodeNetwork: (networkId: string | null) => void;

  /**
   * Set node editor focused state
   */
  setNodeEditorFocused: (focused: boolean) => void;

  // ========================================================================
  // UNIFIED UNDO/REDO
  // ========================================================================

  /**
   * Context-aware undo
   */
  undo: () => void;

  /**
   * Context-aware redo
   */
  redo: () => void;

  /**
   * Check if undo is available
   */
  canUndo: () => boolean;

  /**
   * Check if redo is available
   */
  canRedo: () => boolean;

  // ========================================================================
  // UTILITY
  // ========================================================================

  /**
   * Set bypass history flag
   */
  setBypassHistory: (bypass: boolean) => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const MAX_HISTORY_SIZE = 50;

function createEmptyLayerHistory(): LayerEditorHistory {
  return {
    past: [],
    present: {
      layers: [],
      layerValues: {},
      networkEnabledStates: {},
    },
    future: [],
  };
}

function createEmptyNodeHistory(): NodeNetworkHistory {
  return {
    past: [],
    present: {
      nodes: [],
      edges: [],
    },
    future: [],
  };
}

// Get network enabled states for history tracking
function getNetworkEnabledStates(): Record<string, boolean> {
  const networks = useNodeNetworkStore.getState().networks;
  const enabledStates: Record<string, boolean> = {};

  Object.entries(networks).forEach(([parameterId, network]) => {
    if (network.isEnabled) {
      enabledStates[parameterId] = true;
    }
  });

  return enabledStates;
}

// Serialize layers to a JSON-safe format
function serializeLayers(layers: LayerData[]): SerializableLayer[] {
  return layers.map((layer) => ({
    id: layer.id,
    compName: layer.comp.name,
    layerSettings: JSON.parse(JSON.stringify(layer.layerSettings)),
    isExpanded: layer.isExpanded,
    isDebugEnabled: layer.isDebugEnabled,
  }));
}

// Restore layers from serialized format
function restoreLayers(
  serializedLayers: SerializableLayer[],
  currentLayers: LayerData[],
): LayerData[] {
  const currentLayersMap = new Map(
    currentLayers.map((layer) => [layer.id, layer]),
  );

  const restoredLayers: LayerData[] = [];

  for (const serialized of serializedLayers) {
    const currentLayer = currentLayersMap.get(serialized.id);
    if (currentLayer) {
      restoredLayers.push({
        ...currentLayer,
        layerSettings: serialized.layerSettings,
        isExpanded: serialized.isExpanded,
        isDebugEnabled: serialized.isDebugEnabled,
      });
    } else {
      const comp = useCompStore
        .getState()
        .comps.find((c) => c.name === serialized.compName);

      if (comp) {
        const layerConfigWithIds = assignDeterministicIdsToConfig(
          serialized.id,
          comp.config.clone(),
        );

        restoredLayers.push({
          id: serialized.id,
          comp,
          config: layerConfigWithIds,
          state: comp.createState ? comp.createState() : undefined,
          layerSettings: serialized.layerSettings,
          isExpanded: serialized.isExpanded,
          isDebugEnabled: serialized.isDebugEnabled,
        });
      } else {
        console.warn(
          `Cannot restore layer ${serialized.id}: component "${serialized.compName}" not found`,
        );
      }
    }
  }

  return restoredLayers;
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  // Initial state
  layerHistory: createEmptyLayerHistory(),
  nodeHistories: {},
  activeContext: 'layer-editor',
  openNodeNetwork: null,
  isNodeEditorFocused: false,
  isBypassingHistory: false,
  nodeDragBypass: {},
  debounceTimer: null,

  // ========================================================================
  // LAYER EDITOR ACTIONS
  // ========================================================================

  initializeLayerHistory: () => {
    const state = get();
    const layers = useLayerStore.getState().layers;
    const layerValues = useLayerValuesStore.getState().values;

    if (
      state.layerHistory.present.layers.length === 0 &&
      state.layerHistory.past.length === 0 &&
      layers.length > 0
    ) {
      const initialState: LayerEditorHistoryState = {
        layers: serializeLayers(layers),
        layerValues: JSON.parse(JSON.stringify(layerValues)),
        networkEnabledStates: getNetworkEnabledStates(),
      };

      set({
        layerHistory: {
          past: [],
          present: initialState,
          future: [],
        },
      });
    }
  },

  pushLayerHistory: (skipDebounce = false) => {
    const state = get();

    // Skip if bypassing history
    if (state.isBypassingHistory) {
      return;
    }

    // Clear any pending debounce
    if (state.debounceTimer !== null) {
      clearTimeout(state.debounceTimer);
      set({ debounceTimer: null });
    }

    const layers = useLayerStore.getState().layers;
    const layerValues = useLayerValuesStore.getState().values;

    const newState: LayerEditorHistoryState = {
      layers: serializeLayers(layers),
      layerValues: JSON.parse(JSON.stringify(layerValues)),
      networkEnabledStates: getNetworkEnabledStates(),
    };

    const executePush = () => {
      const currentState = get();

      // Check if this would be identical to the last saved state
      if (
        JSON.stringify(newState) ===
        JSON.stringify(currentState.layerHistory.present)
      ) {
        return;
      }

      // Add current state to past
      const newPast = [
        ...currentState.layerHistory.past,
        currentState.layerHistory.present,
      ];

      // Limit history size by removing oldest entries
      if (newPast.length > MAX_HISTORY_SIZE) {
        newPast.shift();
      }

      // Update history
      set({
        layerHistory: {
          past: newPast,
          present: newState,
          future: [], // Clear future (new action destroys redo stack)
        },
      });
    };

    // For value changes, debounce to avoid recording every slider movement
    if (!skipDebounce) {
      const timer = setTimeout(executePush, 300);
      set({ debounceTimer: timer as any });
    } else {
      executePush();
    }
  },

  flushPendingLayerHistory: () => {
    const state = get();

    if (state.debounceTimer !== null) {
      clearTimeout(state.debounceTimer);
      set({ debounceTimer: null });

      // Get the latest state directly from stores
      const layers = useLayerStore.getState().layers;
      const layerValues = useLayerValuesStore.getState().values;

      const currentState: LayerEditorHistoryState = {
        layers: serializeLayers(layers),
        layerValues: JSON.parse(JSON.stringify(layerValues)),
        networkEnabledStates: getNetworkEnabledStates(),
      };

      // Check if this would be identical to the last saved state
      if (
        JSON.stringify(currentState) !==
        JSON.stringify(state.layerHistory.present)
      ) {
        // Add current state to past
        const newPast = [
          ...state.layerHistory.past,
          state.layerHistory.present,
        ];

        // Limit history size
        if (newPast.length > MAX_HISTORY_SIZE) {
          newPast.shift();
        }

        // Update history
        set({
          layerHistory: {
            past: newPast,
            present: currentState,
            future: [],
          },
        });
      }
    }
  },

  applyLayerHistoryState: (state: LayerEditorHistoryState) => {
    const currentLayers = useLayerStore.getState().layers;
    const restoredLayers = restoreLayers(state.layers, currentLayers);
    const valuesClone = JSON.parse(JSON.stringify(state.layerValues));

    // Apply to stores
    useLayerStore.setState({ layers: restoredLayers });
    useLayerValuesStore.setState({ values: valuesClone });

    // Restore network enabled states
    const currentNetworks = useNodeNetworkStore.getState().networks;
    const targetEnabledStates = state.networkEnabledStates || {};

    Object.keys(currentNetworks).forEach((parameterId) => {
      const shouldBeEnabled = targetEnabledStates[parameterId] === true;
      const currentNetwork = currentNetworks[parameterId];

      if (currentNetwork && currentNetwork.isEnabled !== shouldBeEnabled) {
        useNodeNetworkStore.setState((storeState) => ({
          networks: {
            ...storeState.networks,
            [parameterId]: {
              ...storeState.networks[parameterId],
              isEnabled: shouldBeEnabled,
            },
          },
          openNetwork:
            !shouldBeEnabled && storeState.openNetwork === parameterId
              ? null
              : storeState.openNetwork,
        }));
      }
    });
  },

  undoLayerEditor: () => {
    // First, flush any pending debounced changes
    get().flushPendingLayerHistory();

    const state = get();

    if (state.layerHistory.past.length === 0) {
      return;
    }

    // Set bypass flag FIRST to prevent tracking effect from firing
    set({ isBypassingHistory: true });

    // Get previous state
    const previous =
      state.layerHistory.past[state.layerHistory.past.length - 1];
    const newPast = state.layerHistory.past.slice(0, -1);

    // Move current state to future
    const newFuture = [
      state.layerHistory.present,
      ...state.layerHistory.future,
    ];

    // Update history
    set({
      layerHistory: {
        past: newPast,
        present: previous,
        future: newFuture,
      },
    });

    // Apply state to stores
    get().applyLayerHistoryState(previous);

    // Show toast notification
    toast.success('Undo', {
      description: `${newPast.length} step${newPast.length !== 1 ? 's' : ''} back available`,
      duration: 1500,
    });

    // Clear bypass flag after React has finished processing effects
    setTimeout(() => {
      set({ isBypassingHistory: false });
    }, 0);
  },

  redoLayerEditor: () => {
    // First, flush any pending debounced changes
    get().flushPendingLayerHistory();

    const state = get();

    if (state.layerHistory.future.length === 0) {
      return;
    }

    // Set bypass flag FIRST to prevent tracking effect from firing
    set({ isBypassingHistory: true });

    // Get next state
    const next = state.layerHistory.future[0];
    const newFuture = state.layerHistory.future.slice(1);

    // Move current state to past
    const newPast = [...state.layerHistory.past, state.layerHistory.present];

    // Update history
    set({
      layerHistory: {
        past: newPast,
        present: next,
        future: newFuture,
      },
    });

    // Apply state to stores
    get().applyLayerHistoryState(next);

    // Show toast notification
    toast.success('Redo', {
      description: `${newFuture.length} step${newFuture.length !== 1 ? 's' : ''} forward available`,
      duration: 1500,
    });

    // Clear bypass flag after React has finished processing effects
    setTimeout(() => {
      set({ isBypassingHistory: false });
    }, 0);
  },

  resetLayerHistory: () => {
    set({
      layerHistory: createEmptyLayerHistory(),
    });
  },

  // ========================================================================
  // NODE EDITOR ACTIONS
  // ========================================================================

  initializeNodeHistory: (networkId: string) => {
    const state = get();

    if (!state.nodeHistories[networkId]) {
      const network = useNodeNetworkStore.getState().networks[networkId];

      if (network) {
        set({
          nodeHistories: {
            ...state.nodeHistories,
            [networkId]: {
              past: [],
              present: {
                nodes: network.nodes,
                edges: network.edges,
              },
              future: [],
            },
          },
        });
      }
    }
  },

  pushNodeHistory: (networkId: string, nodes: any[], edges: any[]) => {
    const state = get();

    // Skip if bypassing history for this network
    if (state.nodeDragBypass[networkId]) {
      return;
    }

    const history = state.nodeHistories[networkId];
    if (!history) {
      return;
    }

    const newState = { nodes, edges };

    // Check if this would be identical to the last saved state
    if (JSON.stringify(newState) === JSON.stringify(history.present)) {
      return;
    }

    // Add current state to past
    const newPast = [...history.past, history.present];

    // Limit history size
    if (newPast.length > MAX_HISTORY_SIZE) {
      newPast.shift();
    }

    // Update history
    set({
      nodeHistories: {
        ...state.nodeHistories,
        [networkId]: {
          past: newPast,
          present: newState,
          future: [], // Clear future (new action destroys redo stack)
        },
      },
    });
  },

  undoNodeEditor: (networkId: string) => {
    const state = get();
    const history = state.nodeHistories[networkId];

    if (!history || history.past.length === 0) {
      return;
    }

    // Get previous state
    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, -1);

    // Move current state to future
    const newFuture = [history.present, ...history.future];

    // Update history
    set({
      nodeHistories: {
        ...state.nodeHistories,
        [networkId]: {
          past: newPast,
          present: previous,
          future: newFuture,
        },
      },
    });

    // Apply to network store
    useNodeNetworkStore.getState().setNodesInNetwork(networkId, previous.nodes);
    useNodeNetworkStore.getState().setEdgesInNetwork(networkId, previous.edges);
  },

  redoNodeEditor: (networkId: string) => {
    const state = get();
    const history = state.nodeHistories[networkId];

    if (!history || history.future.length === 0) {
      return;
    }

    // Get next state
    const next = history.future[0];
    const newFuture = history.future.slice(1);

    // Move current state to past
    const newPast = [...history.past, history.present];

    // Update history
    set({
      nodeHistories: {
        ...state.nodeHistories,
        [networkId]: {
          past: newPast,
          present: next,
          future: newFuture,
        },
      },
    });

    // Apply to network store
    useNodeNetworkStore.getState().setNodesInNetwork(networkId, next.nodes);
    useNodeNetworkStore.getState().setEdgesInNetwork(networkId, next.edges);
  },

  startNodeDrag: (networkId: string) => {
    set((state) => ({
      nodeDragBypass: {
        ...state.nodeDragBypass,
        [networkId]: true,
      },
    }));
  },

  endNodeDrag: (networkId: string) => {
    set((state) => ({
      nodeDragBypass: {
        ...state.nodeDragBypass,
        [networkId]: false,
      },
    }));
  },

  // ========================================================================
  // CONTEXT MANAGEMENT
  // ========================================================================

  setActiveContext: (context: HistoryContext) => {
    set({ activeContext: context });
  },

  setOpenNodeNetwork: (networkId: string | null) => {
    set({
      openNodeNetwork: networkId,
      activeContext: networkId ? 'node-editor' : 'layer-editor',
    });
  },

  setNodeEditorFocused: (focused: boolean) => {
    const state = get();
    set({
      isNodeEditorFocused: focused,
      activeContext:
        focused && state.openNodeNetwork ? 'node-editor' : 'layer-editor',
    });
  },

  // ========================================================================
  // UNIFIED UNDO/REDO
  // ========================================================================

  undo: () => {
    const state = get();

    if (
      state.openNodeNetwork &&
      state.isNodeEditorFocused &&
      state.nodeHistories[state.openNodeNetwork]?.past.length > 0
    ) {
      get().undoNodeEditor(state.openNodeNetwork);
    } else if (state.layerHistory.past.length > 0) {
      get().undoLayerEditor();
    }
  },

  redo: () => {
    const state = get();

    if (
      state.openNodeNetwork &&
      state.isNodeEditorFocused &&
      state.nodeHistories[state.openNodeNetwork]?.future.length > 0
    ) {
      get().redoNodeEditor(state.openNodeNetwork);
    } else if (state.layerHistory.future.length > 0) {
      get().redoLayerEditor();
    }
  },

  canUndo: () => {
    const state = get();

    if (state.openNodeNetwork && state.isNodeEditorFocused) {
      const history = state.nodeHistories[state.openNodeNetwork];
      return history ? history.past.length > 0 : false;
    }

    return state.layerHistory.past.length > 0;
  },

  canRedo: () => {
    const state = get();

    if (state.openNodeNetwork && state.isNodeEditorFocused) {
      const history = state.nodeHistories[state.openNodeNetwork];
      return history ? history.future.length > 0 : false;
    }

    return state.layerHistory.future.length > 0;
  },

  // ========================================================================
  // UTILITY
  // ========================================================================

  setBypassHistory: (bypass: boolean) => {
    set({ isBypassingHistory: bypass });
  },
}));
