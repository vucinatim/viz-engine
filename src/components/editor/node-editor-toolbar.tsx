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
import { useRafLoop } from 'react-use';
import { toast } from 'sonner';
import { useNodeGraphClipboard } from '../../lib/hooks/use-node-graph-clipboard';
import { destructureParameterId } from '../../lib/id-utils';
import useAnimationLiveValuesStore from '../../lib/stores/animation-live-values-store';
import { useHistoryStore } from '../../lib/stores/history-store';
import useLayerStore from '../../lib/stores/layer-store';
import { cn } from '../../lib/utils';
import { NodeHandleType } from '../config/node-types';
import { useNodeNetworkStore } from '../node-network/node-network-store';
import NodesSearch from '../node-network/nodes-search';
import { getPresetsForType } from '../node-network/presets';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import SearchSelect from '../ui/search-select';

interface NodeEditorToolbarProps {
  nodeNetworkId: string;
  reactFlowInstance: React.MutableRefObject<any>;
}

const NodeEditorToolbar = ({
  nodeNetworkId,
  reactFlowInstance,
}: NodeEditorToolbarProps) => {
  // Add node popover state
  const [isAddNodeOpen, setIsAddNodeOpen] = useState(false);

  // History functions
  const undo = useCallback(() => {
    useHistoryStore.getState().undoNodeEditor(nodeNetworkId);
  }, [nodeNetworkId]);

  const redo = useCallback(() => {
    useHistoryStore.getState().redoNodeEditor(nodeNetworkId);
  }, [nodeNetworkId]);

  const canUndo = useHistoryStore(
    (state) => (state.nodeHistories[nodeNetworkId]?.past.length || 0) > 0,
  );
  const canRedo = useHistoryStore(
    (state) => (state.nodeHistories[nodeNetworkId]?.future.length || 0) > 0,
  );

  // Get store functions without subscribing to data that changes frequently
  const setNodesInNetwork = useNodeNetworkStore(
    (state) => state.setNodesInNetwork,
  );
  const setEdgesInNetwork = useNodeNetworkStore(
    (state) => state.setEdgesInNetwork,
  );
  const layers = useLayerStore((state) => state.layers);

  // Create wrapper functions to match the expected interface
  const setNodes = (newNodes: any[]) =>
    setNodesInNetwork(nodeNetworkId, newNodes);
  const setEdges = (newEdges: any[]) =>
    setEdgesInNetwork(nodeNetworkId, newEdges);

  // Get parameter info using the generic function
  // Only subscribe to isEnabled, not the entire network
  const isNetworkEnabled = useNodeNetworkStore(
    (state) => state.networks[nodeNetworkId]?.isEnabled ?? false,
  );

  // Compute parameter info from networkId and layers
  const parameterInfo = useMemo(() => {
    const destructured = destructureParameterId(nodeNetworkId);
    const layer = layers.find((l) => l.id === destructured.layerId);
    return {
      ...destructured,
      layerName: layer?.comp.name || destructured.componentName,
      isEnabled: isNetworkEnabled,
    };
  }, [nodeNetworkId, layers, isNetworkEnabled]);

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

    // Get current nodes and edges from store when needed
    const store = useNodeNetworkStore.getState();
    const network = store.networks[nodeNetworkId];
    if (!network) return;

    const { nodes, edges } = network;

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

  const handleCopyGraphJson = async () => {
    const store = useNodeNetworkStore.getState();
    const network = store.networks[nodeNetworkId];
    if (!network) return;

    const safeNodes = network.nodes.map((node) => {
      const def: any = node.data.definition as any;
      let serializedDefinition: any = def;
      if (def && def.label === 'Output') {
        const type = def.inputs?.[0]?.type;
        serializedDefinition = { label: 'Output', type };
      } else if (def && typeof def.label === 'string') {
        serializedDefinition = def.label;
      }
      return {
        ...node,
        data: {
          ...node.data,
          definition: serializedDefinition,
        },
      } as any;
    });

    const payload = {
      name: network.name,
      isEnabled: network.isEnabled,
      isMinimized: network.isMinimized ?? false,
      nodes: safeNodes,
      edges: network.edges,
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      toast.success('Graph JSON copied to clipboard');
    } catch (e) {
      console.error('Failed to copy graph JSON', e);
      toast.error('Failed to copy graph JSON');
    }
  };

  const handleCopyNetwork = () => {
    copySelectedNodes();
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
    <div className="absolute left-4 right-4 top-4 z-10">
      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-4 py-2 backdrop-blur-md">
        {/* Left Section - Animation Info & Actions */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-white">
              {parameterInfo?.displayName || 'Parameter'}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-white/60">
              <span>{parameterInfo?.layerName || 'Layer'}</span>
              {parameterInfo?.groupPath && (
                <>
                  <span>›</span>
                  <span>{parameterInfo.groupPath}</span>
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
              onClick={undo}
              disabled={!canUndo}
              tooltip="Undo">
              <Undo2 size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-50"
              onClick={redo}
              disabled={!canRedo}
              tooltip="Redo">
              <Redo2 size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-white/80 hover:bg-white/10 hover:text-white"
              onClick={handleDelete}
              disabled={!hasDeletableSelection()}
              tooltip="Delete">
              <Trash2 size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-white/80 hover:bg-white/10 hover:text-white"
              onClick={handleCopyGraphJson}
              tooltip="Copy graph JSON">
              <FileJson size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-white/80 hover:bg-white/10 hover:text-white"
              onClick={handleCopyNetwork}
              tooltip="Copy network">
              <Copy size={14} />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <LiveValueDisplay nodeNetworkId={nodeNetworkId} />
          <PresetsSelect
            nodeNetworkId={nodeNetworkId}
            onPresetSelect={applyPreset}
          />
          <Button
            variant="ghostly"
            size="icon"
            tooltip="Close"
            className="-mx-2"
            onClick={() => useNodeNetworkStore.getState().setOpenNetwork(null)}>
            <Minus size={20} />
          </Button>
        </div>
      </div>
    </div>
  );
};

interface LiveValueDisplayProps {
  nodeNetworkId: string;
}

const LiveValueDisplay = ({ nodeNetworkId }: LiveValueDisplayProps) => {
  const ref = useRef<HTMLSpanElement>(null);

  useRafLoop(() => {
    if (!ref.current) return;
    const value = useAnimationLiveValuesStore.getState().values[nodeNetworkId];

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
      <span className="whitespace-nowrap text-xs text-white/60">
        Live Output
      </span>
      <span ref={ref} className="font-mono text-sm text-white">
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
  const store = useNodeNetworkStore.getState();
  const network = store.networks[nodeNetworkId];
  const outType = (
    network?.nodes.find((n) => n.id.includes('-output-node'))?.data as any
  )?.definition?.inputs?.[0]?.type as NodeHandleType | undefined;
  const type: NodeHandleType = outType || 'number';
  const presets = getPresetsForType(type);

  // Check if there are any nodes in the network (indicating active animations)
  const hasActiveAnimations = network?.nodes && network.nodes.length > 0;

  return (
    <SearchSelect
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
