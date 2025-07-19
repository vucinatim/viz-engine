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
  useState,
} from 'react';
import '../../lib/css/xyflow.css';
import { useNodeGraphClipboard } from '../../lib/hooks/use-node-graph-clipboard';
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
  const reactFlowInstance = useRef<any>(null);

  // Use the new clipboard hook
  const {
    copySelectedNodes,
    pasteNodesAtPosition,
    duplicateSelectedNodes,
    canPaste,
  } = useNodeGraphClipboard({
    parameterId: nodeNetworkId,
    reactFlowInstance,
  });

  // Mouse position tracking for context menu
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Get canvas position from mouse position
  const getCanvasPosition = useCallback(
    (mousePos: { x: number; y: number }) => {
      if (!reactFlowInstance.current) return { x: 0, y: 0 };
      return reactFlowInstance.current.screenToFlowPosition({
        x: mousePos.x,
        y: mousePos.y,
      });
    },
    [reactFlowInstance],
  );

  const onPaneContextMenu = (event: ReactMouseEvent) => {
    // Store the raw client coordinates for screenToFlowPosition
    const newMousePosition = {
      x: event.clientX,
      y: event.clientY,
    };
    setMousePosition(newMousePosition);
  };

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      return isConnectionValid(connection as Connection, nodes, edges);
    },
    [nodes, edges],
  );

  const nodeTypes = useMemo(
    () => ({
      NodeRenderer: (props: any) => {
        return (
          <ContextMenu>
            <ContextMenuTrigger>
              <NodeRenderer {...props} nodeNetworkId={nodeNetworkId} />
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem
                inset
                onClick={() => {
                  copySelectedNodes();
                }}>
                Copy
              </ContextMenuItem>
              <ContextMenuItem
                inset
                onClick={() => {
                  duplicateSelectedNodes();
                }}>
                Duplicate
              </ContextMenuItem>
              <ContextMenuItem
                inset
                onClick={() => {
                  const canvasPosition = getCanvasPosition(mousePosition);
                  pasteNodesAtPosition(canvasPosition);
                }}>
                Paste
              </ContextMenuItem>
              <ContextMenuItem
                inset
                onClick={() => {
                  // Check if this is a protected node
                  const node = nodes.find((n) => n.id === props.id);
                  const isProtected =
                    node &&
                    (node.data.definition.label === 'Input' ||
                      node.data.definition.label === 'Output');

                  if (!isProtected) {
                    // Handle delete - this would need to be implemented
                    console.log('Delete node:', props.id);
                  }
                }}>
                Delete
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        );
      },
    }),
    [nodeNetworkId], // Only depend on nodeNetworkId
  );

  return (
    <div
      ref={reactFlowWrapper}
      className="relative h-full w-full"
      onContextMenu={onPaneContextMenu}>
      {/* Selection indicator */}
      {/* The selection indicator is removed as per the edit hint */}
      <ContextMenu>
        <ContextMenuTrigger>
          <ReactFlow
            onInit={(instance) => {
              reactFlowInstance.current = instance;
            }}
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
            onNodesChange={(changes) => {
              // Filter out deletion changes for protected nodes (input/output)
              const filteredChanges = changes.filter((change) => {
                if (change.type === 'remove') {
                  // Check if the node being removed is a protected node
                  // We can identify protected nodes by their ID pattern
                  const isProtected =
                    change.id.includes('-input-node') ||
                    change.id.includes('-output-node');
                  return !isProtected;
                }
                return true;
              });

              // Only apply changes if there are any non-filtered changes
              if (filteredChanges.length > 0) {
                setNodes(applyNodeChanges(filteredChanges, nodes));
              }
            }}
            onSelectionChange={(elements) => {
              // This handler is no longer needed as selection state is removed
            }}
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
                mousePosition={mousePosition}
                getCanvasPosition={getCanvasPosition}
              />
              <ContextMenuItem
                inset
                onClick={() => {
                  const canvasPosition = getCanvasPosition(mousePosition);
                  pasteNodesAtPosition(canvasPosition);
                }}>
                Paste
              </ContextMenuItem>
            </ContextMenuContent>
          </ReactFlow>
        </ContextMenuTrigger>
      </ContextMenu>
    </div>
  );
};

export default NodeNetworkRenderer;
