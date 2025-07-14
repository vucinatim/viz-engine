import { ContextMenuTrigger } from '@radix-ui/react-context-menu';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  ReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useMemo } from 'react';
import '../../lib/css/xyflow.css';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
} from '../ui/context-menu';
import { useNodeNetwork } from './node-network-store';
import NodeRenderer from './node-renderer';
import NodesSearch from './nodes-search';

const NodeNetworkRenderer = ({ nodeNetworkId }: { nodeNetworkId: string }) => {
  // Get nodes, edges, and actions from zustand store
  const { nodes, edges, setEdges, setNodes } = useNodeNetwork(nodeNetworkId);

  const nodeTypes = useMemo(
    () => ({
      NodeRenderer: (props: any) => (
        <ContextMenu>
          <ContextMenuTrigger>
            <NodeRenderer {...props} nodeNetworkId={nodeNetworkId} />
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem inset>Copy</ContextMenuItem>
            <ContextMenuItem inset>Delete</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ),
    }),
    [nodeNetworkId],
  );

  return (
    <ContextMenu>
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
