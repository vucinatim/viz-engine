import { useNodeLiveValuesStore } from '@/lib/stores/node-live-values-store';
import { useNodeOutputCache } from '@/lib/stores/node-output-cache-store';
import { cn } from '@/lib/utils';
import { memo, useRef } from 'react';
import { useRafLoop } from 'react-use';
import { GraphNodeData } from '../node-network-store';

interface ThresholdCounterBodyProps {
  id: string;
  data: GraphNodeData;
  selected: boolean;
  nodeNetworkId: string;
}

const ThresholdCounterBody = ({
  id: nodeId,
  data,
}: ThresholdCounterBodyProps) => {
  const countDisplayRef = useRef<HTMLDivElement>(null);
  const maxValueRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const triggerHistory = useRef<number[]>([]);
  const lastCount = useRef<number>(0);
  const flashTimestamp = useRef<number>(0);

  const { getNodeOutput } = useNodeOutputCache.getState();
  const { getNodeInputValue } = useNodeLiveValuesStore.getState();

  useRafLoop(() => {
    const output = getNodeOutput(nodeId);
    const count = Number(output?.count ?? 0);
    const maxValue = Number(getNodeInputValue(nodeId, 'maxValue') ?? 5);

    // Detect count change and trigger flash
    if (count !== lastCount.current) {
      flashTimestamp.current = Date.now();
      triggerHistory.current.push(count);
      if (triggerHistory.current.length > 10) {
        triggerHistory.current.shift();
      }
    }
    lastCount.current = count;

    const timeSinceFlash = Date.now() - flashTimestamp.current;
    const isFlashing = timeSinceFlash < 300;

    // Update count display
    if (countDisplayRef.current) {
      countDisplayRef.current.textContent = count.toString();
      countDisplayRef.current.className = cn(
        'text-6xl font-bold tabular-nums transition-all duration-200',
        isFlashing ? 'scale-110 text-indigo-400' : 'scale-100 text-zinc-200',
      );
    }

    // Update max value display
    if (maxValueRef.current) {
      maxValueRef.current.textContent = `/ ${maxValue - 1}`;
      maxValueRef.current.className = 'text-2xl text-zinc-500';
    }

    // Update history dots
    if (historyRef.current) {
      const dots = triggerHistory.current
        .slice(-8)
        .map((c) => {
          const hue = (c / Math.max(1, maxValue - 1)) * 280;
          return `<div class="h-2 w-2 rounded-full" style="background: hsl(${hue}, 70%, 60%)"></div>`;
        })
        .join('');
      historyRef.current.innerHTML = dots;
    }
  });

  return (
    <div className="nodrag nopan relative flex h-24 w-[200px] flex-col items-center justify-center overflow-hidden rounded border border-zinc-700 bg-zinc-900/50">
      <div className="flex items-baseline gap-2">
        <div ref={countDisplayRef} />
        <div ref={maxValueRef} />
      </div>
      <div className="mt-1 text-[10px] text-zinc-500">Counter</div>
      <div ref={historyRef} className="absolute bottom-2 flex gap-1" />
    </div>
  );
};

export default memo(ThresholdCounterBody);
