import { useEffect, useRef } from "react";
import DynamicForm from "../dynamic-form/dynamic-form";
import { Separator } from "../ui/separator";
import { Comp, ConfigSchema } from "./comp-renderer";
import useCompStore from "@/lib/stores/comps-store";

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

  return (
    <div className="p-4 bg-black/20 rounded-2xl flex flex-col gap-y-4">
      <h2>{comp.name}</h2>
      <p>{comp.description}</p>
      <Separator />
      <DynamicForm schema={comp.config} valuesRef={valuesRef} />
    </div>
  );
}

export default CompConfigurator;
