import { StageStatus } from '@/lib/rhythm-lab/analysis-graph';
import { STAGE_COLORS } from '@/lib/rhythm-lab/stage-colors';
import useRhythmLabStore from '@/lib/stores/rhythm-lab-store';

type StageCardProps = {
  stageId: string;
  title: string;
  status: StageStatus;
  showToggle?: boolean;
  topStrip?: React.ReactNode;
  children: React.ReactNode;
};

const StageCard = ({
  stageId,
  title,
  status,
  showToggle = true,
  topStrip,
  children,
}: StageCardProps) => {
  const enabled = useRhythmLabStore((s) => Boolean(s.enabledStages[stageId]));
  const setEnabledStage = useRhythmLabStore((s) => s.setEnabledStage);
  const color = STAGE_COLORS[stageId] || '#7a7a7a';

  return (
    <div className="h-full min-w-[240px] overflow-y-auto rounded-md border border-white/10 bg-black/50">
      {topStrip ? <div className="h-2 w-full">{topStrip}</div> : null}
      <div className="p-3 pt-2">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-semibold text-white">{title}</div>
          {showToggle ? (
            <button
              type="button"
              className="flex items-center gap-1 text-[10px] text-white/40 uppercase"
              onClick={() => setEnabledStage(stageId, !enabled)}
              aria-pressed={enabled}>
              {status}
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: enabled ? color : '#3a3a3a',
                }}
              />
            </button>
          ) : (
            <span className="text-[10px] text-white/40 uppercase">
              {status}
            </span>
          )}
        </div>
        {children}
      </div>
    </div>
  );
};

export default StageCard;
