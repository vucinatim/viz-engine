import useCompStore from "@/lib/stores/comp-store";
import { useEffect } from "react";
import EditorLayerSearch from "./editor-layer-search";
import LayerConfigCard from "./layer-config-card";
import useLayerStore from "@/lib/stores/layer-store";
import * as allComps from "@/components/comps";

const LayersConfigPanel = () => {
  const { layers } = useLayerStore();

  // Initialize the Comps in the CompStore
  useEffect(() => {
    console.log("Comps have been updated");
    // Add all components to the store
    Object.values(allComps).forEach((comp) =>
      useCompStore.getState().addComp(comp)
    );

    // Cleanup function to remove components from the store
    return () => {
      Object.values(allComps).forEach((comp) =>
        useCompStore.getState().removeComp(comp.name)
      );
    };

    // This makes it reactive to changes to any of the comp files
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allComps]);

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
