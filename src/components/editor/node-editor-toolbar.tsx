import editorControl from '@/lib/editor-control';
import {
  describeProjectGraph,
  getRuntimeGraphValue,
  useCanRedo,
  useCanUndo,
  useVizSessionSelector,
} from '@/lib/viz-session';
import type { Edge, ReactFlowInstance } from '@xyflow/react';
import {
  Copy,
  FileJson,
  Minus,
  Plus,
  Redo2,
  Search,
  Trash2,
  Undo2,
} from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useNodeGraphClipboard } from '../../lib/hooks/use-node-graph-clipboard';
import { cn } from '../../lib/utils';
import { NodeHandleType } from '../config/node-types';
import type { GraphNode } from '../node-network/graph-types';
import { isProtectedGraphNode } from '../node-network/graph-types';
import { useGraphLiveUpdate } from '../node-network/live-update';
import {
  applyPresetToNodeNetwork,
  getNodeNetwork,
  removeNodesFromNetwork,
  useIsNetworkEnabled,
  useSpecificNetwork,
} from '../node-network/node-network-store';
import NodesSearch from '../node-network/nodes-search';
import { getPresetsForType } from '../node-network/presets';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import SearchSelect from '../ui/search-select';

interface NodeEditorToolbarProps {
  nodeNetworkId: string;
  reactFlowInstance: React.MutableRefObject<ReactFlowInstance<
    GraphNode,
    Edge
  > | null>;
  selectedNodeIds: readonly string[];
}

