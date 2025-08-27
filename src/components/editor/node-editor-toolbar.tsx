import { MinusSquare, Redo2, Trash2, Undo2 } from 'lucide-react';
import { useNodeGraphClipboard } from '../../lib/hooks/use-node-graph-clipboard';
import { useNodeNetworkHistory } from '../../lib/hooks/use-node-network-history';
import { destructureParameterId } from '../../lib/id-utils';
import useAnimationLiveValuesStore from '../../lib/stores/animation-live-values-store';
import { NodeHandleType } from '../config/node-types';
import {
  useNodeNetwork,
  useNodeNetworkStore,
} from '../node-network/node-network-store';
import { getPresetsForType } from '../node-network/presets';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface NodeEditorToolbarProps {
  nodeNetworkId: string;
  reactFlowInstance: React.MutableRefObject<any>;
}

const NodeEditorToolbar = ({
  nodeNetworkId,
  reactFlowInstance,
}: NodeEditorToolbarProps) => {
  // Use history hook for undo/redo functionality
  const { undo, redo, canUndo, canRedo } = useNodeNetworkHistory(nodeNetworkId);

  // Use node network store for delete functionality
  const { nodes, edges, setNodes, setEdges } = useNodeNetwork(nodeNetworkId);

  // Get live output value using existing architecture
  const liveOutput = useAnimationLiveValuesStore(
    (state) => state.values[nodeNetworkId],
  );

  // Get parameter info using the generic function
  const parameterInfo = useNodeNetworkStore((state) => {
    const network = state.networks[nodeNetworkId];
    if (!network) return null;

    const destructured = destructureParameterId(nodeNetworkId);
    return {
      ...destructured,
      isEnabled: network.isEnabled,
    };
  });

  const applyPreset = (presetId: string) => {
    const store = useNodeNetworkStore.getState();
    // Derive output type from current Output node definition if present; fallback to number
    const network = store.networks[nodeNetworkId];
    let outputType: NodeHandleType = 'number';
    const outputNode = network?.nodes.find((n) =>
      n.id.includes('-output-node'),
    );
    const typeFromNode = (outputNode?.data as any)?.definition?.inputs?.[0]
      ?.type as NodeHandleType | undefined;
    if (typeFromNode) outputType = typeFromNode;
    store.applyPresetToNetwork(nodeNetworkId, presetId, outputType);
  };

  // Use clipboard hook for copy functionality
  const { copySelectedNodes } = useNodeGraphClipboard({
    parameterId: nodeNetworkId,
    reactFlowInstance,
  });

  const handleDelete = () => {
    if (!reactFlowInstance.current) return;

    const selectedNodes = reactFlowInstance.current
      .getNodes()
      .filter((node: any) => node.selected);

    if (selectedNodes.length === 0) return;

    const selectedNodeIds = selectedNodes.map((node: any) => node.id);

    // Filter out protected nodes (input/output)
    const deletableNodeIds = selectedNodeIds.filter(
      (id: string) =>
        !id.includes('-input-node') && !id.includes('-output-node'),
    );

    if (deletableNodeIds.length === 0) return;

    // Remove selected nodes
    const newNodes = nodes.filter(
      (node) => !deletableNodeIds.includes(node.id),
    );

    // Remove edges connected to deleted nodes
    const newEdges = edges.filter(
      (edge) =>
        !deletableNodeIds.includes(edge.source) &&
        !deletableNodeIds.includes(edge.target),
    );

    setNodes(newNodes);
    setEdges(newEdges);
  };

  // Check if there are any deletable selected nodes
  const hasDeletableSelection = () => {
    if (!reactFlowInstance.current) return false;

    const selectedNodes = reactFlowInstance.current
      .getNodes()
      .filter((node: any) => node.selected);

    return selectedNodes.some(
      (node: any) =>
        !node.id.includes('-input-node') && !node.id.includes('-output-node'),
    );
  };

  return (
    <div className="absolute left-4 right-4 top-4 z-10">
      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-4 py-2 backdrop-blur-md">
        {/* Left Section - Animation Info & Actions */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white">
              {parameterInfo?.componentName || 'Animation'}
            </span>
            <span className="text-xs text-white/60">
              {parameterInfo?.parameterName || 'Parameter'}
            </span>
          </div>
          <div className="h-5 w-px bg-white/20" />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-50"
              onClick={undo}
              disabled={!canUndo}>
              <Undo2 size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-50"
              onClick={redo}
              disabled={!canRedo}>
              <Redo2 size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-white/80 hover:bg-white/10 hover:text-white"
              onClick={handleDelete}
              disabled={!hasDeletableSelection()}>
              <Trash2 size={14} />
            </Button>
          </div>
        </div>

        {/* Right Section - Live Output Display */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-xs text-white/60">Live Output</span>
            <span className="font-mono text-sm text-white">
              {typeof liveOutput === 'number'
                ? liveOutput.toFixed(2)
                : liveOutput !== undefined
                  ? String(liveOutput)
                  : '0.00'}
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm">
                Presets
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64">
              <DropdownMenuLabel>Select preset</DropdownMenuLabel>
              {(() => {
                const store = useNodeNetworkStore.getState();
                const network = store.networks[nodeNetworkId];
                const outType = (
                  network?.nodes.find((n) => n.id.includes('-output-node'))
                    ?.data as any
                )?.definition?.inputs?.[0]?.type as NodeHandleType | undefined;
                const type: NodeHandleType = outType || 'number';
                const presets = getPresetsForType(type);
                if (presets.length === 0) {
                  return (
                    <DropdownMenuItem disabled>
                      No presets for {type}
                    </DropdownMenuItem>
                  ) as any;
                }
                return presets.map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    onClick={() => applyPreset(p.id)}>
                    {p.name}
                  </DropdownMenuItem>
                ));
              })()}
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Minimize pinned at far left */}
          <Button
            variant="ghostly"
            size="icon"
            onClick={() =>
              useNodeNetworkStore.getState().setNetworksMinimized(true)
            }>
            <MinusSquare size={20} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NodeEditorToolbar;
