'use client';

import { PipelineStageDefinition } from '@/lib/rhythm-lab/analysis-graph';
import useRhythmLabStore from '@/lib/stores/rhythm-lab-store';
import StageCard from './stage-card';

type TempoCardProps = {
  stage: PipelineStageDefinition;
};

const TempoCard = ({ stage }: TempoCardProps) => {
  const tempoValue = useRhythmLabStore((s) => s.tempoValue);
  const tempoCandidates = useRhythmLabStore((s) => s.tempoCandidates);
  const tempoRefined = useRhythmLabStore((s) => s.tempoRefined);

  const candidates = tempoCandidates
    ? Array.from(tempoCandidates).slice(0, 3)
    : [];

  return (
    <StageCard
      stageId={stage.id}
      title={stage.title}
      status={stage.status}
      showToggle={false}
    >
      <div className="mb-3">
        <div className="text-[11px] text-white/50">Dominant BPM</div>
        <div className="text-lg font-semibold text-white">
          {tempoValue ? tempoValue.toFixed(1) : '--'}
        </div>
      </div>
      <div className="mb-2 text-[11px] text-white/60">
        Raw candidates:{' '}
        {candidates.length > 0
          ? candidates.map((bpm) => bpm.toFixed(1)).join(', ')
          : '--'}
      </div>
      <div className="mb-2 text-[11px] text-white/60">
        Refined peak: {tempoRefined ? tempoRefined.toFixed(2) : '--'}
      </div>
      <div className="text-[11px] text-white/60">
        Corrected candidates:{' '}
        {tempoValue ? tempoValue.toFixed(1) : '--'}
      </div>
    </StageCard>
  );
};

export default TempoCard;
