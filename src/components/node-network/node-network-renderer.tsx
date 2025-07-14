import { ContextMenuTrigger } from '@radix-ui/react-context-menu';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  NodeProps,
  ReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useState } from 'react';
import '../../lib/css/xyflow.css';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
} from '../ui/context-menu';
import { GraphNode, useNodeNetwork } from './node-network-store';
import NodeRenderer from './node-renderer';
import NodesSearch from './nodes-search';

const nodeTypes: Record<string, React.ComponentType<NodeProps>> = {
  NodeRenderer: (props) => (
    <ContextMenu>
      <ContextMenuTrigger>
        <NodeRenderer {...(props as unknown as GraphNode)} />
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem inset>Copy</ContextMenuItem>
        <ContextMenuItem inset>Delete</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
};

const NodeNetworkRenderer = ({ nodeNetworkId }: { nodeNetworkId: string }) => {
  // Get nodes, edges, and actions from zustand store
  const { nodes, edges, setEdges, setNodes, addNode, computeOutput } =
    useNodeNetwork(nodeNetworkId);

  const [output, setOutput] = useState<any>(null);

  return (
    <ContextMenu>
      <div className="absolute right-0 top-0 z-[99999999]">
        <button
          onClick={() => {
            const output = computeOutput({
              audioSignal: new Uint8Array(0),
              time: 2.5,
            });
            console.log('Output:', output);
            setOutput(output);
          }}
          className="rounded-md bg-blue-500 px-4 py-2 text-sm font-bold text-white">
          OUTPUT: {output}
        </button>
      </div>
      <ContextMenuTrigger>
        <ReactFlow
          colorMode="dark"
          nodeTypes={nodeTypes}
          nodes={nodes}
          edges={edges}
          onNodesChange={(changes) => {
            const newNodes = applyNodeChanges(changes, nodes);
            setNodes(newNodes);
          }}
          onEdgesChange={(changes) => {
            const newEdges = applyEdgeChanges(changes, edges);
            setEdges(newEdges);
          }}
          onConnect={(params) => {
            const newEdges = addEdge(params, edges);
            setEdges(newEdges);
          }}
          defaultEdgeOptions={{
            animated: true,
            style: {
              stroke: 'white',
            },
          }}>
          <Background />
          <Controls className="overflow-hidden rounded-md bg-black" />
          <ContextMenuContent className="w-64">
            <NodesSearch networkId={nodeNetworkId} />
          </ContextMenuContent>
        </ReactFlow>
      </ContextMenuTrigger>
    </ContextMenu>
  );
};

export default NodeNetworkRenderer;
