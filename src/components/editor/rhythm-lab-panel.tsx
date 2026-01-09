'use client';

import useAudioStore from '@/lib/stores/audio-store';
import useEditorStore from '@/lib/stores/editor-store';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { SimpleSelect } from '../ui/select';
import { Switch } from '../ui/switch';

const AGGREGATE_OPTIONS = ['mean', 'median', 'max'];

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

  const [stats, setStats] = useState({
    min: 0,
    max: 0,
    mean: 0,
    frames: 0,
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
      if (onsetEnv && onsetEnv.length > 0) {
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

        ctx.strokeStyle = 'rgba(255, 115, 190, 0.85)';
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
      if (onsetEnv && onsetEnv.length > 0 && analysisMeta && audio) {
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
      ctx.fillStyle = 'rgba(255, 115, 190, 0.8)';
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
  }, [audioBuffer, audioElementRef, rhythmSelection, onsetEnv, analysisMeta, hopLength, winLength]);

  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <div>
          <div className="text-sm font-semibold text-white">Rhythm Lab</div>
          <div className="text-xs text-white/50">
            DSP debug surface for rhythm-core
          </div>
        </div>
        <Button
          variant="outline"
          className="h-7 px-2 text-xs"
          onClick={() => setIsRhythmLabOpen(false)}>
          Close
        </Button>
      </div>
      <div className="flex grow flex-col gap-3 p-3">
        <div className="flex items-center justify-between text-[11px] text-white/50">
          <span>Selection</span>
          <span>
            {selectionInfo.startSec.toFixed(2)}s -{' '}
            {selectionInfo.endSec.toFixed(2)}s (
            {selectionInfo.duration.toFixed(2)}s)
          </span>
        </div>
        <div className="relative h-56">
          <canvas ref={canvasRef} className="h-full w-full" />
        </div>
      </div>
      <div className="border-t border-white/10 bg-black/40 p-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-wide text-white/40">
            Analysis Controls
          </div>
          <Button
            variant="outline"
            className="h-7 px-2 text-[10px]"
            onClick={triggerCompute}
            disabled={!audioBuffer || !isRhythmLabOpen}>
            {isComputing ? 'Computing...' : 'Recompute'}
          </Button>
        </div>
        {isComputing && (
          <div className="mb-2 text-[11px] text-white/50">
            Running onset analysis...
          </div>
        )}
        <div className="grid grid-cols-3 gap-3 text-xs text-white/70">
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wide text-white/40">
              Onset
            </div>
            <div className="flex flex-col gap-1">
              <div>frames: {stats.frames}</div>
              <div>min: {stats.min.toFixed(4)}</div>
              <div>max: {stats.max.toFixed(4)}</div>
              <div>mean: {stats.mean.toFixed(4)}</div>
            </div>
          </div>
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wide text-white/40">
              Params
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="w-16 text-white/50">hop</span>
                <Input
                  type="number"
                  value={hopLength}
                  onChange={(e) => setHopLength(Number(e.target.value) || 0)}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 text-white/50">n_fft</span>
                <Input
                  type="number"
                  value={nFft}
                  onChange={(e) => setNFft(Number(e.target.value) || 0)}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 text-white/50">win</span>
                <Input
                  type="number"
                  value={winLength}
                  onChange={(e) => setWinLength(Number(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wide text-white/40">
              Options
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="w-20 text-white/50">aggregate</span>
                <div className="flex-1">
                  <SimpleSelect
                    name="Aggregate"
                    value={aggregate}
                    onChange={setAggregate}
                    options={AGGREGATE_OPTIONS}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-20 text-white/50">log</span>
                <Switch
                  checked={logCompression}
                  onCheckedChange={setLogCompression}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RhythmLabPanel;
