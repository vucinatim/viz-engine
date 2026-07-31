import { audioPresentationClock } from '@/lib/audio-presentation-clock';
import { PipelineStageDefinition } from '@/lib/rhythm-lab/analysis-graph';
import { STAGE_COLORS } from '@/lib/rhythm-lab/stage-colors';
import { rhythmSelectionPresentation } from '@/lib/rhythm-selection-presentation';
import useAudioEngineStore from '@/lib/stores/audio-engine-store';
import useRhythmLabStore from '@/lib/stores/rhythm-lab-store';
import { useEffect, useRef } from 'react';
import StageCard from './stage-card';
import StageParams from './stage-params';

type OnsetCardProps = {
  stage: PipelineStageDefinition;
};

const OnsetCard = ({ stage }: OnsetCardProps) => {
  const stats = useRhythmLabStore((s) => s.stats);
  const onsetEnv = useRhythmLabStore((s) => s.onsetEnv);
  const analysisMeta = useRhythmLabStore((s) => s.analysisMeta);
  const enabled = useRhythmLabStore((s) => Boolean(s.enabledStages.onset));
  const audioBuffer = useAudioEngineStore((s) => s.audioBuffer);
  const visualTimeRef = useRef(audioPresentationClock.getSnapshot().visualTime);
  const selectionRef = useRef(rhythmSelectionPresentation.getSnapshot());
  const rafRef = useRef(0);
  const levelRef = useRef<HTMLDivElement>(null);

  const setLevel = (level: number) => {
    if (levelRef.current) levelRef.current.style.opacity = String(level);
  };

  useEffect(() => {
    const unsub = audioPresentationClock.subscribe(({ visualTime }) => {
      visualTimeRef.current = visualTime;
    });
    return () => unsub();
  }, []);

  useEffect(
    () =>
      rhythmSelectionPresentation.subscribe((selection) => {
        selectionRef.current = selection;
      }),
    [],
  );

  useEffect(() => {
    if (!enabled) {
      setLevel(0);
      return;
    }
    const tick = () => {
      if (!audioBuffer || !onsetEnv || onsetEnv.length === 0 || !analysisMeta) {
        setLevel(0);
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const selectionStartSec =
        selectionRef.current.start * audioBuffer.duration;
      const t = visualTimeRef.current - selectionStartSec;
      const onsetHop = analysisMeta.hopLength;
      const onsetWin = analysisMeta.winLength;
      const onsetOffset = onsetWin * 0.5;
      const frame = Math.round(
        (t * analysisMeta.sampleRate - onsetOffset) / onsetHop,
      );
      if (frame >= 0 && frame < onsetEnv.length) {
        const max = stats.max || 1;
        const normalized = Math.min(1, Math.max(0, onsetEnv[frame] / max));
        setLevel(normalized);
      } else {
        setLevel(0);
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [analysisMeta, audioBuffer, enabled, onsetEnv, stats.max]);

  return (
    <StageCard
      stageId={stage.id}
      title={stage.title}
      status={stage.status}
      showToggle
      topStrip={
        <div className="h-full w-full bg-white/5">
          <div
            ref={levelRef}
            className="h-full w-full"
            style={{
              backgroundColor: STAGE_COLORS.onset,
              opacity: 0,
            }}
          />
        </div>
      }>
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
      <StageParams params={stage.params} />
    </StageCard>
  );
};

export default OnsetCard;
