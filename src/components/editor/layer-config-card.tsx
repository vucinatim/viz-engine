import useLayerStore, { LayerData } from '@/lib/stores/layer-store';
import useLayerValuesStore from '@/lib/stores/layer-values-store';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Bug,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Layers2,
  Trash,
} from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';
import DynamicForm from '../config/dynamic-form';
import { Button } from '../ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';
import SearchSelect from '../ui/search-select';
import LayerPreview from './layer-preview';
import LayerSettings from './layer-settings';

interface LayerConfigCardProps {
  index: number;
  layer: LayerData;
}

function LayerConfigCard({ index, layer }: LayerConfigCardProps) {
  const comp = layer.comp;
  const updateLayerComp = useLayerStore((state) => state.updateLayerComp);
  const removeLayer = useLayerStore((state) => state.removeLayer);
  const duplicateLayer = useLayerStore((state) => state.duplicateLayer);
  const setIsLayerExpanded = useLayerStore((state) => state.setIsLayerExpanded);
  const setDebugEnabled = useLayerStore((state) => state.setDebugEnabled);
  const [selectedPreset, setSelectedPreset] = useState<any | null>();
  const hasInitialized = useRef(false);
  const [initialValues, setInitialValues] = useState<any | null>(null);

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: layer.id });

  // When the persisted values are loaded, sync them with the config instance
  useEffect(() => {
    if (hasInitialized.current) return;
    const storeValues = useLayerValuesStore.getState().values[layer.id];
    const valuesToUse = storeValues ?? layer.comp.defaultValues;
    layer.config.setValues(valuesToUse);
    setInitialValues(valuesToUse);
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
        console.log('Setting layer expanded', layer.id, open);
        setIsLayerExpanded(layer.id, open);
      }}
      className="w-full">
      <div className="relative">
        <div
          ref={setNodeRef}
          style={style}
          className="sticky top-0 z-20 border-b border-zinc-600">
          <div className="flex overflow-hidden bg-gradient-to-b from-zinc-900 to-zinc-900/90 backdrop-blur-sm">
            <div
              {...attributes}
              {...listeners}
              className={cn(
                'flex w-6 shrink-0 cursor-grab flex-col items-center justify-center overflow-hidden bg-zinc-400/5 transition-all',
                layer.isExpanded && 'w-0 opacity-0',
              )}>
              <GripVertical className="h-4 w-4" />
            </div>
            <div className="flex grow flex-col gap-y-4 px-4 py-4">
              <div className="flex h-16 gap-x-4">
                <div className="flex grow flex-col gap-y-2 overflow-y-auto">
                  <h2 className="flex items-start text-sm font-semibold">
                    <div className="mr-2 h-5 w-5 shrink-0 rounded-md bg-gradient-to-br from-zinc-200 to-zinc-500 text-center font-bold text-black opacity-20">
                      {index + 1}
                    </div>
                    {comp.name}
                  </h2>
                  <p className="text-xs">{comp.description}</p>
                </div>
                <LayerPreview layer={layer} />
              </div>

              <div className="flex select-none items-center gap-x-2">
                <Button
                  size="iconMini"
                  variant="defaultLighter"
                  tooltip="Delete layer"
                  onClick={() => removeLayer(layer.id)}>
                  <Trash className="h-6 w-6" />
                </Button>
                <Button
                  size="iconMini"
                  variant="defaultLighter"
                  tooltip="Duplicate layer"
                  onClick={() => duplicateLayer(layer.id)}>
                  <Layers2 className="h-6 w-6" />
                </Button>
                <Button
                  size="iconMini"
                  variant="defaultLighter"
                  tooltip="Enable/Disable debug overlay"
                  className={layer.isDebugEnabled ? 'border border-white' : ''}
                  onClick={() =>
                    setDebugEnabled(layer.id, !layer.isDebugEnabled)
                  }>
                  <Bug className="h-6 w-6" />
                </Button>

                <div className="grow" />
                <CollapsibleTrigger asChild>
                  <Button
                    variant="defaultLighter"
                    className="h-7 px-2"
                    tooltip="Open/Close layer settings">
                    <div className="flex cursor-pointer items-center gap-x-2">
                      <p className="grow text-xs">Settings</p>
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
          </div>
        </div>

        <CollapsibleContent className="space-y-2">
          <div className="flex flex-col gap-y-4">
            <div className="z-10 flex select-none flex-col gap-y-3 bg-gradient-to-b from-zinc-900 to-transparent px-4 pt-4">
              <LayerSettings layer={layer} />
              {comp.presets && comp.presets.length > 0 && (
                <SearchSelect
                  trigger={<p>{selectedPreset?.name ?? 'Presets'}</p>}
                  options={comp.presets}
                  extractKey={(preset) => preset.name}
                  renderOption={(preset) => <div>{preset.name}</div>}
                  noItemsMessage="No presets available."
                  onSelect={(preset) => {
                    layer.config.setValues(preset.values);
                    setSelectedPreset(preset);
                    useLayerValuesStore
                      .getState()
                      .setLayerValues(layer.id, preset.values);
                    updateLayerComp(layer.id, {
                      ...layer.comp,
                      defaultValues: preset.values,
                    });
                  }}
                />
              )}
            </div>
            <div className="relative flex select-none flex-col gap-y-2 border-b border-zinc-600">
              <DynamicForm
                layerId={layer.id}
                config={layer.config}
                defaultValues={initialValues ?? layer.comp.defaultValues}
              />
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
