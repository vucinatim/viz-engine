import { useEffect, useRef, useState } from "react";
import DynamicForm from "./dynamic-form";
import { Separator } from "../ui/separator";
import { ConfigSchema, ControlledCanvas } from "./layer-renderer";
import LayerSettings from "./layer-settings";
import useLayerStore, { LayerData } from "@/lib/stores/layer-store";
import SearchSelect from "../ui/search-select";

interface LayerConfigCardProps {
  layer: LayerData;
}

function LayerConfigCard({ layer }: LayerConfigCardProps) {
  const comp = layer.comp;
  const { registerMirrorCanvas, unregisterMirrorCanvas, updateLayerComp } =
    useLayerStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedPreset, setSelectedPreset] = useState<any | null>();

  useEffect(() => {
    console.log("Registering mirror canvas", layer.id);
    registerMirrorCanvas(layer.id, canvasRef);

    return () => {
      console.log("Unregistering mirror canvas", layer.id);
      unregisterMirrorCanvas(layer.id, canvasRef);
    };
  }, [canvasRef, registerMirrorCanvas, unregisterMirrorCanvas, layer.id]);

  console.log("Rendering layer config", comp.name);

  return (
    <div className="relative flex flex-col gap-y-4">
      <div className="absolute inset-x-0 bottom-0 top-4 rounded-md bg-zinc-900" />
      <div className="sticky top-0 z-20">
        <div className="h-5 bg-[#27272a]" />
        <div className=" flex -mt-1 items-center rounded-md overflow-hidden bg-zinc-900 backdrop-blur-sm px-4 py-4">
          <div className="flex grow flex-col gap-y-2">
            <h2 className="font-semibold text-sm">{comp.name}</h2>
            <p className="text-xs">{comp.description}</p>
          </div>
          <div className="relative w-32 aspect-video rounded-md overflow-hidden">
            <ControlledCanvas layer={layer} ref={canvasRef} />
          </div>
        </div>
        {/* <Separator /> */}
      </div>
      <div className="flex z-10 flex-col gap-y-3 px-4 select-none">
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
      <div className="relative flex flex-col select-none">
        <DynamicForm
          schema={comp.config}
          valuesRef={layer.valuesRef}
          defaultValues={layer.comp.defaultValues}
        />
      </div>
    </div>
  );
}

export default LayerConfigCard;
