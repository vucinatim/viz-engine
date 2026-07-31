import { getRuntimeNodeInput, getRuntimeNodeOutput } from '@/lib/viz-session';
import { memo, useRef } from 'react';
import { useGraphLiveUpdate } from '../live-update';
import { prepareNodeCanvas, type NodeBodyProps } from './node-body';

// Visual body for HSL Color node showing color swatch and HSL values
const HSLColorBody = ({ id: nodeId }: NodeBodyProps) => {
  const getNodeInputValue = getRuntimeNodeInput;
  const getNodeOutput = getRuntimeNodeOutput;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);

  useGraphLiveUpdate(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const prepared = prepareNodeCanvas(canvas);
    if (!prepared) return;
    const { context: ctx, width: cssW, height: cssH } = prepared;

    // Get input values
    const h = Number(getNodeInputValue(nodeId, 'h')) || 0;
    const s = Math.max(
      0,
      Math.min(100, Number(getNodeInputValue(nodeId, 's')) || 0),
    );
    const l = Math.max(
      0,
      Math.min(100, Number(getNodeInputValue(nodeId, 'l')) || 0),
    );

    // Normalize hue
    const hue = ((h % 360) + 360) % 360;

    // Get output color
    const colorOutput = (getNodeOutput(nodeId)?.color as string) || '#000000';

    ctx.clearRect(0, 0, cssW, cssH);

    const barHeight = 10;
    const barY = 4;

    // Hue bar (full rainbow)
    const hueGrad = ctx.createLinearGradient(0, 0, cssW, 0);
    const hueStops = [0, 60, 120, 180, 240, 300, 360];
    for (const deg of hueStops) {
      hueGrad.addColorStop(deg / 360, `hsl(${deg}, 100%, 50%)`);
    }
    ctx.fillStyle = hueGrad;
    ctx.fillRect(0, barY, cssW, barHeight);

    // Hue indicator
    const hueX = (hue / 360) * cssW;
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hueX, barY);
    ctx.lineTo(hueX, barY + barHeight);
    ctx.stroke();
    // Dark outline for visibility
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(hueX, barY);
    ctx.lineTo(hueX, barY + barHeight);
    ctx.stroke();
    // White line on top
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hueX, barY);
    ctx.lineTo(hueX, barY + barHeight);
    ctx.stroke();

    // Draw color swatch at bottom
    const swatchY = barY + barHeight + 4;
    const swatchHeight = 32;

    // Checkerboard background for transparency
    const squareSize = 4;
    for (let y = swatchY; y < swatchY + swatchHeight; y += squareSize) {
      for (let x = 0; x < cssW; x += squareSize) {
        const isDark = (x / squareSize + y / squareSize) % 2 === 0;
        ctx.fillStyle = isDark ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)';
        ctx.fillRect(x, y, squareSize, squareSize);
      }
    }

    // Color swatch
    ctx.fillStyle = colorOutput;
    ctx.fillRect(0, swatchY, cssW, swatchHeight);

    // Border around swatch
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, swatchY + 0.5, cssW - 1, swatchHeight - 1);

    // Update info text with HSL values
    if (infoRef.current) {
      infoRef.current.textContent = `${Math.round(hue)}°, ${Math.round(s)}%, ${Math.round(l)}%`;
      infoRef.current.className =
        'pointer-events-none absolute right-1 bottom-1 rounded bg-zinc-900/80 px-1.5 py-0.5 text-[10px] font-mono text-zinc-100 backdrop-blur-sm';
    }
  });

  return (
    <div className="nodrag nopan relative h-[58px] w-[200px] flex-none overflow-hidden rounded">
      <canvas ref={canvasRef} className="h-full w-full" />
      <div ref={infoRef} />
    </div>
  );
};

export default memo(HSLColorBody);
