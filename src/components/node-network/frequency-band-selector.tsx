import { useNodeLiveValuesStore } from '@/lib/stores/node-live-values-store';
import { useNodeOutputCache } from '@/lib/stores/node-output-cache-store';
import { cn } from '@/lib/utils';
import { D3DragEvent, drag } from 'd3-drag';
import { select } from 'd3-selection';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { useRafLoop } from 'react-use';
import { GraphNodeData, useNodeNetwork } from './node-network-store';

type DragEvent = D3DragEvent<HTMLDivElement, unknown, unknown>;

const MIN_FREQ = 20;
const MAX_FREQ = 20000;
const MIN_LOG_FREQ = Math.log(MIN_FREQ);
const MAX_LOG_FREQ = Math.log(MAX_FREQ);

interface FrequencyBandSelectorProps {
  id: string;
  data: GraphNodeData;
  selected: boolean;
  nodeNetworkId: string;
}

const FrequencyBandSelector = ({
  id: nodeId,
  data,
  nodeNetworkId,
}: FrequencyBandSelectorProps) => {
  const { getNodeOutput } = useNodeOutputCache.getState();
  const { getNodeInputValue: getLiveNodeValue } =
    useNodeLiveValuesStore.getState();
  const { edges, updateInputValue } = useNodeNetwork(nodeNetworkId);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startHandleRef = useRef<HTMLDivElement>(null);
  const endHandleRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const { startFrequency, endFrequency } = data.inputValues;

  const getInputValue = useCallback(
    (inputId: string) => {
      const edge = edges.find(
        (e) => e.target === nodeId && e.targetHandle === inputId,
      );
      if (edge?.source) {
        const sourceNodeOutput = getNodeOutput(edge.source);
        if (edge.sourceHandle && sourceNodeOutput) {
          return sourceNodeOutput[edge.sourceHandle];
        }
        return sourceNodeOutput;
      }
      return data.inputValues[inputId];
    },
    [edges, nodeId, data.inputValues, getNodeOutput],
  );

  const freqToLogPercent = useCallback((freq: number) => {
    if (freq <= MIN_FREQ) return 0;
    if (freq >= MAX_FREQ) return 100;
    return (
      ((Math.log(freq) - MIN_LOG_FREQ) / (MAX_LOG_FREQ - MIN_LOG_FREQ)) * 100
    );
  }, []);

  const xToLogFreq = useCallback((x: number, width: number) => {
    const percent = x / width;
    const logFreq = MIN_LOG_FREQ + percent * (MAX_LOG_FREQ - MIN_LOG_FREQ);
    return Math.exp(logFreq);
  }, []);

  useEffect(() => {
    const width = canvasRef.current?.getBoundingClientRect().width ?? 0;

    const setupDrag = (
      handleRef: React.RefObject<HTMLDivElement>,
      inputId: 'startFrequency' | 'endFrequency',
    ) => {
      if (handleRef.current) {
        const d3Selection = select(handleRef.current);
        const dragBehavior = drag().on('drag', (event: DragEvent) => {
          const clampedX = Math.max(0, Math.min(event.x, width));
          const newFreq = xToLogFreq(clampedX, width);
          updateInputValue(nodeId, inputId, newFreq);
        });
        d3Selection.call(dragBehavior as any);
      }
    };

    setupDrag(startHandleRef, 'startFrequency');
    setupDrag(endHandleRef, 'endFrequency');
  }, [nodeId, updateInputValue, xToLogFreq]);

  const sourceNodeId = useMemo(
    () =>
      edges.find(
        (edge) =>
          edge.target === nodeId && edge.targetHandle === 'frequencyData',
      )?.source,
    [edges, nodeId],
  );

  useRafLoop(() => {
    // Get latest values on every frame
    const sampleRate = getInputValue('sampleRate');
    const sourceNodeOutput = sourceNodeId
      ? getNodeOutput(sourceNodeId)
      : undefined;
    const startFrequency =
      getLiveNodeValue(nodeId, 'startFrequency') ??
      data.inputValues.startFrequency;
    const endFrequency =
      getLiveNodeValue(nodeId, 'endFrequency') ?? data.inputValues.endFrequency;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      canvas.width = canvas.parentElement?.clientWidth ?? 0;
      canvas.height = canvas.parentElement?.clientHeight ?? 0;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const fullSpectrum = (sourceNodeOutput?.frequencyData ??
      sourceNodeOutput) as Uint8Array;

    if (fullSpectrum && sampleRate) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      const nyquist = sampleRate / 2;
      const frequencyPerBin = nyquist / fullSpectrum.length;

      for (let i = 0; i < fullSpectrum.length; i++) {
        const freq = i * frequencyPerBin;
        const nextFreq = (i + 1) * frequencyPerBin;

        const x = (freqToLogPercent(freq) / 100) * width;
        const nextX = (freqToLogPercent(nextFreq) / 100) * width;
        const barWidth = Math.max(1, nextX - x);

        const barHeight = (fullSpectrum[i] / 255) * height;
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);
      }
    }

    const startPercent = freqToLogPercent(startFrequency);
    const endPercent = freqToLogPercent(endFrequency);

    if (startHandleRef.current) {
      startHandleRef.current.style.left = `${startPercent}%`;
    }
    if (endHandleRef.current) {
      endHandleRef.current.style.left = `${endPercent}%`;
      endHandleRef.current.style.transform = 'translateX(-100%)';
    }
    if (overlayRef.current) {
      overlayRef.current.style.left = `${startPercent}%`;
      overlayRef.current.style.width = `${endPercent - startPercent}%`;
    }
  });

  return (
    <div className="nodrag nopan relative h-24 w-full overflow-hidden rounded-md">
      <canvas ref={canvasRef} className="h-full w-full" />
      <div
        ref={startHandleRef}
        className="absolute top-0 h-full w-1 cursor-ew-resize bg-blue-400"
      />
      <div
        ref={endHandleRef}
        className="absolute top-0 h-full w-1 cursor-ew-resize bg-blue-400"
      />
      <div
        ref={overlayRef}
        className={cn(
          'pointer-events-none absolute top-0 h-full bg-blue-500/50 mix-blend-multiply',
        )}
      />
    </div>
  );
};

export default memo(FrequencyBandSelector);
