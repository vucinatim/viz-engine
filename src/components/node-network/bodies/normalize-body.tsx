import { cn } from '@/lib/utils';
import { getRuntimeNodeInput, getRuntimeNodeOutput } from '@/lib/viz-session';
import { memo, useRef } from 'react';
import { useGraphLiveUpdate } from '../live-update';
import { prepareNodeCanvas, type NodeBodyProps } from './node-body';

// Custom body for Normalize node: sparkline preview only (inputs handled by core UI)
const NormalizeBody = ({ id: nodeId }: NodeBodyProps) => {
  const getNodeInputValue = getRuntimeNodeInput;
  const getNodeOutput = getRuntimeNodeOutput;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const inRing = useRef<number[]>([]);
  const outRing = useRef<number[]>([]);
  const capacity = 120;

  useGraphLiveUpdate(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const prepared = prepareNodeCanvas(canvas);
    if (!prepared) return;
    const { context: ctx, width: cssW, height: cssH } = prepared;

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
        'pointer-events-none absolute top-1 right-1 rounded bg-zinc-800/70 px-1 text-[10px] text-zinc-200',
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
