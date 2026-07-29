import { useCallback, useRef } from 'react';
import {
  getNodeNetworks,
  setEdgesInNetwork,
  setNodeNetwork,
  setNodesInNetwork,
} from '../../components/node-network/node-network-store';
import { useKeyboardShortcuts } from '../hooks/use-keyboard-shortcuts';
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

  // Helper to extract boundary edges and filter nodes
  const extractCopyData = useCallback(
    (nodesToCopy: any[]) => {
      if (!reactFlowInstance.current) return null;

      // Filter out input and output nodes
      const copyableNodes = nodesToCopy.filter(
        (node: any) =>
          !node.id.includes('-input-node') && !node.id.includes('-output-node'),
      );

      if (copyableNodes.length === 0) return null;

      const copyableNodeIds = copyableNodes.map((node: any) => node.id);
      const allEdges = reactFlowInstance.current.getEdges();

      // Get edges between copyable nodes
      const internalEdges = allEdges.filter(
        (edge: any) =>
          copyableNodeIds.includes(edge.source) &&
          copyableNodeIds.includes(edge.target),
      );

      // Get edges from input node to copyable nodes
      const inputEdges = allEdges
        .filter(
          (edge: any) =>
            edge.source.includes('-input-node') &&
            copyableNodeIds.includes(edge.target),
        )
        .map((edge: any) => ({
          boundaryHandle: edge.sourceHandle,
          connectedNodeId: edge.target,
          connectedHandle: edge.targetHandle,
        }));

      // Get edges from copyable nodes to output node
      const outputEdges = allEdges
        .filter(
          (edge: any) =>
            copyableNodeIds.includes(edge.source) &&
            edge.target.includes('-output-node'),
        )
        .map((edge: any) => ({
          boundaryHandle: edge.targetHandle,
          connectedNodeId: edge.source,
          connectedHandle: edge.sourceHandle,
        }));

      return {
        copyableNodes,
        copyableNodeIds,
        internalEdges,
        inputEdges,
        outputEdges,
      };
    },
    [reactFlowInstance],
  );

  const copySelectedNodes = useCallback(() => {
    if (!reactFlowInstance.current) return;

    const selectedNodes = reactFlowInstance.current
      .getNodes()
      .filter((node: any) => node.selected);

    const copyData = extractCopyData(selectedNodes);
    if (!copyData) return;

    copiedNodeIdsRef.current = copyData.copyableNodeIds;
    copyNodes(
      copyData.copyableNodes,
      copyData.internalEdges,
      copyData.inputEdges,
      copyData.outputEdges,
    );
  }, [copyNodes, reactFlowInstance, extractCopyData]);

  const copyAllNodes = useCallback(() => {
    if (!reactFlowInstance.current) return;

    const allNodes = reactFlowInstance.current.getNodes();
    const copyData = extractCopyData(allNodes);
    if (!copyData) return;

    copiedNodeIdsRef.current = copyData.copyableNodeIds;
    copyNodes(
      copyData.copyableNodes,
      copyData.internalEdges,
      copyData.inputEdges,
      copyData.outputEdges,
    );
  }, [copyNodes, reactFlowInstance, extractCopyData]);

  const pasteNodesAtPosition = useCallback(
    (position: { x: number; y: number }) => {
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

          // Create edges between pasted nodes
          const newInternalEdges = clipboard.edges.map((edge) => ({
            ...edge,
            id: `${parameterId}-edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            source: newNodeIdMap.get(edge.source) || edge.source,
            target: newNodeIdMap.get(edge.target) || edge.target,
          }));

          // Get current network state from the store
          const currentNetwork = getNodeNetworks()[parameterId];

          if (currentNetwork) {
            // Find the input and output nodes of the target network
            const inputNodeId = `${parameterId}-input-node`;
            const outputNodeId = `${parameterId}-output-node`;

            // Create edges from input node to pasted nodes
            const newInputEdges = clipboard.inputEdges
              .map((boundaryEdge) => {
                const newTargetId = newNodeIdMap.get(
                  boundaryEdge.connectedNodeId,
                );
                if (!newTargetId) return null;
                return {
                  id: `${parameterId}-edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  source: inputNodeId,
                  sourceHandle: boundaryEdge.boundaryHandle,
                  target: newTargetId,
                  targetHandle: boundaryEdge.connectedHandle,
                  animated: true,
                  style: { stroke: 'white' },
                };
              })
              .filter(Boolean);

            // Create edges from pasted nodes to output node
            const newOutputEdges = clipboard.outputEdges
              .map((boundaryEdge) => {
                const newSourceId = newNodeIdMap.get(
                  boundaryEdge.connectedNodeId,
                );
                if (!newSourceId) return null;
                return {
                  id: `${parameterId}-edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  source: newSourceId,
                  sourceHandle: boundaryEdge.connectedHandle,
                  target: outputNodeId,
                  targetHandle: boundaryEdge.boundaryHandle,
                  animated: true,
                  style: { stroke: 'white' },
                };
              })
              .filter(Boolean);

            // Combine all new edges
            const allNewEdges = [
              ...newInternalEdges,
              ...newInputEdges,
              ...newOutputEdges,
            ];

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
              nodes: [...unselectedNodes, ...(newNodes as any)],
              edges: [...unselectedEdges, ...allNewEdges],
            };

            setNodeNetwork(parameterId, updatedNetwork);

            // Now select the newly pasted nodes and edges
            const finalNodes = updatedNetwork.nodes;
            const finalEdges = updatedNetwork.edges;

            const newlySelectedNodes = finalNodes.map((node: any) => {
              const isNewlyPasted = newNodes.some(
                (newNode: any) => newNode.id === node.id,
              );
              return { ...node, selected: isNewlyPasted };
            });

            const newlySelectedEdges = finalEdges.map((edge: any) => {
              const isNewlyPasted = allNewEdges.some(
                (newEdge: any) => newEdge.id === edge.id,
              );
              return { ...edge, selected: isNewlyPasted };
            });

            setNodesInNetwork(parameterId, newlySelectedNodes);
            setEdgesInNetwork(parameterId, newlySelectedEdges);
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

    const copyData = extractCopyData(selectedNodes);
    if (!copyData) return;

    // Copy to clipboard first (using the same logic as copySelectedNodes)
    copyNodes(
      copyData.copyableNodes,
      copyData.internalEdges,
      copyData.inputEdges,
      copyData.outputEdges,
    );

    // Calculate center of copyable nodes for offset
    const center = {
      x:
        copyData.copyableNodes.reduce(
          (sum: number, node: any) => sum + node.position.x,
          0,
        ) / copyData.copyableNodes.length,
      y:
        copyData.copyableNodes.reduce(
          (sum: number, node: any) => sum + node.position.y,
          0,
        ) / copyData.copyableNodes.length,
    };

    // Paste with a small offset (20px down and right)
    const offsetPosition = {
      x: center.x + 20,
      y: center.y + 20,
    };

    pasteNodesAtPosition(offsetPosition);

    // Note: Selection is now handled within pasteNodesAtPosition
    // so we don't need to do anything extra here
  }, [copyNodes, pasteNodesAtPosition, reactFlowInstance, extractCopyData]);

  const canPaste = useCallback(() => {
    return hasClipboardData();
  }, [hasClipboardData]);

  // Use the generic keyboard shortcuts hook
  useKeyboardShortcuts({
    enabled,
    shortcuts: [
      {
        key: 'c',
        ctrl: true,
        callback: copySelectedNodes,
        enabled: enabled && !!reactFlowInstance.current,
      },
      {
        key: 'v',
        ctrl: true,
        callback: () => {
          // Paste at mouse position or center of view
          const position = reactFlowInstance.current?.getViewport()?.center || {
            x: 0,
            y: 0,
          };
          pasteNodesAtPosition(position);
        },
        enabled: enabled && !!reactFlowInstance.current && canPaste(),
      },
      {
        key: 'd',
        ctrl: true,
        callback: duplicateSelectedNodes,
        enabled: enabled && !!reactFlowInstance.current,
      },
    ],
  });

  return {
    copySelectedNodes,
    copyAllNodes,
    pasteNodesAtPosition,
    duplicateSelectedNodes,
    canPaste,
    copiedNodeIds: copiedNodeIdsRef.current,
  };
};
