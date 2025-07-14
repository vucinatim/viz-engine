import useEditorStore from '@/lib/stores/editor-store';
import { cn } from '@/lib/utils';
import { AudioLines } from 'lucide-react';
import { useState } from 'react';
import NodeNetworkRenderer from '../node-network/node-network-renderer';
import useNodeNetworkStore from '../node-network/node-network-store';

const AnimationBuilder = () => {
  const isPlaying = useEditorStore((state) => state.isPlaying);
  const nodeNetworkId = useNodeNetworkStore((state) => state.openNetwork);
  const networks = useNodeNetworkStore((state) => state.networks);
  const nodeNetwork = nodeNetworkId && networks[nodeNetworkId];

  const [isHovering, setIsHovering] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovering(true)}
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
      }}
      className={cn(
        'absolute inset-0',
        !nodeNetworkId && 'pointer-events-none',
      )}>
      {nodeNetwork && (
        <>
          <div
            className={cn(
              'h-full w-full opacity-0 transition-opacity',
              isHovering && (isPlaying ? 'opacity-70' : 'opacity-100'),
            )}>
            <NodeNetworkRenderer nodeNetworkId={nodeNetworkId} />
          </div>
          <div
            className={cn(
              'pointer-events-none absolute left-4 top-4 rounded-lg bg-zinc-600/30 px-6 py-4 transition-opacity',
              isHovering && 'opacity-0',
            )}>
            <p className="flex items-center justify-center text-sm font-semibold text-white">
              <AudioLines size={24} className="mr-4 text-purple-400" />
              {nodeNetwork.name}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default AnimationBuilder;
