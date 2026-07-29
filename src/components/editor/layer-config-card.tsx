import editorControl from '@/lib/editor-control';
import { LayerData } from '@/lib/stores/editor-layer-projection-store';
import { getVizSessionState } from '@/lib/viz-session';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Bug,
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  Layers2,
  Trash,
} from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';
import SearchSelect from '../ui/search-select';
import LayerParameters from './layer-parameters';
import LayerPreview from './layer-preview';
import LayerSettings from './layer-settings';

interface LayerConfigCardProps {
  index: number;
  layer: LayerData;
}

const getCanonicalLayerValues = (layerId: string) =>
  getVizSessionState().project.workingProject.layers.find(
    (layer) => layer.id === layerId,
  )?.settings;

function LayerConfigCard({ index, layer }: LayerConfigCardProps) {
  const comp = layer.comp;
  const [selectedPreset, setSelectedPreset] = useState<any | null>();
  const hasInitialized = useRef(false);

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: layer.id });

  // Initialize layer values from store on mount
  useEffect(() => {
    if (hasInitialized.current) return;
    const storeValues = getCanonicalLayerValues(layer.id);
    const valuesToUse = storeValues ?? layer.comp.defaultValues;
    layer.config.setValues(valuesToUse);
    hasInitialized.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layer.id]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Collapsible
      open={layer.isExpanded}
      onOpenChange={(open) => {
        editorControl.project.setLayerExpanded(layer.id, open);
      }}
      className="w-full">
      <div className="group relative">
        <div
          ref={setNodeRef}
          style={style}
          className="sticky top-0 z-20 border-b border-zinc-600">
          <div className="flex overflow-hidden bg-gradient-to-b from-zinc-900 to-zinc-900/90 backdrop-blur-sm transition-colors group-hover:from-zinc-700/70 group-hover:to-zinc-700/50 group-hover:backdrop-blur-md">
            <div
              {...attributes}
              {...listeners}
              className={cn(
                'flex w-6 shrink-0 cursor-grab flex-col items-center justify-center overflow-hidden bg-zinc-400/5 transition-all',
                layer.isExpanded && 'w-0 opacity-0',
              )}>
              <GripVertical className="h-4 w-4" />
            </div>
            <CollapsibleTrigger asChild>
              <div className="flex grow cursor-pointer flex-col gap-y-4 px-4 py-4 transition-colors hover:bg-zinc-800/30">
                <div className="flex h-16 gap-x-4">
                  <div className="flex grow flex-col gap-y-2 overflow-y-auto">
                    <h2 className="flex select-none items-start text-sm font-semibold">
                      <div className="mr-2 h-5 w-5 shrink-0 rounded-md bg-gradient-to-br from-zinc-200 to-zinc-500 text-center font-bold text-black opacity-20">
                        {index + 1}
                      </div>
                      {comp.name}
                    </h2>
                    <p className="select-none text-xs">{comp.description}</p>
                  </div>
                  <div
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}>
                    <LayerPreview layer={layer} />
                  </div>
                </div>

                <div
                  className="pointer-events-none flex select-none items-center gap-x-2"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}>
                  <Button
                    size="iconMini"
                    variant="defaultLighter"
                    tooltip="Delete layer"
                    className="pointer-events-auto"
                    onClick={() => editorControl.project.removeLayer(layer.id)}>
                    <Trash className="h-6 w-6" />
                  </Button>
                  <Button
                    size="iconMini"
                    variant="defaultLighter"
                    tooltip="Duplicate layer"
                    className="pointer-events-auto"
                    onClick={() =>
                      editorControl.project.duplicateLayer(layer.id)
                    }>
                    <Layers2 className="h-6 w-6" />
                  </Button>
                  <Button
                    size="iconMini"
                    variant="defaultLighter"
                    tooltip="Enable/Disable debug overlay"
                    className={cn(
                      'pointer-events-auto',
                      layer.isDebugEnabled ? 'border border-white' : '',
                    )}
                    onClick={() =>
                      editorControl.project.setLayerDebugEnabled(
                        layer.id,
                        !layer.isDebugEnabled,
                      )
                    }>
                    <Bug className="h-6 w-6" />
                  </Button>
                  <Button
                    size="iconMini"
                    variant="defaultLighter"
                    tooltip="Copy layer settings to clipboard as JSON"
                    className="pointer-events-auto"
                    onClick={() => {
                      const currentValues =
                        getCanonicalLayerValues(layer.id) ??
                        layer.comp.defaultValues;
                      const json = JSON.stringify(currentValues, null, 2);
                      navigator.clipboard.writeText(json);
                      toast.success('Layer settings copied to clipboard!');
                    }}>
                    <Copy className="h-6 w-6" />
                  </Button>

                  <div className="grow" />
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghostly"
                      className="pointer-events-auto h-7 px-2"
                      tooltip="Open/Close layer settings">
                      <div className="flex cursor-pointer items-center gap-x-2">
                        <p className="grow select-none text-xs">Settings</p>
                        {layer.isExpanded ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent className="space-y-2 transition-colors group-hover:bg-zinc-800/30">
          <div className="flex flex-col">
            <div className="z-10 flex select-none flex-col gap-y-3 bg-gradient-to-b from-zinc-900 to-transparent px-4 pb-4 pt-4 transition-colors group-hover:bg-zinc-700/20">
              <LayerSettings layer={layer} />
              {comp.presets && comp.presets.length > 0 && (
                <SearchSelect
                  trigger={
                    <p>{selectedPreset?.name ?? 'Select a preset...'}</p>
                  }
                  triggerClassName="bg-white/70 text-black hover:bg-black/40"
                  options={comp.presets}
                  extractKey={(preset) => preset.name}
                  renderOption={(preset) => <div>{preset.name}</div>}
                  noItemsMessage="No presets available."
                  keepOpenOnSelect={true}
                  onSelect={(preset) => {
                    setSelectedPreset(preset);
                    editorControl.project.applyLayerPreset(layer.id, preset);
                  }}
                />
              )}
            </div>
            <div className="relative flex select-none flex-col gap-y-2 border-b border-zinc-600 transition-colors group-hover:bg-zinc-700/20">
              <LayerParameters layerId={layer.id} config={layer.config} />
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// Memoize to prevent re-renders when other layers change
export default memo(LayerConfigCard, (prevProps, nextProps) => {
  // Only re-render if this specific layer or its index changed
  return (
    prevProps.index === nextProps.index && prevProps.layer === nextProps.layer
  );
});
