import { getRuntimeGraphValueForParameter } from '@/lib/viz-session';
import { useRef } from 'react';
import { useRafLoop } from 'react-use';

export const AnimatedLiveValue = ({
  parameterId,
  className = 'text-zinc-300',
}: {
  parameterId: string;
  className?: string;
}) => {
  const ref = useRef<HTMLSpanElement>(null);

  useRafLoop(() => {
    if (!ref.current) {
      return;
    }
    const value = getRuntimeGraphValueForParameter(parameterId);
    if (value === undefined) {
      ref.current.innerText = '';
    } else if (typeof value === 'number') {
      ref.current.innerText = value.toFixed(2);
    } else if (typeof value === 'string') {
      ref.current.innerText = value;
    } else {
      try {
        ref.current.innerText = JSON.stringify(value);
      } catch {
        ref.current.innerText = String(value);
      }
    }
  });

  return <span ref={ref} className={className} />;
};
