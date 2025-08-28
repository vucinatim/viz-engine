import { useNodeOutputCache } from '@/lib/stores/node-output-cache-store';
import { cn } from '@/lib/utils';
import { memo, useCallback, useRef } from 'react';
import { useRafLoop } from 'react-use';
import { GraphNodeData, useNodeNetwork } from '../node-network-store';

interface SpectralFluxBodyProps {
  id: string;
  data: GraphNodeData;
  selected: boolean;
  nodeNetworkId: string;
}

const SpectralFluxBody = ({
  id: nodeId,
  nodeNetworkId,
  data,
}: SpectralFluxBodyProps) => {
  const { edges } = useNodeNetwork(nodeNetworkId);
  const { getNodeOutput } = useNodeOutputCache.getState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevDataRef = useRef<Uint8Array | null>(null);
  const fluxRef = useRef<HTMLDivElement>(null);
  const rollingMaxDiffRef = useRef<number>(32); // adaptive gain base

  const getInputValue = useCallback(
    (inputId: string) => {
      const edge = edges.find(
        (e) => e.target === nodeId && e.targetHandle === inputId,
      );
      if (edge?.source) {
        const srcOut = getNodeOutput(edge.source);
        if (edge.sourceHandle && srcOut) return srcOut[edge.sourceHandle];
        return srcOut;
      }
      return data.inputValues[inputId];
    },
    [edges, nodeId, data.inputValues, getNodeOutput],
  );

  useRafLoop(() => {
    const dataArr = getInputValue('data') as Uint8Array | undefined;
    const canvas = canvasRef.current;
    if (!canvas || !dataArr) return;

    // HiDPI-aware sizing
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
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const bins = dataArr.length;
    if (bins === 0) return;
    const barW = Math.max(1, Math.floor(cssW / Math.max(1, bins)));

    // Draw current spectrum
    for (let i = 0; i < bins; i++) {
      const v = dataArr[i] / 255;
      const h = v * cssH;
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(i * barW, cssH - h, Math.max(1, barW - 1), h);
    }

    // Highlight positive diffs
    const prev = prevDataRef.current;
    if (prev && prev.length === bins) {
      // Track the largest positive diff this frame
      let frameMax = 0;
      for (let i = 0; i < bins; i++) {
        const diff = dataArr[i] - prev[i];
        if (diff > 0) frameMax = Math.max(frameMax, diff);
      }
      // Decay rolling max to adapt quickly but not flicker
      rollingMaxDiffRef.current = Math.max(
        1,
        Math.max(frameMax, rollingMaxDiffRef.current * 0.98),
      );
      const gain = rollingMaxDiffRef.current;
      for (let i = 0; i < bins; i++) {
        const diff = dataArr[i] - prev[i];
        if (diff <= 0) continue;
        const v = Math.min(1, diff / gain);
        const h = v * cssH;
        ctx.fillStyle = 'rgba(239,68,68,0.85)';
        ctx.fillRect(i * barW, cssH - h, Math.max(1, barW - 1), h);
      }
    }
    prevDataRef.current = new Uint8Array(dataArr);

    const flux = (getNodeOutput(nodeId)?.flux as number) ?? 0;
    if (fluxRef.current) {
      fluxRef.current.textContent = flux.toFixed(1);
      fluxRef.current.className = cn(
        'pointer-events-none absolute right-1 top-1 rounded bg-zinc-800/70 px-1 text-[10px] text-zinc-200',
      );
    }
  });

  return (
    <div className="nodrag nopan relative h-16 w-[200px] flex-none overflow-hidden rounded">
      <canvas ref={canvasRef} className="h-full w-full" />
      <div ref={fluxRef} />
    </div>
  );
};

export default memo(SpectralFluxBody);
