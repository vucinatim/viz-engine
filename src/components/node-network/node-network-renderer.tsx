import { generateGraphEdgeId } from '@/lib/id-utils';
import { ContextMenuTrigger } from '@radix-ui/react-context-menu';
import {
  Background,
  Connection,
  Controls,
  Edge,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  reconnectEdge,
  type FinalConnectionState,
  type NodeProps,
  type NodeTypes,
  type ReactFlowInstance,
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
import { toast } from 'sonner';
import '../../lib/css/xyflow.css';
import editorControl from '../../lib/editor-control';
import { useNodeGraphClipboard } from '../../lib/hooks/use-node-graph-clipboard';
import { useCanRedo, useCanUndo } from '../../lib/viz-session';
import {
  removeNodesFromNetwork,
  setEdgesInNetwork,
  setNodesInNetwork,
  useSpecificNetwork,
} from '../node-network/node-network-store';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
} from '../ui/context-menu';
import {
  isConnectionValid,
  validateGraphConnection,
} from './connection-validator';
import { GraphNode, isProtectedGraphNode } from './graph-types';
import NodeRenderer from './node-renderer';
import NodesSearch from './nodes-search';

type GraphFlowInstance = ReactFlowInstance<GraphNode, Edge>;

const NodeNetworkRenderer = ({
  nodeNetworkId,
  onReactFlowInit,
  onSelectionChange,
  reactFlowInstance,
}: {
  nodeNetworkId: string;
  onReactFlowInit?: (instance: GraphFlowInstance) => void;
  onSelectionChange?: (nodeIds: string[]) => void;
  reactFlowInstance?: React.MutableRefObject<GraphFlowInstance | null>;
}) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Use the passed instance or create our own if not provided
  const localReactFlowInstance = useRef<GraphFlowInstance | null>(null);
  const finalReactFlowInstance = reactFlowInstance || localReactFlowInstance;

  // Get nodes and edges from the network store
  const network = useSpecificNetwork(nodeNetworkId);
  const nodes = useMemo(() => network?.nodes ?? [], [network?.nodes]);
  const edges = useMemo(() => network?.edges ?? [], [network?.edges]);
  const [paneMenuGeneration, setPaneMenuGeneration] = useState(0);
  const flowNodesRef = useRef<GraphNode[]>(nodes);
  const flowEdgesRef = useRef<Edge[]>(edges);
  const isNodeDragActiveRef = useRef(false);

  useEffect(() => {
    const currentNodes = flowNodesRef.current;
    const nextNodes = nodes.map((node) => {
      const current = currentNodes.find(
        (candidate) => candidate.id === node.id,
      );
      return current
        ? {
            ...node,
            ...(current.measured === undefined
              ? {}
              : { measured: current.measured }),
            ...(current.width === undefined ? {} : { width: current.width }),
            ...(current.height === undefined ? {} : { height: current.height }),
            ...(current.selected === undefined
              ? {}
              : { selected: current.selected }),
          }
        : node;
    });
    flowNodesRef.current = nextNodes;
    finalReactFlowInstance.current?.setNodes(nextNodes);
  }, [finalReactFlowInstance, nodes]);

  useEffect(() => {
    const currentEdges = flowEdgesRef.current;
    const nextEdges = edges.map((edge) => {
      const current = currentEdges.find(
        (candidate) => candidate.id === edge.id,
      );
      return current?.selected === undefined
        ? edge
        : { ...edge, selected: current.selected };
    });
    flowEdgesRef.current = nextEdges;
    finalReactFlowInstance.current?.setEdges(nextEdges);
  }, [edges, finalReactFlowInstance]);

  // Wrapped setters that push to history
  const setNodes = useCallback(
    (newNodes: GraphNode[]) => {
      setNodesInNetwork(nodeNetworkId, newNodes);
    },
    [nodeNetworkId],
  );

  const setEdges = useCallback(
    (newEdges: Edge[]) => {
      setEdgesInNetwork(nodeNetworkId, newEdges);
    },
    [nodeNetworkId],
  );

  // History functions
  const undo = useCallback(() => {
    editorControl.history.undoNodeEditor(nodeNetworkId);
  }, [nodeNetworkId]);

  const redo = useCallback(() => {
    editorControl.history.redoNodeEditor(nodeNetworkId);
  }, [nodeNetworkId]);

  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  const startDrag = useCallback(() => {
    editorControl.history.startNodeDrag(nodeNetworkId);
  }, [nodeNetworkId]);

  const endDrag = useCallback(() => {
    editorControl.history.endNodeDrag(nodeNetworkId);
  }, [nodeNetworkId]);

  // Use the clipboard hook for copy/paste functionality
  const { copyNode, pasteNodesAtPosition, duplicateNode } =
    useNodeGraphClipboard({
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

  const isValidConnection = useCallback((connection: Connection | Edge) => {
    return isConnectionValid(
      connection as Connection,
      flowNodesRef.current,
      flowEdgesRef.current,
    );
  }, []);

  // Handle edge reconnection
  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      const validation = validateGraphConnection(
        newConnection,
        flowNodesRef.current,
        flowEdgesRef.current.filter((edge) => edge.id !== oldEdge.id),
      );
      if (!validation.valid) {
        toast.error(validation.message);
        return;
      }
      const newEdges = reconnectEdge(
        oldEdge,
        newConnection,
        flowEdgesRef.current,
      );
      flowEdgesRef.current = newEdges;
      finalReactFlowInstance.current?.setEdges(newEdges);
      setEdges(newEdges);
    },
    [finalReactFlowInstance, setEdges],
  );

  const reportInvalidConnection = useCallback(
    (connectionState: FinalConnectionState) => {
      if (
        connectionState.isValid !== false ||
        !connectionState.fromHandle ||
        !connectionState.toHandle
      ) {
        return;
      }
      const from = connectionState.fromHandle;
      const to = connectionState.toHandle;
      const connection: Connection =
        from.type === 'source'
          ? {
              source: from.nodeId,
              sourceHandle: from.id ?? null,
              target: to.nodeId,
              targetHandle: to.id ?? null,
            }
          : {
              source: to.nodeId,
              sourceHandle: to.id ?? null,
              target: from.nodeId,
              targetHandle: from.id ?? null,
            };
      const validation = validateGraphConnection(
        connection,
        flowNodesRef.current,
        flowEdgesRef.current,
      );
      if (!validation.valid) {
        toast.error(validation.message);
      }
    },
    [],
  );

  const nodeContextActionsRef = useRef({
    canRedo,
    canUndo,
    copyNode,
    duplicateNode,
    getCanvasPosition,
    mousePosition,
    nodeNetworkId,
    pasteNodesAtPosition,
    redo,
    undo,
  });
  nodeContextActionsRef.current = {
    canRedo,
    canUndo,
    copyNode,
    duplicateNode,
    getCanvasPosition,
    mousePosition,
    nodeNetworkId,
    pasteNodesAtPosition,
    redo,
    undo,
  };

  const nodeTypes = useMemo<NodeTypes>(
    () => ({
      NodeRenderer: (props: NodeProps<GraphNode>) => {
        return (
          <ContextMenu>
            <ContextMenuTrigger>
              <NodeRenderer
                {...props}
                nodeNetworkId={nodeContextActionsRef.current.nodeNetworkId}
              />
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem
                inset
                onClick={() => {
                  nodeContextActionsRef.current.copyNode(props.id);
                }}>
                Copy
              </ContextMenuItem>
              <ContextMenuItem
                inset
                onClick={() => {
                  nodeContextActionsRef.current.duplicateNode(props.id);
                }}>
                Duplicate
              </ContextMenuItem>
              <ContextMenuItem
                inset
                onClick={() => {
                  const actions = nodeContextActionsRef.current;
                  const canvasPosition = actions.getCanvasPosition(
                    actions.mousePosition,
                  );
                  actions.pasteNodesAtPosition(canvasPosition);
                }}>
                Paste
              </ContextMenuItem>
              <ContextMenuItem
                inset
                onClick={nodeContextActionsRef.current.undo}
                disabled={!nodeContextActionsRef.current.canUndo}>
                Undo
              </ContextMenuItem>
              <ContextMenuItem
                inset
                onClick={nodeContextActionsRef.current.redo}
                disabled={!nodeContextActionsRef.current.canRedo}>
                Redo
              </ContextMenuItem>
              <ContextMenuItem
                inset
                onClick={() => {
                  // Check if this is a protected node
                  const node = flowNodesRef.current.find(
                    (candidate) => candidate.id === props.id,
                  );
                  if (node && !isProtectedGraphNode(node)) {
                    removeNodesFromNetwork(
                      nodeContextActionsRef.current.nodeNetworkId,
                      [props.id],
                    );
                  }
                }}>
                Delete
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        );
      },
    }),
    [],
  );

  return (
    <div
      ref={reactFlowWrapper}
      data-testid="node-network"
      className="relative h-full w-full"
      onContextMenu={onPaneContextMenu}>
      {/* Selection indicator */}
      {/* The selection indicator is removed as per the edit hint */}
      <ContextMenu key={paneMenuGeneration}>
        <ContextMenuTrigger>
          <ReactFlow<GraphNode, Edge>
            key={nodeNetworkId}
            onInit={(instance) => {
              finalReactFlowInstance.current = instance;
              onReactFlowInit?.(instance);
            }}
            fitView
            fitViewOptions={{ padding: 0.24 }}
            panOnScroll
            zoomOnPinch
            selectionOnDrag
            panOnDrag={true}
            colorMode="dark"
            nodeTypes={nodeTypes}
            defaultNodes={nodes}
            defaultEdges={edges}
            onlyRenderVisibleElements
            isValidConnection={isValidConnection}
            onConnectEnd={(_event, connectionState) =>
              reportInvalidConnection(connectionState)
            }
            connectionRadius={40}
            snapToGrid={false}
            edgesReconnectable={true}
            onReconnect={onReconnect}
            onNodesChange={(changes) => {
              const isDragging = changes.some(
                (change) =>
                  change.type === 'position' && change.dragging === true,
              );
              const isDragEnd = changes.some(
                (change) =>
                  change.type === 'position' && change.dragging === false,
              );

              if (isDragging && !isNodeDragActiveRef.current) {
                isNodeDragActiveRef.current = true;
                startDrag();
              }

              // React Flow owns pointer-rate canvas state. The canonical graph
              // receives only durable edits, including one position commit when
              // a drag ends.
              if (changes.length > 0) {
                const newNodes = applyNodeChanges(
                  changes,
                  flowNodesRef.current,
                );
                flowNodesRef.current = newNodes;
                if (
                  changes.some(
                    (change) =>
                      change.type !== 'dimensions' &&
                      change.type !== 'select' &&
                      !(change.type === 'position' && change.dragging === true),
                  )
                ) {
                  setNodes(newNodes);
                }
              }

              if (changes.some((change) => change.type === 'select')) {
                onSelectionChange?.(
                  flowNodesRef.current
                    .filter((node) => node.selected)
                    .map((node) => node.id),
                );
              }

              if (isDragEnd && isNodeDragActiveRef.current) {
                isNodeDragActiveRef.current = false;
                endDrag();
              }
            }}
            onBeforeDelete={async ({ nodes: nodesToDelete }) =>
              !nodesToDelete.some(isProtectedGraphNode)
            }
            onEdgesChange={(changes) => {
              const newEdges = applyEdgeChanges(changes, flowEdgesRef.current);
              flowEdgesRef.current = newEdges;
              if (changes.some((change) => change.type !== 'select')) {
                setEdges(newEdges);
              }
            }}
            onConnect={(params) => {
              const validation = validateGraphConnection(
                params,
                flowNodesRef.current,
                flowEdgesRef.current,
              );
              if (!validation.valid) {
                toast.error(validation.message);
                return;
              }
              const currentEdges = flowEdgesRef.current;
              // Check if there's already an edge connected to the target input
              const existingEdgeIndex = currentEdges.findIndex(
                (edge) =>
                  edge.target === params.target &&
                  edge.targetHandle === params.targetHandle,
              );

              if (existingEdgeIndex !== -1) {
                // Replace the existing edge
                const newEdges = [...currentEdges];
                newEdges[existingEdgeIndex] = {
                  id: generateGraphEdgeId(),
                  source: params.source,
                  sourceHandle: params.sourceHandle,
                  target: params.target,
                  targetHandle: params.targetHandle,
                };
                flowEdgesRef.current = newEdges;
                finalReactFlowInstance.current?.setEdges(newEdges);
                setEdges(newEdges);
              } else {
                // Add new edge normally
                const newEdges = addEdge(
                  { ...params, id: generateGraphEdgeId() },
                  currentEdges,
                );
                flowEdgesRef.current = newEdges;
                finalReactFlowInstance.current?.setEdges(newEdges);
                setEdges(newEdges);
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
                onNodeAdded={() =>
                  setPaneMenuGeneration((generation) => generation + 1)
                }
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
