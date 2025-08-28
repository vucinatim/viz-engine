import { useNodeLiveValuesStore } from '@/lib/stores/node-live-values-store';
import { useNodeOutputCache } from '@/lib/stores/node-output-cache-store';
import { cn } from '@/lib/utils';
import { D3DragEvent, drag } from 'd3-drag';
import { select } from 'd3-selection';
import { memo, useEffect, useRef } from 'react';
import { useRafLoop } from 'react-use';
import { GraphNodeData, useNodeNetwork } from '../node-network-store';

type DragEvt = D3DragEvent<HTMLDivElement, unknown, unknown>;

interface HysteresisGateBodyProps {
  id: string;
  data: GraphNodeData;
  selected: boolean;
  nodeNetworkId: string;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const HysteresisGateBody = ({
  id: nodeId,
  data,
  nodeNetworkId,
}: HysteresisGateBodyProps) => {
  const { updateInputValue } = useNodeNetwork(nodeNetworkId);
  const { getNodeOutput } = useNodeOutputCache.getState();
  const { getNodeInputValue } = useNodeLiveValuesStore.getState();

  const trackRef = useRef<HTMLDivElement>(null);
  const lowRef = useRef<HTMLDivElement>(null);
  const highRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const gatedRef = useRef<HTMLDivElement>(null);

  const getWidth = () => trackRef.current?.getBoundingClientRect().width ?? 0;

  useEffect(() => {
    const setupDrag = (
      handleRef: React.RefObject<HTMLDivElement>,
      inputId: 'low' | 'high',
    ) => {
      if (!handleRef.current) return;
      const selection = select(handleRef.current);
      const behavior = drag().on('drag', (e: DragEvt) => {
        const width = getWidth();
        const clampedX = Math.max(0, Math.min(e.x, width));
        const value = clamp01(width === 0 ? 0 : clampedX / width);
        updateInputValue(nodeId, inputId, value);
      });
      selection.call(behavior as any);
    };

    setupDrag(lowRef, 'low');
    setupDrag(highRef, 'high');
  }, [nodeId, updateInputValue]);

  useRafLoop(() => {
    const width = getWidth();
    if (width === 0) return;

    const low = clamp01(
      (getNodeInputValue(nodeId, 'low') as number) ??
        data.inputValues.low ??
        0.02,
    );
    const high = clamp01(
      (getNodeInputValue(nodeId, 'high') as number) ??
        data.inputValues.high ??
        0.08,
    );
    const valueRaw = (getNodeInputValue(nodeId, 'value') as number) ?? 0;
    const value = clamp01(valueRaw);

    if (lowRef.current) {
      lowRef.current.style.left = `${low * 100}%`;
    }
    if (highRef.current) {
      highRef.current.style.left = `${high * 100}%`;
      highRef.current.style.transform = 'translateX(-100%)';
    }
    if (fillRef.current) {
      fillRef.current.style.width = `${value * 100}%`;
    }

    const gated = (getNodeOutput(nodeId)?.gated as number) ?? 0;
    if (gatedRef.current) {
      gatedRef.current.textContent = `${value.toFixed(2)} → ${gated.toFixed(2)}`;
      gatedRef.current.className = cn(
        'pointer-events-none absolute -top-5 right-0 rounded px-1 text-[10px]',
        gated > 0
          ? 'bg-emerald-600/30 text-emerald-300'
          : 'bg-zinc-700/50 text-zinc-300',
      );
    }
  });

  return (
    <div className="flex w-full min-w-[200px] cursor-auto flex-col gap-1">
      <div className="flex items-center justify-between text-[10px] text-zinc-400">
        <span>Low</span>
        <span>High</span>
      </div>
      <div ref={trackRef} className="relative h-6 w-full rounded bg-zinc-800">
        <div
          ref={fillRef}
          className="absolute left-0 top-0 h-full rounded-l bg-zinc-500/40"
          style={{ width: '0%' }}
        />
        <div
          ref={lowRef}
          className="absolute top-0 h-full w-1 cursor-ew-resize bg-yellow-400"
          title="Low threshold"
        />
        <div
          ref={highRef}
          className="absolute top-0 h-full w-1 cursor-ew-resize bg-orange-500"
          title="High threshold"
        />
        <div className="pointer-events-none absolute inset-0 border-l-2 border-r-2 border-transparent" />
        <div
          ref={gatedRef}
          className="pointer-events-none absolute -top-5 right-0 rounded px-1 text-[10px]"
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-zinc-400">
        <span>0</span>
        <span>1</span>
      </div>
    </div>
  );
};

export default memo(HysteresisGateBody);
