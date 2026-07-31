import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { destructureParameterId } from '@/lib/id-utils';
import { useProjectedLayers } from '@/lib/projected-layers';
import { cn } from '@/lib/utils';
import type { VizNodeAuthoringIo } from '@viz-engine/nodes-core';
import { Handle, Position, useConnection, type NodeProps } from '@xyflow/react';
import { Info } from 'lucide-react';
import { useState } from 'react';
import { MATH_OPERATIONS } from '../config/math-operations';
import {
  NodeHandleType,
  getTypeColor,
  getTypeLabel,
} from '../config/node-types';
import SimpleTooltip from '../ui/simple-tooltip';
import LiveValue from './live-value';
import NodeLiteralInput from './node-literal-input';
import { GraphNode, useNodeNetwork } from './node-network-store';

type NodeRendererProps = Pick<
  NodeProps<GraphNode>,
  'id' | 'data' | 'selected'
> & {
  nodeNetworkId: string;
};

const NodeRenderer = ({
  id: nodeId,
  data,
  selected,
  nodeNetworkId,
}: NodeRendererProps) => {
  const { definition, inputValues } = data;
  const { label, inputs, outputs, customBody: CustomBody } = definition;

  const {
    edges,
    updateInputValue,
    beginInputGesture,
    updateLiveInputValue,
    commitInputGesture,
    cancelInputGesture,
  } = useNodeNetwork(nodeNetworkId);

  // Check if this is a protected node (input/output)
  const isProtectedNode = label === 'Input' || label === 'Output';
  const isOutputNode = label === 'Output';
  const graphOutputKey = data.graphOutputKey;

  // For output nodes, get the layer name from nodeNetworkId
  // Only read the layer name when needed, not the entire layers array
  const layerInfo = isOutputNode ? destructureParameterId(nodeNetworkId) : null;
  const projectedLayers = useProjectedLayers();
  const layerName =
    isOutputNode && layerInfo
      ? (projectedLayers.find((layer) => layer.id === layerInfo.layerId)?.comp
          .name ?? layerInfo.componentName)
      : null;

  // Get parameter info for output node label
  const parameterInfo = graphOutputKey
    ? {
        displayName: graphOutputKey
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (character) => character.toUpperCase()),
        layerName: 'Graph output',
        groupPath: null,
      }
    : isOutputNode && layerInfo
      ? {
          ...layerInfo,
          layerName: layerName || layerInfo.componentName,
        }
      : null;

  // Get the output type for display in header
  const getNodeHeaderText = () => {
    if (label === 'Output' && inputs.length > 0) {
      const outputType = inputs[0].type as NodeHandleType;
      const typeLabel = getTypeLabel(outputType);
      return `${label} (${typeLabel})`;
    }
    return label;
  };

  const renderInput = (input: VizNodeAuthoringIo) => {
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
      case 'math-op':
        return (
          <Select
            value={inputValues[input.id] ?? ''}
            onValueChange={(value) =>
              updateInputValue(nodeId, input.id, value)
            }>
            <SelectTrigger className="nodrag nopan h-6 w-24 bg-zinc-800 text-xs">
              <SelectValue placeholder="Select op" />
            </SelectTrigger>
            <SelectContent>
              {MATH_OPERATIONS.map((op) => (
                <SelectItem key={op} value={op}>
                  {op}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'number':
        return (
          <NodeLiteralInput
            kind="number"
            className="nodrag nopan h-6 w-16 bg-zinc-800 text-xs"
            value={inputValues[input.id] ?? ''}
            onBegin={beginInputGesture}
            onTransientChange={(value) =>
              updateLiveInputValue(nodeId, input.id, value)
            }
            onCommit={commitInputGesture}
            onCancel={cancelInputGesture}
          />
        );
      case 'string':
        return (
          <NodeLiteralInput
            kind="string"
            className="nodrag nopan h-6 w-24 bg-zinc-800 text-xs"
            value={inputValues[input.id] ?? ''}
            onBegin={beginInputGesture}
            onTransientChange={(value) =>
              updateLiveInputValue(nodeId, input.id, value)
            }
            onCommit={commitInputGesture}
            onCancel={cancelInputGesture}
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
      className="relative"
      data-testid="graph-node"
      data-graph-node-id={nodeId}>
      {/* Floating label above output node */}
      {isOutputNode && parameterInfo && (
        <div className="pointer-events-none absolute bottom-full left-0 mb-2">
          <div className="flex flex-col gap-0.5">
            <div className="text-xs font-semibold text-white">
              {parameterInfo.displayName}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-white/60">
              <span>{parameterInfo.layerName}</span>
              {parameterInfo.groupPath && (
                <>
                  <span>›</span>
                  <span>{parameterInfo.groupPath}</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      <div
        className={cn(
          'rounded-lg border shadow-md',
          isProtectedNode
            ? 'border-blue-500 bg-zinc-900'
            : 'border-zinc-700 bg-zinc-900',
          selected && 'border-animation-purple shadow-lg',
        )}>
        <div className="flex w-full items-center justify-between gap-2 rounded-t-lg bg-zinc-800 px-2 py-1">
          <p className="text-xs font-bold select-none">{getNodeHeaderText()}</p>
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
              {inputs.map((input, index) => (
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
              {outputs.map((output, index) => (
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
                selected={selected ?? false}
                nodeNetworkId={nodeNetworkId}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface RenderHandleProps {
  io: VizNodeAuthoringIo;
  position: Position;
  type: 'source' | 'target';
  index: number;
}

const ConnectionHandle = ({ io, position, type, index }: RenderHandleProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const connection = useConnection();
  const handleColor = getTypeColor(io.type as NodeHandleType);

  // Check if a connection is currently being made
  const isConnecting = !!connection.inProgress;

  // Check if this handle is valid for the current connection
  const isValidTarget =
    isConnecting &&
    ((type === 'target' && connection.fromHandle?.type === 'source') ||
      (type === 'source' && connection.fromHandle?.type === 'target'));

  // Determine if handle should glow
  const shouldGlow = isHovered || (isConnecting && isValidTarget);

  return (
    <Handle
      type={type}
      id={io.id}
      position={position}
      aria-label={`${type === 'source' ? 'Output' : 'Input'} ${io.label} (${getTypeLabel(io.type as NodeHandleType)})`}
      data-handle-value-type={io.type}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group !flex !h-6 !w-6 !items-center !justify-center !border-0 !bg-transparent"
      style={{
        top: `${24 + index * 40}px`,
        cursor: 'crosshair',
      }}>
      <span
        className="pointer-events-none block h-3 w-3 rounded-full"
        style={{
          backgroundColor: handleColor,
          border: `1px solid ${shouldGlow ? '#ffffff' : handleColor}`,
          boxShadow: shouldGlow
            ? `0 0 8px ${handleColor}`
            : '0 0 0 1px rgba(0,0,0,0.3)',
        }}
      />
    </Handle>
  );
};

export default NodeRenderer;
