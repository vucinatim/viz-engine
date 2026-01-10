'use client';

import { PipelineStageDefinition } from '@/lib/rhythm-lab/analysis-graph';
import StageCard from './stage-card';

type PlaceholderCardProps = {
  stage: PipelineStageDefinition;
};

const PlaceholderCard = ({ stage }: PlaceholderCardProps) => {
  return (
    <StageCard
      stageId={stage.id}
      title={stage.title}
      status={stage.status}
      showToggle={false}
    >
      <div className="text-[11px] text-white/40">Not implemented yet.</div>
    </StageCard>
  );
};

export default PlaceholderCard;
