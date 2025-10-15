import { useNodeLiveValuesStore } from '@/lib/stores/node-live-values-store';
import { useNodeOutputCache } from '@/lib/stores/node-output-cache-store';
import { memo, useRef } from 'react';
import { useRafLoop } from 'react-use';
import { GraphNodeData } from '../node-network-store';

interface RGBColorBodyProps {
  id: string;
  data: GraphNodeData;
  selected: boolean;
  nodeNetworkId: string;
}

// Visual body for RGB Color node showing color swatch and RGB values
const RGBColorBody = ({ id: nodeId }: RGBColorBodyProps) => {
  const getNodeInputValue = useNodeLiveValuesStore((s) => s.getNodeInputValue);
  const getNodeOutput = useNodeOutputCache((s) => s.getNodeOutput);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);

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

    // Get input values
    const r = Math.max(
      0,
      Math.min(255, Math.round(Number(getNodeInputValue(nodeId, 'r')) || 0)),
    );
    const g = Math.max(
      0,
      Math.min(255, Math.round(Number(getNodeInputValue(nodeId, 'g')) || 0)),
    );
    const b = Math.max(
      0,
      Math.min(255, Math.round(Number(getNodeInputValue(nodeId, 'b')) || 0)),
    );

    // Get output color
    const colorOutput = (getNodeOutput(nodeId)?.color as string) || '#000000';

    ctx.clearRect(0, 0, cssW, cssH);

    // Draw RGB bars
    const barHeight = 8;
    const barSpacing = 2;
    const barY = 4;

    // Red bar
    const redGrad = ctx.createLinearGradient(0, 0, cssW, 0);
    redGrad.addColorStop(0, 'rgb(0,0,0)');
    redGrad.addColorStop(1, 'rgb(255,0,0)');
    ctx.fillStyle = redGrad;
    ctx.fillRect(0, barY, cssW, barHeight);
    // Red indicator
    const redX = (r / 255) * cssW;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(redX - 1, barY, 2, barHeight);

    // Green bar
    const greenGrad = ctx.createLinearGradient(0, 0, cssW, 0);
    greenGrad.addColorStop(0, 'rgb(0,0,0)');
    greenGrad.addColorStop(1, 'rgb(0,255,0)');
    ctx.fillStyle = greenGrad;
    ctx.fillRect(0, barY + barHeight + barSpacing, cssW, barHeight);
    // Green indicator
    const greenX = (g / 255) * cssW;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(greenX - 1, barY + barHeight + barSpacing, 2, barHeight);

    // Blue bar
    const blueGrad = ctx.createLinearGradient(0, 0, cssW, 0);
    blueGrad.addColorStop(0, 'rgb(0,0,0)');
    blueGrad.addColorStop(1, 'rgb(0,0,255)');
    ctx.fillStyle = blueGrad;
    ctx.fillRect(0, barY + (barHeight + barSpacing) * 2, cssW, barHeight);
    // Blue indicator
    const blueX = (b / 255) * cssW;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(blueX - 1, barY + (barHeight + barSpacing) * 2, 2, barHeight);

    // Draw color swatch at bottom
    const swatchY = barY + (barHeight + barSpacing) * 3 + 4;
    const swatchHeight = 24;

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

    // Update info text
    if (infoRef.current) {
      infoRef.current.textContent = `${r},${g},${b}`;
      infoRef.current.className =
        'pointer-events-none absolute right-1 bottom-1 rounded bg-zinc-900/80 px-1.5 py-0.5 text-[10px] font-mono text-zinc-100 backdrop-blur-sm';
    }
  });

  return (
    <div className="nodrag nopan relative h-[72px] w-[200px] flex-none overflow-hidden rounded">
      <canvas ref={canvasRef} className="h-full w-full" />
      <div ref={infoRef} />
    </div>
  );
};

export default memo(RGBColorBody);
