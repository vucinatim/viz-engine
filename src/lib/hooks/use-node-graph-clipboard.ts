import type { Edge, ReactFlowInstance } from '@xyflow/react';
import { useCallback, type MutableRefObject } from 'react';

import {
  pasteGraphFragment,
  type GraphNode,
} from '@/components/node-network/node-network-store';
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts';
import { useNodeGraphClipboardStore } from '@/lib/stores/node-graph-clipboard-store';
import { getVizSessionState } from '@/lib/viz-session';
import {
  createVizGraphFragment,
  type VizGraphFragment,
} from '@/lib/viz-session/graph-fragments';

interface UseNodeGraphClipboardOptions {
  parameterId: string;
  reactFlowInstance: MutableRefObject<ReactFlowInstance<
    GraphNode,
    Edge
  > | null>;
  enabled?: boolean;
}

export const useNodeGraphClipboard = ({
  parameterId,
  reactFlowInstance,
  enabled = true,
}: UseNodeGraphClipboardOptions) => {
  const { setClipboard, hasClipboardData } = useNodeGraphClipboardStore();

  const copyNodeIds = useCallback(
    (nodeIds: string[]): VizGraphFragment | null => {
      const graph = getVizSessionState().project.workingProject.graphs?.find(
        (candidate) => candidate.id === parameterId,
      );
      if (!graph) {
        return null;
      }

      const fragment = createVizGraphFragment(graph, nodeIds);
      if (fragment.nodes.length === 0) {
        return null;
      }
      setClipboard(fragment);
      return fragment;
    },
    [parameterId, setClipboard],
  );

  const copySelectedNodes = useCallback(() => {
    const nodeIds =
      reactFlowInstance.current
        ?.getNodes()
        .filter((node) => node.selected)
        .map((node) => node.id) ?? [];
    copyNodeIds(nodeIds);
  }, [copyNodeIds, reactFlowInstance]);

  const copyNode = useCallback(
    (nodeId: string) => copyNodeIds([nodeId]),
    [copyNodeIds],
  );

  const copyAllNodes = useCallback(() => {
    copyNodeIds(
      reactFlowInstance.current?.getNodes().map((node) => node.id) ?? [],
    );
  }, [copyNodeIds, reactFlowInstance]);

  const pasteNodesAtPosition = useCallback(
    (position: { x: number; y: number }) => {
      const fragment = useNodeGraphClipboardStore.getState().clipboard;
      if (!fragment) {
        return;
      }

      const pastedNodeIds = new Set(
        pasteGraphFragment(parameterId, fragment, position),
      );
      if (pastedNodeIds.size === 0) {
        return;
      }
    },
    [parameterId],
  );

  const duplicateNodeIds = useCallback(
    (nodeIds: string[]) => {
      const fragment = copyNodeIds(nodeIds);
      if (!fragment) {
        return;
      }

      const center = {
        x:
          fragment.nodes.reduce(
            (sum, node) => sum + (node.position?.x ?? 0),
            0,
          ) / fragment.nodes.length,
        y:
          fragment.nodes.reduce(
            (sum, node) => sum + (node.position?.y ?? 0),
            0,
          ) / fragment.nodes.length,
      };
      pasteNodesAtPosition({ x: center.x + 20, y: center.y + 20 });
    },
    [copyNodeIds, pasteNodesAtPosition],
  );

  const duplicateSelectedNodes = useCallback(() => {
    duplicateNodeIds(
      reactFlowInstance.current
        ?.getNodes()
        .filter((node) => node.selected)
        .map((node) => node.id) ?? [],
    );
  }, [duplicateNodeIds, reactFlowInstance]);

  const duplicateNode = useCallback(
    (nodeId: string) => duplicateNodeIds([nodeId]),
    [duplicateNodeIds],
  );

  const canPaste = useCallback(() => hasClipboardData(), [hasClipboardData]);

  useKeyboardShortcuts({
    enabled,
    shortcuts: [
      {
        key: 'c',
        mod: true,
        callback: copySelectedNodes,
        enabled,
      },
      {
        key: 'v',
        mod: true,
        callback: () => {
          const viewport = reactFlowInstance.current?.getViewport();
          pasteNodesAtPosition(
            viewport
              ? {
                  x: -viewport.x / viewport.zoom,
                  y: -viewport.y / viewport.zoom,
                }
              : { x: 0, y: 0 },
          );
        },
        enabled,
      },
      {
        key: 'd',
        mod: true,
        callback: duplicateSelectedNodes,
        enabled,
      },
    ],
  });

  return {
    copySelectedNodes,
    copyNode,
    copyAllNodes,
    pasteNodesAtPosition,
    duplicateSelectedNodes,
    duplicateNode,
    canPaste,
  };
};
