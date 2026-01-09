'use client';

import {
  OUTPUT_VIEW_OPTIONS,
  PIPELINE_STAGES,
  StageParamUiDefinition,
} from '@/lib/rhythm-lab/analysis-graph';
import useAudioStore from '@/lib/stores/audio-store';
import useEditorStore from '@/lib/stores/editor-store';
import { X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '../ui/resizable';
import { SimpleSelect } from '../ui/select';
import { Switch } from '../ui/switch';

const RhythmLabPanel = () => {
  const setIsRhythmLabOpen = useEditorStore((s) => s.setIsRhythmLabOpen);
  const isRhythmLabOpen = useEditorStore((s) => s.isRhythmLabOpen);
  const rhythmSelection = useEditorStore((s) => s.rhythmSelection);
  const audioBuffer = useAudioStore((s) => s.audioBuffer);
  const audioElementRef = useAudioStore((s) => s.audioElementRef);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const selectionRef = useRef(rhythmSelection);
  const waveformCacheRef = useRef<{
    plotWidth: number;
    startSample: number;
    endSample: number;
    rmsLevels: Float32Array;
  } | null>(null);
  const paramsRef = useRef({
    hopLength: 512,
    nFft: 2048,
    winLength: 2048,
    aggregate: 'mean',
    logCompression: true,
  });

  const [hopLength, setHopLength] = useState(512);
  const [nFft, setNFft] = useState(2048);
  const [winLength, setWinLength] = useState(2048);
  const [aggregate, setAggregate] = useState('mean');
  const [logCompression, setLogCompression] = useState(true);
  const [onsetEnv, setOnsetEnv] = useState<Float32Array | null>(null);
  const [computeToken, setComputeToken] = useState(0);
  const [isComputing, setIsComputing] = useState(false);
  const [analysisMeta, setAnalysisMeta] = useState<{
    sampleRate: number;
    hopLength: number;
    sampleCount: number;
    winLength: number;
  } | null>(null);
  const [outputView, setOutputView] = useState('Onset');

  const [stats, setStats] = useState({
    min: 0,
    max: 0,
    mean: 0,
    frames: 0,
  });
  const [enabledStages, setEnabledStages] = useState<Record<string, boolean>>({
    onset: true,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const worker = new Worker(
      new URL('../../lib/workers/rhythm-lab-worker.ts', import.meta.url),
      { type: 'module' },
    );
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent) => {
      const {
        id,
        onsetEnv: env,
        stats: nextStats,
        sampleRate,
        hopLength: responseHop,
        sampleCount,
        winLength,
      } = event.data as {
        id: number;
        onsetEnv: Float32Array;
        stats: { min: number; max: number; mean: number; frames: number };
        sampleRate: number;
        hopLength: number;
        sampleCount: number;
        winLength: number;
      };
      if (id !== requestIdRef.current) return;
      setOnsetEnv(env);
      setStats(nextStats);
      setAnalysisMeta({
        sampleRate,
        hopLength: responseHop,
        sampleCount,
        winLength,
      });
      setIsComputing(false);
    };
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    selectionRef.current = rhythmSelection;
  }, [rhythmSelection]);

  useEffect(() => {
    paramsRef.current = {
      hopLength,
      nFft,
      winLength,
      aggregate,
      logCompression,
    };
  }, [aggregate, hopLength, logCompression, nFft, winLength]);

  const selectionInfo = useMemo(() => {
    if (!audioBuffer) return { startSec: 0, endSec: 0, duration: 0 };
    const startSec = rhythmSelection.start * audioBuffer.duration;
    const endSec = rhythmSelection.end * audioBuffer.duration;
    return {
      startSec,
      endSec,
      duration: Math.max(0, endSec - startSec),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBuffer, rhythmSelection, onsetEnv]);

  const triggerCompute = () => {
    if (!audioBuffer || !isRhythmLabOpen) return;
    setIsComputing(true);
    setComputeToken((token) => token + 1);
  };

  useEffect(() => {
    if (!audioBuffer || !isRhythmLabOpen || computeToken === 0) {
      setIsComputing(false);
      return;
    }
    const worker = workerRef.current;
    if (!worker) {
      setIsComputing(false);
      return;
    }

    const channel = audioBuffer.getChannelData(0);
    const selection = selectionRef.current;
    const startSample = Math.floor(selection.start * channel.length);
    const endSample = Math.max(
      startSample + 1,
      Math.floor(selection.end * channel.length),
    );
    const slice = new Float32Array(channel.subarray(startSample, endSample));
    const params = paramsRef.current;

    const id = requestIdRef.current + 1;
    requestIdRef.current = id;

    worker.postMessage(
      {
        id,
        samples: slice,
        sampleRate: audioBuffer.sampleRate,
        hopLength: params.hopLength,
        nFft: params.nFft,
        winLength: params.winLength,
        aggregate: params.aggregate as 'mean' | 'median' | 'max',
        logCompression: params.logCompression,
        center: false,
      },
      [slice.buffer],
    );
  }, [audioBuffer, isRhythmLabOpen, computeToken]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioBuffer) return;

    let raf = 0;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr =
        typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      const axisWidth = 36;
      const barWidth = 14;
      const barGap = 8;
      const plotWidth = Math.max(1, width - axisWidth - barWidth - barGap);
      const barX = axisWidth + plotWidth + barGap;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, width, height);

      const channel = audioBuffer.getChannelData(0);
      const startSample = Math.floor(rhythmSelection.start * channel.length);
      const endSample = Math.max(
        startSample + 1,
        Math.floor(rhythmSelection.end * channel.length),
      );
      const slice = channel.subarray(startSample, endSample);

      const cache = waveformCacheRef.current;
      if (
        !cache ||
        cache.plotWidth !== plotWidth ||
        cache.startSample !== startSample ||
        cache.endSample !== endSample
      ) {
        const samplesPerBucket = Math.max(
          1,
          Math.floor(slice.length / plotWidth),
        );
        const rmsLevels = new Float32Array(plotWidth);
        for (let x = 0; x < plotWidth; x += 1) {
          let sumSq = 0;
          let count = 0;
          const start = x * samplesPerBucket;
          const end = Math.min(slice.length, start + samplesPerBucket);
          for (let i = start; i < end; i += 1) {
            const v = slice[i];
            sumSq += v * v;
            count += 1;
          }
          rmsLevels[x] = count > 0 ? Math.sqrt(sumSq / count) : 0;
        }
        waveformCacheRef.current = {
          plotWidth,
          startSample,
          endSample,
          rmsLevels,
        };
      }

      const rmsLevels = waveformCacheRef.current?.rmsLevels;
      if (!rmsLevels) return;

      const midY = height / 2;
      const amp = height * 0.42;

      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(0, 0, axisWidth, height);

      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      const gridLevels = [1, 0.5, 0, -0.5, -1];
      for (const level of gridLevels) {
        const y = midY - level * amp;
        ctx.beginPath();
        ctx.moveTo(axisWidth, y);
        ctx.lineTo(axisWidth + plotWidth, y);
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (const level of gridLevels) {
        const y = midY - level * amp;
        ctx.fillText(level.toFixed(1), axisWidth - 6, y);
      }

      let rmsMax = 0;
      for (let i = 0; i < rmsLevels.length; i += 1) {
        if (rmsLevels[i] > rmsMax) rmsMax = rmsLevels[i];
      }
      const rmsScale = rmsMax > 0 ? 1 / rmsMax : 1;
      const rmsCurve = 0.7;

      ctx.fillStyle = 'rgba(0, 229, 255, 0.18)';
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();

      for (let x = 0; x < plotWidth; x += 1) {
        const level = Math.pow(rmsLevels[x] * rmsScale, rmsCurve);
        const y = midY - level * amp;
        const drawX = axisWidth + x;
        if (x === 0) ctx.moveTo(drawX, y);
        else ctx.lineTo(drawX, y);
      }

      for (let x = plotWidth - 1; x >= 0; x -= 1) {
        const level = Math.pow(rmsLevels[x] * rmsScale, rmsCurve);
        const y = midY + level * amp;
        const drawX = axisWidth + x;
        ctx.lineTo(drawX, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      let onsetScale = 1;
      if (enabledStages.onset && onsetEnv && onsetEnv.length > 0) {
        let onsetMax = 0;
        for (let i = 0; i < onsetEnv.length; i += 1) {
          if (onsetEnv[i] > onsetMax) onsetMax = onsetEnv[i];
        }
        onsetScale = onsetMax > 0 ? 1 / onsetMax : 1;
        const meta = analysisMeta;
        const onsetSampleRate = meta?.sampleRate || audioBuffer.sampleRate;
        const onsetHop = meta?.hopLength || hopLength;
        const onsetWin = meta?.winLength || winLength;
        const onsetDuration = meta
          ? meta.sampleCount / meta.sampleRate
          : slice.length / audioBuffer.sampleRate;
        const onsetOffset = onsetWin * 0.5;

        ctx.strokeStyle = stageColors.onset;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        let moved = false;
        if (onsetDuration > 0) {
          for (let i = 0; i < onsetEnv.length; i += 1) {
            const t = (i * onsetHop + onsetOffset) / onsetSampleRate;
            const normX = t / onsetDuration;
            if (normX < 0 || normX > 1) continue;
            const drawX = axisWidth + normX * plotWidth;
            const normalized = onsetEnv[i] * onsetScale;
            const y = midY - normalized * amp;
            if (!moved) {
              ctx.moveTo(drawX, y);
              moved = true;
            } else {
              ctx.lineTo(drawX, y);
            }
          }
        }
        ctx.stroke();
      }

      const audio = audioElementRef.current;
      const selectionStartSec = rhythmSelection.start * audioBuffer.duration;
      const selectionEndSec = rhythmSelection.end * audioBuffer.duration;
      const selectionDuration = Math.max(
        0.0001,
        selectionEndSec - selectionStartSec,
      );
      if (audio) {
        const t = audio.currentTime;
        const norm = (t - selectionStartSec) / selectionDuration;
        if (norm >= 0 && norm <= 1) {
          const playheadX = axisWidth + norm * plotWidth;
          ctx.strokeStyle = 'rgba(255,255,255,0.55)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(playheadX, 0);
          ctx.lineTo(playheadX, height);
          ctx.stroke();
        }
      }

      let currentOnset = 0;
      if (
        enabledStages.onset &&
        onsetEnv &&
        onsetEnv.length > 0 &&
        analysisMeta &&
        audio
      ) {
        const t = audio.currentTime - selectionStartSec;
        const onsetHop = analysisMeta.hopLength;
        const onsetWin = analysisMeta.winLength;
        const onsetOffset = onsetWin * 0.5;
        const frame = Math.round(
          (t * analysisMeta.sampleRate - onsetOffset) / onsetHop,
        );
        if (frame >= 0 && frame < onsetEnv.length) {
          currentOnset = onsetEnv[frame] * onsetScale;
        }
      }

      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(barX, 0, barWidth, height);
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.strokeRect(barX, 0, barWidth, height);

      const barFillHeight = currentOnset * amp;
      const barY = midY - barFillHeight;
      ctx.fillStyle = enabledStages.onset
        ? stageColors.onset
        : 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(barX, barY, barWidth, barFillHeight);

      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.moveTo(axisWidth, midY);
      ctx.lineTo(axisWidth + plotWidth, midY);
      ctx.stroke();
    };

    const tick = () => {
      draw();
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    audioBuffer,
    audioElementRef,
    rhythmSelection,
    onsetEnv,
    analysisMeta,
    hopLength,
    winLength,
    enabledStages,
  ]);

  const stageColors: Record<string, string> = {
    onset: '#ff73be',
    tempogram: '#7cf2ff',
    tempo: '#ffd86b',
    grid: '#7aff9c',
    extraction: '#9fa2ff',
  };

  const toggleStage = (id: string) => {
    setEnabledStages((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const paramValues: Record<string, number | boolean | string> = {
    hopLength,
    nFft,
    winLength,
    aggregate,
    logCompression,
  };

  const paramSetters: Record<string, (value: any) => void> = {
    hopLength: setHopLength,
    nFft: setNFft,
    winLength: setWinLength,
    aggregate: setAggregate,
    logCompression: setLogCompression,
  };

  const renderParamControl = (param: StageParamUiDefinition) => {
    const value = paramValues[param.id];
    const setValue = paramSetters[param.id];
    if (!setValue) return null;

    if (param.type === 'select') {
      return (
        <div key={param.id} className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-[10px] text-white/50">
            {param.label}
          </span>
          <div className="w-1/2 max-w-[120px]">
            <SimpleSelect
              name={param.label}
              value={String(value)}
              onChange={(next) => setValue(next)}
              options={param.options || []}
              size="xs"
            />
          </div>
        </div>
      );
    }

    if (param.type === 'boolean') {
      return (
        <div key={param.id} className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-[10px] text-white/50">
            {param.label}
          </span>
          <Switch
            checked={Boolean(value)}
            onCheckedChange={setValue}
            size="xs"
          />
        </div>
      );
    }

    return (
      <div key={param.id} className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[10px] text-white/50">
          {param.label}
        </span>
        <div className="w-1/2 max-w-[120px]">
          <Input
            type="number"
            value={Number(value)}
            onChange={(e) => setValue(Number(e.target.value) || 0)}
            size="xs"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <div>
          <div className="text-sm font-semibold text-white">Rhythm Lab</div>
          <div className="text-xs text-white/50">
            DSP debug surface for rhythm-core
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <div className="text-[11px] text-white/50">
            {selectionInfo.startSec.toFixed(2)}s -{' '}
            {selectionInfo.endSec.toFixed(2)}s (
            {selectionInfo.duration.toFixed(2)}s)
          </div>
          <div className="w-36">
            <SimpleSelect
              name="Output"
              value={outputView}
              onChange={setOutputView}
              options={OUTPUT_VIEW_OPTIONS}
              size="xs"
            />
          </div>
          <Button
            variant="outline"
            className="h-7 px-2 text-[10px]"
            onClick={triggerCompute}
            disabled={!audioBuffer || !isRhythmLabOpen}>
            {isComputing ? 'Computing...' : 'Recompute'}
          </Button>
          <Button
            variant="outline"
            className="h-7 w-7 p-0"
            onClick={() => setIsRhythmLabOpen(false)}
            aria-label="Close rhythm lab">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <ResizablePanelGroup direction="vertical" className="min-h-0 flex-1">
        <ResizablePanel defaultSize={34} minSize={20} className="min-h-0">
          <div className="relative h-full min-h-0 overflow-hidden">
            <canvas ref={canvasRef} className="h-full w-full" />
          </div>
        </ResizablePanel>
        <ResizableHandle className="bg-white/10" />
        <ResizablePanel defaultSize={66} minSize={40} className="min-h-0">
          <div className="flex h-full min-h-0 flex-col bg-black/40 px-3 py-2">
            <div className="flex h-full min-w-0 flex-nowrap gap-3 overflow-x-auto pb-2 text-xs text-white/70">
              {PIPELINE_STAGES.map((stage) => (
                <div
                  key={stage.id}
                  className="h-full min-w-[240px] overflow-y-auto rounded-md border border-white/10 bg-black/50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-semibold text-white">
                  {stage.title}
                </div>
                <button
                  type="button"
                  className="flex items-center gap-1 text-[10px] uppercase text-white/40"
                  onClick={() => toggleStage(stage.id)}
                  aria-pressed={Boolean(enabledStages[stage.id])}
                >
                  {stage.status}
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: enabledStages[stage.id]
                        ? stageColors[stage.id] || '#7a7a7a'
                        : '#3a3a3a',
                    }}
                  />
                </button>
              </div>
                  {stage.id === 'onset' ? (
                    <div className="mb-3 grid grid-cols-2 gap-x-3 text-[11px] text-white/60">
                      <div className="flex flex-col gap-1">
                        <div>frames: {stats.frames}</div>
                        <div>mean: {stats.mean.toFixed(4)}</div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div>min: {stats.min.toFixed(4)}</div>
                        <div>max: {stats.max.toFixed(4)}</div>
                      </div>
                    </div>
                  ) : null}
                  {stage.status === 'active' ? (
                    <div className="flex flex-col gap-2">
                      {stage.params.map(renderParamControl)}
                    </div>
                  ) : (
                    <div className="text-[11px] text-white/40">
                      Not implemented yet.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default RhythmLabPanel;
