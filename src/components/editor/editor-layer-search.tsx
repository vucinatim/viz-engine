"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus } from "lucide-react";
import useLayerStore from "@/lib/stores/layer-store";
import useCompStore from "@/lib/stores/comp-store";

const EditorLayerSearch = () => {
  const { comps } = useCompStore();
  const { addLayer } = useLayerStore();

  const [open, setOpen] = React.useState(false);
  const layoutRef = React.useRef<HTMLDivElement>(null);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div ref={layoutRef} className="w-full">
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-center gap-x-2 w-full"
          >
            <Plus className="h-4 w-4 shrink-0 opacity-50" />
            Add New Layer
          </Button>
        </PopoverTrigger>
      </div>
      <PopoverContent
        className="p-0"
        style={{
          width: layoutRef.current ? layoutRef.current.offsetWidth : 0,
        }}
      >
        <Command>
          <CommandInput placeholder="Search framework..." className="h-9" />
          <CommandEmpty>No Comps Avaliable.</CommandEmpty>
          <CommandList>
            <CommandGroup heading="Suggestions">
              {comps.map((comp) => (
                <CommandItem
                  key={comp.id}
                  value={comp.id}
                  onSelect={() => {
                    addLayer(comp);
                    setOpen(false);
                  }}
                >
                  {comp.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default EditorLayerSearch;
