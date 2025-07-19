import { useCallback, useEffect, useRef } from 'react';
import { useNodeNetworkStore } from '../../components/node-network/node-network-store';
import { useNodeGraphClipboardStore } from '../stores/node-graph-clipboard-store';

interface UseNodeGraphClipboardOptions {
  parameterId: string;
  reactFlowInstance: React.MutableRefObject<any>;
  enabled?: boolean;
}

export const useNodeGraphClipboard = ({
  parameterId,
  reactFlowInstance,
  enabled = true,
}: UseNodeGraphClipboardOptions) => {
  const { copyNodes, pasteNodes, hasClipboardData } =
    useNodeGraphClipboardStore();

  // Store copied node IDs to work independently of current selection
  const copiedNodeIdsRef = useRef<string[]>([]);

  const copySelectedNodes = useCallback(() => {
    if (!reactFlowInstance.current) return;

    const selectedNodes = reactFlowInstance.current
      .getNodes()
      .filter((node: any) => node.selected);
    console.log('Copy triggered, selected nodes:', selectedNodes);

    if (selectedNodes.length > 0) {
      const selectedNodeIds = selectedNodes.map((node: any) => node.id);
      // Store the copied node IDs for later use
      copiedNodeIdsRef.current = selectedNodeIds;
      console.log('Storing copied node IDs:', selectedNodeIds);

      // Get edges that connect selected nodes to each other
      const allEdges = reactFlowInstance.current.getEdges();
      const selectedEdges = allEdges.filter(
        (edge: any) =>
          selectedNodeIds.includes(edge.source) &&
          selectedNodeIds.includes(edge.target),
      );

      copyNodes(selectedNodes, selectedEdges);
    }
  }, [copyNodes, reactFlowInstance]);

  const pasteNodesAtPosition = useCallback(
    (position: { x: number; y: number }) => {
      console.log(
        'Paste triggered, stored node IDs:',
        copiedNodeIdsRef.current,
      );
      console.log('Pasting at position:', position);

      const newNodes = pasteNodes(position, parameterId);

      // Add the new nodes and edges to the network through the store
      if (newNodes.length > 0) {
        const clipboard = useNodeGraphClipboardStore.getState().clipboard;
        if (clipboard) {
          const newNodeIdMap = new Map<string, string>();
          newNodes.forEach((newNode, index) => {
            const originalNode = clipboard.nodes[index];
            if (originalNode) {
              newNodeIdMap.set(originalNode.id, newNode.id);
            }
          });

          const newEdges = clipboard.edges.map((edge) => ({
            ...edge,
            id: `${parameterId}-edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            source: newNodeIdMap.get(edge.source) || edge.source,
            target: newNodeIdMap.get(edge.target) || edge.target,
          }));

          // Get current network state from the store
          const { networks } = useNodeNetworkStore.getState();
          const currentNetwork = networks[parameterId];

          if (currentNetwork) {
            // Clear all existing selections first (both nodes and edges)
            const unselectedNodes = currentNetwork.nodes.map((node: any) => ({
              ...node,
              selected: false,
            }));
            const unselectedEdges = currentNetwork.edges.map((edge: any) => ({
              ...edge,
              selected: false,
            }));

            // Update the network with new nodes/edges and clear old selections
            const updatedNetwork = {
              ...currentNetwork,
              nodes: [...unselectedNodes, ...(newNodes as any)], // Clear old selections, add new nodes
              edges: [...unselectedEdges, ...newEdges], // Clear old selections, add new edges
            };

            useNodeNetworkStore
              .getState()
              .setNetwork(parameterId, updatedNetwork);
            console.log(
              'Network updated through store with cleared selections',
            );

            // Now select the newly pasted nodes and edges
            const allNodes = updatedNetwork.nodes;
            const allEdges = updatedNetwork.edges;

            const newlySelectedNodes = allNodes.map((node: any) => {
              const isNewlyPasted = newNodes.some(
                (newNode: any) => newNode.id === node.id,
              );
              return { ...node, selected: isNewlyPasted };
            });

            const newlySelectedEdges = allEdges.map((edge: any) => {
              const isNewlyPasted = newEdges.some(
                (newEdge: any) => newEdge.id === edge.id,
              );
              return { ...edge, selected: isNewlyPasted };
            });

            useNodeNetworkStore
              .getState()
              .setNodesInNetwork(parameterId, newlySelectedNodes);
            useNodeNetworkStore
              .getState()
              .setEdgesInNetwork(parameterId, newlySelectedEdges);
            console.log('Newly pasted nodes and edges selected');
          }
        }
      }
    },
    [pasteNodes, parameterId],
  );

  const duplicateSelectedNodes = useCallback(() => {
    if (!reactFlowInstance.current) return;

    const selectedNodes = reactFlowInstance.current
      .getNodes()
      .filter((node: any) => node.selected);
    console.log('Duplicate triggered, selected nodes:', selectedNodes);

    if (selectedNodes.length > 0) {
      const selectedNodeIds = selectedNodes.map((node: any) => node.id);

      // Get edges that connect selected nodes to each other
      const allEdges = reactFlowInstance.current.getEdges();
      const selectedEdges = allEdges.filter(
        (edge: any) =>
          selectedNodeIds.includes(edge.source) &&
          selectedNodeIds.includes(edge.target),
      );

      // Copy to clipboard first
      copyNodes(selectedNodes, selectedEdges);

      // Calculate center of selected nodes for offset
      const center = {
        x:
          selectedNodes.reduce(
            (sum: number, node: any) => sum + node.position.x,
            0,
          ) / selectedNodes.length,
        y:
          selectedNodes.reduce(
            (sum: number, node: any) => sum + node.position.y,
            0,
          ) / selectedNodes.length,
      };

      // Paste with a small offset (20px down and right)
      const offsetPosition = {
        x: center.x + 20,
        y: center.y + 20,
      };

      console.log('Duplicating at offset position:', offsetPosition);
      pasteNodesAtPosition(offsetPosition);

      // Note: Selection is now handled within pasteNodesAtPosition
      // so we don't need to do anything extra here
    }
  }, [copyNodes, pasteNodesAtPosition, reactFlowInstance]);

  const canPaste = useCallback(() => {
    return hasClipboardData();
  }, [hasClipboardData]);

  // Keyboard shortcuts using manual event listeners
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when the node editor is mounted and ReactFlow is ready
      if (!reactFlowInstance.current) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? event.metaKey : event.ctrlKey;

      if (modifierKey && event.key === 'c') {
        event.preventDefault();
        event.stopPropagation();
        console.log('Copy keyboard shortcut triggered');
        copySelectedNodes();
      } else if (modifierKey && event.key === 'v') {
        event.preventDefault();
        event.stopPropagation();
        console.log('Paste keyboard shortcut triggered');

        // Paste at mouse position or center of view
        const position = reactFlowInstance.current?.getViewport()?.center || {
          x: 0,
          y: 0,
        };
        console.log('Pasting at position:', position);
        pasteNodesAtPosition(position);
      } else if (modifierKey && event.key === 'd') {
        event.preventDefault();
        event.stopPropagation();
        console.log('Duplicate keyboard shortcut triggered');
        duplicateSelectedNodes();
      }
    };

    // Use capture phase to ensure our handler runs before others
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled, copySelectedNodes, pasteNodesAtPosition]);

  return {
    copySelectedNodes,
    pasteNodesAtPosition,
    duplicateSelectedNodes,
    canPaste,
    copiedNodeIds: copiedNodeIdsRef.current,
  };
};
