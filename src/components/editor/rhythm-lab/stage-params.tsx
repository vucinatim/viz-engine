'use client';

import { StageParamUiDefinition } from '@/lib/rhythm-lab/analysis-graph';
import useRhythmLabStore from '@/lib/stores/rhythm-lab-store';
import { Input } from '@/components/ui/input';
import { SimpleSelect } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

type StageParamsProps = {
  params: StageParamUiDefinition[];
};

const StageParams = ({ params }: StageParamsProps) => {
  const values = useRhythmLabStore((s) => s.params);
  const setParam = useRhythmLabStore((s) => s.setParam);

  const renderParamControl = (param: StageParamUiDefinition) => {
    const value = values[param.id as keyof typeof values];
    if (value === undefined) return null;

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
              onChange={(next) => setParam(param.id as keyof typeof values, next as any)}
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
            onCheckedChange={(next) => setParam(param.id as keyof typeof values, next as any)}
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
            onChange={(e) =>
              setParam(param.id as any, Number(e.target.value) || 0)
            }
            size="xs"
          />
        </div>
      </div>
    );
  };

  return <div className="flex flex-col gap-2">{params.map(renderParamControl)}</div>;
};

export default StageParams;
