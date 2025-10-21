'use client';

import { ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import '../../lib/css/xyflow.css';
import useNodeNetworkStore from '../node-network/node-network-store';
import NodeRenderer from '../node-network/node-renderer';

interface NodeNetworkPreviewProps {
  parameterId: string;
  width?: number;
  height?: number;
  isHovered?: boolean;
}

/**
 * Renders a small preview of a node network
 * Read-only, no interactions, just for visualization
 */
const NodeNetworkPreview = memo(
  ({
    parameterId,
    width = 120,
    height = 68,
    isHovered = false,
  }: NodeNetworkPreviewProps) => {
    const network = useNodeNetworkStore((state) => state.networks[parameterId]);
    const reactFlowInstance = useRef<any>(null);
    const [isReady, setIsReady] = useState(false);

    // Create nodeTypes with parameterId bound to each node
    const nodeTypes = useMemo(
      () => ({
        NodeRenderer: (props: any) => (
          <NodeRenderer {...props} nodeNetworkId={parameterId} />
        ),
      }),
      [parameterId],
    );

    // Fit view when network changes or when hovered
    useEffect(() => {
      if (reactFlowInstance.current && isReady) {
        // Small delay to ensure nodes are rendered
        setTimeout(() => {
          reactFlowInstance.current?.fitView({
            padding: 0.5,
            duration: 200,
            minZoom: 0.1,
            maxZoom: 0.8,
          });
        }, 50);
      }
    }, [network?.nodes, network?.edges, isHovered, isReady]);

    if (!network) {
      return (
        <div
          className="flex items-center justify-center rounded border border-zinc-700 bg-black/50"
          style={{ width: `${width}px`, height: `${height}px` }}>
          <p className="text-xs text-muted-foreground">No network</p>
        </div>
      );
    }

    return (
      <div
        className="overflow-hidden rounded border border-zinc-700 bg-zinc-900/50"
        style={{ width: `${width}px`, height: `${height}px` }}>
        <ReactFlow
          onInit={(instance) => {
            reactFlowInstance.current = instance;
            setIsReady(true);
            // Initial fit view
            setTimeout(() => {
              instance.fitView({
                padding: 0.5,
                duration: 0,
                minZoom: 0.1,
                maxZoom: 0.8,
              });
            }, 100);
          }}
          nodes={network.nodes}
          edges={network.edges}
          nodeTypes={nodeTypes}
          colorMode="dark"
          fitView
          // Disable all interactions
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          preventScrolling={false}
          // Hide controls
          proOptions={{ hideAttribution: true }}
        />
      </div>
    );
  },
  // Custom comparison to prevent re-renders when only isHovered changes
  (prevProps, nextProps) => {
    return (
      prevProps.parameterId === nextProps.parameterId &&
      prevProps.width === nextProps.width &&
      prevProps.height === nextProps.height
      // Deliberately ignore isHovered changes for performance
    );
  },
);

NodeNetworkPreview.displayName = 'NodeNetworkPreview';

export default NodeNetworkPreview;
