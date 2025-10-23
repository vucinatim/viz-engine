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
  reconnectEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import '../../lib/css/xyflow.css';
import { useNodeGraphClipboard } from '../../lib/hooks/use-node-graph-clipboard';
import { useHistoryStore } from '../../lib/stores/history-store';
import useNodeNetworkStore from '../node-network/node-network-store';
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

  // Get nodes and edges from the network store
  const network = useNodeNetworkStore((state) => state.networks[nodeNetworkId]);
  const nodes = network?.nodes || [];
  const edges = network?.edges || [];

  // Get store functions
  const setNodesInNetwork = useNodeNetworkStore(
    (state) => state.setNodesInNetwork,
  );
  const setEdgesInNetwork = useNodeNetworkStore(
    (state) => state.setEdgesInNetwork,
  );

  // Wrapped setters that push to history
  const setNodes = useCallback(
    (newNodes: any[]) => {
      setNodesInNetwork(nodeNetworkId, newNodes);
      useHistoryStore
        .getState()
        .pushNodeHistory(nodeNetworkId, newNodes, edges);
    },
    [nodeNetworkId, edges, setNodesInNetwork],
  );

  const setEdges = useCallback(
    (newEdges: any[]) => {
      setEdgesInNetwork(nodeNetworkId, newEdges);
      useHistoryStore
        .getState()
        .pushNodeHistory(nodeNetworkId, nodes, newEdges);
    },
    [nodeNetworkId, nodes, setEdgesInNetwork],
  );

  // History functions
  const undo = useCallback(() => {
    useHistoryStore.getState().undoNodeEditor(nodeNetworkId);
  }, [nodeNetworkId]);

  const redo = useCallback(() => {
    useHistoryStore.getState().redoNodeEditor(nodeNetworkId);
  }, [nodeNetworkId]);

  const canUndo = useHistoryStore(
    (state) => (state.nodeHistories[nodeNetworkId]?.past.length || 0) > 0,
  );
  const canRedo = useHistoryStore(
    (state) => (state.nodeHistories[nodeNetworkId]?.future.length || 0) > 0,
  );

  const startDrag = useCallback(() => {
    useHistoryStore.getState().startNodeDrag(nodeNetworkId);
  }, [nodeNetworkId]);

  const endDrag = useCallback(() => {
    useHistoryStore.getState().endNodeDrag(nodeNetworkId);
  }, [nodeNetworkId]);

  // Initialize node history for this network
  useEffect(() => {
    useHistoryStore.getState().initializeNodeHistory(nodeNetworkId);
  }, [nodeNetworkId]);

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

  // Handle edge reconnection
  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      const newEdges = reconnectEdge(oldEdge, newConnection, edges);
      setEdges(newEdges);
    },
    [edges, setEdges],
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
                    // Use ReactFlow's built-in deletion mechanism
                    // First select the node, then trigger delete
                    if (finalReactFlowInstance.current) {
                      // Select the node first
                      finalReactFlowInstance.current.setNodes((nds: any[]) =>
                        nds.map((n: any) => ({
                          ...n,
                          selected: n.id === props.id,
                        })),
                      );

                      // Then trigger the delete action
                      setTimeout(() => {
                        if (finalReactFlowInstance.current) {
                          finalReactFlowInstance.current.deleteElements({
                            nodes: [{ id: props.id }],
                          });
                        }
                      }, 10);
                    }
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
            panOnDrag={true}
            colorMode="dark"
            nodeTypes={nodeTypes}
            nodes={nodes}
            edges={edges}
            isValidConnection={isValidConnection}
            connectionRadius={40}
            snapToGrid={false}
            edgesReconnectable={true}
            onReconnect={onReconnect}
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
            onConnect={(params) => {
              // Check if there's already an edge connected to the target input
              const existingEdgeIndex = edges.findIndex(
                (edge) =>
                  edge.target === params.target &&
                  edge.targetHandle === params.targetHandle,
              );

              if (existingEdgeIndex !== -1) {
                // Replace the existing edge
                const newEdges = [...edges];
                newEdges[existingEdgeIndex] = {
                  id: `edge-${Date.now()}-${Math.random()}`,
                  source: params.source,
                  sourceHandle: params.sourceHandle,
                  target: params.target,
                  targetHandle: params.targetHandle,
                };
                setEdges(newEdges);
              } else {
                // Add new edge normally
                setEdges(addEdge(params, edges));
              }
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
