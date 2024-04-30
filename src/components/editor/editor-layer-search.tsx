"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import useLayerStore from "@/lib/stores/layer-store";
import useCompStore from "@/lib/stores/comp-store";
import SearchSelect from "../ui/search-select";

const EditorLayerSearch = () => {
  const { comps } = useCompStore();
  const { addLayer, updateComps } = useLayerStore();

  React.useEffect(() => {
    console.log("Updating comps: ", comps);
    updateComps(comps);
  }, [comps, updateComps]);

  return (
    <SearchSelect
      trigger={
        <div className="flex items-center gap-x-4">
          <Plus className="h-4 w-4 shrink-0 opacity-50" />
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
