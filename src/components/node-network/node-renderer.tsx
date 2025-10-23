import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { destructureParameterId } from '@/lib/id-utils';
import useLayerStore from '@/lib/stores/layer-store';
import { cn } from '@/lib/utils';
import { Handle, Position, useConnection } from '@xyflow/react';
import { Info } from 'lucide-react';
import { useRef, useState } from 'react';
import { MATH_OPERATIONS } from '../config/math-operations';
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
  const isOutputNode = label === 'Output';

  // For output nodes, get the layer name from nodeNetworkId
  // Only read the layer name when needed, not the entire layers array
  const layerInfo = isOutputNode ? destructureParameterId(nodeNetworkId) : null;
  const layerName = useLayerStore((state) => {
    if (!isOutputNode || !layerInfo) return null;
    const layer = state.layers.find((l) => l.id === layerInfo.layerId);
    return layer?.comp.name || layerInfo.componentName;
  });

  // Get parameter info for output node label
  const parameterInfo =
    isOutputNode && layerInfo
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
    <div className="relative">
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
                    nodeId={nodeId}
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
                    nodeId={nodeId}
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
    </div>
  );
};

interface RenderHandleProps {
  io: any;
  position: Position;
  type: 'source' | 'target';
  index: number;
  nodeId: string;
}

const ConnectionHandle = ({
  io,
  position,
  type,
  index,
  nodeId,
}: RenderHandleProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const handleRef = useRef<HTMLDivElement>(null);
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

  const handleOverlayMouseDown = (e: React.MouseEvent) => {
    const handleElement = handleRef.current;

    if (handleElement) {
      console.log('Clicking handle:', io.id, 'on node:', nodeId);
      // Get the center of the small handle
      const rect = handleElement.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Temporarily hide the overlay to prevent interference
      const overlay = e.currentTarget as HTMLElement;
      overlay.style.pointerEvents = 'none';

      // Create and dispatch mousedown at the center of the handle
      const mouseDownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: centerX,
        clientY: centerY,
        screenX: e.screenX,
        screenY: e.screenY,
        button: 0,
        buttons: 1,
      });

      handleElement.dispatchEvent(mouseDownEvent);

      // Re-enable overlay after a short delay
      setTimeout(() => {
        overlay.style.pointerEvents = 'all';
      }, 100);
    } else {
      console.error('Handle ref not available for:', io.id);
    }
  };

  return (
    <>
      {/* Actual handle - small and positioned normally */}
      <Handle
        ref={handleRef}
        type={type}
        id={io.id}
        position={position}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group !h-3 !w-3"
        style={{
          top: `${24 + index * 40}px`,
          cursor: 'crosshair',
          backgroundColor: handleColor,
          border: `1px solid ${shouldGlow ? '#ffffff' : handleColor}`,
          boxShadow: shouldGlow
            ? `0 0 8px ${handleColor}`
            : '0 0 0 1px rgba(0,0,0,0.3)',
        }}
      />

      {/* Larger invisible overlay - sibling, not child */}
      <div
        className="nodrag nopan absolute cursor-crosshair rounded-full"
        onMouseDown={handleOverlayMouseDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          top: `${24 + index * 40}px`,
          transform: 'translate(-50%, -50%)',
          left: position === Position.Left ? '0' : 'auto',
          right: position === Position.Right ? '-40px' : 'auto',
          width: '40px',
          height: '40px',
          backgroundColor: 'transparent',
          pointerEvents: 'all',
        }}
      />
    </>
  );
};

export default NodeRenderer;
