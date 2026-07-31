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

const HistoryContextIndicator = () => {
  const openNodeNetwork = useNodeNetworkStore((state) => state.openNetwork);
  const isNodeEditorFocused = useVizSessionSelector(
    (state) => state.history.isNodeEditorFocused,
  );

  // Only show when node editor is open
  if (!openNodeNetwork) {
    return null;
  }

  const focusLabel = isNodeEditorFocused ? 'Graph editor' : 'Layer editor';

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            aria-label={`Project history. ${focusLabel} focused.`}
            data-testid="history-context-indicator"
            data-editor-focus={isNodeEditorFocused ? 'graph' : 'layers'}
            className="flex h-full items-center px-2">
            {isNodeEditorFocused ? (
              <Network size={14} className="text-animation-purple" />
            ) : (
              <Layers size={14} className="text-blue-400/80" />
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-xs" data-testid="history-context-description">
            <span className="font-semibold">Project History</span>
            <br />
            {focusLabel} focused.
            <br />
            <span className="text-white/60">
              Undo and redo follow one chronological project history.
            </span>
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default memo(HistoryContextIndicator);
