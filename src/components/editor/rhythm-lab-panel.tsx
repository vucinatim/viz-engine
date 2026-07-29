'use client';

import editorControl from '@/lib/editor-control';
import {
  OUTPUT_VIEW_OPTIONS,
  PIPELINE_STAGES,
} from '@/lib/rhythm-lab/analysis-graph';
import { STAGE_COLORS } from '@/lib/rhythm-lab/stage-colors';
import useAudioEngineStore from '@/lib/stores/audio-engine-store';
import useEditorAudioSessionStore from '@/lib/stores/editor-audio-session-store';
import useEditorStore from '@/lib/stores/editor-store';
import useRhythmLabStore from '@/lib/stores/rhythm-lab-store';
import { X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../ui/button';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '../ui/resizable';
import { SimpleSelect } from '../ui/select';
import GridCard from './rhythm-lab/grid-card';
import OnsetCard from './rhythm-lab/onset-card';
import PlaceholderCard from './rhythm-lab/placeholder-card';
import TempoCard from './rhythm-lab/tempo-card';
import TempogramCard from './rhythm-lab/tempogram-card';

const RhythmLabPanel = () => {
  const isRhythmLabOpen = useEditorStore((s) => s.isRhythmLabOpen);
  const rhythmSelection = useEditorStore((s) => s.rhythmSelection);
  const audioBuffer = useAudioEngineStore((s) => s.audioBuffer);
  const visualTimeRef = useRef(
    useEditorAudioSessionStore.getState().visualTime,
  );
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
  const paramsRef = useRef(useRhythmLabStore.getState().params);
  const params = useRhythmLabStore((s) => s.params);
  const onsetEnv = useRhythmLabStore((s) => s.onsetEnv);
  const analysisMeta = useRhythmLabStore((s) => s.analysisMeta);
  const enabledStages = useRhythmLabStore((s) => s.enabledStages);
  const beatsTimes = useRhythmLabStore((s) => s.beatsTimes);
  const outputView = useRhythmLabStore((s) => s.outputView);
  const isComputing = useRhythmLabStore((s) => s.isComputing);
  const setOutputView = useRhythmLabStore((s) => s.setOutputView);
  const setOnsetEnv = useRhythmLabStore((s) => s.setOnsetEnv);
  const setTempogramCurve = useRhythmLabStore((s) => s.setTempogramCurve);
  const setTempogramTempos = useRhythmLabStore((s) => s.setTempogramTempos);
  const setTempoValue = useRhythmLabStore((s) => s.setTempoValue);
  const setTempoCandidates = useRhythmLabStore((s) => s.setTempoCandidates);
  const setTempoRefined = useRhythmLabStore((s) => s.setTempoRefined);
  const setBeats = useRhythmLabStore((s) => s.setBeats);
  const setBeatsTimes = useRhythmLabStore((s) => s.setBeatsTimes);
  const setBeatConfidence = useRhythmLabStore((s) => s.setBeatConfidence);
  const setBeatPhase = useRhythmLabStore((s) => s.setBeatPhase);
  const setBeatPeriodFrames = useRhythmLabStore((s) => s.setBeatPeriodFrames);
  const setStats = useRhythmLabStore((s) => s.setStats);
  const setTempogramStats = useRhythmLabStore((s) => s.setTempogramStats);
  const setAnalysisMeta = useRhythmLabStore((s) => s.setAnalysisMeta);
  const setIsComputing = useRhythmLabStore((s) => s.setIsComputing);
  const [computeToken, setComputeToken] = useState(0);

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
        tempogram: tempoCurve,
        tempos: tempoBins,
        tempo,
        tempoCandidates,
        tempoRefined,
        beats,
        beatsTimes,
        beatConfidence,
        beatPhase,
        beatPeriodFrames,
        tempogramStats: nextTempoStats,
        stats: nextStats,
        sampleRate,
        hopLength: responseHop,
        sampleCount,
        winLength,
      } = event.data as {
        id: number;
        onsetEnv: Float32Array;
        tempogram?: Float32Array;
        tempos?: Float32Array;
        tempo?: number;
        tempoCandidates?: Float32Array;
        tempoRefined?: number;
        beats?: Float32Array;
        beatsTimes?: Float32Array;
        beatConfidence?: number;
        beatPhase?: number;
        beatPeriodFrames?: number;
        tempogramStats?: {
          min: number;
          max: number;
          mean: number;
          points: number;
        };
        stats: { min: number; max: number; mean: number; frames: number };
        sampleRate: number;
        hopLength: number;
        sampleCount: number;
        winLength: number;
      };
      if (id !== requestIdRef.current) return;
      setOnsetEnv(env);
      setTempogramCurve(tempoCurve ?? null);
      setTempogramTempos(tempoBins ?? null);
      if (typeof tempo === 'number') {
        setTempoValue(tempo);
      }
      if (typeof tempoRefined === 'number') {
        setTempoRefined(tempoRefined);
      }
      setTempoCandidates(tempoCandidates ?? null);
      setBeats(beats ?? null);
      setBeatsTimes(beatsTimes ?? null);
      if (typeof beatConfidence === 'number') {
        setBeatConfidence(beatConfidence);
      }
      if (typeof beatPhase === 'number') {
        setBeatPhase(beatPhase);
      }
      if (typeof beatPeriodFrames === 'number') {
        setBeatPeriodFrames(beatPeriodFrames);
      }
      if (nextTempoStats) {
        setTempogramStats(nextTempoStats);
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    selectionRef.current = rhythmSelection;
  }, [rhythmSelection]);

  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

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
        minBpm: params.minBpm,
        maxBpm: params.maxBpm,
        phaseOffset: params.phaseOffset,
        optimizePhase: params.optimizePhase,
        tempoOverride: useRhythmLabStore.getState().tempoValue || undefined,
      },
      [slice.buffer],
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const plotWidth = Math.max(1, width - axisWidth);

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
        const onsetHop = meta?.hopLength || params.hopLength;
        const onsetWin = meta?.winLength || params.winLength;
        const onsetDuration = meta
          ? meta.sampleCount / meta.sampleRate
          : slice.length / audioBuffer.sampleRate;
        const onsetOffset = onsetWin * 0.5;

        ctx.strokeStyle = STAGE_COLORS.onset;
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

      if (enabledStages.grid && beatsTimes && beatsTimes.length > 0) {
        const selectionStartSec = rhythmSelection.start * audioBuffer.duration;
        const selectionEndSec = rhythmSelection.end * audioBuffer.duration;
        const selectionDuration = Math.max(
          0.0001,
          selectionEndSec - selectionStartSec,
        );

        ctx.strokeStyle = 'rgba(122, 255, 156, 0.55)';
        ctx.lineWidth = 1;
        for (let i = 0; i < beatsTimes.length; i += 1) {
          const t = beatsTimes[i];
          if (t < 0 || t > selectionDuration) continue;
          const normX = t / selectionDuration;
          const drawX = axisWidth + normX * plotWidth;
          ctx.beginPath();
          ctx.moveTo(drawX, 0);
          ctx.lineTo(drawX, height);
          ctx.stroke();
        }
      }

      const selectionStartSec = rhythmSelection.start * audioBuffer.duration;
      const selectionEndSec = rhythmSelection.end * audioBuffer.duration;
      const selectionDuration = Math.max(
        0.0001,
        selectionEndSec - selectionStartSec,
      );
      const norm =
        (visualTimeRef.current - selectionStartSec) / selectionDuration;
      if (norm >= 0 && norm <= 1) {
        const playheadX = axisWidth + norm * plotWidth;
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, height);
        ctx.stroke();
      }

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
    rhythmSelection,
    onsetEnv,
    analysisMeta,
    enabledStages,
    beatsTimes,
    params.hopLength,
    params.winLength,
  ]);

  useEffect(() => {
    const unsub = useEditorAudioSessionStore.subscribe((state) => {
      visualTimeRef.current = state.visualTime;
    });
    return () => unsub();
  }, []);

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
            onClick={() => editorControl.ui.setRhythmLabOpen(false)}
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
              {PIPELINE_STAGES.map((stage) => {
                if (stage.id === 'onset') {
                  return <OnsetCard key={stage.id} stage={stage} />;
                }
                if (stage.id === 'tempogram') {
                  return <TempogramCard key={stage.id} stage={stage} />;
                }
                if (stage.id === 'tempo') {
                  return <TempoCard key={stage.id} stage={stage} />;
                }
                if (stage.id === 'grid') {
                  return <GridCard key={stage.id} stage={stage} />;
                }
                return <PlaceholderCard key={stage.id} stage={stage} />;
              })}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default RhythmLabPanel;
