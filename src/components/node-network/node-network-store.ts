import { Edge } from '@xyflow/react';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

import useEditorGraphStore from '@/lib/stores/editor-graph-store';
import type { VizGraphFragment } from '@/lib/viz-session/graph-fragments';
import {
  NodeHandleType,
  canConnectTypes,
  getTypeColor,
  getTypeLabel,
} from '../config/node-types';
import { VType } from '../config/types';
import { GraphNode, GraphNodeData, NodeNetwork } from './graph-types';

interface NodeNetworkStore {
  openNetwork: string | null;
  setOpenNetwork: (parameterId: string | null) => void;
  areNetworksMinimized: boolean;
  setNetworksMinimized: (isMinimized: boolean) => void;
  shouldForceShowOverlay: boolean;
  setShouldForceShowOverlay: (shouldShow: boolean) => void;
}

type PersistedNodeNetworkUiState = Pick<
  NodeNetworkStore,
  'openNetwork' | 'areNetworksMinimized' | 'shouldForceShowOverlay'
>;

export const nodeNetworkStorePartialize = (
  state: NodeNetworkStore,
): PersistedNodeNetworkUiState => ({
  openNetwork: state.openNetwork,
  areNetworksMinimized: state.areNetworksMinimized,
  shouldForceShowOverlay: false,
});

export const nodeNetworkStoreMerge = (
  persistedState: unknown,
  currentState: NodeNetworkStore,
): NodeNetworkStore => {
  const persisted =
    (persistedState as PersistedNodeNetworkUiState | undefined) ??
    ({
      openNetwork: null,
      areNetworksMinimized: false,
      shouldForceShowOverlay: false,
    } satisfies PersistedNodeNetworkUiState);

  return {
    ...currentState,
    openNetwork: persisted.openNetwork ?? null,
    areNetworksMinimized: persisted.areNetworksMinimized ?? false,
    shouldForceShowOverlay: false,
  };
};

export const useNodeNetworkStore = create<NodeNetworkStore>((set) => ({
  openNetwork: null,
  areNetworksMinimized: false,
  shouldForceShowOverlay: false,
  setOpenNetwork: (parameterId) => set({ openNetwork: parameterId }),
  setNetworksMinimized: (isMinimized) =>
    set({
      areNetworksMinimized: isMinimized,
    }),
  setShouldForceShowOverlay: (shouldShow) =>
    set({
      shouldForceShowOverlay: shouldShow,
    }),
}));

export default useNodeNetworkStore;

export const getNodeNetworks = () => useEditorGraphStore.getState().networks;

export const getNodeNetwork = (parameterId: string) =>
  useEditorGraphStore.getState().networks[parameterId];

export const setNodeNetworkEnabled = (
  parameterId: string,
  isEnabled: boolean,
  type: VType,
) => {
  const graphStore = useEditorGraphStore.getState();
  const nodeUiStore = useNodeNetworkStore.getState();

  graphStore.setNetworkEnabled(parameterId, isEnabled, type);

  if (!isEnabled && nodeUiStore.openNetwork === parameterId) {
    nodeUiStore.setOpenNetwork(null);
  } else if (isEnabled && nodeUiStore.openNetwork === null) {
    nodeUiStore.setOpenNetwork(parameterId);
  }

  if (isEnabled) {
    nodeUiStore.setShouldForceShowOverlay(true);
  }
};

export const addNodeToNetwork = (parameterId: string, node: GraphNode) => {
  useEditorGraphStore.getState().addNodeToNetwork(parameterId, node);
};

export const pasteGraphFragment = (
  parameterId: string,
  fragment: VizGraphFragment,
  position: { x: number; y: number },
) =>
  useEditorGraphStore.getState().pasteFragment(parameterId, fragment, position);

export const setNodesInNetwork = (parameterId: string, nodes: GraphNode[]) => {
  useEditorGraphStore.getState().setNodesInNetwork(parameterId, nodes);
};

export const setEdgesInNetwork = (parameterId: string, edges: Edge[]) => {
  useEditorGraphStore.getState().setEdgesInNetwork(parameterId, edges);
};

export const createNodeNetworkForParameter = (
  parameterId: string,
  type: VType,
) => {
  useEditorGraphStore.getState().createNetworkForParameter(parameterId, type);
  const nodeUiStore = useNodeNetworkStore.getState();
  nodeUiStore.setOpenNetwork(parameterId);
  nodeUiStore.setShouldForceShowOverlay(true);
};

