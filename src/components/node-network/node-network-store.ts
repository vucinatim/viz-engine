import { useNodeLiveValuesStore } from '@/lib/stores/node-live-values-store';
import { useNodeOutputCache } from '@/lib/stores/node-output-cache-store';
import { Edge, Node } from '@xyflow/react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  AnimInputData,
  AnimNode,
  InputNode,
  NodeDefinitionMap,
  createOutputNode,
} from '../config/animation-nodes';
import {
  NodeHandleType,
  canConnectTypes,
  getTypeColor,
  getTypeLabel,
  isValidNodeHandleType,
  safeVTypeToNodeHandleType,
} from '../config/node-types';
import { VType } from '../config/types';

// Safe conversion from string to NodeHandleType
// IMPORTANT: This needs to be defined at the top of the file, otherwise it will be undefined in the merge function (hoisting issue)
const safeStringToNodeHandleType = (type: string): NodeHandleType => {
  if (isValidNodeHandleType(type)) {
    return type as NodeHandleType;
  }
  // Default to number if type is invalid
  return 'number';
};

// Define the shape of a node network
type NodeNetwork = {
  name: string;
  isEnabled: boolean;
  isMinimized?: boolean;
  nodes: GraphNode[];
  edges: Edge[];
};

export type GraphNodeData = {
  definition: AnimNode;
  inputValues: { [inputId: string]: any };
  state: { [key: string]: any };
};

export type GraphNode = Node<GraphNodeData>;

// Define the zustand store
interface NodeNetworkStore {
  openNetwork: string | null; // The parameterId of the network that is currently open
  setOpenNetwork: (parameterId: string | null) => void;
  networks: { [parameterId: string]: NodeNetwork }; // Each parameter has its own network
  setNetwork: (parameterId: string, network: NodeNetwork) => void;
  // Global minimize for all node-network editors
  areNetworksMinimized: boolean;
  setNetworksMinimized: (isMinimized: boolean) => void;
  setNetworkEnabled: (
    parameterId: string,
    isEnabled: boolean,
    type: VType,
  ) => void;
  addNodeToNetwork: (parameterId: string, node: GraphNode) => void;
  setNodesInNetwork: (parameterId: string, nodes: GraphNode[]) => void;
  setEdgesInNetwork: (parameterId: string, edges: Edge[]) => void;
  createNetworkForParameter: (parameterId: string, type: VType) => void; // Initialize a new network for a parameter
  removeNetworkForParameter: (parameterId: string) => void; // Remove network if parameter is not animated anymore
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
  computeNetworkOutput: (parameterId: string, inputData: AnimInputData) => any; // Compute the output of the network
}

export const nodeNetworkStorePartialize = (state: NodeNetworkStore) => ({
  ...state,
  networks: Object.fromEntries(
    Object.entries(state.networks).map(([id, network]) => [
      id,
      {
        ...network,
        nodes: network.nodes.map((node) => {
          const def = node.data.definition;
          if (def.label === 'Output') {
            const type = def.inputs[0].type;
            return {
              ...node,
              data: {
                // Persist only serializable, static pieces. Drop runtime state.
                ...node.data,
                definition: { label: 'Output', type },
                state: {},
              },
            };
          }
          return {
            ...node,
            data: {
              // Persist only serializable, static pieces. Drop runtime state.
              ...node.data,
              definition: def.label,
              state: {},
            },
          };
        }),
      },
    ]),
  ),
});

