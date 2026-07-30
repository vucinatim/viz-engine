import useNodeNetworkStore from '@/components/node-network/node-network-store';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useVizSessionSelector } from '@/lib/viz-session';
import { Layers, Network } from 'lucide-react';
import { memo } from 'react';

/**
 * Visual indicator showing which history context is currently active.
 * This helps users understand what Ctrl+Z/Ctrl+Y will undo/redo.
 */
const HistoryContextIndicator = () => {
  const openNodeNetwork = useNodeNetworkStore((state) => state.openNetwork);
  const isNodeEditorFocused = useVizSessionSelector(
    (state) => state.history.isNodeEditorFocused,
  );

  // Only show when node editor is open
  if (!openNodeNetwork) {
    return null;
  }

  const isNodeContext = isNodeEditorFocused;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div className="flex h-full items-center px-2">
            {isNodeContext ? (
              <Network size={14} className="text-animation-purple" />
            ) : (
              <Layers size={14} className="text-blue-400/80" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-xs">
            {isNodeContext ? (
              <>
                <span className="font-semibold">Node History Active</span>
                <br />
                Undo/Redo will affect node graph changes.
                <br />
                <span className="text-white/60">
                  Hover away from node editor to switch to layer history.
                </span>
              </>
            ) : (
              <>
                <span className="font-semibold">Layer History Active</span>
                <br />
                Undo/Redo will affect layer changes.
                <br />
                <span className="text-white/60">
                  Hover over node editor to switch to node history.
                </span>
              </>
            )}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default memo(HistoryContextIndicator);
