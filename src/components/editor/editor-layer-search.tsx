'use client';

import useCompStore from '@/lib/stores/comp-store';
import useLayerStore from '@/lib/stores/layer-store';
import { Search } from 'lucide-react';
import * as React from 'react';
import SearchSelect from '../ui/search-select';
import LazyCompPreview from './lazy-comp-preview';

const EditorLayerSearch = () => {
  const comps = useCompStore((state) => state.comps);
  const addLayer = useLayerStore((state) => state.addLayer);
  const updateComps = useLayerStore((state) => state.updateComps);

  // This is needed for instant changes on save when editing comp files
  React.useEffect(() => {
    updateComps(comps);
  }, [comps, updateComps]);

  return (
    <SearchSelect
      trigger={
        <div className="flex w-full items-center justify-start gap-x-4">
          <Search className="h-4 w-4 shrink-0 opacity-50" />
          <p>Add New Layer</p>
        </div>
      }
      options={comps}
      extractKey={(comp) => comp.id}
      renderOption={(comp) => (
        <div className="flex flex-col gap-y-1">
          <div className="font-medium">{comp.name}</div>
          <div className="text-xs text-muted-foreground">
            {comp.description}
          </div>
        </div>
      )}
      renderPreview={(comp, isHovered) => (
        <LazyCompPreview
          comp={comp}
          isHovered={isHovered}
          width={120}
          height={68}
        />
      )}
      noItemsMessage="No comps avaliable."
      placeholder="Search visual compositions..."
      onSelect={(comp) => {
        addLayer(comp);
      }}
    />
  );
};

export default EditorLayerSearch;
