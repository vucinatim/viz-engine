import { Edge } from '@xyflow/react';
import { create } from 'zustand';

import {
  getVizSessionState,
  selectProjectedNodeNetworks,
  useVizSessionSelector,
  vizSessionActions,
  type VizGraphFragment,
} from '@/lib/viz-session';
import { NodeHandleType, canConnectTypes } from '../config/node-types';
import { GraphNode, GraphNodeData } from './graph-types';

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

export const getNodeNetworks = () =>
  selectProjectedNodeNetworks(getVizSessionState());

export const getNodeNetwork = (parameterId: string) =>
  getNodeNetworks()[parameterId];

export const setNodeNetworkEnabled = (
  parameterId: string,
  isEnabled: boolean,
  type: NodeHandleType,
) => {
  const nodeUiStore = useNodeNetworkStore.getState();

  vizSessionActions.graph.setNetworkEnabled(parameterId, isEnabled, type);

  if (!isEnabled && nodeUiStore.openNetwork === parameterId) {
    nodeUiStore.setOpenNetwork(null);
  } else if (isEnabled && nodeUiStore.openNetwork === null) {
    nodeUiStore.setOpenNetwork(parameterId);
  }

  if (isEnabled) {
    nodeUiStore.setShouldForceShowOverlay(true);
  }
};

const addNodeToNetwork = (parameterId: string, node: GraphNode) => {
  vizSessionActions.graph.addNodeToNetwork(parameterId, node);
};

export const pasteGraphFragment = (
  parameterId: string,
  fragment: VizGraphFragment,
  position: { x: number; y: number },
) => vizSessionActions.graph.pasteFragment(parameterId, fragment, position);

export const setNodesInNetwork = (parameterId: string, nodes: GraphNode[]) => {
  vizSessionActions.graph.setNodesInNetwork(parameterId, nodes);
};

export const setEdgesInNetwork = (parameterId: string, edges: Edge[]) => {
  vizSessionActions.graph.setEdgesInNetwork(parameterId, edges);
};

export const applyPresetToNodeNetwork = (
  parameterId: string,
  presetId: string,
  outputType: NodeHandleType,
) => {
  vizSessionActions.graph.applyPresetToNetwork(
    parameterId,
    presetId,
    outputType,
  );
  const nodeUiStore = useNodeNetworkStore.getState();
  nodeUiStore.setOpenNetwork(parameterId);
  nodeUiStore.setShouldForceShowOverlay(true);
};

const updateNodeNetworkInputValue = (
  parameterId: string,
  nodeId: string,
  inputId: string,
  value: any,
) => {
  vizSessionActions.graph.updateNodeInputValue(
    parameterId,
    nodeId,
    inputId,
    value,
  );
};

export const clearStaleNodeNetworks = () => {
  const openNetwork = useNodeNetworkStore.getState().openNetwork;
  vizSessionActions.graph.clearStaleNetworks();
  const networks = getNodeNetworks();
  if (openNetwork && !networks[openNetwork]) {
    useNodeNetworkStore.getState().setOpenNetwork(null);
  }
};

export const useNodeNetwork = (parameterId: string) => {
  const network = useVizSessionSelector(
    (state) => selectProjectedNodeNetworks(state)[parameterId],
  );

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

export const useIsNetworkEnabled = (parameterId: string) =>
  useVizSessionSelector(
    (state) =>
      selectProjectedNodeNetworks(state)[parameterId]?.isEnabled ?? false,
  );

export const useSpecificNetwork = (parameterId: string | null) =>
  useVizSessionSelector((state) =>
    parameterId ? selectProjectedNodeNetworks(state)[parameterId] : null,
  );

export type { GraphNode, GraphNodeData };