export const removeNodeNetworkForParameter = (parameterId: string) => {
  useEditorGraphStore.getState().removeNetworkForParameter(parameterId);
  const nodeUiStore = useNodeNetworkStore.getState();
  if (nodeUiStore.openNetwork === parameterId) {
    nodeUiStore.setOpenNetwork(null);
  }
};

export const applyPresetToNodeNetwork = (
  parameterId: string,
  presetId: string,
  outputType: NodeHandleType,
) => {
  useEditorGraphStore
    .getState()
    .applyPresetToNetwork(parameterId, presetId, outputType);
  const nodeUiStore = useNodeNetworkStore.getState();
  nodeUiStore.setOpenNetwork(parameterId);
  nodeUiStore.setShouldForceShowOverlay(true);
};

export const updateNodeNetworkInputValue = (
  parameterId: string,
  nodeId: string,
  inputId: string,
  value: any,
) => {
  useEditorGraphStore
    .getState()
    .updateNodeInputValue(parameterId, nodeId, inputId, value);
};

export const duplicateNodeNetwork = (
  fromParameterId: string,
  toParameterId: string,
) => {
  useEditorGraphStore
    .getState()
    .duplicateNetwork(fromParameterId, toParameterId);
};

export const clearStaleNodeNetworks = () => {
  const openNetwork = useNodeNetworkStore.getState().openNetwork;
  useEditorGraphStore.getState().clearStaleNetworks();
  const networks = useEditorGraphStore.getState().networks;
  if (openNetwork && !networks[openNetwork]) {
    useNodeNetworkStore.getState().setOpenNetwork(null);
  }
};

export const useNodeNetwork = (parameterId: string) => {
  const network = useEditorGraphStore((state) => state.networks[parameterId]);

  return {
    ...network,
    setNodes: (nodes: GraphNode[]) => setNodesInNetwork(parameterId, nodes),
    setEdges: (edges: Edge[]) => setEdgesInNetwork(parameterId, edges),
    addNode: (node: GraphNode) => addNodeToNetwork(parameterId, node),
    updateInputValue: (nodeId: string, inputId: string, value: any) =>
      updateNodeNetworkInputValue(parameterId, nodeId, inputId, value),
  };
};

const getNodeOutputType = (
  node: GraphNode,
  outputId: string,
): NodeHandleType | null => {
  const output = node.data.definition.outputs.find(
    (candidate) => candidate.id === outputId,
  );
  return output ? (output.type as NodeHandleType) : null;
};

const getNodeInputType = (
  node: GraphNode,
  inputId: string,
): NodeHandleType | null => {
  const input = node.data.definition.inputs.find(
    (candidate) => candidate.id === inputId,
  );
  return input ? (input.type as NodeHandleType) : null;
};

export const validateConnection = (
  sourceNode: GraphNode,
  sourceHandle: string,
  targetNode: GraphNode,
  targetHandle: string,
): boolean => {
  const sourceType = getNodeOutputType(sourceNode, sourceHandle);
  const targetType = getNodeInputType(targetNode, targetHandle);

  if (!sourceType || !targetType) {
    return false;
  }

  return canConnectTypes(sourceType, targetType);
};

export const useConnectionValidation = () => ({
  validateConnection,
  canConnectTypes,
  getTypeColor,
  getTypeLabel,
});

export const useIsNetworkEnabled = (parameterId: string) =>
  useEditorGraphStore(
    (state) => state.networks[parameterId]?.isEnabled ?? false,
  );

export const useEnabledNetworkIds = () =>
  useEditorGraphStore(
    useShallow((state) =>
      Object.entries(state.networks)
        .filter(([, network]) => network.isEnabled)
        .map(([parameterId]) => parameterId),
    ),
  );

export const useNetworkEnabledMap = () =>
  useEditorGraphStore(
    useShallow((state) => {
      const map: Record<string, boolean> = {};
      Object.entries(state.networks).forEach(([parameterId, network]) => {
        map[parameterId] = network.isEnabled;
      });
      return map;
    }),
  );

export const useSpecificNetwork = (parameterId: string | null) =>
  useEditorGraphStore((state) =>
    parameterId ? state.networks[parameterId] : null,
  );

export const useEnabledNetworks = () =>
  useEditorGraphStore((state) => {
    const enabledNetworks: Record<string, NodeNetwork> = {};
    Object.entries(state.networks).forEach(([parameterId, network]) => {
      if (network.isEnabled) {
        enabledNetworks[parameterId] = network;
      }
    });
    return enabledNetworks;
  });

export type { GraphNode, GraphNodeData, NodeNetwork };
