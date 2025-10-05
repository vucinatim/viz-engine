import { useNodeLiveValuesStore } from '@/lib/stores/node-live-values-store';
import { useRef } from 'react';
import { useRafLoop } from 'react-use';

interface LiveValueProps {
  nodeId: string;
  inputId: string;
  type: string;
}

const LiveValue = ({ nodeId, inputId, type }: LiveValueProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const { getNodeInputValue } = useNodeLiveValuesStore.getState();

  useRafLoop(() => {
    if (!ref.current) return;
    const value = getNodeInputValue(nodeId, inputId);

    if (value !== undefined) {
      switch (type) {
        case 'number':
          ref.current.innerText = (value as number).toFixed(2);
          break;
        case 'Uint8Array':
          ref.current.innerText = '[Data]';
          break;
        case 'FrequencyAnalysis':
          ref.current.innerText = '[Freq]';
          break;
        default:
          ref.current.innerText = String(value);
      }
    }
  });

  return <span ref={ref} />;
};

export default LiveValue;
