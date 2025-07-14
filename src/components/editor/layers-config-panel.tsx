import * as allComps from '@/components/comps';
import useCompStore from '@/lib/stores/comp-store';
import useLayerStore, { LayerData } from '@/lib/stores/layer-store';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ChevronsDown, ChevronsUp } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Comp } from '../config/create-component';
import { Button } from '../ui/button';
import EditorLayerSearch from './editor-layer-search';
import LayerConfigCard from './layer-config-card';

const LayersConfigPanel = () => {
  const { layers, setAllLayersExpanded } = useLayerStore();
  const areSomeLayersExpanded = useMemo(
    () => layers.some((layer) => layer.isExpanded),
    [layers],
  );

  // Initialize the Comps in the CompStore
  useEffect(() => {
    console.log('Comps have been updated');
    // Add all components to the store
    Object.values(allComps).forEach((comp) =>
      useCompStore.getState().addComp(comp as Comp),
    );

    // Cleanup function to remove components from the store
    return () => {
      Object.values(allComps).forEach((comp) =>
        useCompStore.getState().removeComp(comp.name),
      );
    };

    // This makes it reactive to changes to any of the comp files
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allComps]);

  return (
    <div className="absolute inset-0 flex flex-col items-stretch justify-start">
      <div className="flex gap-x-2 border-b border-zinc-600 p-4">
        <EditorLayerSearch />
        <Button
          size="icon"
          tooltip="Expand/Collapse All Layers"
          onClick={() => {
            setAllLayersExpanded(areSomeLayersExpanded ? false : true);
          }}>
          {areSomeLayersExpanded ? (
            <ChevronsUp className="scale-y-90" />
          ) : (
            <ChevronsDown className="scale-y-90" />
          )}
        </Button>
      </div>
      <div className="flex grow flex-col overflow-y-auto pb-[200px]">
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
    }),
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
      console.log('Reordering layers');
      reorderLayers(active.id.toString(), over.id.toString());
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}>
      <SortableContext items={layers} strategy={verticalListSortingStrategy}>
        {layers.toReversed().map((layer, index) => (
          <LayerConfigCard key={layer.id} index={index} layer={layer} />
        ))}
      </SortableContext>
    </DndContext>
  );
};

export default LayersConfigPanel;
