import { useNodeLiveValuesStore } from '@/lib/stores/node-live-values-store';
import { cn } from '@/lib/utils';
import { memo, useRef } from 'react';
import { useRafLoop } from 'react-use';
import { GraphNodeData } from '../node-network-store';

interface RateLimiterBodyProps {
  id: string;
  data: GraphNodeData;
  selected: boolean;
  nodeNetworkId: string;
}

const RateLimiterBody = ({ id: nodeId, data }: RateLimiterBodyProps) => {
  const countdownDisplayRef = useRef<HTMLDivElement>(null);
  const statusDisplayRef = useRef<HTMLDivElement>(null);
  const valueDisplayRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const { getNodeInputValue } = useNodeLiveValuesStore.getState();

  useRafLoop(() => {
    const state = data.state;
    const minIntervalMs = Number(
      getNodeInputValue(nodeId, 'minIntervalMs') ?? 250,
    );

    // Read timing info from state (set by computeSignal)
    // The computeSignal function stores lastChangeTime in milliseconds
    const lastChangeTime = state.lastChangeTime as number | undefined;
    const currentTime = state.currentTime as number | undefined;
    const lastValue = state.lastValue ?? 0;

    // If state hasn't been initialized yet, show ready
    if (typeof lastChangeTime !== 'number' || typeof currentTime !== 'number') {
      if (countdownDisplayRef.current) {
        countdownDisplayRef.current.textContent = 'READY';
        countdownDisplayRef.current.className =
          'text-4xl font-bold tabular-nums text-green-400';
      }
      if (statusDisplayRef.current) {
        statusDisplayRef.current.textContent = '✓ Allowing';
        statusDisplayRef.current.className =
          'text-xs font-medium text-green-500';
      }
      return;
    }

    // Calculate time since last change
    const timeSinceChange = currentTime - lastChangeTime;
    const timeUntilReady = Math.max(0, minIntervalMs - timeSinceChange);
    const isReady = timeUntilReady === 0;
    const progress = Math.min(1, timeSinceChange / minIntervalMs);

    // Update countdown display
    if (countdownDisplayRef.current) {
      const seconds = (timeUntilReady / 1000).toFixed(2);
      countdownDisplayRef.current.textContent = isReady
        ? 'READY'
        : `${seconds}s`;
      countdownDisplayRef.current.className = cn(
        'text-4xl font-bold tabular-nums transition-all duration-200',
        isReady ? 'text-green-400' : 'text-yellow-400',
      );
    }

    // Update status display
    if (statusDisplayRef.current) {
      statusDisplayRef.current.textContent = isReady
        ? '✓ Allowing'
        : '⏸ Blocking';
      statusDisplayRef.current.className = cn(
        'text-xs font-medium transition-colors duration-200',
        isReady ? 'text-green-500' : 'text-zinc-500',
      );
    }

    // Update value display
    if (valueDisplayRef.current) {
      valueDisplayRef.current.textContent = `Value: ${typeof lastValue === 'number' ? lastValue.toFixed(2) : lastValue}`;
      valueDisplayRef.current.className = 'text-[10px] text-zinc-400';
    }

    // Update progress bar
    if (progressBarRef.current) {
      progressBarRef.current.style.width = `${progress * 100}%`;
      progressBarRef.current.className = cn(
        'h-1 transition-all duration-100',
        isReady ? 'bg-green-500' : 'bg-yellow-500',
      );
    }
  });

  return (
    <div className="nodrag nopan relative flex h-28 w-[200px] flex-col items-center justify-center overflow-hidden rounded border border-zinc-700 bg-zinc-900/50">
      <div ref={statusDisplayRef} className="mb-1" />
      <div ref={countdownDisplayRef} />
      <div ref={valueDisplayRef} className="mt-1" />
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
        <div ref={progressBarRef} />
      </div>
    </div>
  );
};

export default memo(RateLimiterBody);
