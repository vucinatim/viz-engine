import editorControl from '@/lib/editor-control';
import useEditorLayerProjectionStore, { LayerData } from '@/lib/stores/editor-layer-projection-store';
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
import { useMemo } from 'react';
import { Button } from '../ui/button';
import EditorLayerSearch from './editor-layer-search';
import LayerConfigCard from './layer-config-card';

const LayersConfigPanel = () => {
  // Parent rerenders when any layer changes (unavoidable with Zustand immutable updates)
  // But LayerConfigCard is memoized, so only the changed layer card actually rerenders
  const layers = useEditorLayerProjectionStore((s) => s.layers);

  const areSomeLayersExpanded = useMemo(
    () => layers.some((layer) => layer.isExpanded),
    [layers],
  );

  return (
    <div className="absolute inset-0 flex flex-col items-stretch justify-start">
      <div className="flex gap-x-2 border-b border-zinc-600 p-4">
        <EditorLayerSearch />
        <Button
          size="icon"
          tooltip="Expand/Collapse All Layers"
          onClick={() => {
            editorControl.project.setAllLayersExpanded(
              areSomeLayersExpanded ? false : true,
            );
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
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragStart(event: DragStartEvent) {
    editorControl.project.setAllLayersExpanded(false);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!active || !over) {
      return;
    }

    if (active.id !== over?.id) {
      console.log('Reordering layers');
      editorControl.project.reorderLayers(
        active.id.toString(),
        over.id.toString(),
      );
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
