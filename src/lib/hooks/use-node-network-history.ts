import { useCallback, useEffect, useMemo, useRef } from 'react';
import { create } from 'zustand';
import { useNodeNetwork } from '../../components/node-network/node-network-store';

// History state for a single network
interface NetworkHistory {
  past: Array<{
    nodes: any[];
    edges: any[];
  }>;
  present: {
    nodes: any[];
    edges: any[];
  };
  future: Array<{
    nodes: any[];
    edges: any[];
  }>;
}

// History store for all networks
interface HistoryStore {
  [networkId: string]: NetworkHistory;
}

// Global Zustand store for history state
interface HistoryStateStore {
  history: HistoryStore;
  canUndo: { [networkId: string]: boolean };
  canRedo: { [networkId: string]: boolean };
  setHistory: (networkId: string, history: NetworkHistory) => void;
  setCanUndo: (networkId: string, canUndo: boolean) => void;
  setCanRedo: (networkId: string, canRedo: boolean) => void;
}

const useHistoryStateStore = create<HistoryStateStore>((set, get) => ({
  history: {},
  canUndo: {},
  canRedo: {},
  setHistory: (networkId: string, history: NetworkHistory) =>
    set((state) => ({
      history: { ...state.history, [networkId]: history },
    })),
  setCanUndo: (networkId: string, canUndo: boolean) =>
    set((state) => ({
      canUndo: { ...state.canUndo, [networkId]: canUndo },
    })),
  setCanRedo: (networkId: string, canRedo: boolean) =>
    set((state) => ({
      canRedo: { ...state.canRedo, [networkId]: canRedo },
    })),
}));

export const useNodeNetworkHistory = (networkId: string) => {
  // Get the existing network operations
  const { nodes, edges, setNodes, setEdges } = useNodeNetwork(networkId);

  // Simple flag to bypass history during drag
  const bypassHistoryRef = useRef(false);

  // Use global Zustand store for reactive state
  const {
    history: globalHistory,
    canUndo,
    canRedo,
    setHistory,
    setCanUndo,
    setCanRedo,
  } = useHistoryStateStore();

  // Initialize history for this network if it doesn't exist
  useEffect(() => {
    if (!globalHistory[networkId]) {
      const initialHistory = {
        past: [],
        present: { nodes, edges },
        future: [],
      };
      setHistory(networkId, initialHistory);
    }
  }, [networkId, globalHistory, nodes, edges, setHistory]);

  // Push current state to history
  const pushToHistory = useCallback(
    (newNodes: any[], newEdges: any[]) => {
      const history = globalHistory[networkId];

      // Check if this would be identical to the last saved state
      const newState = { nodes: newNodes, edges: newEdges };
      const lastState = history.present;

      if (JSON.stringify(newState) === JSON.stringify(lastState)) {
        return;
      }

      // Only save to history if not bypassing
      if (bypassHistoryRef.current) {
        return;
      }

      // Add current state to past
      history.past.push(history.present);

      // Update present
      history.present = newState;

      // Clear future (new action destroys redo stack)
      history.future = [];

      // Update global state directly
      setCanUndo(networkId, history.past.length > 0);
      setCanRedo(networkId, history.future.length > 0);

      // Update the global history
      setHistory(networkId, history);
    },
    [networkId, setCanUndo, setCanRedo, globalHistory, setHistory],
  );

  // Undo function
  const undo = useCallback(() => {
    const history = globalHistory[networkId];

    if (history.past.length === 0) {
      return;
    }

    // Move current state to future
    history.future.unshift(history.present);

    // Restore previous state
    const previous = history.past.pop()!;
    history.present = previous;

    // Apply to network (let ReactFlow handle selection)
    setNodes(previous.nodes);
    setEdges(previous.edges);

    // Update global state directly
    setCanUndo(networkId, history.past.length > 0);
    setCanRedo(networkId, history.future.length > 0);

    // Update the global history
    setHistory(networkId, history);
  }, [
    networkId,
    setNodes,
    setEdges,
    setCanUndo,
    setCanRedo,
    globalHistory,
    setHistory,
  ]);

  // Redo function
  const redo = useCallback(() => {
    const history = globalHistory[networkId];

    if (history.future.length === 0) {
      return;
    }

    // Move current state to past
    history.past.push(history.present);

    // Restore future state
    const next = history.future.shift()!;
    history.present = next;

    // Apply to network (let ReactFlow handle selection)
    setNodes(next.nodes);
    setEdges(next.edges);

    // Update global state directly
    setCanUndo(networkId, history.past.length > 0);
    setCanRedo(networkId, history.future.length > 0);

    // Update the global history
    setHistory(networkId, history);
  }, [
    networkId,
    setNodes,
    setEdges,
    setCanUndo,
    setCanRedo,
    globalHistory,
    setHistory,
  ]);

  // Check if undo/redo are available
  const checkCanUndo = useCallback(() => {
    const history = globalHistory[networkId];
    const result = history.past.length > 0;
    return result;
  }, [networkId, globalHistory]);

  const checkCanRedo = useCallback(() => {
    const history = globalHistory[networkId];
    const result = history.future.length > 0;
    return result;
  }, [networkId, globalHistory]);

  // Reactive canUndo/canRedo values
  const reactiveCanUndo = useMemo(() => {
    return canUndo[networkId] || false;
  }, [canUndo, networkId]);

  const reactiveCanRedo = useMemo(() => {
    return canRedo[networkId] || false;
  }, [canRedo, networkId]);

  // Wrapped setNodes that pushes to history (only when not bypassing)
  const setNodesWithHistory = useCallback(
    (newNodes: any[]) => {
      setNodes(newNodes);

      // Only save to history if not bypassing
      if (!bypassHistoryRef.current) {
        pushToHistory(newNodes, edges);
        // Update reactive state
        checkCanUndo();
        checkCanRedo();
      }
    },
    [setNodes, pushToHistory, edges, checkCanUndo, checkCanRedo],
  );

  // Wrapped setEdges that pushes to history (only when not bypassing)
  const setEdgesWithHistory = useCallback(
    (newEdges: any[]) => {
      setEdges(newEdges);

      // Only save to history if not bypassing
      if (!bypassHistoryRef.current) {
        pushToHistory(nodes, newEdges);
        // Update reactive state
        checkCanUndo();
        checkCanRedo();
      }
    },
    [setEdges, pushToHistory, nodes, checkCanUndo, checkCanRedo],
  );

  // Functions to control history bypass
  const startDrag = useCallback(() => {
    bypassHistoryRef.current = true;
  }, []);

  const endDrag = useCallback(() => {
    bypassHistoryRef.current = false;
  }, []);

  const result = {
    // Original functions
    nodes,
    edges,
    setNodes: setNodesWithHistory,
    setEdges: setEdgesWithHistory,

    // History functions
    undo,
    redo,
    canUndo: reactiveCanUndo,
    canRedo: reactiveCanRedo,

    // Drag functions
    startDrag,
    endDrag,
  };

  return result;
};
