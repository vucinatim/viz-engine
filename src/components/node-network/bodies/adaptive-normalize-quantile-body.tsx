import { useNodeLiveValuesStore } from '@/lib/stores/node-live-values-store';
import { useNodeOutputCache } from '@/lib/stores/node-output-cache-store';
import { cn } from '@/lib/utils';
import { memo, useRef } from 'react';
import { useRafLoop } from 'react-use';
import { GraphNodeData } from '../node-network-store';

interface AdaptiveNormalizeQuantileBodyProps {
  id: string;
  data: GraphNodeData;
  selected: boolean;
  nodeNetworkId: string;
}

// Visual body for Adaptive Normalize (Quantile)
// Shows: raw input sparkline, shaded quantile band (mapped to local view), and normalized output sparkline.
const AdaptiveNormalizeQuantileBody = ({
  id: nodeId,
}: AdaptiveNormalizeQuantileBodyProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const rawRing = useRef<number[]>([]);
  const normRing = useRef<number[]>([]);
  const capacity = 160;

  const getNodeInputValue = useNodeLiveValuesStore((s) => s.getNodeInputValue);
  const getNodeOutput = useNodeOutputCache((s) => s.getNodeOutput);

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

    // Live values
    const raw = Number(getNodeInputValue(nodeId, 'value')) || 0;
    const outputs = getNodeOutput(nodeId) as any;
    const norm = Number(outputs?.result ?? 0) || 0;
    const low = Number(outputs?.low ?? 0) || 0;
    const high = Number(outputs?.high ?? 1) || 1;

    // Maintain rings
    rawRing.current.push(raw);
    normRing.current.push(norm);
    if (rawRing.current.length > capacity) rawRing.current.shift();
    if (normRing.current.length > capacity) normRing.current.shift();

    // Compute local view scaling for raw axis
    let viewMin = Infinity;
    let viewMax = -Infinity;
    for (let i = 0; i < rawRing.current.length; i++) {
      const v = rawRing.current[i];
      if (v < viewMin) viewMin = v;
      if (v > viewMax) viewMax = v;
    }
    if (!isFinite(viewMin)) viewMin = 0;
    if (!isFinite(viewMax)) viewMax = 1;
    if (viewMax - viewMin < 1e-9) {
      // Avoid zero range; expand slightly around value
      viewMin -= 0.5;
      viewMax += 0.5;
    }

    const toYRaw = (v: number) => {
      const n = (v - viewMin) / (viewMax - viewMin);
      const clamped = Math.max(0, Math.min(1, n));
      return cssH - clamped * cssH;
    };
    const toYNorm = (v01: number) => {
      const clamped = Math.max(0, Math.min(1, v01));
      return cssH - clamped * cssH;
    };

    // Clear
    ctx.clearRect(0, 0, cssW, cssH);

    // Grid baseline
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cssH - 0.5);
    ctx.lineTo(cssW, cssH - 0.5);
    ctx.stroke();

    // Draw quantile band mapped to local raw scale
    const yLow = toYRaw(low);
    const yHigh = toYRaw(high);
    const top = Math.min(yLow, yHigh);
    const height = Math.abs(yHigh - yLow);
    ctx.fillStyle = 'rgba(99,102,241,0.20)'; // indigo band
    ctx.fillRect(0, top, cssW, height);
    // Band borders (top and bottom)
    ctx.strokeStyle = 'rgba(99,102,241,0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, yLow + 0.5);
    ctx.lineTo(cssW, yLow + 0.5);
    ctx.moveTo(0, yHigh + 0.5);
    ctx.lineTo(cssW, yHigh + 0.5);
    ctx.stroke();

    // Draw raw series (mapped to local view)
    if (rawRing.current.length > 1) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      const stepX = cssW / Math.max(1, capacity - 1);
      for (let i = 0; i < rawRing.current.length; i++) {
        const x = i * stepX;
        const y = toYRaw(rawRing.current[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Draw normalized output series (0..1 axis)
    if (normRing.current.length > 1) {
      ctx.strokeStyle = 'rgba(34,197,94,0.95)'; // green
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const stepX = cssW / Math.max(1, capacity - 1);
      for (let i = 0; i < normRing.current.length; i++) {
        const x = i * stepX;
        const y = toYNorm(normRing.current[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Info badge
    if (infoRef.current) {
      infoRef.current.textContent = `low ${low.toFixed(2)}  high ${high.toFixed(
        2,
      )}  out ${norm.toFixed(2)}`;
      infoRef.current.className = cn(
        'pointer-events-none absolute right-1 top-1 rounded bg-zinc-800/70 px-1 text-[10px] text-zinc-200',
      );
    }
  });

  return (
    <div className="nodrag nopan relative h-20 w-[220px] overflow-hidden rounded">
      <canvas ref={canvasRef} className="h-full w-full" />
      <div ref={infoRef} />
    </div>
  );
};

export default memo(AdaptiveNormalizeQuantileBody);
