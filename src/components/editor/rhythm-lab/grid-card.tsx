import { audioPresentationClock } from '@/lib/audio-presentation-clock';
import { PipelineStageDefinition } from '@/lib/rhythm-lab/analysis-graph';
import { STAGE_COLORS } from '@/lib/rhythm-lab/stage-colors';
import useAudioEngineStore from '@/lib/stores/audio-engine-store';
import useEditorStore from '@/lib/stores/editor-store';
import useRhythmLabStore from '@/lib/stores/rhythm-lab-store';
import { useEffect, useRef, useState } from 'react';
import StageCard from './stage-card';
import StageParams from './stage-params';

type GridCardProps = {
  stage: PipelineStageDefinition;
};

const GridCard = ({ stage }: GridCardProps) => {
  const beats = useRhythmLabStore((s) => s.beats);
  const beatsTimes = useRhythmLabStore((s) => s.beatsTimes);
  const beatConfidence = useRhythmLabStore((s) => s.beatConfidence);
  const beatPhase = useRhythmLabStore((s) => s.beatPhase);
  const beatPeriodFrames = useRhythmLabStore((s) => s.beatPeriodFrames);
  const enabled = useRhythmLabStore((s) => Boolean(s.enabledStages.grid));
  const audioBuffer = useAudioEngineStore((s) => s.audioBuffer);
  const visualTimeRef = useRef(audioPresentationClock.getSnapshot().visualTime);
  const rhythmSelection = useEditorStore((s) => s.rhythmSelection);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(-1);
  const beatIndexRef = useRef(0);
  const [flash, setFlash] = useState(0);

  useEffect(() => {
    const unsub = audioPresentationClock.subscribe(({ visualTime }) => {
      visualTimeRef.current = visualTime;
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!enabled) {
      setFlash(0);
      return;
    }

    const tick = () => {
      if (!audioBuffer || !beatsTimes || beatsTimes.length === 0) {
        setFlash(0);
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const selectionStartSec = rhythmSelection.start * audioBuffer.duration;
      const tLocal = visualTimeRef.current - selectionStartSec;
      if (tLocal < lastTimeRef.current) {
        beatIndexRef.current = 0;
      }
      lastTimeRef.current = tLocal;

      while (
        beatIndexRef.current + 1 < beatsTimes.length &&
        beatsTimes[beatIndexRef.current + 1] <= tLocal
      ) {
        beatIndexRef.current += 1;
      }

      const beatTime = beatsTimes[beatIndexRef.current];
      const window = 0.06;
      const diff = Math.abs(tLocal - beatTime);
      const intensity = diff < window ? 1 - diff / window : 0;
      setFlash(intensity);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [audioBuffer, beatsTimes, enabled, rhythmSelection]);

  return (
    <StageCard
      stageId={stage.id}
      title={stage.title}
      status={stage.status}
      showToggle
      topStrip={
        <div className="h-full w-full bg-white/5">
          <div
            className="h-full w-full"
            style={{
              backgroundColor: STAGE_COLORS.grid,
              opacity: enabled ? flash : 0,
            }}
          />
        </div>
      }>
      <div className="mb-3 grid grid-cols-2 gap-x-3 text-[11px] text-white/60">
        <div className="flex flex-col gap-1">
          <div>beats: {beats ? beats.length : 0}</div>
          <div>confidence: {beatConfidence.toFixed(3)}</div>
        </div>
        <div className="flex flex-col gap-1">
          <div>phase: {beatPhase.toFixed(1)}</div>
          <div>period: {beatPeriodFrames.toFixed(1)} f</div>
        </div>
      </div>
      <StageParams params={stage.params} />
    </StageCard>
  );
};

export default GridCard;
