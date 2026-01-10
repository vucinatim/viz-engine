'use client';

import { PipelineStageDefinition } from '@/lib/rhythm-lab/analysis-graph';
import { STAGE_COLORS } from '@/lib/rhythm-lab/stage-colors';
import useRhythmLabStore from '@/lib/stores/rhythm-lab-store';
import { useEffect, useMemo, useRef, useState } from 'react';
import StageCard from './stage-card';
import StageParams from './stage-params';

type TempogramCardProps = {
  stage: PipelineStageDefinition;
};

const TempogramCard = ({ stage }: TempogramCardProps) => {
  const tempogramStats = useRhythmLabStore((s) => s.tempogramStats);
  const tempogramCurve = useRhythmLabStore((s) => s.tempogramCurve);
  const tempogramTempos = useRhythmLabStore((s) => s.tempogramTempos);
  const params = useRhythmLabStore((s) => s.params);
  const minBpm = params.minBpm;
  const maxBpm = params.maxBpm;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoverIndexRef = useRef<number | null>(null);
  const drawRef = useRef<(() => void) | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{
    bpm: number;
    value: number;
  } | null>(null);

  const topCandidates = useMemo(() => {
    if (!tempogramCurve || !tempogramTempos) return [];
    const candidates = [];
    for (let i = 0; i < tempogramCurve.length; i += 1) {
      candidates.push({ bpm: tempogramTempos[i], value: tempogramCurve[i] });
    }
    candidates.sort((a, b) => b.value - a.value);
    return candidates.slice(0, 3).map((item) => item.bpm);
  }, [tempogramCurve, tempogramTempos]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr =
        typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(0, 0, width, height);

      if (!tempogramCurve || tempogramCurve.length === 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
        return;
      }

      let maxValue = 0;
      for (let i = 0; i < tempogramCurve.length; i += 1) {
        const value = Math.max(0, tempogramCurve[i]);
        if (value > maxValue) maxValue = value;
      }
      const scale = maxValue > 0 ? 1 / maxValue : 1;
      const stepX =
        tempogramCurve.length > 1
          ? (width - 1) / (tempogramCurve.length - 1)
          : width;

      ctx.strokeStyle = STAGE_COLORS.tempogram;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < tempogramCurve.length; i += 1) {
        const actualIndex = tempogramCurve.length - 1 - i;
        const normalized = Math.max(0, tempogramCurve[actualIndex]) * scale;
        const x = i * stepX;
        const y = height - normalized * (height - 4);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      if (hoverIndexRef.current !== null) {
        const displayIndex = hoverIndexRef.current;
        const actualIndex = tempogramCurve.length - 1 - displayIndex;
        const normalized = Math.max(0, tempogramCurve[actualIndex]) * scale;
        const x = displayIndex * stepX;
        const y = height - normalized * (height - 4);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();

        ctx.fillStyle = STAGE_COLORS.tempogram;
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    draw();
    drawRef.current = draw;

    const observer = new ResizeObserver(() => draw());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [tempogramCurve]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !tempogramCurve || !tempogramTempos) return;

    const handleMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = Math.min(Math.max(0, event.clientX - rect.left), rect.width);
      const displayIndex = Math.round(
        (x / Math.max(1, rect.width - 1)) * (tempogramCurve.length - 1),
      );
      const actualIndex = tempogramCurve.length - 1 - displayIndex;
      hoverIndexRef.current = displayIndex;
      setHoverInfo({
        bpm: tempogramTempos[actualIndex],
        value: tempogramCurve[actualIndex],
      });
      drawRef.current?.();
    };

    const handleLeave = () => {
      hoverIndexRef.current = null;
      setHoverInfo(null);
      drawRef.current?.();
    };

    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseleave', handleLeave);
    return () => {
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('mouseleave', handleLeave);
    };
  }, [tempogramCurve, tempogramTempos]);

  return (
    <StageCard
      stageId={stage.id}
      title={stage.title}
      status={stage.status}
      showToggle={false}>
      <div className="mb-3">
        <div className="relative mb-2">
          <div className="mb-1 text-[10px] uppercase text-white/40">
            Tempogram (BPM)
          </div>
          <div className="relative h-16">
            <canvas ref={canvasRef} className="h-full w-full rounded-sm" />
            {hoverInfo ? (
              <div className="pointer-events-none absolute right-0 top-0 rounded-sm bg-black/20 px-2 py-1 text-[10px] text-white/70">
                {hoverInfo.bpm.toFixed(1)} BPM · {hoverInfo.value.toFixed(3)}
              </div>
            ) : null}
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-white/40">
            <span>{Math.round(minBpm)} BPM</span>
            <span>{Math.round(maxBpm)} BPM</span>
          </div>
        </div>
        {topCandidates.length > 0 ? (
          <div className="mb-2 text-[10px] text-white/50">
            Raw top BPM: {topCandidates.map((bpm) => bpm.toFixed(1)).join(', ')}
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-x-3 text-[11px] text-white/60">
          <div className="flex flex-col gap-1">
            <div>points: {tempogramStats.points}</div>
            <div>mean: {tempogramStats.mean.toFixed(4)}</div>
          </div>
          <div className="flex flex-col gap-1">
            <div>min: {tempogramStats.min.toFixed(4)}</div>
            <div>max: {tempogramStats.max.toFixed(4)}</div>
          </div>
        </div>
      </div>
      <StageParams params={stage.params} />
    </StageCard>
  );
};

export default TempogramCard;