export const nodeNetworkStoreMerge = (
  persistedState: any,
  currentState: NodeNetworkStore,
) => {
  try {
    const persisted = persistedState as NodeNetworkStore;

    const result = {
      ...currentState,
      ...persisted,
      networks: Object.fromEntries(
        Object.entries(persisted.networks).map(([id, network]) => {
          const processedNetwork = {
            ...network,
            nodes: network.nodes.map((node) => {
              const def = node.data.definition as unknown as
                | string
                | { label: string; type: string };

              if (typeof def === 'object' && def.label === 'Output') {
                try {
                  const outputNode = createOutputNode(
                    safeStringToNodeHandleType(def.type),
                  );
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      definition: outputNode,
                    },
                  };
                } catch (error) {
                  console.error('Error creating output node:', error);
                  throw error;
                }
              }

              const nodeDef = NodeDefinitionMap.get(def as string);
              if (!nodeDef) {
                console.error(`Node definition not found for: ${def}`);
                console.error(
                  'Available definitions:',
                  Array.from(NodeDefinitionMap.keys()),
                );
                throw new Error(`Node definition not found for: ${def}`);
              }

              return {
                ...node,
                data: {
                  ...node.data,
                  definition: nodeDef,
                },
              };
            }),
          };

          return [id, processedNetwork];
        }),
      ),
    };

    return result;
  } catch (error) {
    console.error('Error in node network store merge function:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
    console.warn('Falling back to current state due to merge error');
    return currentState;
  }
};

