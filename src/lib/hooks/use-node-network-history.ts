import { useCallback, useRef } from 'react';
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

export const useNodeNetworkHistory = (networkId: string) => {
  // Get the existing network operations
  const { nodes, edges, setNodes, setEdges } = useNodeNetwork(networkId);

  // Store history in a ref to avoid re-renders
  const historyRef = useRef<HistoryStore>({});

  // Simple flag to bypass history during drag
  const bypassHistoryRef = useRef(false);

  // Initialize history for this network if it doesn't exist
  if (!historyRef.current[networkId]) {
    historyRef.current[networkId] = {
      past: [],
      present: { nodes, edges },
      future: [],
    };
  }

  // Push current state to history
  const pushToHistory = useCallback(
    (newNodes: any[], newEdges: any[]) => {
      const history = historyRef.current[networkId];

      // Check if this would be identical to the last saved state
      const newState = { nodes: newNodes, edges: newEdges };
      const lastState = history.present;

      if (JSON.stringify(newState) === JSON.stringify(lastState)) {
        console.log('Skipping history save - state unchanged');
        return;
      }

      // Add current state to past
      history.past.push(history.present);

      // Update present
      history.present = newState;

      // Clear future (new action destroys redo stack)
      history.future = [];

      console.log('Pushed to history:', {
        nodes: newNodes.length,
        edges: newEdges.length,
      });
    },
    [networkId],
  );

  // Undo function
  const undo = useCallback(() => {
    const history = historyRef.current[networkId];

    if (history.past.length === 0) {
      console.log('Nothing to undo');
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

    console.log('Undo applied');
  }, [networkId, setNodes, setEdges]);

  // Redo function
  const redo = useCallback(() => {
    const history = historyRef.current[networkId];

    if (history.future.length === 0) {
      console.log('Nothing to redo');
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

    console.log('Redo applied');
  }, [networkId, setNodes, setEdges]);

  // Check if undo/redo are available
  const canUndo = useCallback(() => {
    const history = historyRef.current[networkId];
    return history.past.length > 0;
  }, [networkId]);

  const canRedo = useCallback(() => {
    const history = historyRef.current[networkId];
    return history.future.length > 0;
  }, [networkId]);

  // Wrapped setNodes that pushes to history (only when not bypassing)
  const setNodesWithHistory = useCallback(
    (newNodes: any[]) => {
      setNodes(newNodes);

      // Only save to history if not bypassing
      if (!bypassHistoryRef.current) {
        pushToHistory(newNodes, edges);
      }
    },
    [setNodes, pushToHistory, edges],
  );

  // Wrapped setEdges that pushes to history (only when not bypassing)
  const setEdgesWithHistory = useCallback(
    (newEdges: any[]) => {
      setEdges(newEdges);

      // Only save to history if not bypassing
      if (!bypassHistoryRef.current) {
        pushToHistory(nodes, newEdges);
      }
    },
    [setEdges, pushToHistory, nodes],
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
    canUndo: canUndo(),
    canRedo: canRedo(),

    // Drag functions
    startDrag,
    endDrag,
  };

  return result;
};
