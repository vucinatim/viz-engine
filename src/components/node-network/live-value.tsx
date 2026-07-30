import { getRuntimeNodeInput } from '@/lib/viz-session';
import { useRef } from 'react';
import { useRafLoop } from 'react-use';

interface LiveValueProps {
  nodeId: string;
  inputId: string;
  type: string;
}

export const formatNodeLiveValue = (value: unknown, type: string): string => {
  switch (type) {
    case 'number':
      return typeof value === 'number' && Number.isFinite(value)
        ? value.toFixed(2)
        : String(value);
    case 'Uint8Array':
      return '[Data]';
    case 'FrequencyAnalysis':
      return '[Freq]';
    default:
      return String(value);
  }
};

const LiveValue = ({ nodeId, inputId, type }: LiveValueProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const getNodeInputValue = getRuntimeNodeInput;

  useRafLoop(() => {
    if (!ref.current) return;
    const value = getNodeInputValue(nodeId, inputId);

    if (value !== undefined) {
      ref.current.innerText = formatNodeLiveValue(value, type);
    }
  });

  return <span ref={ref} />;
};

export default LiveValue;
