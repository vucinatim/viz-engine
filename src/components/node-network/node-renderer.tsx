import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Handle, Position } from '@xyflow/react';
import { Info } from 'lucide-react';
import {
  NodeHandleType,
  getTypeColor,
  getTypeLabel,
} from '../config/node-types';
import SimpleTooltip from '../ui/simple-tooltip';
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
  const {
    label,
    inputs,
    outputs,
    customBody: CustomBody,
  } = definition ||
  ({
    label: 'Unknown',
    inputs: [],
    outputs: [],
  } as any);

  const { edges, updateInputValue } = useNodeNetwork(nodeNetworkId);

  // Check if this is a protected node (input/output)
  const isProtectedNode = label === 'Input' || label === 'Output';

  // Get the output type for display in header
  const getNodeHeaderText = () => {
    if (label === 'Output' && inputs.length > 0) {
      const outputType = inputs[0].type as NodeHandleType;
      const typeLabel = getTypeLabel(outputType);
      return `${label} (${typeLabel})`;
    }
    return label;
  };

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
      case 'boolean':
        return (
          <input
            type="checkbox"
            className="nodrag nopan h-3 w-3"
            checked={!!inputValues[input.id]}
            onChange={(e) =>
              updateInputValue(nodeId, input.id, e.target.checked)
            }
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border shadow-md',
        isProtectedNode
          ? 'border-blue-500 bg-zinc-900/50'
          : 'border-zinc-700 bg-zinc-900',
        selected && 'border-purple-500 shadow-lg',
      )}>
      <div className="flex w-full items-center justify-between gap-2 rounded-t-lg bg-zinc-800 px-2 py-1">
        <p className="select-none text-xs font-bold">{getNodeHeaderText()}</p>
        {definition?.description && (
          <SimpleTooltip
            text={definition.description}
            trigger={<Info className="h-3 w-3 opacity-70" />}
          />
        )}
      </div>
      <div className="relative flex min-w-[150px] flex-col p-2">
        <div className="flex justify-between gap-x-4">
          {/* Inputs */}
          <div className="flex flex-col gap-y-2">
            {(inputs || []).map((input: any, index: number) => (
              <div key={input.id} className="flex h-8 items-center gap-x-2">
                <ConnectionHandle
                  io={input}
                  position={Position.Left}
                  type="target"
                  index={index}
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
            {(outputs || []).map((output: any, index: number) => (
              <div key={output.id} className="flex h-8 items-center gap-x-2">
                <p className="pointer-events-none pr-1 text-xs">
                  {output.label}
                </p>
                <ConnectionHandle
                  io={output}
                  position={Position.Right}
                  type="source"
                  index={index}
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

interface RenderHandleProps {
  io: any;
  position: Position;
  type: 'source' | 'target';
  index: number;
}

const ConnectionHandle = ({ io, position, type, index }: RenderHandleProps) => {
  const handleColor = getTypeColor(io.type as NodeHandleType);
  return (
    <Handle
      type={type}
      id={io.id}
      position={position}
      className="!h-3 !w-3"
      style={{
        top: `${24 + index * 40}px`,
        backgroundColor: handleColor,
        border: `2px solid ${handleColor}`,
        boxShadow: '0 0 0 2px rgba(0,0,0,0.1)',
      }}
    />
  );
};

export default NodeRenderer;
