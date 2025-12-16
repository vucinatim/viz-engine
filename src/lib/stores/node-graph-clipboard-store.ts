import { Edge, Node } from '@xyflow/react';
import { create } from 'zustand';

// Edge that was connected to an input or output node
interface BoundaryEdge {
  // The handle on the input/output node
  boundaryHandle: string;
  // The node ID that was connected (will be remapped on paste)
  connectedNodeId: string;
  // The handle on the connected node
  connectedHandle: string;
}

// Node graph clipboard data structure for copy/paste
interface NodeGraphClipboardData {
  nodes: Node[];
  edges: Edge[];
  // Edges that connected from input node to copied nodes
  inputEdges: BoundaryEdge[];
  // Edges that connected from copied nodes to output node
  outputEdges: BoundaryEdge[];
}

interface NodeGraphClipboardStore {
  clipboard: NodeGraphClipboardData | null;
  copyNodes: (
    nodes: Node[],
    edges: Edge[],
    inputEdges?: BoundaryEdge[],
    outputEdges?: BoundaryEdge[],
  ) => void;
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

    copyNodes: (
      nodes: Node[],
      edges: Edge[],
      inputEdges: BoundaryEdge[] = [],
      outputEdges: BoundaryEdge[] = [],
    ) => {
      set({ clipboard: { nodes, edges, inputEdges, outputEdges } });
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
