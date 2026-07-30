import {
  selectRuntimeGraphValueForParameter,
  useVizSessionSelector,
} from '@/lib/viz-session';

export const AnimatedLiveValue = ({
  parameterId,
  className = 'text-zinc-300',
}: {
  parameterId: string;
  className?: string;
}) => {
  const value = useVizSessionSelector((state) =>
    selectRuntimeGraphValueForParameter(state, parameterId),
  );
  if (value === undefined) {
    return null;
  }
  let text: string;
  if (typeof value === 'number') {
    text = value.toFixed(2);
  } else if (typeof value === 'string') {
    text = value;
  } else {
    try {
      text = JSON.stringify(value);
    } catch {
      text = String(value);
    }
  }
  return <span className={className}>{text}</span>;
};
