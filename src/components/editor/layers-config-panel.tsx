import useCompStore from "@/lib/stores/comp-store";
import { useEffect, useMemo } from "react";
import EditorLayerSearch from "./editor-layer-search";
import LayerConfigCard from "./layer-config-card";
import useLayerStore, { LayerData } from "@/lib/stores/layer-store";
import * as allComps from "@/components/comps";
import { Button } from "../ui/button";
import { ChevronsDown, ChevronsUp } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

const LayersConfigPanel = () => {
  const { layers, setAllLayersExpanded } = useLayerStore();
  const areSomeLayersExpanded = useMemo(
    () => layers.some((layer) => layer.isExpanded),
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
            setAllLayersExpanded(areSomeLayersExpanded ? false : true);
          }}
        >
          {areSomeLayersExpanded ? (
            <ChevronsUp className="scale-y-90" />
          ) : (
            <ChevronsDown className="scale-y-90" />
          )}
        </Button>
      </div>
      <div className="flex flex-col grow overflow-y-auto pb-[200px]">
        <SortableLayers layers={layers} />
      </div>
    </div>
  );
};

interface SortableLayersProps {
  layers: LayerData[];
}

const SortableLayers = ({ layers }: SortableLayersProps) => {
  const { reorderLayers, setAllLayersExpanded } = useLayerStore();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragStart(event: DragStartEvent) {
    setAllLayersExpanded(false);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!active || !over) {
      return;
    }

    if (active.id !== over?.id) {
      console.log("Reordering layers");
      reorderLayers(active.id.toString(), over.id.toString());
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={layers} strategy={verticalListSortingStrategy}>
        {layers.toReversed().map((layer, index) => (
          <LayerConfigCard key={layer.id} index={index} layer={layer} />
        ))}
      </SortableContext>
    </DndContext>
  );
};

export default LayersConfigPanel;
