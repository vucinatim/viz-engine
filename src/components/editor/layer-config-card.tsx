import { useState } from "react";
import DynamicForm from "./dynamic-form";
import { ConfigSchema } from "./layer-renderer";
import LayerSettings from "./layer-settings";
import useLayerStore, { LayerData } from "@/lib/stores/layer-store";
import SearchSelect from "../ui/search-select";
import { Button } from "../ui/button";
import {
  Bug,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Layers2,
  Trash,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import LayerPreview from "./layer-preview";

interface LayerConfigCardProps {
  index: number;
  layer: LayerData;
}

function LayerConfigCard({ index, layer }: LayerConfigCardProps) {
  const comp = layer.comp;
  const {
    updateLayerComp,
    removeLayer,
    duplicateLayer,
    setIsLayerExpanded,
    setDebugEnabled,
  } = useLayerStore();
  const [selectedPreset, setSelectedPreset] = useState<any | null>();

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: layer.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Collapsible
      open={layer.isExpanded}
      onOpenChange={(open) => {
        console.log("Setting layer expanded", layer.id, open);
        setIsLayerExpanded(layer.id, open);
      }}
      className="w-full"
    >
      <div className="relative">
        <div
          ref={setNodeRef}
          style={style}
          className="sticky top-0 z-20 border-b border-zinc-600"
        >
          <div className="flex overflow-hidden bg-gradient-to-b from-zinc-900 to-zinc-900/90 backdrop-blur-sm">
            <div
              {...attributes}
              {...listeners}
              className={cn(
                "flex flex-col bg-zinc-400/5 cursor-grab items-center shrink-0 justify-center w-6 overflow-hidden transition-all",
                layer.isExpanded && "w-0 opacity-0"
              )}
            >
              <GripVertical className="w-4 h-4" />
            </div>
            <div className="flex grow flex-col gap-y-4 px-4 py-4">
              <div className="flex gap-x-4 h-16">
                <div className="flex grow flex-col gap-y-2 overflow-y-auto">
                  <h2 className="flex items-start font-semibold text-sm">
                    <div className="bg-gradient-to-br shrink-0 from-zinc-200 to-zinc-500 opacity-20 text-center w-5 h-5 rounded-md mr-2 text-black font-bold">
                      {index + 1}
                    </div>
                    {comp.name}
                  </h2>
                  <p className="text-xs">{comp.description}</p>
                </div>
                <LayerPreview layer={layer} />
              </div>

              <div className="flex gap-x-2 items-center select-none">
                <Button
                  size="iconMini"
                  variant="defaultLighter"
                  tooltip="Delete layer"
                  onClick={() => removeLayer(layer.id)}
                >
                  <Trash className="w-6 h-6" />
                </Button>
                <Button
                  size="iconMini"
                  variant="defaultLighter"
                  tooltip="Duplicate layer"
                  onClick={() => duplicateLayer(layer.id)}
                >
                  <Layers2 className="w-6 h-6" />
                </Button>
                <Button
                  size="iconMini"
                  variant="defaultLighter"
                  tooltip="Enable/Disable debug overlay"
                  className={layer.isDebugEnabled ? "border border-white" : ""}
                  onClick={() =>
                    setDebugEnabled(layer.id, !layer.isDebugEnabled)
                  }
                >
                  <Bug className="w-6 h-6" />
                </Button>

                <div className="grow" />
                <CollapsibleTrigger asChild>
                  <Button
                    variant="defaultLighter"
                    className="h-7 px-2"
                    tooltip="Open/Close layer settings"
                  >
                    <div className="flex items-center gap-x-2 cursor-pointer">
                      <p className="text-xs grow">Settings</p>
                      {layer.isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
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
            <div className="flex z-10 flex-col pt-4 gap-y-3 px-4 select-none bg-gradient-to-b from-zinc-900 to-transparent">
              <LayerSettings layer={layer} />
              {comp.presets && comp.presets.length > 0 && (
                <SearchSelect
                  trigger={<p>{selectedPreset?.name ?? "Presets"}</p>}
                  options={comp.presets}
                  extractKey={(preset) => preset.name}
                  renderOption={(preset) => <div>{preset.name}</div>}
                  noItemsMessage="No presets available."
                  onSelect={(preset) => {
                    layer.valuesRef.current = preset.values as ConfigSchema;
                    setSelectedPreset(preset);
                    updateLayerComp(layer.id, {
                      ...layer.comp,
                      defaultValues: preset.values,
                    });
                  }}
                />
              )}
            </div>
            <div className="relative flex flex-col gap-y-2 select-none border-b border-zinc-600">
              <DynamicForm
                schema={comp.config}
                valuesRef={layer.valuesRef}
                defaultValues={
                  layer.valuesRef.current ?? layer.comp.defaultValues
                }
              />
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export default LayerConfigCard;
