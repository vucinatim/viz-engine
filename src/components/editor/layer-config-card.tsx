import { getParameterIdsFromConfig } from '@/lib/comp-utils/config-utils';
import { useHistoryStore } from '@/lib/stores/history-store';
import useLayerStore, { LayerData } from '@/lib/stores/layer-store';
import useLayerValuesStore from '@/lib/stores/layer-values-store';
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
import { ConfigParam, GroupConfigOption } from '../config/config';
import { UnknownConfig } from '../config/create-component';
import DynamicForm from '../config/dynamic-form';
import { safeVTypeToNodeHandleType } from '../config/node-types';
import { VType } from '../config/types';
import { useNodeNetworkStore } from '../node-network/node-network-store';
import { Button } from '../ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';
import SearchSelect from '../ui/search-select';
import LayerPreview from './layer-preview';
import LayerSettings from './layer-settings';

// Helper function to get parameter type from a config path
function getParameterType(config: UnknownConfig, path: string): VType | null {
  const parts = path.split('.');
  let current: any = config.options;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const option = current[part];

    if (!option) return null;

    // If this is the last part, get the type
    if (i === parts.length - 1) {
      if (option instanceof ConfigParam) {
        return option.type;
      }
      return null;
    }

    // Navigate into group
    if (option instanceof GroupConfigOption) {
      current = option.options;
    } else {
      return null;
    }
  }

  return null;
}

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

  // Subscribe to store values and bypass history flag
  const storeValues = useLayerValuesStore((state) => state.values[layer.id]);
  const isBypassingHistory = useHistoryStore(
    (state) => state.isBypassingHistory,
  );

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

  // Sync form values when store changes (from undo/redo), but NOT during slider drag
  // We check if we're NOT bypassing history, which means the change came from
  // undo/redo or other external source, not from user interaction with sliders
  useEffect(() => {
    if (!hasInitialized.current) return;
    if (isBypassingHistory) return; // Don't update during slider drag

    // Only update if values actually changed to avoid unnecessary form resets
    if (
      storeValues &&
      JSON.stringify(storeValues) !== JSON.stringify(initialValues)
    ) {
      setInitialValues({ ...storeValues }); // Create new object reference to trigger form update
      layer.config.setValues(storeValues);
      // Clear preset selection when values change from external source (undo/redo)
      setSelectedPreset(null);
    }
  }, [storeValues, isBypassingHistory, layer.config, initialValues]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Collapsible
      open={layer.isExpanded}
      onOpenChange={(open) => {
        setIsLayerExpanded(layer.id, open);
      }}
      className="w-full">
      <div className="group relative">
        <div
          ref={setNodeRef}
          style={style}
          className="sticky top-0 z-20 border-b border-zinc-600">
          <div className="flex overflow-hidden bg-gradient-to-b from-zinc-900 to-zinc-900/90 backdrop-blur-sm transition-colors group-hover:from-zinc-700/70 group-hover:to-zinc-700/50">
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
                    onClick={() => removeLayer(layer.id)}>
                    <Trash className="h-6 w-6" />
                  </Button>
                  <Button
                    size="iconMini"
                    variant="defaultLighter"
                    tooltip="Duplicate layer"
                    className="pointer-events-auto"
                    onClick={() => duplicateLayer(layer.id)}>
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
                      setDebugEnabled(layer.id, !layer.isDebugEnabled)
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
                        useLayerValuesStore.getState().values[layer.id] ??
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
                    // Apply config values
                    layer.config.setValues(preset.values);
                    setSelectedPreset(preset);
                    setInitialValues(preset.values);
                    useLayerValuesStore
                      .getState()
                      .setLayerValues(layer.id, preset.values);
                    updateLayerComp(layer.id, {
                      ...layer.comp,
                      defaultValues: preset.values,
                    });

                    // Handle networks: clear existing ones and apply new preset networks
                    // Defer to avoid setState during render
                    setTimeout(() => {
                      const networkStore = useNodeNetworkStore.getState();

                      // Get all parameter IDs for this layer
                      const allParameterIds = getParameterIdsFromConfig(
                        layer.config,
                      );

                      // Build a set of parameter paths that should have networks after applying preset
                      const presetNetworkPaths = new Set(
                        preset.networks ? Object.keys(preset.networks) : [],
                      );

                      // Disable/remove networks that aren't in the preset
                      allParameterIds.forEach((parameterId) => {
                        // Extract the parameter path from the ID (format: "layerId:paramPath")
                        const paramPath = parameterId
                          .split(':')
                          .slice(1)
                          .join('.');

                        // If this parameter's network isn't in the preset, disable it
                        if (!presetNetworkPaths.has(paramPath)) {
                          const existingNetwork =
                            networkStore.networks[parameterId];
                          if (existingNetwork) {
                            networkStore.setNetwork(parameterId, {
                              ...existingNetwork,
                              isEnabled: false,
                            });
                          }
                        }
                      });

                      // Apply network presets if defined
                      if (preset.networks) {
                        const applyPresetToNetwork =
                          networkStore.applyPresetToNetwork;

                        Object.entries(preset.networks).forEach(
                          ([paramPath, presetId]) => {
                            // Get the parameter type from the config
                            const paramType = getParameterType(
                              layer.config,
                              paramPath,
                            );

                            if (paramType) {
                              // Use colon separator to match parameter ID format
                              // Replace dots with colons for nested paths (e.g., "group.param" -> "layerId:group:param")
                              const parameterId = `${layer.id}:${paramPath.replace(/\./g, ':')}`;
                              const nodeHandleType =
                                safeVTypeToNodeHandleType(paramType);

                              applyPresetToNetwork(
                                parameterId,
                                presetId as string,
                                nodeHandleType,
                              );
                            }
                          },
                        );
                      }
                    }, 0);
                  }}
                />
              )}
            </div>
            <div className="relative flex select-none flex-col gap-y-2 border-b border-zinc-600 transition-colors group-hover:bg-zinc-700/20">
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
