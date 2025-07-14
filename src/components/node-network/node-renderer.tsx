import { cn } from '@/lib/utils';
import { Handle, Position } from '@xyflow/react';
import { useEffect, useRef, useState } from 'react';
import { GraphNode } from './node-network-store';

const NodeRenderer = ({ data, selected }: GraphNode) => {
  const { label, inputs, outputs } = data;
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (boxRef.current) {
      const { width, height } = boxRef.current.getBoundingClientRect();
      setSize({ width, height });
    }
  }, []);

  const calculateHandleOffset = (
    index: number,
    total: number,
    height: number,
  ) => {
    if (total <= 1) return height / 2; // Center if only one handle
    const gap = height / (total + 1); // Create even space between handles
    return gap * (index + 1); // Calculate the top position based on the index
  };

  return (
    <div>
      <p className="w-full py-1 text-xs">{label}</p>
      <div
        ref={boxRef}
        className={cn(
          'relative min-h-[150px] min-w-[150px] rounded-lg border border-zinc-700 bg-zinc-900',
          selected && 'border-zinc-400 bg-zinc-800',
        )}>
        <div className="flex flex-col items-center">
          <div>
            {inputs.map((input, index) => {
              const top = calculateHandleOffset(
                index,
                inputs.length,
                size.height,
              );
              return (
                <div key={`node_in_${index}`}>
                  <Handle
                    type="target"
                    id={input.id}
                    position={Position.Left}
                    style={{
                      width: 24,
                      height: 24,
                      backgroundColor: 'transparent',
                      border: 'none',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      top,
                    }}>
                    <div className="pointer-events-none h-1.5 w-1.5 rounded-full bg-gray-200" />
                  </Handle>
                  <p
                    className="pointer-events-none absolute -translate-y-1/2 whitespace-nowrap text-2xs"
                    style={{ top, left: 6 }}>
                    {input.label}
                  </p>
                </div>
              );
            })}
          </div>
          <div>
            {outputs.map((output, index) => {
              const top = calculateHandleOffset(
                index,
                outputs.length,
                size.height,
              );
              return (
                <div key={`node_out_${index}`}>
                  <Handle
                    type="source"
                    id={output.id}
                    position={Position.Right}
                    style={{
                      width: 24,
                      height: 24,
                      backgroundColor: 'transparent',
                      border: 'none',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      top,
                    }}>
                    <div className="pointer-events-none h-1.5 w-1.5 rounded-full bg-gray-200" />
                  </Handle>
                  <p
                    className="pointer-events-none absolute -translate-y-1/2 whitespace-nowrap text-2xs"
                    style={{ top, right: 6 }}>
                    {output.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NodeRenderer;
