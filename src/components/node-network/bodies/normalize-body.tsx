import { useNodeLiveValuesStore } from '@/lib/stores/node-live-values-store';
import { useNodeOutputCache } from '@/lib/stores/node-output-cache-store';
import { cn } from '@/lib/utils';
import { memo, useRef } from 'react';
import { useRafLoop } from 'react-use';
import { GraphNodeData } from '../node-network-store';

interface NormalizeBodyProps {
  id: string;
  data: GraphNodeData;
  selected: boolean;
  nodeNetworkId: string;
}

// Custom body for Normalize node: sparkline preview only (inputs handled by core UI)
const NormalizeBody = ({ id: nodeId }: NormalizeBodyProps) => {
  const { getNodeInputValue } = useNodeLiveValuesStore.getState();
  const { getNodeOutput } = useNodeOutputCache.getState();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const inRing = useRef<number[]>([]);
  const outRing = useRef<number[]>([]);
  const capacity = 120;

  useRafLoop(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr =
      typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const cssW = Math.max(1, Math.floor(rect.width));
    const cssH = Math.max(1, Math.floor(rect.height));
    const pixelW = cssW * dpr;
    const pixelH = cssH * dpr;
    if (canvas.width !== pixelW || canvas.height !== pixelH) {
      canvas.width = pixelW;
      canvas.height = pixelH;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const inputVal = Number(getNodeInputValue(nodeId, 'value')) || 0;
    const resultVal =
      Number((getNodeOutput(nodeId)?.result as number) ?? 0) || 0;

    inRing.current.push(inputVal);
    outRing.current.push(resultVal);
    if (inRing.current.length > capacity) inRing.current.shift();
    if (outRing.current.length > capacity) outRing.current.shift();

    ctx.clearRect(0, 0, cssW, cssH);

    // grid
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cssH - 0.5);
    ctx.lineTo(cssW, cssH - 0.5);
    ctx.stroke();

    const drawSeries = (series: number[], color: string, clamp01 = false) => {
      if (series.length < 2) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const stepX = cssW / Math.max(1, capacity - 1);
      for (let i = 0; i < series.length; i++) {
        const x = i * stepX;
        const v = clamp01 ? Math.max(0, Math.min(1, series[i])) : series[i];
        // visualize with a 0..1 vertical range
        const y = cssH - Math.max(0, Math.min(1, v)) * cssH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    // Input (light)
    drawSeries(inRing.current, 'rgba(255,255,255,0.25)');
    // Output normalized (accent)
    drawSeries(outRing.current, 'rgba(34,197,94,0.95)', true);

    if (infoRef.current) {
      infoRef.current.textContent = resultVal.toFixed(2);
      infoRef.current.className = cn(
        'pointer-events-none absolute right-1 top-1 rounded bg-zinc-800/70 px-1 text-[10px] text-zinc-200',
      );
    }
  });

  return (
    <div className="nodrag nopan flex flex-col gap-2">
      <div className="relative h-16 w-[220px] overflow-hidden rounded">
        <canvas ref={canvasRef} className="h-full w-full" />
        <div ref={infoRef} />
      </div>
    </div>
  );
};

export default memo(NormalizeBody);
