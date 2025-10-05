import { Edge, Node } from '@xyflow/react';
import { create } from 'zustand';

// Node graph clipboard data structure for copy/paste
interface NodeGraphClipboardData {
  nodes: Node[];
  edges: Edge[];
}

interface NodeGraphClipboardStore {
  clipboard: NodeGraphClipboardData | null;
  copyNodes: (nodes: Node[], edges: Edge[]) => void;
  pasteNodes: (
    position: { x: number; y: number },
    parameterId: string,
  ) => Node[];
  clearClipboard: () => void;
  hasClipboardData: () => boolean;
}

export const useNodeGraphClipboardStore = create<NodeGraphClipboardStore>(
  (set, get) => ({
    clipboard: null,

    copyNodes: (nodes: Node[], edges: Edge[]) => {
      set({ clipboard: { nodes, edges } });
    },

    pasteNodes: (position: { x: number; y: number }, parameterId: string) => {
      const clipboard = get().clipboard;

      if (!clipboard || clipboard.nodes.length === 0) {
        return [];
      }

      // Calculate offset from original positions
      const originalCenter = {
        x:
          clipboard.nodes.reduce((sum, node) => sum + node.position.x, 0) /
          clipboard.nodes.length,
        y:
          clipboard.nodes.reduce((sum, node) => sum + node.position.y, 0) /
          clipboard.nodes.length,
      };

      const offset = {
        x: position.x - originalCenter.x,
        y: position.y - originalCenter.y,
      };

      // Create new nodes with new IDs and offset positions
      const newNodeIdMap = new Map<string, string>();
      const newNodes = clipboard.nodes.map((node) => {
        const newNodeId = `${parameterId}-node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        newNodeIdMap.set(node.id, newNodeId);

        return {
          ...node,
          id: newNodeId,
          position: {
            x: node.position.x + offset.x,
            y: node.position.y + offset.y,
          },
        };
      });

      // Create new edges with updated node IDs
      const newEdges = clipboard.edges.map((edge) => ({
        ...edge,
        id: `${parameterId}-edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        source: newNodeIdMap.get(edge.source) || edge.source,
        target: newNodeIdMap.get(edge.target) || edge.target,
      }));

      return newNodes;
    },

    clearClipboard: () => {
      set({ clipboard: null });
    },

    hasClipboardData: () => {
      const clipboard = get().clipboard;
      return clipboard !== null && clipboard.nodes.length > 0;
    },
  }),
);
