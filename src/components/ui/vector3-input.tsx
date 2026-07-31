import { cn } from '@/lib/utils';
import { NumberScrubInput } from './number-scrub-input';

export type Vector3Value = { x: number; y: number; z: number };

type Vector3InputProps = {
  value: Vector3Value;
  onChange: (value: Vector3Value) => void;
  onTransientChange?: (value: Vector3Value) => void;
  onCommit?: (value: Vector3Value) => void;
  onGestureStart?: () => void;
  onGestureCancel?: () => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  inputClassName?: string;
  labelX?: string;
  labelY?: string;
  labelZ?: string;
  labelSuffix?: string; // e.g. "°"
};

export default function Vector3Input({
  value,
  onChange,
  onTransientChange,
  onCommit,
  onGestureStart,
  onGestureCancel,
  min,
  max,
  step = 0.01,
  className,
  inputClassName,
  labelX = 'X',
  labelY = 'Y',
  labelZ = 'Z',
  labelSuffix,
}: Vector3InputProps) {
  return (
    <div className={cn('grid w-full grid-cols-3 gap-2', className)}>
      <div className="flex w-full flex-col">
        <label className="mb-1 block text-[10px] uppercase opacity-70">
          {labelX}
          {labelSuffix ? ` ${labelSuffix}` : ''}
        </label>
        <NumberScrubInput
          value={value.x}
          onChange={(n) => onChange({ ...value, x: n })}
          onTransientChange={(n) =>
            (onTransientChange ?? onChange)({ ...value, x: n })
          }
          onCommit={(n) => (onCommit ?? onChange)({ ...value, x: n })}
          onGestureStart={onGestureStart}
          onGestureCancel={onGestureCancel}
          min={min}
          max={max}
          step={step}
          inputClassName={cn('w-full bg-fuchsia-500/20', inputClassName)}
        />
      </div>
      <div className="flex w-full flex-col">
        <label className="mb-1 block text-[10px] uppercase opacity-70">
          {labelY}
          {labelSuffix ? ` ${labelSuffix}` : ''}
        </label>
        <NumberScrubInput
          value={value.y}
          onChange={(n) => onChange({ ...value, y: n })}
          onTransientChange={(n) =>
            (onTransientChange ?? onChange)({ ...value, y: n })
          }
          onCommit={(n) => (onCommit ?? onChange)({ ...value, y: n })}
          onGestureStart={onGestureStart}
          onGestureCancel={onGestureCancel}
          min={min}
          max={max}
          step={step}
          inputClassName={cn('w-full bg-animation-blue/20', inputClassName)}
        />
      </div>
      <div className="flex w-full flex-col">
        <label className="mb-1 block text-[10px] uppercase opacity-70">
          {labelZ}
          {labelSuffix ? ` ${labelSuffix}` : ''}
        </label>
        <NumberScrubInput
          value={value.z}
          onChange={(n) => onChange({ ...value, z: n })}
          onTransientChange={(n) =>
            (onTransientChange ?? onChange)({ ...value, z: n })
          }
          onCommit={(n) => (onCommit ?? onChange)({ ...value, z: n })}
          onGestureStart={onGestureStart}
          onGestureCancel={onGestureCancel}
          min={min}
          max={max}
          step={step}
          inputClassName={cn('w-full bg-teal-500/20', inputClassName)}
        />
      </div>
    </div>
  );
}
