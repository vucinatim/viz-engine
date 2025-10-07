import { useNodeOutputCache } from '@/lib/stores/node-output-cache-store';
import { cn } from '@/lib/utils';
import { memo, useRef } from 'react';
import { useRafLoop } from 'react-use';
import { GraphNodeData } from '../node-network-store';

interface SpectralCentroidBodyProps {
  id: string;
  data: GraphNodeData;
  selected: boolean;
  nodeNetworkId: string;
}

const SpectralCentroidBody = ({ id: nodeId }: SpectralCentroidBodyProps) => {
  const getNodeOutput = useNodeOutputCache((s) => s.getNodeOutput);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const centroidTextRef = useRef<HTMLDivElement>(null);
  const centroidRing = useRef<number[]>([]);
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

    // Read outputs
    const output = getNodeOutput(nodeId);
    const centroid = Number(output?.centroid ?? 0);
    const normalized = Number(output?.normalized ?? 0);

    // Maintain centroid history
    centroidRing.current.push(centroid);
    if (centroidRing.current.length > capacity) centroidRing.current.shift();

    // Clear
    ctx.clearRect(0, 0, cssW, cssH);

    // Background with gradient (bass = blue, treble = red)
    const bgGradient = ctx.createLinearGradient(0, 0, 0, cssH);
    bgGradient.addColorStop(0, 'rgba(239,68,68,0.1)'); // Red (highs)
    bgGradient.addColorStop(0.5, 'rgba(168,85,247,0.1)'); // Purple (mids)
    bgGradient.addColorStop(1, 'rgba(59,130,246,0.1)'); // Blue (bass)
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, cssW, cssH);

    // Draw frequency range markers
    const drawMarker = (hz: number, label: string, color: string) => {
      const minFreq = 200;
      const maxFreq = 4000;
      const normalized = (hz - minFreq) / (maxFreq - minFreq);
      const y = cssH - normalized * cssH;

      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cssW, y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = color;
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(label, 4, y - 2);
    };

    drawMarker(500, 'Bass', 'rgba(59,130,246,0.4)');
    drawMarker(1500, 'Mids', 'rgba(168,85,247,0.4)');
    drawMarker(3000, 'Highs', 'rgba(239,68,68,0.4)');

    // Draw centroid waveform with color gradient based on frequency
    if (centroidRing.current.length >= 2) {
      const minFreq = 200;
      const maxFreq = 4000;

      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const stepX = cssW / Math.max(1, capacity - 1);

      for (let i = 0; i < centroidRing.current.length; i++) {
        const x = i * stepX;
        const freq = centroidRing.current[i];
        const normalizedFreq = Math.max(
          0,
          Math.min(1, (freq - minFreq) / (maxFreq - minFreq)),
        );
        const y = cssH - normalizedFreq * cssH;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      // Gradient stroke from blue (bass) to red (treble)
      const gradient = ctx.createLinearGradient(0, cssH, 0, 0);
      gradient.addColorStop(0, 'rgba(59,130,246,0.9)'); // Blue at bottom (bass)
      gradient.addColorStop(0.5, 'rgba(168,85,247,0.9)'); // Purple in middle
      gradient.addColorStop(1, 'rgba(239,68,68,0.9)'); // Red at top (treble)
      ctx.strokeStyle = gradient;
      ctx.stroke();
    }

    // Update centroid text with color
    if (centroidTextRef.current) {
      const hue = normalized * 240; // 240 (blue) to 0 (red)
      centroidTextRef.current.innerHTML = `
        <div class="text-lg font-bold font-mono" style="color: hsl(${240 - hue}, 80%, 65%)">
          ${centroid.toFixed(0)} Hz
        </div>
        <div class="text-[9px] text-zinc-400 mt-0.5">
          ${centroid < 800 ? 'Bass' : centroid < 2000 ? 'Mids' : 'Highs'}
        </div>
      `;
      centroidTextRef.current.className = cn(
        'pointer-events-none absolute right-2 top-2 flex flex-col items-end rounded bg-zinc-900/90 px-2 py-1',
      );
    }
  });

  return (
    <div className="nodrag nopan relative h-24 w-[240px] flex-none overflow-hidden rounded border border-zinc-700">
      <canvas ref={canvasRef} className="h-full w-full" />
      <div ref={centroidTextRef} />
      <div className="pointer-events-none absolute bottom-1 left-2 text-[9px] text-zinc-500">
        Spectral Centroid
      </div>
    </div>
  );
};

export default memo(SpectralCentroidBody);