export const useNodeNetworkStore = create<NodeNetworkStore>()(
  persist(
    (set, get) => ({
      networks: {}, // Store networks by parameterId
      openNetwork: null, // The parameterId of the network that is currently open
      areNetworksMinimized: false,

      // Set the network that is currently open
      setOpenNetwork: (parameterId: string | null) =>
        set({ openNetwork: parameterId }),

      // Enable/disable a network
      setNetworkEnabled: (
        parameterId: string,
        isEnabled: boolean,
        type: VType,
      ) => {
        if (!get().networks[parameterId]) {
          get().createNetworkForParameter(parameterId, type);
        } else {
          set((state) => ({
            networks: {
              ...state.networks,
              [parameterId]: {
                ...state.networks[parameterId],
                isEnabled,
              },
            },
          }));
        }

        // If the network being disabled is the open network, set openNetwork to null
        if (!isEnabled && get().openNetwork === parameterId) {
          get().setOpenNetwork(null);
        } else if (isEnabled && get().openNetwork === null) {
          get().setOpenNetwork(parameterId);
        }
      },

      // Create an empty network for a parameter
      createNetworkForParameter: (parameterId: string, type: VType) => {
        set((state) => ({
          networks: {
            ...state.networks,
            [parameterId]: {
              name: parameterId,
              isEnabled: true,
              isMinimized: false,
              nodes: [
                {
                  id: `${parameterId}-input-node`,
                  type: 'NodeRenderer',
                  position: { x: 0, y: 0 },
                  data: {
                    definition: InputNode,
                    inputValues: {},
                    state: {},
                  },
                },
                {
                  id: `${parameterId}-output-node`,
                  type: 'NodeRenderer',
                  position: { x: 300, y: 0 },
                  data: {
                    definition: createOutputNode(
                      safeVTypeToNodeHandleType(type),
                    ),
                    inputValues: {},
                    state: {},
                  },
                },
              ],
              edges: [],
            },
          },
        }));
        get().setOpenNetwork(parameterId);
      },

      // Apply a preset by id to a network
      applyPresetToNetwork: (parameterId, presetId, outputType) => {
        const { instantiatePreset, getPresetsForType } = require('./presets');
        const presets = getPresetsForType(outputType);
        const preset = presets.find((p: any) => p.id === presetId);
        if (!preset) return;
        const { nodes, edges } = instantiatePreset(
          preset,
          parameterId,
          outputType,
        );
        set((state) => ({
          networks: {
            ...state.networks,
            [parameterId]: {
              name: parameterId,
              isEnabled: true,
              isMinimized: false,
              nodes,
              edges,
            },
          },
        }));
        get().setOpenNetwork(parameterId);
      },

      // Minimize / restore a specific network UI
      setNetworksMinimized: (isMinimized: boolean) =>
        set(() => ({ areNetworksMinimized: isMinimized })),

      // Remove a network (e.g., when a parameter is no longer animated)
      removeNetworkForParameter: (parameterId: string) => {
        set((state) => {
          const newNetworks = { ...state.networks };
          delete newNetworks[parameterId]; // Remove the network
          return { networks: newNetworks };
        });
        // If the network being removed is the open network, set openNetwork to null
        if (get().openNetwork === parameterId) {
          get().setOpenNetwork(null);
        }
      },

      // Set an entire network (nodes + edges) for a specific parameter
      setNetwork: (parameterId: string, network: NodeNetwork) =>
        set((state) => ({
          networks: {
            ...state.networks,
            [parameterId]: network,
          },
        })),

      // Set the nodes for a specific parameter's network
      setNodesInNetwork: (parameterId: string, nodes: GraphNode[]) =>
        set((state) => ({
          networks: {
            ...state.networks,
            [parameterId]: {
              ...state.networks[parameterId],
              nodes,
            },
          },
        })),

      // Set the edges for a specific parameter's network
      setEdgesInNetwork: (parameterId: string, edges: Edge[]) =>
        set((state) => ({
          networks: {
            ...state.networks,
            [parameterId]: {
              ...state.networks[parameterId],
              edges,
            },
          },
        })),

      // Add a node to a specific parameter's network
      addNodeToNetwork: (parameterId: string, node: GraphNode) =>
        set((state) => {
          const existingNetwork = state.networks[parameterId] || {
            nodes: [],
            edges: [],
          };
          return {
            networks: {
              ...state.networks,
              [parameterId]: {
                ...existingNetwork,
                nodes: [...existingNetwork.nodes, node],
              },
            },
          };
        }),

      updateNodeInputValue: (parameterId, nodeId, inputId, value) => {
        set((state) => {
          const network = state.networks[parameterId];
          if (!network) return state;

          const newNodes = network.nodes.map((node) => {
            if (node.id === nodeId) {
              return {
                ...node,
                data: {
                  ...node.data,
                  inputValues: {
                    ...node.data.inputValues,
                    [inputId]: value,
                  },
                },
              };
            }
            return node;
          });

          return {
            networks: {
              ...state.networks,
              [parameterId]: {
                ...network,
                nodes: newNodes,
              },
            },
          };
        });
      },

      // Compute the output of the network
      computeNetworkOutput: (parameterId: string, inputData: AnimInputData) => {
        const network = get().networks[parameterId];
        if (!network || !network.isEnabled) {
          throw new Error('Network not found or not enabled');
        }

        const nodes = network.nodes;
        const edges = network.edges;
        const { setNodeOutput, setGlobalAnimData } =
          useNodeOutputCache.getState();
        setGlobalAnimData(inputData);
        const { setNodeInputValue } = useNodeLiveValuesStore.getState();

        // 1. Initialize a map to store node outputs
        const nodeOutputs: { [nodeId: string]: any } = {};

        // 2. Create a function to traverse and compute node output
        const computeNodeOutput = (node: GraphNode): any => {
          if (nodeOutputs[node.id]) return nodeOutputs[node.id]; // Return cached output if already computed

          // Special handling for InputNode: Provide external input data
          if (node.data.definition.label === 'Input') {
            const inputOutput = node.data.definition.computeSignal(
              inputData,
              inputData,
            ); // InputNode directly uses input data
            nodeOutputs[node.id] = inputOutput;
            setNodeOutput(node.id, inputOutput);

            return inputOutput;
          }

          // Construct the inputs object for the node
          const inputs = node.data.definition.inputs.reduce(
            (acc, input) => {
              const edge = edges.find(
                (edge) =>
                  edge.target === node.id && edge.targetHandle === input.id,
              );

              let resolvedValue;
              if (edge) {
                // Input is connected, compute the source node's output
                const sourceNode = nodes.find((n) => n.id === edge.source);
                if (sourceNode) {
                  const sourceOutput = computeNodeOutput(sourceNode);
                  const sourceHandle = edge.sourceHandle;
                  if (
                    sourceHandle &&
                    sourceOutput[sourceHandle] !== undefined
                  ) {
                    resolvedValue = sourceOutput[sourceHandle];
                  } else if (
                    !sourceHandle &&
                    typeof sourceOutput === 'object' &&
                    sourceOutput !== null
                  ) {
                    // If there's no handle, but the output is an object,
                    // assume the first property is the output
                    resolvedValue = Object.values(sourceOutput)[0];
                  }
                }
              } else {
                // Input is not connected, use the stored default value
                resolvedValue = node.data.inputValues[input.id];
                // If still undefined, inject from global animation input data by convention
                if (resolvedValue === undefined) {
                  if (input.id === 'audioSignal') {
                    resolvedValue = (inputData as any)?.audioSignal;
                  } else if (input.id === 'frequencyAnalysis') {
                    resolvedValue = (inputData as any)?.frequencyAnalysis;
                  }
                }
              }

              // Type-aware parsing
              if (
                input.type === 'number' &&
                typeof resolvedValue === 'string'
              ) {
                const parsed = parseFloat(resolvedValue);
                acc[input.id] = isNaN(parsed) ? 0 : parsed;
              } else if (input.type === 'string') {
                acc[input.id] = String(resolvedValue);
              } else {
                acc[input.id] = resolvedValue;
              }

              if (resolvedValue !== undefined) {
                setNodeInputValue(node.id, input.id, acc[input.id]);
              }
              return acc;
            },
            {} as { [key: string]: any },
          ); // Initialize the accumulator as an object

          // 3. Compute the node's output using the computeSignal function
          const output = node.data.definition.computeSignal(
            inputs,
            inputData,
            node,
          );

          // 4. Cache the output for this node
          nodeOutputs[node.id] = output;
          setNodeOutput(node.id, output); // Also update the cache
          return output;
        };

        // 3. Identify the OutputNode and compute the network's final output
        const outputNode = nodes.find(
          (node) => node.data.definition.label === 'Output',
        );
        if (!outputNode) throw new Error('Output node not found in network');

        const finalOutput = computeNodeOutput(outputNode); // Compute the final output of the network

        // The output node itself just returns its input, so we need to get that specific input value
        return finalOutput;
      },
    }),
    {
      name: 'node-network-store',
      partialize: nodeNetworkStorePartialize,
      merge: nodeNetworkStoreMerge,
    },
  ),
);

