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
import { useKeyboardShortcuts } from '../../lib/hooks/use-keyboard-shortcuts';
import { useNodeGraphClipboard } from '../../lib/hooks/use-node-graph-clipboard';
import { useNodeNetworkHistory } from '../../lib/hooks/use-node-network-history';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
} from '../ui/context-menu';
import { isConnectionValid } from './connection-validator';
import NodeRenderer from './node-renderer';
import NodesSearch from './nodes-search';

const NodeNetworkRenderer = ({
  nodeNetworkId,
  onReactFlowInit,
  reactFlowInstance,
}: {
  nodeNetworkId: string;
  onReactFlowInit?: (instance: any) => void;
  reactFlowInstance?: React.MutableRefObject<any>;
}) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Use the passed instance or create our own if not provided
  const localReactFlowInstance = useRef<any>(null);
  const finalReactFlowInstance = reactFlowInstance || localReactFlowInstance;

  // Use history hook for undo/redo functionality
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    undo,
    redo,
    canUndo,
    canRedo,
    startDrag,
    endDrag,
  } = useNodeNetworkHistory(nodeNetworkId);

  // Use keyboard shortcuts hook for undo/redo shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'z',
        ctrl: true,
        callback: undo,
        enabled: canUndo,
      },
      {
        key: 'z',
        ctrl: true,
        shift: true,
        callback: redo,
        enabled: canRedo,
      },
      {
        key: 'y',
        ctrl: true,
        callback: redo,
        enabled: canRedo,
      },
    ],
  });

  // Use the clipboard hook for copy/paste functionality
  const {
    copySelectedNodes,
    pasteNodesAtPosition,
    duplicateSelectedNodes,
    canPaste,
  } = useNodeGraphClipboard({
    parameterId: nodeNetworkId,
    reactFlowInstance: finalReactFlowInstance,
  });

  // Mouse position tracking for context menu
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Get canvas position from mouse position
  const getCanvasPosition = useCallback(
    (mousePos: { x: number; y: number }) => {
      if (!finalReactFlowInstance.current) return { x: 0, y: 0 };
      return finalReactFlowInstance.current.screenToFlowPosition({
        x: mousePos.x,
        y: mousePos.y,
      });
    },
    [finalReactFlowInstance],
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
              <ContextMenuItem inset onClick={undo} disabled={!canUndo}>
                Undo
              </ContextMenuItem>
              <ContextMenuItem inset onClick={redo} disabled={!canRedo}>
                Redo
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
              finalReactFlowInstance.current = instance;
              onReactFlowInit?.(instance);
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
              // Check if this is a drag operation
              const isDragStart = changes.some(
                (change) =>
                  change.type === 'position' && change.dragging === true,
              );
              const isDragEnd = changes.some(
                (change) =>
                  change.type === 'position' && change.dragging === false,
              );

              if (isDragStart) {
                startDrag();
              }

              if (isDragEnd) {
                endDrag();
              }

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
                const newNodes = applyNodeChanges(filteredChanges, nodes);
                setNodes(newNodes);
              }
            }}
            onSelectionChange={(elements) => {
              // This handler is no longer needed as selection state is removed
            }}
            onEdgesChange={(changes) => {
              const newEdges = applyEdgeChanges(changes, edges);
              setEdges(newEdges);
            }}
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
