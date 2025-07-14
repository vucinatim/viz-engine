import { Edge, Node } from '@xyflow/react';
import { create } from 'zustand';
import {
  AnimInputData,
  AnimNode,
  InputNode,
  OutputNode,
} from '../config/animation-nodes';

// Define the shape of a node network
type NodeNetwork = {
  name: string;
  isEnabled: boolean;
  nodes: GraphNode[];
  edges: Edge[];
};

export type GraphNode = Node & {
  data: AnimNode;
};

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
              data: InputNode, // Add InputNode
            },
            {
              id: `${parameterId}-output-node`,
              type: 'NodeRenderer',
              position: { x: 300, y: 0 },
              data: OutputNode, // Add OutputNode
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
      if (node.data.label === 'Input') {
        nodeOutputs[node.id] = node.data.computeSignal(inputData); // InputNode directly uses input data
        return nodeOutputs[node.id];
      }

      // Construct the inputs object for the node
      const inputs = node.data.inputs.reduce(
        (acc, input) => {
          const edge = edges.find(
            (edge) => edge.target === node.id && edge.targetHandle === input.id,
          );

          if (!edge) {
            return acc; // No edge found for this input, continue to next input
          }

          const sourceNode = nodes.find((n) => n.id === edge.source);
          if (!sourceNode) {
            return acc; // No source node found for this edge, continue to next input
          }

          // Recursively compute the source node output
          const sourceOutput = computeNodeOutput(sourceNode);
          const sourceHandle = edge.sourceHandle;

          if (sourceHandle && sourceOutput[sourceHandle] !== undefined) {
            acc[input.id] = sourceOutput[sourceHandle]; // Add the output to the inputs object
          }

          return acc;
        },
        {} as { [key: string]: any },
      ); // Initialize the accumulator as an object

      // 3. Compute the node's output using the computeSignal function
      const output = node.data.computeSignal(inputs);

      // 4. Cache the output for this node
      nodeOutputs[node.id] = output;

      return output;
    };

    // 3. Identify the OutputNode and compute the network's final output
    const outputNode = nodes.find((node) => node.data.label === 'Output');
    if (!outputNode) throw new Error('Output node not found in network');

    const finalOutput = computeNodeOutput(outputNode); // Compute the final output of the network

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

  return {
    ...network,
    setNodes: (nodes: GraphNode[]) => setNodesInNetwork(parameterId, nodes),
    setEdges: (edges: Edge[]) => setEdgesInNetwork(parameterId, edges),
    addNode: (node: GraphNode) => addNodeToNetwork(parameterId, node),
    computeOutput: (inputData: AnimInputData) =>
      computeNetworkOutput(parameterId, inputData),
  };
};
