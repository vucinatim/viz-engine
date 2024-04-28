import useCompStore from "@/lib/stores/comp-store";
import { use, useEffect } from "react";
import SpectrumComp from "./spectrum-comp";
import EditorLayerSearch from "../editor-layer-search";
import LayerConfigCard from "./layer-config-card";
import useLayerStore from "@/lib/stores/layer-store";

const LayersConfigPanel = () => {
  const { layers } = useLayerStore();

  // Initialize the Comps in the CompStore
  // TODO: Add a way to automatically add all comps in the comps folder
  useEffect(() => {
    useCompStore.getState().addComp(SpectrumComp);

    return () => {
      useCompStore.getState().removeComp(SpectrumComp.name);
    };
  }, []);

  return (
    <div className="absolute inset-0 flex flex-col items-stretch justify-start">
      <div className="border-b border-white/30 px-2 py-4 flex flex-col items-stretch gap-y-4">
        <EditorLayerSearch />
      </div>
      <div className="flex flex-col grow px-2 py-4 gap-y-3 overflow-y-auto">
        {layers.map((layer) => (
          <LayerConfigCard key={layer.id} layer={layer} />
        ))}
      </div>
    </div>
  );
};

export default LayersConfigPanel;
