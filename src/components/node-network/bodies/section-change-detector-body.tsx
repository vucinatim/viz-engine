import { useNodeOutputCache } from '@/lib/stores/node-output-cache-store';
import { memo, useRef } from 'react';
import { useRafLoop } from 'react-use';
import { GraphNodeData } from '../node-network-store';

interface SectionChangeDetectorBodyProps {
  id: string;
  data: GraphNodeData;
  selected: boolean;
  nodeNetworkId: string;
}

const SectionChangeDetectorBody = ({
  id: nodeId,
  data,
}: SectionChangeDetectorBodyProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const valueHistoryRef = useRef<number[]>([]);
  const changeHistoryRef = useRef<number[]>([]);
  const triggerFlashRef = useRef(0);
  const statsTextRef = useRef<HTMLDivElement>(null);
  const capacity = 90;

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

    // Read outputs and inputs
    const output = getNodeOutput(nodeId);
    const trigger = Number(output?.trigger ?? 0);
    const cooldownActive = Number(output?.cooldownActive ?? 0);
    const change = Number(output?.change ?? 0);
    const inputValue = Number(data.inputValues.flux ?? 0);
    const threshold = Number(data.inputValues.threshold ?? 0.5);

    // Track trigger flash
    if (trigger > 0.5) {
      triggerFlashRef.current = 1;
    } else {
      triggerFlashRef.current = Math.max(0, triggerFlashRef.current - 0.08);
    }

    // Maintain value history
    valueHistoryRef.current.push(inputValue);
    if (valueHistoryRef.current.length > capacity) {
      valueHistoryRef.current.shift();
    }

    // Maintain change history
    changeHistoryRef.current.push(change);
    if (changeHistoryRef.current.length > capacity) {
      changeHistoryRef.current.shift();
    }

    // Clear
    ctx.clearRect(0, 0, cssW, cssH);

    // Background
    ctx.fillStyle =
      cooldownActive > 0.5 ? 'rgba(100,40,0,0.3)' : 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, cssW, cssH);

    // Draw threshold line
    const thresholdY = cssH - threshold * cssH;
    ctx.strokeStyle = 'rgba(251,146,60,0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, thresholdY);
    ctx.lineTo(cssW, thresholdY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw threshold label
    ctx.fillStyle = 'rgba(251,146,60,0.9)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`T: ${threshold.toFixed(2)}`, cssW - 4, thresholdY - 4);

    // Draw value waveform (input value - faded)
    if (valueHistoryRef.current.length >= 2) {
      ctx.strokeStyle =
        cooldownActive > 0.5 ? 'rgba(200,100,50,0.3)' : 'rgba(59,130,246,0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const stepX = cssW / Math.max(1, capacity - 1);

      for (let i = 0; i < valueHistoryRef.current.length; i++) {
        const x = i * stepX;
        const val = Math.max(0, Math.min(1, valueHistoryRef.current[i]));
        const y = cssH - val * cssH;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    // Draw change waveform (frame-to-frame difference - bright, main focus)
    if (changeHistoryRef.current.length >= 2) {
      ctx.strokeStyle =
        cooldownActive > 0.5 ? 'rgba(251,146,60,0.9)' : 'rgba(34,197,94,0.9)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const stepX = cssW / Math.max(1, capacity - 1);

      for (let i = 0; i < changeHistoryRef.current.length; i++) {
        const x = i * stepX;
        const val = Math.max(0, Math.min(1, changeHistoryRef.current[i]));
        const y = cssH - val * cssH;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    // Draw trigger flash indicator (big pulse)
    if (triggerFlashRef.current > 0) {
      const alpha = triggerFlashRef.current;
      const size = 30 + (1 - alpha) * 20;

      ctx.fillStyle = `rgba(239,68,68,${alpha * 0.8})`;
      ctx.beginPath();
      ctx.arc(cssW / 2, cssH / 2, size, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', cssW / 2, cssH / 2);
    }

    // Update stats text
    if (statsTextRef.current) {
      const changeColor =
        change > threshold ? 'text-red-400' : 'text-green-400';
      statsTextRef.current.innerHTML = `
        <div class="text-[10px] text-blue-400/60 font-mono">
          Val: ${inputValue.toFixed(3)}
        </div>
        <div class="text-xs font-mono ${changeColor} font-bold">
          Δ: ${change.toFixed(3)}
        </div>
        <div class="text-[9px] text-zinc-500 mt-0.5">
          ${cooldownActive > 0.5 ? 'COOLDOWN' : 'Ready'}
        </div>
      `;
    }
  });

  return (
    <div className="nodrag nopan relative h-24 w-[260px] flex-none overflow-hidden rounded border border-zinc-700">
      <canvas ref={canvasRef} className="h-full w-full" />
      <div
        ref={statsTextRef}
        className="pointer-events-none absolute right-2 top-2 flex flex-col items-end rounded bg-zinc-900/90 px-2 py-1"
      />
      <div className="pointer-events-none absolute bottom-1 left-2 text-[9px] text-zinc-500">
        Section Detector
      </div>
    </div>
  );
};

export default memo(SectionChangeDetectorBody);
