import { useNodeOutputCache } from '@/lib/stores/node-output-cache-store';
import { memo, useRef } from 'react';
import { useRafLoop } from 'react-use';
import { GraphNodeData } from '../node-network-store';

interface MultiBandAnalysisBodyProps {
  id: string;
  data: GraphNodeData;
  selected: boolean;
  nodeNetworkId: string;
}

const MultiBandAnalysisBody = ({ id: nodeId }: MultiBandAnalysisBodyProps) => {
  const getNodeOutput = useNodeOutputCache((s) => s.getNodeOutput);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bassHistoryRef = useRef<number[]>([]);
  const midHistoryRef = useRef<number[]>([]);
  const highHistoryRef = useRef<number[]>([]);
  const capacity = 60;

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
    const bassPercent = Number(output?.bassPercent ?? 0);
    const midPercent = Number(output?.midPercent ?? 0);
    const highPercent = Number(output?.highPercent ?? 0);

    // Maintain history
    bassHistoryRef.current.push(bassPercent);
    midHistoryRef.current.push(midPercent);
    highHistoryRef.current.push(highPercent);
    if (bassHistoryRef.current.length > capacity)
      bassHistoryRef.current.shift();
    if (midHistoryRef.current.length > capacity) midHistoryRef.current.shift();
    if (highHistoryRef.current.length > capacity)
      highHistoryRef.current.shift();

    // Clear
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, cssW, cssH);

    // Draw stacked bar chart on the left
    const barW = 40;
    const barX = 8;
    const barH = cssH - 40;
    const barY = 20;

    // Draw background bar
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(barX, barY, barW, barH);

    // Draw stacked percentages (from bottom to top: bass, mid, high)
    let currentY = barY + barH;

    // Bass (blue) - bottom
    const bassHeight = barH * bassPercent;
    currentY -= bassHeight;
    ctx.fillStyle = 'rgba(59,130,246,0.8)';
    ctx.fillRect(barX, currentY, barW, bassHeight);

    // Mid (purple) - middle
    const midHeight = barH * midPercent;
    currentY -= midHeight;
    ctx.fillStyle = 'rgba(168,85,247,0.8)';
    ctx.fillRect(barX, currentY, barW, midHeight);

    // High (red) - top
    const highHeight = barH * highPercent;
    currentY -= highHeight;
    ctx.fillStyle = 'rgba(239,68,68,0.8)';
    ctx.fillRect(barX, currentY, barW, highHeight);

    // Draw border
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    // Draw waveforms on the right
    const waveX = barX + barW + 12;
    const waveW = cssW - waveX - 8;
    const waveH = (cssH - 24) / 3;
    const gap = 4;

    const drawWaveform = (
      history: number[],
      y: number,
      color: string,
      label: string,
      percent: number,
    ) => {
      // Background
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(waveX, y, waveW, waveH);

      // Waveform
      if (history.length >= 2) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        const stepX = waveW / Math.max(1, capacity - 1);
        for (let i = 0; i < history.length; i++) {
          const x = waveX + i * stepX;
          const val = history[i];
          const waveY = y + waveH - val * waveH;
          if (i === 0) {
            ctx.moveTo(x, waveY);
          } else {
            ctx.lineTo(x, waveY);
          }
        }
        ctx.stroke();
      }

      // Label and percentage
      ctx.fillStyle = color;
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(label, waveX + 4, y + 12);

      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${(percent * 100).toFixed(0)}%`, waveX + waveW - 4, y + 12);

      // Border
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(waveX, y, waveW, waveH);
    };

    drawWaveform(
      highHistoryRef.current,
      8,
      'rgba(239,68,68,0.9)',
      'High',
      highPercent,
    );
    drawWaveform(
      midHistoryRef.current,
      8 + waveH + gap,
      'rgba(168,85,247,0.9)',
      'Mid',
      midPercent,
    );
    drawWaveform(
      bassHistoryRef.current,
      8 + (waveH + gap) * 2,
      'rgba(59,130,246,0.9)',
      'Bass',
      bassPercent,
    );
  });

  return (
    <div className="nodrag nopan relative h-32 w-[280px] flex-none overflow-hidden rounded border border-zinc-700">
      <canvas ref={canvasRef} className="h-full w-full" />
      <div className="pointer-events-none absolute bottom-1 left-2 text-[9px] text-zinc-500">
        Multi-Band
      </div>
    </div>
  );
};

export default memo(MultiBandAnalysisBody);