export default useNodeNetworkStore;

export const useNodeNetwork = (parameterId: string) => {
  const network = useNodeNetworkStore((state) => state.networks[parameterId]);
  const setNodesInNetwork = useNodeNetworkStore(
    (state) => state.setNodesInNetwork,
  );
  const setEdgesInNetwork = useNodeNetworkStore(
    (state) => state.setEdgesInNetwork,
  );
  const addNodeToNetwork = useNodeNetworkStore(
    (state) => state.addNodeToNetwork,
  );
  const computeNetworkOutput = useNodeNetworkStore(
    (state) => state.computeNetworkOutput,
  );
  const updateNodeInputValue = useNodeNetworkStore(
    (state) => state.updateNodeInputValue,
  );

  return {
    ...network,
    setNodes: (nodes: GraphNode[]) => setNodesInNetwork(parameterId, nodes),
    setEdges: (edges: Edge[]) => setEdgesInNetwork(parameterId, edges),
    addNode: (node: GraphNode) => addNodeToNetwork(parameterId, node),
    updateInputValue: (nodeId: string, inputId: string, value: any) =>
      updateNodeInputValue(parameterId, nodeId, inputId, value),
    computeOutput: (inputData: AnimInputData) =>
      computeNetworkOutput(parameterId, inputData),
  };
};

// Helper function to get the output type of a node
const getNodeOutputType = (
  node: GraphNode,
  outputId: string,
): NodeHandleType | null => {
  const output = node.data.definition.outputs.find((o) => o.id === outputId);
  return output ? (output.type as NodeHandleType) : null;
};

// Helper function to get the input type of a node
const getNodeInputType = (
  node: GraphNode,
  inputId: string,
): NodeHandleType | null => {
  const input = node.data.definition.inputs.find((i) => i.id === inputId);
  return input ? (input.type as NodeHandleType) : null;
};

// Connection validation function
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

// Hook for connection validation
export const useConnectionValidation = () => {
  return {
    validateConnection,
    canConnectTypes,
    getTypeColor,
    getTypeLabel,
  };
};
