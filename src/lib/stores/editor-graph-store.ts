import { Edge } from '@xyflow/react';
import { useStore } from 'zustand';

import type { VType } from '@/components/config/types';
import type { AnimInputData } from '@/components/node-network/animation-nodes';
import type { GraphNode, NodeNetwork } from '@/components/node-network/graph-types';
import type { NodeHandleType } from '@/components/config/node-types';
import { vizSessionActions, vizSessionStore } from '@/lib/viz-session';

export interface EditorGraphStore {
  networks: Record<string, NodeNetwork>;
  importNetworks: (networks: Record<string, NodeNetwork>) => void;
  replaceNetworks: (networks: Record<string, NodeNetwork>) => void;
  exportNetworks: () => Record<string, NodeNetwork>;
  reset: () => void;
  setNetwork: (parameterId: string, network: NodeNetwork) => void;
  setNetworkEnabled: (parameterId: string, isEnabled: boolean, type: VType) => void;
  addNodeToNetwork: (parameterId: string, node: GraphNode) => void;
  setNodesInNetwork: (parameterId: string, nodes: GraphNode[]) => void;
  setEdgesInNetwork: (parameterId: string, edges: Edge[]) => void;
  createNetworkForParameter: (parameterId: string, type: VType) => void;
  removeNetworkForParameter: (parameterId: string) => void;
  applyPresetToNetwork: (
    parameterId: string,
    presetId: string,
    outputType: NodeHandleType,
  ) => void;
  updateNodeInputValue: (
    parameterId: string,
    nodeId: string,
    inputId: string,
    value: any,
  ) => void;
  computeNetworkOutput: (parameterId: string, inputData: AnimInputData) => any;
  duplicateNetwork: (fromParameterId: string, toParameterId: string) => void;
  clearStaleNetworks: (validParameterIds?: Iterable<string>) => void;
}

const selectEditorGraphStore = (): EditorGraphStore => {
  const graph = vizSessionStore.getState().graph;

  return {
    networks: graph.networks,
    importNetworks: vizSessionActions.graph.importNetworks,
    replaceNetworks: vizSessionActions.graph.replaceNetworks,
    exportNetworks: vizSessionActions.graph.exportNetworks,
    reset: vizSessionActions.graph.reset,
    setNetwork: vizSessionActions.graph.setNetwork,
    setNetworkEnabled: vizSessionActions.graph.setNetworkEnabled,
    addNodeToNetwork: vizSessionActions.graph.addNodeToNetwork,
    setNodesInNetwork: vizSessionActions.graph.setNodesInNetwork,
    setEdgesInNetwork: vizSessionActions.graph.setEdgesInNetwork,
    createNetworkForParameter: vizSessionActions.graph.createNetworkForParameter,
    removeNetworkForParameter: vizSessionActions.graph.removeNetworkForParameter,
    applyPresetToNetwork: vizSessionActions.graph.applyPresetToNetwork,
    updateNodeInputValue: vizSessionActions.graph.updateNodeInputValue,
    computeNetworkOutput: vizSessionActions.graph.computeNetworkOutput,
    duplicateNetwork: vizSessionActions.graph.duplicateNetwork,
    clearStaleNetworks: vizSessionActions.graph.clearStaleNetworks,
  };
};

type EditorGraphSelector<T> = (state: EditorGraphStore) => T;
type EditorGraphListener = (
  state: EditorGraphStore,
  previousState: EditorGraphStore,
) => void;

const useEditorGraphStore = Object.assign(
  <T>(selector: EditorGraphSelector<T>) =>
    useStore(vizSessionStore, () => selector(selectEditorGraphStore())),
  {
    getState: () => selectEditorGraphStore(),
    setState: (partial: Partial<EditorGraphStore>) =>
      vizSessionActions.graph.setState({
        networks: partial.networks,
      }),
    subscribe: (listener: EditorGraphListener) =>
      vizSessionStore.subscribe((state, previousState) =>
        listener(
          {
            ...selectEditorGraphStore(),
            networks: state.graph.networks,
          },
          {
            ...selectEditorGraphStore(),
            networks: previousState.graph.networks,
          },
        ),
      ),
  },
);

export default useEditorGraphStore;
