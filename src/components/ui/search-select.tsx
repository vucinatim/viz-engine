import { Plus } from "lucide-react";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";
import { useRef, useState } from "react";

interface SearchSelectProps {
  trigger: React.ReactNode;
  options: any[];
  renderOption: (option: any) => React.ReactNode;
  onSelect: (option: any) => void;
  extractKey: (option: any) => string;
  placeholder?: string;
  noItemsMessage?: string;
}

const SearchSelect = ({
  trigger,
  options,
  onSelect,
  renderOption,
  extractKey,
  placeholder,
  noItemsMessage,
}: SearchSelectProps) => {
  const [open, setOpen] = useState(false);
  const layoutRef = useRef<HTMLDivElement>(null);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div ref={layoutRef} className="w-full">
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-center bg-black/20 hover:bg-black/30 gap-x-2 w-full"
          >
            {trigger}
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
          <CommandInput
            placeholder={placeholder || "Search options..."}
            className="h-9"
          />
          <CommandEmpty>
            {noItemsMessage || "No options available."}
          </CommandEmpty>
          <CommandList>
            <CommandGroup heading="Suggestions">
              {options.map((option, index) => (
                <CommandItem
                  key={`${extractKey(option)}-${index}`}
                  value={extractKey(option)}
                  onSelect={() => {
                    onSelect(option);
                    setOpen(false);
                  }}
                >
                  {renderOption(option)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default SearchSelect;
