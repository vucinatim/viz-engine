import { useNodeLiveValuesStore } from '@/lib/stores/node-live-values-store';
import { useNodeOutputCache } from '@/lib/stores/node-output-cache-store';
import { cn } from '@/lib/utils';
import { memo, useRef } from 'react';
import { useRafLoop } from 'react-use';
import { GraphNodeData } from '../node-network-store';

interface TonalPresenceBodyProps {
  id: string;
  data: GraphNodeData;
  selected: boolean;
  nodeNetworkId: string;
}

// Visual body for Tonal Presence
// Shows: bar for peak, bar for (1 - flatness), and their product (presence) over time as a sparkline.
const TonalPresenceBody = ({ id: nodeId }: TonalPresenceBodyProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const presenceRing = useRef<number[]>([]);
  const capacity = 160;

  const { getNodeOutput } = useNodeOutputCache.getState();
  const { getNodeInputValue } = useNodeLiveValuesStore.getState();

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

    const outputs = getNodeOutput(nodeId) as any;
    const peak = Number(outputs?.peak ?? 0) || 0;
    const flatness = Number(outputs?.flatness ?? 1);
    const presence = Number(outputs?.presence ?? 0) || 0;
    const cutoff = Number(getNodeInputValue(nodeId, 'flatnessCutoff') ?? 0.6);

    presenceRing.current.push(presence);
    if (presenceRing.current.length > capacity) presenceRing.current.shift();

    // Clear
    ctx.clearRect(0, 0, cssW, cssH);

    // Grid baseline
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cssH - 0.5);
    ctx.lineTo(cssW, cssH - 0.5);
    ctx.stroke();

    // Bars (left to right): Peak (blue), Tonality (1-flatness) (pink), Presence (green)
    const pad = 6;
    const barW = (cssW - pad * 4) / 3;
    const drawBar = (x: number, value01: number, color: string) => {
      const v = Math.max(0, Math.min(1, value01));
      const h = v * (cssH - 2);
      const y = cssH - h;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, barW, h);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font =
        '10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(v.toFixed(2), x + barW / 2, 2);
    };

    drawBar(pad, peak, 'rgba(59,130,246,0.9)'); // blue
    const tonal = Math.max(0, Math.min(1, 1 - flatness));
    drawBar(pad * 2 + barW, tonal, 'rgba(236,72,153,0.95)'); // pink
    drawBar(pad * 3 + barW * 2, presence, 'rgba(34,197,94,0.95)'); // green

    // Presence sparkline
    if (presenceRing.current.length > 1) {
      ctx.strokeStyle = 'rgba(34,197,94,0.9)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const stepX = cssW / Math.max(1, capacity - 1);
      for (let i = 0; i < presenceRing.current.length; i++) {
        const x = i * stepX;
        const y =
          cssH - Math.max(0, Math.min(1, presenceRing.current[i])) * cssH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Cutoff line (horizontal across the (1-flatness) bar height)
    const cutoffY = cssH - Math.max(0, Math.min(1, 1 - cutoff)) * cssH;
    ctx.strokeStyle = 'rgba(236,72,153,0.5)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(pad * 2 + barW, cutoffY + 0.5);
    ctx.lineTo(pad * 3 + barW * 2, cutoffY + 0.5);
    ctx.stroke();
    ctx.setLineDash([]);

    if (infoRef.current) {
      infoRef.current.textContent = `peak ${peak.toFixed(2)}  flat ${flatness.toFixed(
        2,
      )}  pres ${presence.toFixed(2)}`;
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

export default memo(TonalPresenceBody);
