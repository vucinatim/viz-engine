import { Edge } from '@xyflow/react';
import { useStore } from 'zustand';

import type { NodeHandleType } from '@/components/config/node-types';
import type {
  GraphNode,
  NodeNetwork,
} from '@/components/node-network/graph-types';
import {
  vizSessionActions,
  vizSessionStore,
  type VizSessionState,
} from '@/lib/viz-session';
import type { VizGraphFragment } from '@/lib/viz-session/graph-fragments';
import { selectProjectedNodeNetworks } from '@/lib/viz-session/selectors';

export interface EditorGraphStore {
  networks: Record<string, NodeNetwork>;
  reset: () => void;
  setNetworkEnabled: (
    parameterId: string,
    isEnabled: boolean,
    type: NodeHandleType,
  ) => void;
  addNodeToNetwork: (parameterId: string, node: GraphNode) => void;
  pasteFragment: (
    parameterId: string,
    fragment: VizGraphFragment,
    position: { x: number; y: number },
  ) => string[];
  setNodesInNetwork: (parameterId: string, nodes: GraphNode[]) => void;
  setEdgesInNetwork: (parameterId: string, edges: Edge[]) => void;
  createNetworkForParameter: (
    parameterId: string,
    type: NodeHandleType,
  ) => void;
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
  duplicateNetwork: (fromParameterId: string, toParameterId: string) => void;
  clearStaleNetworks: (validParameterIds?: Iterable<string>) => void;
}

const selectEditorGraphStore = (state: VizSessionState): EditorGraphStore => {
  return {
    networks: selectProjectedNodeNetworks(state),
    reset: vizSessionActions.graph.reset,
    setNetworkEnabled: vizSessionActions.graph.setNetworkEnabled,
    addNodeToNetwork: vizSessionActions.graph.addNodeToNetwork,
    pasteFragment: vizSessionActions.graph.pasteFragment,
    setNodesInNetwork: vizSessionActions.graph.setNodesInNetwork,
    setEdgesInNetwork: vizSessionActions.graph.setEdgesInNetwork,
    createNetworkForParameter:
      vizSessionActions.graph.createNetworkForParameter,
    removeNetworkForParameter:
      vizSessionActions.graph.removeNetworkForParameter,
    applyPresetToNetwork: vizSessionActions.graph.applyPresetToNetwork,
    updateNodeInputValue: vizSessionActions.graph.updateNodeInputValue,
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
    useStore(vizSessionStore, (state) =>
      selector(selectEditorGraphStore(state)),
    ),
  {
    getState: () => selectEditorGraphStore(vizSessionStore.getState()),
    subscribe: (listener: EditorGraphListener) =>
      vizSessionStore.subscribe((state, previousState) =>
        listener(
          selectEditorGraphStore(state),
          selectEditorGraphStore(previousState),
        ),
      ),
  },
);

export default useEditorGraphStore;
