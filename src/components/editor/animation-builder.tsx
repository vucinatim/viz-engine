import editorControl from '@/lib/editor-control';
import { cn } from '@/lib/utils';
import { describeProjectGraph, useVizSessionSelector } from '@/lib/viz-session';
import { AudioLines } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import NodeNetworkRenderer from '../node-network/node-network-renderer';
import useNodeNetworkStore, {
  useSpecificNetwork,
} from '../node-network/node-network-store';
import NodeEditorToolbar from './node-editor-toolbar';

const AnimationBuilder = () => {
  const isPlaying = useVizSessionSelector(
    (state) => state.preview.transport.isPlaying,
  );
  const nodeNetworkId = useNodeNetworkStore((state) => state.openNetwork);
  // Use optimized selector to only subscribe to the specific network we need
  const nodeNetwork = useSpecificNetwork(nodeNetworkId);
  const areNetworksMinimized = useNodeNetworkStore(
    (state) => state.areNetworksMinimized,
  );
  const shouldForceShowOverlay = useNodeNetworkStore(
    (state) => state.shouldForceShowOverlay,
  );
  const project = useVizSessionSelector(
    (state) => state.project.workingProject,
  );

  const [isHovering, setIsHovering] = useState(false);
  const [hasMouseEntered, setHasMouseEntered] = useState(false);
  const reactFlowInstance = useRef<any>(null);

  // Get formatted parameter info
  const graphPresentation = useMemo(
    () => (nodeNetworkId ? describeProjectGraph(project, nodeNetworkId) : null),
    [nodeNetworkId, project],
  );

  // When shouldForceShowOverlay changes to true, show the overlay immediately
  useEffect(() => {
    if (shouldForceShowOverlay) {
      setIsHovering(true);
      setHasMouseEntered(false);
    }
  }, [shouldForceShowOverlay]);

  // Update focus state based on hover (when user is interacting with node editor)
  useEffect(() => {
    if (nodeNetworkId && !areNetworksMinimized) {
      editorControl.history.setNodeEditorFocused(isHovering);
    } else {
      editorControl.history.setNodeEditorFocused(false);
    }
  }, [isHovering, nodeNetworkId, areNetworksMinimized]);

  return (
    <div
      data-testid="animation-builder"
      onMouseEnter={() => {
        setIsHovering(true);
        // Mark that mouse has entered
        if (shouldForceShowOverlay) {
          setHasMouseEntered(true);
        }
      }}
      onMouseLeave={(e) => {
        // Check if the <body/> has data-scroll-locked="1"
        // This property is set to 1 if the shadcn ContextMenu is open
        if (document.body.getAttribute('data-scroll-locked') === '1') {
          return;
        }

        // Check if any mouse buttons are pressed
        if (e.buttons) {
          return;
        }

        setIsHovering(false);

        // If we were force showing and mouse has entered, now clear the force show flag
        if (shouldForceShowOverlay && hasMouseEntered) {
          editorControl.nodeEditor.setShouldForceShowOverlay(false);
          setHasMouseEntered(false);
        }
      }}
      className={cn(
        'absolute inset-0',
        !nodeNetworkId && 'pointer-events-none',
        areNetworksMinimized && 'pointer-events-none',
      )}>
      {nodeNetwork && nodeNetworkId && (
        <>
          <div
            className={cn(
              'h-full w-full opacity-0 transition-opacity',
              isHovering && (isPlaying ? 'opacity-80' : 'opacity-100'),
              areNetworksMinimized && 'pointer-events-none opacity-0',
            )}>
            {nodeNetwork && !areNetworksMinimized && (
              <NodeNetworkRenderer
                key={nodeNetworkId}
                nodeNetworkId={nodeNetworkId}
                onReactFlowInit={(instance) => {
                  reactFlowInstance.current = instance;
                }}
                reactFlowInstance={reactFlowInstance}
              />
            )}
            <NodeEditorToolbar
              nodeNetworkId={nodeNetworkId}
              reactFlowInstance={reactFlowInstance}
            />
          </div>
          <div
            className={cn(
              'pointer-events-none absolute top-4 right-4 rounded-lg bg-zinc-600/30 px-4 py-2 transition-opacity',
              isHovering && 'opacity-0',
              areNetworksMinimized && 'opacity-0',
            )}>
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-0.5 text-right">
                <div className="text-sm font-semibold text-white">
                  {graphPresentation?.displayName || 'Graph'}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-white/60">
                  <span>
                    {graphPresentation?.contextLabel || 'Project graph'}
                  </span>
                  {graphPresentation?.detailLabel && (
                    <>
                      <span>›</span>
                      <span>{graphPresentation.detailLabel}</span>
                    </>
                  )}
                </div>
              </div>
              <AudioLines size={24} className="text-animation-purple" />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AnimationBuilder;