const NodeEditorToolbar = ({
  nodeNetworkId,
  reactFlowInstance,
  selectedNodeIds,
}: NodeEditorToolbarProps) => {
  // Add node popover state
  const [isAddNodeOpen, setIsAddNodeOpen] = useState(false);

  // History functions
  const undo = useCallback(() => {
    editorControl.history.undoNodeEditor(nodeNetworkId);
  }, [nodeNetworkId]);

  const redo = useCallback(() => {
    editorControl.history.redoNodeEditor(nodeNetworkId);
  }, [nodeNetworkId]);

  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  const project = useVizSessionSelector(
    (state) => state.project.workingProject,
  );

  // Get parameter info using the generic function
  // Only subscribe to isEnabled, not the entire network
  const isNetworkEnabled = useIsNetworkEnabled(nodeNetworkId);

  // Compute parameter info from networkId and layers
  const graphPresentation = useMemo(
    () => ({
      ...describeProjectGraph(project, nodeNetworkId),
      isEnabled: isNetworkEnabled,
    }),
    [nodeNetworkId, project, isNetworkEnabled],
  );

  const applyPreset = (presetId: string) => {
    // Derive output type from current Output node definition if present; fallback to number
    const network = getNodeNetwork(nodeNetworkId);
    let outputType: NodeHandleType = 'number';
    const outputNode = network?.nodes.find(
      (node) => node.data.graphOutputKey !== undefined,
    );
    const typeFromNode = outputNode?.data.definition.inputs[0]?.type as
      NodeHandleType | undefined;
    if (typeFromNode) outputType = typeFromNode;
    applyPresetToNodeNetwork(nodeNetworkId, presetId, outputType);
  };

  // Use clipboard hook for copy functionality
  const { copyAllNodes } = useNodeGraphClipboard({
    parameterId: nodeNetworkId,
    reactFlowInstance,
  });

  const handleDelete = () => {
    const network = getNodeNetwork(nodeNetworkId);
    if (!network) return;
    const selectedIds = new Set(selectedNodeIds);
    const deletableNodeIds = network.nodes
      .filter((node) => selectedIds.has(node.id) && !isProtectedGraphNode(node))
      .map((node) => node.id);

    if (deletableNodeIds.length === 0) return;
    removeNodesFromNetwork(nodeNetworkId, deletableNodeIds);
  };

  const selectedIds = new Set(selectedNodeIds);
  const hasDeletableSelection =
    getNodeNetwork(nodeNetworkId)?.nodes.some(
      (node) => selectedIds.has(node.id) && !isProtectedGraphNode(node),
    ) ?? false;

  const handleCopyGraphJson = async () => {
    const graph = project.graphs?.find(
      (candidate) => candidate.id === nodeNetworkId,
    );
    if (!graph) return;

    try {
      await navigator.clipboard.writeText(JSON.stringify(graph, null, 2));
      toast.success('Graph JSON copied to clipboard');
    } catch (e) {
      console.error('Failed to copy graph JSON', e);
      toast.error('Failed to copy graph JSON');
    }
  };

  const handleCopyNetwork = () => {
    copyAllNodes();
    toast.success('Network copied to clipboard');
  };

  // Get center position of viewport for adding nodes
  const getCenterPosition = () => {
    if (!reactFlowInstance.current) {
      return { x: 0, y: 0 };
    }
    // Get the current viewport
    const viewport = reactFlowInstance.current.getViewport();
    // Get the center in flow coordinates
    return {
      x: -viewport.x / viewport.zoom + 400,
      y: -viewport.y / viewport.zoom + 300,
    };
  };

  return (
    <div className="absolute top-4 right-4 left-4 z-10">
      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-4 py-2 backdrop-blur-md">
        {/* Left Section - Animation Info & Actions */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-white">
              {graphPresentation.displayName}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-white/60">
              <span>{graphPresentation.contextLabel}</span>
              {graphPresentation.detailLabel && (
                <>
                  <span>›</span>
                  <span>{graphPresentation.detailLabel}</span>
                </>
              )}
            </div>
          </div>
          <div className="h-5 w-px bg-white/20" />
          <div className="flex items-center gap-2">
            <Popover open={isAddNodeOpen} onOpenChange={setIsAddNodeOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-white/80 hover:bg-white/10 hover:text-white"
                  aria-label="Add graph node"
                  tooltip="Add Node">
                  <Plus size={14} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="start">
                <NodesSearch
                  networkId={nodeNetworkId}
                  mousePosition={{ x: 0, y: 0 }}
                  getCanvasPosition={getCenterPosition}
                  onNodeAdded={() => setIsAddNodeOpen(false)}
                />
              </PopoverContent>
            </Popover>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-50"
              aria-label="Undo graph edit"
              onClick={undo}
              disabled={!canUndo}
              tooltip="Undo">
              <Undo2 size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-50"
              aria-label="Redo graph edit"
              onClick={redo}
              disabled={!canRedo}
              tooltip="Redo">
              <Redo2 size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-white/80 hover:bg-white/10 hover:text-white"
              aria-label="Delete selected graph nodes"
              onClick={handleDelete}
              disabled={!hasDeletableSelection}
              tooltip="Delete">
              <Trash2 size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-white/80 hover:bg-white/10 hover:text-white"
              aria-label="Copy canonical graph JSON"
              onClick={handleCopyGraphJson}
              tooltip="Copy graph JSON">
              <FileJson size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-white/80 hover:bg-white/10 hover:text-white"
              aria-label="Copy graph"
              onClick={handleCopyNetwork}
              tooltip="Copy network">
              <Copy size={14} />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {graphPresentation.outputKeys.length === 1 ? (
            <LiveValueDisplay
              nodeNetworkId={nodeNetworkId}
              outputKey={graphPresentation.outputKeys[0]}
            />
          ) : (
            <span className="font-mono text-xs text-white/60">
              {graphPresentation.outputKeys.length} live outputs
            </span>
          )}
          {graphPresentation.supportsParameterPresets && (
            <PresetsSelect
              nodeNetworkId={nodeNetworkId}
              onPresetSelect={applyPreset}
            />
          )}
          <Button
            variant="ghostly"
            size="icon"
            tooltip="Close"
            aria-label="Close graph editor"
            className="-mx-2"
            onClick={() => editorControl.nodeEditor.closeNetwork()}>
            <Minus size={20} />
          </Button>
        </div>
      </div>
    </div>
  );
};

interface LiveValueDisplayProps {
  nodeNetworkId: string;
  outputKey?: string;
}

const LiveValueDisplay = ({
  nodeNetworkId,
  outputKey = 'value',
}: LiveValueDisplayProps) => {
  const ref = useRef<HTMLSpanElement>(null);

  useGraphLiveUpdate(() => {
    if (!ref.current) return;
    const value = getRuntimeGraphValue(nodeNetworkId, outputKey);

    if (value !== undefined) {
      if (typeof value === 'number') {
        ref.current.innerText = value.toFixed(2);
      } else {
        ref.current.innerText = String(value);
      }
    } else {
      ref.current.innerText = '0.00';
    }
  });

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs whitespace-nowrap text-white/60">
        Live Output
      </span>
      <span
        ref={ref}
        data-testid="graph-live-output"
        className="font-mono text-sm text-white">
        0.00
      </span>
    </div>
  );
};

interface PresetsSelectProps {
  nodeNetworkId: string;
  onPresetSelect: (presetId: string) => void;
}

const PresetsSelect = ({
  nodeNetworkId,
  onPresetSelect,
}: PresetsSelectProps) => {
  const network = useSpecificNetwork(nodeNetworkId);
  const outType = network?.nodes.find(
    (node) => node.data.graphOutputKey !== undefined,
  )?.data.definition.inputs[0]?.type as NodeHandleType | undefined;
  const type: NodeHandleType = outType || 'number';
  const presets = getPresetsForType(type);

  // Check if there are any nodes in the network (indicating active animations)
  const hasActiveAnimations = network?.nodes && network.nodes.length > 0;

  return (
    <SearchSelect
      ariaLabel="Load graph preset"
      triggerClassName="bg-white/10"
      trigger={
        <div className="flex items-center gap-2">
          <Search
            className={cn(
              'h-4 w-4',
              hasActiveAnimations ? 'text-purple-300' : 'text-foreground',
            )}
          />
          <span
            className={cn(
              hasActiveAnimations ? 'text-purple-300' : 'text-foreground',
            )}>
            Load Presets
          </span>
        </div>
      }
      options={presets}
      extractKey={(preset) => preset.name}
      renderOption={(preset) => (
        <div className="flex flex-col">
          <span className="font-medium">{preset.name}</span>
          {preset.description && (
            <span className="text-xs text-zinc-400">{preset.description}</span>
          )}
        </div>
      )}
      placeholder="Search presets..."
      noItemsMessage={`No presets available for ${type} type`}
      dropdownWidth={300}
      align="right"
      onSelect={(preset) => onPresetSelect(preset.id)}
    />
  );
};

export default NodeEditorToolbar;
