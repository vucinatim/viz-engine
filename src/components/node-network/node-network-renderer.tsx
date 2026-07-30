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
import editorControl from '../../lib/editor-control';
import { useNodeGraphClipboard } from '../../lib/hooks/use-node-graph-clipboard';
import { useHistoryStore } from '../../lib/stores/history-store';
import {
  setEdgesInNetwork,
  setNodesInNetwork,
  useSpecificNetwork,
} from '../node-network/node-network-store';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
} from '../ui/context-menu';
import { isConnectionValid } from './connection-validator';
import { isProtectedGraphNode } from './graph-types';
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

  // Use the passed instance or create our own if not provided
  const localReactFlowInstance = useRef<any>(null);
  const finalReactFlowInstance = reactFlowInstance || localReactFlowInstance;

  // Get nodes and edges from the network store
  const network = useSpecificNetwork(nodeNetworkId);
  const nodes = useMemo(() => network?.nodes ?? [], [network?.nodes]);
  const edges = useMemo(() => network?.edges ?? [], [network?.edges]);
  const [flowNodes, setFlowNodes] = useState<any[]>(nodes);
  const [paneMenuGeneration, setPaneMenuGeneration] = useState(0);
  const flowNodesRef = useRef<any[]>(nodes);

  useEffect(() => {
    setFlowNodes((currentNodes) =>
      nodes.map((node) => {
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
              ...(current.height === undefined
                ? {}
                : { height: current.height }),
              ...(current.selected === undefined
                ? {}
                : { selected: current.selected }),
            }
          : node;
      }),
    );
  }, [nodes]);

  useEffect(() => {
    flowNodesRef.current = flowNodes;
  }, [flowNodes]);

  // Wrapped setters that push to history
  const setNodes = useCallback(
    (newNodes: any[]) => {
      setNodesInNetwork(nodeNetworkId, newNodes);
    },
    [nodeNetworkId],
  );

  const setEdges = useCallback(
    (newEdges: any[]) => {
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

  const canUndo = useHistoryStore((state) => state.canUndo());
  const canRedo = useHistoryStore((state) => state.canRedo());

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

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      return isConnectionValid(connection as Connection, flowNodes);
    },
    [flowNodes],
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
                  copyNode(props.id);
                }}>
                Copy
              </ContextMenuItem>
              <ContextMenuItem
                inset
                onClick={() => {
                  duplicateNode(props.id);
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
                  const node = flowNodesRef.current.find(
                    (candidate) => candidate.id === props.id,
                  );
                  const isProtected = node && isProtectedGraphNode(node);

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
      data-testid="node-network"
      className="relative h-full w-full"
      onContextMenu={onPaneContextMenu}>
      {/* Selection indicator */}
      {/* The selection indicator is removed as per the edit hint */}
      <ContextMenu key={paneMenuGeneration}>
        <ContextMenuTrigger>
          <ReactFlow
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
            nodes={flowNodes}
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

              // Filter out deletion changes for protected nodes (input/output)
              const filteredChanges = changes.filter((change) => {
                if (change.type === 'remove') {
                  // Check if the node being removed is a protected node
                  // We can identify protected nodes by their ID pattern
                  const node = flowNodesRef.current.find(
                    (candidate) => candidate.id === change.id,
                  );
                  const isProtected =
                    node !== undefined && isProtectedGraphNode(node);
                  return !isProtected;
                }
                return true;
              });

              // React Flow measurement and selection are canvas-local UI state.
              // Only durable graph edits are written back to the canonical document.
              if (filteredChanges.length > 0) {
                const newNodes = applyNodeChanges(filteredChanges, flowNodes);
                setFlowNodes(newNodes);
                if (
                  filteredChanges.some(
                    (change) =>
                      change.type !== 'dimensions' && change.type !== 'select',
                  )
                ) {
                  setNodes(newNodes);
                }
              }

              if (isDragEnd) {
                endDrag();
              }
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
