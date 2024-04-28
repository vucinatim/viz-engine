import { useRef } from "react";
import DynamicForm from "../dynamic-form/dynamic-form";
import { Separator } from "../ui/separator";
import { ConfigSchema } from "./layer-renderer";
import LayerSettings from "./layer-settings";
import { LayerData } from "@/lib/stores/layer-store";

interface LayerConfigCardProps {
  layer: LayerData;
}

function LayerConfigCard({ layer }: LayerConfigCardProps) {
  const valuesRef = useRef<ConfigSchema>({} as ConfigSchema);
  const comp = layer.comp;

  return (
    <div className="p-4 bg-zinc-900 shadow-inner rounded-md flex flex-col gap-y-4">
      <div className="flex flex-col gap-y-2">
        <h2 className="font-semibold text-sm">{comp.name}</h2>
        <p className="text-xs">{comp.description}</p>
      </div>
      <Separator />
      <div className="flex flex-col gap-y-3">
        <LayerSettings layer={layer} />
        {comp.presets && comp.presets.length > 1 && (
          <div className="flex gap-x-2">
            {comp.presets.map((preset) => (
              <button
                key={preset.name}
                className="btn btn-sm"
                onClick={() => {
                  valuesRef.current = preset.values as ConfigSchema;
                }}
              >
                {preset.name}
              </button>
            ))}
          </div>
        )}
      </div>
      <Separator />
      <div className="relative flex flex-col gap-y-2">
        <DynamicForm schema={comp.config} valuesRef={valuesRef} />
      </div>
    </div>
  );
}

export default LayerConfigCard;
