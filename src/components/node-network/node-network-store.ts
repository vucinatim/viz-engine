import { Edge, Node } from '@xyflow/react';
import { create } from 'zustand';
import {
  AnimInputData,
  AnimNode,
  InputNode,
  OutputNode,
} from '../config/animation-nodes';

// A simple throttle utility per key
const throttledLoggers = new Map<
  string,
  (message: string, data: any) => void
>();

function getThrottledLogger(key: string, interval: number) {
  if (!throttledLoggers.has(key)) {
    let lastLogTime = 0;
    const logger = (message: string, data: any) => {
      const now = Date.now();
      if (now - lastLogTime > interval) {
        console.log(message, JSON.parse(JSON.stringify(data)));
        lastLogTime = now;
      }
    };
    throttledLoggers.set(key, logger);
  }
  return throttledLoggers.get(key)!;
}

// Define the shape of a node network
type NodeNetwork = {
  name: string;
  isEnabled: boolean;
  nodes: GraphNode[];
  edges: Edge[];
};

export type GraphNodeData = {
  definition: AnimNode;
  inputValues: { [inputId: string]: any };
};

export type GraphNode = Node<GraphNodeData>;

// Define the zustand store
interface NodeNetworkStore {
  openNetwork: string | null; // The parameterId of the network that is currently open
  setOpenNetwork: (parameterId: string | null) => void;
  networks: { [parameterId: string]: NodeNetwork }; // Each parameter has its own network
  setNetwork: (parameterId: string, network: NodeNetwork) => void;
  setNetworkEnabled: (parameterId: string, isEnabled: boolean) => void;
  addNodeToNetwork: (parameterId: string, node: GraphNode) => void;
  setNodesInNetwork: (parameterId: string, nodes: GraphNode[]) => void;
  setEdgesInNetwork: (parameterId: string, edges: Edge[]) => void;
  createNetworkForParameter: (parameterId: string) => void; // Initialize a new network for a parameter
  removeNetworkForParameter: (parameterId: string) => void; // Remove network if parameter is not animated anymore
  updateNodeInputValue: (
    parameterId: string,
    nodeId: string,
    inputId: string,
    value: any,
  ) => void;
  computeNetworkOutput: (parameterId: string, inputData: AnimInputData) => any; // Compute the output of the network
}

const useNodeNetworkStore = create<NodeNetworkStore>((set, get) => ({
  networks: {}, // Store networks by parameterId
  openNetwork: null, // The parameterId of the network that is currently open

  // Set the network that is currently open
  setOpenNetwork: (parameterId: string | null) =>
    set({ openNetwork: parameterId }),

  // Enable/disable a network
  setNetworkEnabled: (parameterId: string, isEnabled: boolean) => {
    if (!get().networks[parameterId]) {
      get().createNetworkForParameter(parameterId);
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
  createNetworkForParameter: (parameterId: string) => {
    set((state) => ({
      networks: {
        ...state.networks,
        [parameterId]: {
          name: parameterId,
          isEnabled: true,
          nodes: [
            {
              id: `${parameterId}-input-node`,
              type: 'NodeRenderer',
              position: { x: 0, y: 0 },
              data: {
                definition: InputNode,
                inputValues: {},
              },
            },
            {
              id: `${parameterId}-output-node`,
              type: 'NodeRenderer',
              position: { x: 300, y: 0 },
              data: {
                definition: OutputNode,
                inputValues: {},
              },
            },
          ],
          edges: [],
        },
      },
    }));
    get().setOpenNetwork(parameterId);
  },

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

    // 1. Initialize a map to store node outputs
    const nodeOutputs: { [nodeId: string]: any } = {};

    // 2. Create a function to traverse and compute node output
    const computeNodeOutput = (node: GraphNode): any => {
      if (nodeOutputs[node.id]) return nodeOutputs[node.id]; // Return cached output if already computed

      // Special handling for InputNode: Provide external input data
      if (node.data.definition.label === 'Input') {
        nodeOutputs[node.id] = node.data.definition.computeSignal(inputData); // InputNode directly uses input data
        return nodeOutputs[node.id];
      }

      // Construct the inputs object for the node
      const inputs = node.data.definition.inputs.reduce(
        (acc, input) => {
          const edge = edges.find(
            (edge) => edge.target === node.id && edge.targetHandle === input.id,
          );

          if (edge) {
            // Input is connected, compute the source node's output
            const sourceNode = nodes.find((n) => n.id === edge.source);
            if (sourceNode) {
              const sourceOutput = computeNodeOutput(sourceNode);
              const sourceHandle = edge.sourceHandle;
              if (sourceHandle && sourceOutput[sourceHandle] !== undefined) {
                acc[input.id] = sourceOutput[sourceHandle];
              } else if (
                !sourceHandle &&
                typeof sourceOutput === 'object' &&
                sourceOutput !== null
              ) {
                // If there's no handle, but the output is an object,
                // assume the first property is the output
                acc[input.id] = Object.values(sourceOutput)[0];
              }
            }
          } else {
            // Input is not connected, use the stored default value
            acc[input.id] = node.data.inputValues[input.id];
          }

          return acc;
        },
        {} as { [key: string]: any },
      ); // Initialize the accumulator as an object

      // 3. Compute the node's output using the computeSignal function
      const output = node.data.definition.computeSignal(inputs);

      // 4. Cache the output for this node
      nodeOutputs[node.id] = output;

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
}));

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
