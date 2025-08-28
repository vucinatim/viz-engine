import { useNodeLiveValuesStore } from '@/lib/stores/node-live-values-store';
import { useNodeOutputCache } from '@/lib/stores/node-output-cache-store';
import { cn } from '@/lib/utils';
import { memo, useRef } from 'react';
import { useRafLoop } from 'react-use';
import { GraphNodeData } from '../node-network-store';

interface EnvelopeFollowerBodyProps {
  id: string;
  data: GraphNodeData;
  selected: boolean;
  nodeNetworkId: string;
}

// Lightweight sparkline visualizer for Envelope Follower
const EnvelopeFollowerBody = ({ id: nodeId }: EnvelopeFollowerBodyProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const inputRing = useRef<number[]>([]);
  const envRing = useRef<number[]>([]);
  const capacity = 160; // ~ last few seconds depending on frame rate

  const { getNodeInputValue } = useNodeLiveValuesStore.getState();
  const { getNodeOutput } = useNodeOutputCache.getState();

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

    const drawSeries = (series: number[], color: string) => {
      if (series.length < 2) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const stepX = cssW / Math.max(1, capacity - 1);
      for (let i = 0; i < series.length; i++) {
        const x = i * stepX;
        const v = Math.max(0, Math.min(1, series[i]));
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
        'pointer-events-none absolute right-1 top-1 rounded bg-zinc-800/70 px-1 text-[10px] text-zinc-200',
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
