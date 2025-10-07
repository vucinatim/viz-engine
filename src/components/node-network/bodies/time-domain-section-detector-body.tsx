import { useNodeOutputCache } from '@/lib/stores/node-output-cache-store';
import { cn } from '@/lib/utils';
import { memo, useRef } from 'react';
import { useRafLoop } from 'react-use';
import { GraphNodeData } from '../node-network-store';

interface TimeDomainSectionDetectorBodyProps {
  id: string;
  data: GraphNodeData;
  selected: boolean;
  nodeNetworkId: string;
}

const TimeDomainSectionDetectorBody = ({
  id: nodeId,
}: TimeDomainSectionDetectorBodyProps) => {
  const getNodeOutput = useNodeOutputCache((s) => s.getNodeOutput);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const triggerIndicatorRef = useRef<HTMLDivElement>(null);
  const statsTextRef = useRef<HTMLDivElement>(null);
  const differenceRing = useRef<number[]>([]);
  const capacity = 120;
  const peakRef = useRef<number>(1);

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

    // Read outputs
    const output = getNodeOutput(nodeId);
    const trigger = Number(output?.trigger ?? 0);
    const difference = Number(output?.difference ?? 0);
    const threshold = Number(output?.threshold ?? 0);

    // Maintain difference history
    differenceRing.current.push(difference);
    if (differenceRing.current.length > capacity)
      differenceRing.current.shift();

    // Update dynamic peak
    const currentMax = Math.max(
      1,
      ...differenceRing.current,
      difference,
      threshold,
    );
    const decay = 0.98;
    peakRef.current = Math.max(currentMax, peakRef.current * decay);

    // Clear
    ctx.clearRect(0, 0, cssW, cssH);

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, cssW, cssH);

    // Draw adaptive threshold line (orange)
    if (threshold > 0) {
      const thresholdY = cssH - (threshold / peakRef.current) * cssH;
      ctx.strokeStyle = 'rgba(251,146,60,0.9)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, thresholdY);
      ctx.lineTo(cssW, thresholdY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw difference waveform (green, with area above threshold highlighted)
    if (differenceRing.current.length >= 2) {
      ctx.strokeStyle = 'rgba(34,197,94,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const stepX = cssW / Math.max(1, capacity - 1);
      for (let i = 0; i < differenceRing.current.length; i++) {
        const x = i * stepX;
        const v = Math.max(
          0,
          Math.min(1, differenceRing.current[i] / peakRef.current),
        );
        const y = cssH - v * cssH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Fill area under curve with gradient (more intense when above threshold)
      const gradient = ctx.createLinearGradient(0, 0, 0, cssH);
      gradient.addColorStop(0, 'rgba(34,197,94,0.3)');
      gradient.addColorStop(1, 'rgba(34,197,94,0.05)');
      ctx.lineTo(cssW, cssH);
      ctx.lineTo(0, cssH);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // Draw baseline
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cssH - 0.5);
    ctx.lineTo(cssW, cssH - 0.5);
    ctx.stroke();

    // Update trigger indicator
    if (triggerIndicatorRef.current) {
      if (trigger > 0.5) {
        triggerIndicatorRef.current.className =
          'absolute left-2 top-2 h-3 w-3 rounded-full bg-red-500 animate-pulse shadow-lg shadow-red-500/50';
      } else {
        triggerIndicatorRef.current.className =
          'absolute left-2 top-2 h-3 w-3 rounded-full bg-zinc-600';
      }
    }

    // Update stats text - show both difference and threshold
    if (statsTextRef.current) {
      const diffAboveThreshold = difference > threshold;
      statsTextRef.current.innerHTML = `
        <div class="text-[10px] font-mono ${diffAboveThreshold ? 'text-red-400 font-bold' : 'text-green-400'}">
          Δ: ${difference.toFixed(2)}
        </div>
        <div class="text-[9px] font-mono text-orange-400">
          T: ${threshold.toFixed(2)}
        </div>
      `;
      statsTextRef.current.className = cn(
        'pointer-events-none absolute right-2 top-2 flex flex-col items-end gap-0.5 rounded bg-zinc-800/90 px-2 py-1',
      );
    }
  });

  return (
    <div className="nodrag nopan relative h-20 w-[260px] flex-none overflow-hidden rounded border border-zinc-700">
      <canvas ref={canvasRef} className="h-full w-full" />
      <div ref={triggerIndicatorRef} />
      <div ref={statsTextRef} />
      <div className="pointer-events-none absolute bottom-1 left-2 text-[9px] text-zinc-500">
        Adaptive Section Detector
      </div>
    </div>
  );
};

export default memo(TimeDomainSectionDetectorBody);
