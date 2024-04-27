import { useEffect, useRef } from "react";
import DynamicForm from "../dynamic-form/dynamic-form";
import { Separator } from "../ui/separator";
import { Comp, ConfigSchema } from "./comp-renderer";
import useCompStore from "@/lib/stores/comps-store";
import LayerSettings from "./layer-settings";

interface CompConfiguratorProps {
  comp: Comp;
}

function CompConfigurator({ comp }: CompConfiguratorProps) {
  const { registerCompValuesRef, unregisterCompValuesRef } = useCompStore();
  const valuesRef = useRef<ConfigSchema>({} as ConfigSchema);

  useEffect(() => {
    registerCompValuesRef(comp.name, valuesRef);
    return () => {
      unregisterCompValuesRef(comp.name);
    };
  }, [comp.name, registerCompValuesRef, unregisterCompValuesRef]);

  console.log("[CompConfigurator] Rerendering");

  return (
    <div className="p-4 bg-zinc-900 shadow-inner rounded-md flex flex-col gap-y-4">
      <div className="flex flex-col gap-y-2">
        <h2 className="font-semibold text-sm">{comp.name}</h2>
        <p className="text-xs">{comp.description}</p>
      </div>
      <Separator />
      <div className="flex flex-col gap-y-3">
        <LayerSettings layerId={comp.name} />
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
      <div className="flex flex-col gap-y-2">
        <DynamicForm schema={comp.config} valuesRef={valuesRef} />
      </div>
    </div>
  );
}

export default CompConfigurator;
