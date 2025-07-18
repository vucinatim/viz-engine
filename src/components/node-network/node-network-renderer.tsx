import { ContextMenuTrigger } from '@radix-ui/react-context-menu';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Connection,
  Controls,
  Edge,
  ReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  MouseEvent as ReactMouseEvent,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import '../../lib/css/xyflow.css';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
} from '../ui/context-menu';
import { isConnectionValid } from './connection-validator';
import { useNodeNetwork } from './node-network-store';
import NodeRenderer from './node-renderer';
import NodesSearch from './nodes-search';

const NodeNetworkRenderer = ({ nodeNetworkId }: { nodeNetworkId: string }) => {
  // Get nodes, edges, and actions from zustand store
  const { nodes, edges, setEdges, setNodes } = useNodeNetwork(nodeNetworkId);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const mousePosition = useRef({ x: 0, y: 0 });

  const onPaneContextMenu = (event: ReactMouseEvent) => {
    if (!reactFlowWrapper.current) return;
    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    mousePosition.current = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
  };

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      return isConnectionValid(connection as Connection, nodes, edges);
    },
    [nodes, edges],
  );

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
    <div
      ref={reactFlowWrapper}
      className="h-full w-full"
      onContextMenu={onPaneContextMenu}>
      <ContextMenu>
        <ContextMenuTrigger>
          <ReactFlow
            fitView
            panOnScroll
            zoomOnPinch
            selectionOnDrag
            panOnDrag={false}
            colorMode="dark"
            nodeTypes={nodeTypes}
            nodes={nodes}
            edges={edges}
            isValidConnection={isValidConnection}
            onNodesChange={(changes) =>
              setNodes(applyNodeChanges(changes, nodes))
            }
            onEdgesChange={(changes) =>
              setEdges(applyEdgeChanges(changes, edges))
            }
            onConnect={(params) => setEdges(addEdge(params, edges))}
            defaultEdgeOptions={{
              animated: true,
              style: {
                stroke: 'white',
              },
            }}>
            <Background />
            <Controls className="overflow-hidden rounded-md bg-black" />
            <ContextMenuContent className="w-64">
              <NodesSearch
                networkId={nodeNetworkId}
                mousePosition={mousePosition.current}
              />
            </ContextMenuContent>
          </ReactFlow>
        </ContextMenuTrigger>
      </ContextMenu>
    </div>
  );
};

export default NodeNetworkRenderer;
