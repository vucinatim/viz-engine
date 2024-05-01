"use client";

import * as React from "react";
import { AudioLines, Plus, Search } from "lucide-react";
import useLayerStore from "@/lib/stores/layer-store";
import useCompStore from "@/lib/stores/comp-store";
import SearchSelect from "../ui/search-select";

const EditorLayerSearch = () => {
  const { comps } = useCompStore();
  const { addLayer, updateComps } = useLayerStore();

  // This is needed for instant changes on save when editing comp files
  React.useEffect(() => {
    updateComps(comps);
  }, [comps, updateComps]);

  return (
    <SearchSelect
      trigger={
        <div className="flex items-center justify-start w-full gap-x-4">
          <AudioLines className="h-4 w-4 shrink-0 opacity-50" />
          <p>Add New Layer</p>
        </div>
      }
      options={comps}
      extractKey={(comp) => comp.id}
      renderOption={(comp) => <div>{comp.name}</div>}
      noItemsMessage="No comps avaliable."
      placeholder="Search visual compositions..."
      onSelect={(comp) => {
        addLayer(comp);
      }}
    />
  );
};

export default EditorLayerSearch;
