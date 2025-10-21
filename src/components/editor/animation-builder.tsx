import { destructureParameterId } from '@/lib/id-utils';
import useEditorStore from '@/lib/stores/editor-store';
import useLayerStore from '@/lib/stores/layer-store';
import { cn } from '@/lib/utils';
import { AudioLines } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import NodeNetworkRenderer from '../node-network/node-network-renderer';
import useNodeNetworkStore from '../node-network/node-network-store';
import NodeEditorToolbar from './node-editor-toolbar';

const AnimationBuilder = () => {
  const isPlaying = useEditorStore((state) => state.isPlaying);
  const nodeNetworkId = useNodeNetworkStore((state) => state.openNetwork);
  const networks = useNodeNetworkStore((state) => state.networks);
  const areNetworksMinimized = useNodeNetworkStore(
    (state) => state.areNetworksMinimized,
  );
  const setNetworksMinimized = useNodeNetworkStore(
    (state) => state.setNetworksMinimized,
  );
  const shouldForceShowOverlay = useNodeNetworkStore(
    (state) => state.shouldForceShowOverlay,
  );
  const setShouldForceShowOverlay = useNodeNetworkStore(
    (state) => state.setShouldForceShowOverlay,
  );
  const nodeNetwork = nodeNetworkId && networks[nodeNetworkId];
  const layers = useLayerStore((state) => state.layers);

  const [isHovering, setIsHovering] = useState(false);
  const [hasMouseEntered, setHasMouseEntered] = useState(false);
  const reactFlowInstance = useRef<any>(null);

  // Get formatted parameter info
  const parameterInfo = nodeNetworkId
    ? (() => {
        const info = destructureParameterId(nodeNetworkId);
        const layer = layers.find((l) => l.id === info.layerId);
        return {
          ...info,
          layerName: layer?.comp.name || info.componentName,
        };
      })()
    : null;

  // When shouldForceShowOverlay changes to true, show the overlay immediately
  useEffect(() => {
    if (shouldForceShowOverlay) {
      setIsHovering(true);
      setHasMouseEntered(false);
    }
  }, [shouldForceShowOverlay]);

  return (
    <div
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
          setShouldForceShowOverlay(false);
          setHasMouseEntered(false);
        }
      }}
      className={cn(
        'absolute inset-0',
        !nodeNetworkId && 'pointer-events-none',
        areNetworksMinimized && 'pointer-events-none',
      )}>
      {nodeNetwork && (
        <>
          <div
            className={cn(
              'h-full w-full opacity-0 transition-opacity',
              isHovering && (isPlaying ? 'opacity-80' : 'opacity-100'),
              areNetworksMinimized && 'pointer-events-none opacity-0',
            )}>
            {nodeNetwork && !areNetworksMinimized && (
              <NodeNetworkRenderer
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
              'pointer-events-none absolute right-4 top-4 rounded-lg bg-zinc-600/30 px-4 py-2 transition-opacity',
              isHovering && 'opacity-0',
              areNetworksMinimized && 'opacity-0',
            )}>
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-0.5 text-right">
                <div className="text-sm font-semibold text-white">
                  {parameterInfo?.displayName || 'Parameter'}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-white/60">
                  <span>{parameterInfo?.layerName || 'Layer'}</span>
                  {parameterInfo?.groupPath && (
                    <>
                      <span>›</span>
                      <span>{parameterInfo.groupPath}</span>
                    </>
                  )}
                </div>
              </div>
              <AudioLines size={24} className="text-purple-400" />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AnimationBuilder;
