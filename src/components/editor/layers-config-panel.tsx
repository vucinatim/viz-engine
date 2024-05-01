import useCompStore from "@/lib/stores/comp-store";
import { useEffect, useMemo } from "react";
import EditorLayerSearch from "./editor-layer-search";
import LayerConfigCard from "./layer-config-card";
import useLayerStore from "@/lib/stores/layer-store";
import * as allComps from "@/components/comps";
import { Button } from "../ui/button";
import { ChevronsDown, ChevronsUp } from "lucide-react";

const LayersConfigPanel = () => {
  const { layers, setAllLayersExpanded } = useLayerStore();
  const areAllLayersExpanded = useMemo(
    () => layers.every((layer) => layer.isExpanded),
    [layers]
  );

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
      <div className="p-4 flex gap-x-2 border-b border-zinc-600">
        <EditorLayerSearch />
        <Button
          size="icon"
          tooltip="Expand/Collapse All Layers"
          onClick={() => {
            setAllLayersExpanded(!areAllLayersExpanded);
          }}
        >
          {areAllLayersExpanded ? (
            <ChevronsUp className="scale-y-90" />
          ) : (
            <ChevronsDown className="scale-y-90" />
          )}
        </Button>
      </div>
      <div className="flex flex-col grow overflow-y-auto">
        {layers.toReversed().map((layer, index) => (
          <LayerConfigCard key={layer.id} index={index} layer={layer} />
        ))}
      </div>
    </div>
  );
};

export default LayersConfigPanel;
