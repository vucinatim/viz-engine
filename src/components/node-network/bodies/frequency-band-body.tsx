import { useNodeLiveValuesStore } from '@/lib/stores/node-live-values-store';
import { useNodeOutputCache } from '@/lib/stores/node-output-cache-store';
import { cn } from '@/lib/utils';
import { D3DragEvent, drag } from 'd3-drag';
import { select } from 'd3-selection';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { useRafLoop } from 'react-use';
import { GraphNodeData, useNodeNetwork } from '../node-network-store';

type DragEvent = D3DragEvent<HTMLDivElement, unknown, unknown>;

const MIN_FREQ = 20;
const MAX_FREQ = 20000;
const MIN_LOG_FREQ = Math.log(MIN_FREQ);
const MAX_LOG_FREQ = Math.log(MAX_FREQ);

interface FrequencyBandBodyProps {
  id: string;
  data: GraphNodeData;
  selected: boolean;
  nodeNetworkId: string;
}

const FrequencyBandBody = ({
  id: nodeId,
  data,
  nodeNetworkId,
}: FrequencyBandBodyProps) => {
  const getNodeOutput = useNodeOutputCache((s) => s.getNodeOutput);
  const getLiveNodeValue = useNodeLiveValuesStore((s) => s.getNodeInputValue);

  const { edges, updateInputValue } = useNodeNetwork(nodeNetworkId);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startHandleRef = useRef<HTMLDivElement>(null);
  const endHandleRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Track drag state for range dragging
  const dragStateRef = useRef<{
    isDragging: boolean;
    startX: number;
    initialStartFreq: number;
    initialEndFreq: number;
  }>({
    isDragging: false,
    startX: 0,
    initialStartFreq: 0,
    initialEndFreq: 0,
  });

  const { startFrequency, endFrequency } = data.inputValues;

  // Update getInputValue to handle frequencyAnalysis
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

    const setupRangeDrag = () => {
      if (overlayRef.current) {
        const d3Selection = select(overlayRef.current);
        const dragBehavior = drag()
          .on('start', (event: DragEvent) => {
            // Check if we're clicking near the handles - if so, don't start range drag
            const startPercent = freqToLogPercent(
              getLiveNodeValue(nodeId, 'startFrequency') ??
                data.inputValues.startFrequency,
            );
            const endPercent = freqToLogPercent(
              getLiveNodeValue(nodeId, 'endFrequency') ??
                data.inputValues.endFrequency,
            );

            const clickPercent = (event.x / width) * 100;
            const handleMargin = 6; // 6% margin around handles (increased for larger hit boxes)

            // Don't start range drag if clicking near handles
            if (
              clickPercent < startPercent + handleMargin ||
              clickPercent > endPercent - handleMargin
            ) {
              return;
            }

            dragStateRef.current.isDragging = true;
            dragStateRef.current.startX = event.x;
            dragStateRef.current.initialStartFreq =
              getLiveNodeValue(nodeId, 'startFrequency') ??
              data.inputValues.startFrequency;
            dragStateRef.current.initialEndFreq =
              getLiveNodeValue(nodeId, 'endFrequency') ??
              data.inputValues.endFrequency;
          })
          .on('drag', (event: DragEvent) => {
            if (!dragStateRef.current.isDragging) return;

            const deltaX = event.x - dragStateRef.current.startX;
            const deltaPercent = (deltaX / width) * 100;
            const deltaLogFreq =
              (deltaPercent / 100) * (MAX_LOG_FREQ - MIN_LOG_FREQ);
            const deltaFreq = Math.exp(deltaLogFreq);

            const newStartFreq = Math.max(
              MIN_FREQ,
              Math.min(
                MAX_FREQ,
                dragStateRef.current.initialStartFreq * deltaFreq,
              ),
            );
            const newEndFreq = Math.max(
              MIN_FREQ,
              Math.min(
                MAX_FREQ,
                dragStateRef.current.initialEndFreq * deltaFreq,
              ),
            );

            // Ensure start frequency is less than end frequency
            if (newStartFreq < newEndFreq) {
              updateInputValue(nodeId, 'startFrequency', newStartFreq);
              updateInputValue(nodeId, 'endFrequency', newEndFreq);
            }
          })
          .on('end', () => {
            dragStateRef.current.isDragging = false;
          });
        d3Selection.call(dragBehavior as any);
      }
    };

    setupDrag(startHandleRef, 'startFrequency');
    setupDrag(endHandleRef, 'endFrequency');
    setupRangeDrag();
  }, [
    nodeId,
    updateInputValue,
    xToLogFreq,
    getLiveNodeValue,
    data.inputValues,
  ]);

  // Update sourceNodeId to use frequencyAnalysis
  const sourceNodeId = useMemo(
    () =>
      edges.find(
        (edge) =>
          edge.target === nodeId && edge.targetHandle === 'frequencyAnalysis',
      )?.source,
    [edges, nodeId],
  );

  useRafLoop(() => {
    // Get latest values on every frame
    const frequencyAnalysis = getInputValue('frequencyAnalysis');
    const sampleRate = frequencyAnalysis?.sampleRate;
    const fullSpectrum = frequencyAnalysis?.frequencyData;
    const fftSize = frequencyAnalysis?.fftSize;
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

    if (fullSpectrum && sampleRate) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      const nyquist = sampleRate / 2;
      const frequencyPerBin = nyquist / (fftSize / 2);

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
      endHandleRef.current.style.transform = 'translateX(-16px)';
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
        style={{
          transform: 'translateX(-16px)',
          width: '32px',
          background: 'transparent',
        }}>
        <div className="absolute left-1/2 top-0 h-full w-1 -translate-x-1/2 bg-blue-400" />
      </div>
      <div
        ref={endHandleRef}
        className="absolute top-0 h-full w-1 cursor-ew-resize bg-blue-400"
        style={{
          transform: 'translateX(-16px)',
          width: '32px',
          background: 'transparent',
        }}>
        <div className="absolute left-1/2 top-0 h-full w-1 -translate-x-1/2 bg-blue-400" />
      </div>
      <div
        ref={overlayRef}
        className={cn(
          'absolute top-0 h-full cursor-move bg-blue-500/50 mix-blend-multiply',
        )}
      />
    </div>
  );
};

export default memo(FrequencyBandBody);
