import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Handle, Position } from '@xyflow/react';
import LiveValue from './live-value';
import { GraphNodeData, useNodeNetwork } from './node-network-store';

// Manually defining props instead of relying on NodeProps to avoid TS issues
interface NodeRendererProps {
  id: string;
  data: GraphNodeData;
  selected: boolean;
  nodeNetworkId: string;
}

const NodeRenderer = ({
  id: nodeId,
  data,
  selected,
  nodeNetworkId,
}: NodeRendererProps) => {
  const { definition, inputValues } = data;
  const { label, inputs, outputs, customBody: CustomBody } = definition;

  const { edges, updateInputValue } = useNodeNetwork(nodeNetworkId);

  const renderInput = (input: any) => {
    const isConnected = edges.some(
      (edge) => edge.target === nodeId && edge.targetHandle === input.id,
    );
    if (isConnected)
      return (
        <div className="flex h-6 w-16 items-center justify-center rounded-md bg-zinc-800 text-xs">
          <LiveValue nodeId={nodeId} inputId={input.id} type={input.type} />
        </div>
      );

    // TODO: Handle other types
    switch (input.type) {
      case 'number':
        return (
          <Input
            type="text"
            className="nodrag nopan h-6 w-16 bg-zinc-800 text-xs"
            value={inputValues[input.id] ?? ''}
            onChange={(e) => updateInputValue(nodeId, input.id, e.target.value)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border border-zinc-700 bg-zinc-900 shadow-md',
        selected && 'border-purple-500 shadow-lg',
      )}>
      <p className="w-full select-none rounded-t-lg bg-zinc-800 px-2 py-1 text-xs font-bold">
        {label}
      </p>
      <div className="relative flex min-w-[150px] flex-col p-2">
        <div className="flex justify-between gap-x-4">
          {/* Inputs */}
          <div className="flex flex-col gap-y-2">
            {inputs.map((input: any, index: number) => (
              <div key={input.id} className="flex h-8 items-center gap-x-2">
                <Handle
                  type="target"
                  id={input.id}
                  position={Position.Left}
                  className="!h-3 !w-3 !bg-zinc-400"
                  style={{ top: `${24 + index * 40}px` }}
                />
                <p className="pointer-events-none pl-1 text-xs">
                  {input.label}
                </p>
                {renderInput(input)}
              </div>
            ))}
          </div>
          {/* Outputs */}
          <div className="flex flex-col items-end gap-y-2">
            {outputs.map((output: any, index: number) => (
              <div key={output.id} className="flex h-8 items-center gap-x-2">
                <p className="pointer-events-none pr-1 text-xs">
                  {output.label}
                </p>
                <Handle
                  type="source"
                  id={output.id}
                  position={Position.Right}
                  className="!h-3 !w-3 !bg-zinc-400"
                  style={{ top: `${24 + index * 40}px` }}
                />
              </div>
            ))}
          </div>
        </div>
        {CustomBody && (
          <div className="p-2">
            <CustomBody
              id={nodeId}
              data={data}
              selected={selected}
              nodeNetworkId={nodeNetworkId}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default NodeRenderer;
