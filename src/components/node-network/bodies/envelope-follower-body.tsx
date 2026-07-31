import { cn } from '@/lib/utils';
import { getRuntimeNodeInput, getRuntimeNodeOutput } from '@/lib/viz-session';
import { memo, useRef } from 'react';
import { useGraphLiveUpdate } from '../live-update';
import { prepareNodeCanvas, type NodeBodyProps } from './node-body';

// Lightweight sparkline visualizer for Envelope Follower
const EnvelopeFollowerBody = ({ id: nodeId }: NodeBodyProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const inputRing = useRef<number[]>([]);
  const envRing = useRef<number[]>([]);
  const capacity = 160; // ~ last few seconds depending on frame rate
  const peakRef = useRef<number>(1);

  const getNodeInputValue = getRuntimeNodeInput;
  const getNodeOutput = getRuntimeNodeOutput;

  useGraphLiveUpdate(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prepared = prepareNodeCanvas(canvas);
    if (!prepared) return;
    const { context: ctx, width: cssW, height: cssH } = prepared;

    // Read current input and env
    const inputVal = Number(getNodeInputValue(nodeId, 'value')) || 0;
    const envVal = Number((getNodeOutput(nodeId)?.env as number) ?? 0) || 0;

    // Maintain ring buffers
    inputRing.current.push(inputVal);
    envRing.current.push(envVal);
    if (inputRing.current.length > capacity) inputRing.current.shift();
    if (envRing.current.length > capacity) envRing.current.shift();

    // Clear
    ctx.clearRect(0, 0, cssW, cssH);

    // Axes
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cssH - 0.5);
    ctx.lineTo(cssW, cssH - 0.5);
    ctx.stroke();

    // Update dynamic peak (decays slowly so scale adapts without jumps)
    const currentMax = Math.max(
      1e-6,
      ...inputRing.current,
      ...envRing.current,
      Math.abs(inputVal),
      Math.abs(envVal),
    );
    const decay = 0.98; // per-frame decay of the held peak
    peakRef.current = Math.max(currentMax, peakRef.current * decay);

    const drawSeries = (series: number[], color: string) => {
      if (series.length < 2) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const stepX = cssW / Math.max(1, capacity - 1);
      for (let i = 0; i < series.length; i++) {
        const x = i * stepX;
        const vRaw = series[i];
        const v = Math.max(0, Math.min(1, vRaw / peakRef.current));
        const y = cssH - v * cssH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    // Input (light)
    drawSeries(inputRing.current, 'rgba(255,255,255,0.25)');
    // Envelope (accent)
    drawSeries(envRing.current, 'rgba(99,102,241,0.95)');

    if (infoRef.current) {
      infoRef.current.textContent = envVal.toFixed(2);
      infoRef.current.className = cn(
        'pointer-events-none absolute top-1 right-1 rounded bg-zinc-800/70 px-1 text-[10px] text-zinc-200',
      );
    }
  });

  return (
    <div className="nodrag nopan relative h-16 w-[200px] flex-none overflow-hidden rounded">
      <canvas ref={canvasRef} className="h-full w-full" />
      <div ref={infoRef} />
    </div>
  );
};

export default memo(EnvelopeFollowerBody);
