'use client';

import { onsetStrength } from '@viz-engine/rhythm-core';
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
  const rhythmSelection = useEditorStore((s) => s.rhythmSelection);
  const wavesurfer = useAudioStore((s) => s.wavesurfer);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [hopLength, setHopLength] = useState(512);
  const [nFft, setNFft] = useState(2048);
  const [winLength, setWinLength] = useState(2048);
  const [aggregate, setAggregate] = useState('mean');
  const [logCompression, setLogCompression] = useState(true);

  const [stats, setStats] = useState({
    min: 0,
    max: 0,
    mean: 0,
    frames: 0,
  });

  useEffect(() => {
    if (!wavesurfer) return;

    const handleReady = () => {
      setAudioBuffer(wavesurfer.getDecodedData());
    };

    wavesurfer.on('ready', handleReady);
    handleReady();

    return () => {
      wavesurfer.un('ready', handleReady);
    };
  }, [wavesurfer]);

  const selectionInfo = useMemo(() => {
    if (!audioBuffer) return { startSec: 0, endSec: 0, duration: 0 };
    const startSec = rhythmSelection.start * audioBuffer.duration;
    const endSec = rhythmSelection.end * audioBuffer.duration;
    return {
      startSec,
      endSec,
      duration: Math.max(0, endSec - startSec),
    };
  }, [audioBuffer, rhythmSelection]);

  useEffect(() => {
    if (!audioBuffer) return;
    const channel = audioBuffer.getChannelData(0);
    const startSample = Math.floor(rhythmSelection.start * channel.length);
    const endSample = Math.max(
      startSample + 1,
      Math.floor(rhythmSelection.end * channel.length),
    );

    const slice = channel.subarray(startSample, endSample);
    const result = onsetStrength(slice, {
      sr: audioBuffer.sampleRate,
      hopLength,
      nFft,
      winLength,
      aggregate: aggregate as 'mean' | 'median' | 'max',
      logCompression,
    });

    const env = result.onsetEnv;
    let min = Number.POSITIVE_INFINITY;
    let max = 0;
    let sum = 0;

    for (let i = 0; i < env.length; i += 1) {
      const value = env[i];
      if (value < min) min = value;
      if (value > max) max = value;
      sum += value;
    }

    setStats({
      min: env.length ? min : 0,
      max,
      mean: env.length ? sum / env.length : 0,
      frames: env.length,
    });
  }, [audioBuffer, rhythmSelection, hopLength, nFft, winLength, aggregate, logCompression]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioBuffer) return;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));

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
      const step = Math.max(1, Math.floor(slice.length / width));

      ctx.strokeStyle = 'rgba(0, 229, 255, 0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();

      for (let x = 0; x < width; x += 1) {
        const idx = x * step;
        const sample = slice[idx] || 0;
        const y = height / 2 - sample * height * 0.4;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [audioBuffer, rhythmSelection]);

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
        <div className="rounded-md border border-white/10 bg-black/40 p-2">
          <div className="mb-2 flex items-center justify-between text-[11px] text-white/50">
            <span>Selection</span>
            <span>
              {selectionInfo.startSec.toFixed(2)}s - {selectionInfo.endSec.toFixed(2)}s
              {' '}({selectionInfo.duration.toFixed(2)}s)
            </span>
          </div>
          <div className="relative h-48">
            <canvas ref={canvasRef} className="h-full w-full rounded-sm" />
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 bg-black/40 p-3">
        <div className="grid grid-cols-3 gap-3 text-xs text-white/70">
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wide text-white/40">Onset</div>
            <div className="flex flex-col gap-1">
              <div>frames: {stats.frames}</div>
              <div>min: {stats.min.toFixed(4)}</div>
              <div>max: {stats.max.toFixed(4)}</div>
              <div>mean: {stats.mean.toFixed(4)}</div>
            </div>
          </div>
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wide text-white/40">Params</div>
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
            <div className="mb-1 text-[10px] uppercase tracking-wide text-white/40">Options</div>
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
