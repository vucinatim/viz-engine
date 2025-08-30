import { useNodeLiveValuesStore } from '@/lib/stores/node-live-values-store';
import { useNodeOutputCache } from '@/lib/stores/node-output-cache-store';
import { cn } from '@/lib/utils';
import { memo, useRef } from 'react';
import { useRafLoop } from 'react-use';
import { GraphNodeData } from '../node-network-store';

interface HarmonicPresenceBodyProps {
  id: string;
  data: GraphNodeData;
  selected: boolean;
  nodeNetworkId: string;
}

// Visual body for Harmonic Presence
// Top: band-limited spectrum with harmonic overlays (fundamental and multiples)
// Bottom: presence sparkline and quick stats
const HarmonicPresenceBody = ({ id: nodeId }: HarmonicPresenceBodyProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const presenceRing = useRef<number[]>([]);
  const capacity = 160;

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

    // Inputs (live)
    const data = (getNodeInputValue(nodeId, 'data') as Uint8Array) || undefined;
    const bandStartBin =
      Number(getNodeInputValue(nodeId, 'bandStartBin') ?? 0) || 0;
    const frequencyPerBin =
      Number(getNodeInputValue(nodeId, 'frequencyPerBin') ?? 0) || 0;
    const toleranceCents =
      Number(getNodeInputValue(nodeId, 'toleranceCents') ?? 35) || 35;
    const maxHarmonics = Math.max(
      1,
      Math.floor(Number(getNodeInputValue(nodeId, 'maxHarmonics') ?? 8) || 8),
    );

    // Outputs
    const outputs = getNodeOutput(nodeId) as any;
    const presence = Number(outputs?.presence ?? 0) || 0;
    const f0 = Number(outputs?.fundamentalHz ?? 0) || 0;

    presenceRing.current.push(presence);
    if (presenceRing.current.length > capacity) presenceRing.current.shift();

    // Layout: top spectrum (65%), bottom sparkline (35%)
    const topH = Math.floor(cssH * 0.65);
    const botY = topH + 1;
    const botH = cssH - botY;

    // Clear
    ctx.clearRect(0, 0, cssW, cssH);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, topH + 0.5);
    ctx.lineTo(cssW, topH + 0.5);
    ctx.moveTo(0, cssH - 0.5);
    ctx.lineTo(cssW, cssH - 0.5);
    ctx.stroke();

    // --- Top: band spectrum ---
    if (data && data.length > 0) {
      const n = data.length;
      const barW = Math.max(1, cssW / n);
      for (let i = 0; i < n; i++) {
        const v = data[i] / 255;
        const h = v * topH;
        const x = i * barW;
        const y = topH - h;
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.fillRect(x, y, Math.ceil(barW), h);
      }

      // Harmonic overlays if we have f0 and bin metadata
      if (f0 > 0 && frequencyPerBin > 0) {
        const tolRatio = Math.pow(2, toleranceCents / 1200) - 1;
        for (let k = 1; k <= maxHarmonics; k++) {
          const centerHz = f0 * k;
          const absoluteCenterBin = centerHz / frequencyPerBin;
          const localCenter = absoluteCenterBin - bandStartBin;
          const center = Math.round(localCenter);
          if (center < 0 || center >= n) continue;
          const halfBins = Math.max(1, Math.ceil(center * tolRatio));
          const lo = Math.max(0, center - halfBins);
          const hi = Math.min(n - 1, center + halfBins);
          const xLo = (lo / n) * cssW;
          const xHi = ((hi + 1) / n) * cssW;
          // Window highlight
          ctx.fillStyle = 'rgba(99,102,241,0.20)';
          ctx.fillRect(xLo, 0, xHi - xLo, topH);
          // Center line
          ctx.strokeStyle = 'rgba(99,102,241,0.9)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          const xC = (center / n) * cssW + 0.5;
          ctx.moveTo(xC, 0);
          ctx.lineTo(xC, topH);
          ctx.stroke();
        }
      }
    }

    // --- Bottom: presence sparkline ---
    if (presenceRing.current.length > 1) {
      ctx.strokeStyle = 'rgba(34,197,94,0.95)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const stepX = cssW / Math.max(1, capacity - 1);
      for (let i = 0; i < presenceRing.current.length; i++) {
        const x = i * stepX;
        const y =
          botY + (1 - Math.max(0, Math.min(1, presenceRing.current[i]))) * botH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Presence bar and labels (bottom-left)
    const barW = 8;
    const barH = Math.max(2, Math.min(botH - 4, presence * botH));
    ctx.fillStyle = 'rgba(34,197,94,0.9)';
    ctx.fillRect(4, botY + botH - barH, barW, barH);

    // Info badge
    if (infoRef.current) {
      const f0Str = f0 > 0 ? `${Math.round(f0)}Hz` : '—';
      infoRef.current.textContent = `pres ${presence.toFixed(2)}  f0 ${f0Str}`;
      infoRef.current.className = cn(
        'pointer-events-none absolute right-1 top-1 rounded bg-zinc-800/70 px-1 text-[10px] text-zinc-200',
      );
    }
  });

  return (
    <div className="nodrag nopan relative h-24 w-[260px] overflow-hidden rounded">
      <canvas ref={canvasRef} className="h-full w-full" />
      <div ref={infoRef} />
    </div>
  );
};

export default memo(HarmonicPresenceBody);
