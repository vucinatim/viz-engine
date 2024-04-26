import { useEffect, useRef } from "react";
import DynamicForm from "../dynamic-form/dynamic-form";
import { Separator } from "../ui/separator";
import { Comp, ConfigSchema } from "./comp-renderer";
import useCompStore from "@/lib/stores/comps-store";

interface CompConfiguratorProps<TConfig extends ConfigSchema> {
  comp: Comp<TConfig>;
}

function CompConfigurator<TConfig extends ConfigSchema>({
  comp,
}: CompConfiguratorProps<ConfigSchema>) {
  const { registerComp, unregisterComp } = useCompStore();
  const valuesRef = useRef<TConfig>({} as TConfig);

  useEffect(() => {
    const id = registerComp(comp, valuesRef);
    return () => {
      unregisterComp(id);
    };
  }, [comp, registerComp, unregisterComp]);

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
