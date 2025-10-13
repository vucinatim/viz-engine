import { cn } from '@/lib/utils';
import { useRef, useState } from 'react';
import { Button } from './button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

interface SearchSelectProps {
  trigger: React.ReactNode;
  triggerClassName?: string;
  options: any[];
  renderOption: (option: any) => React.ReactNode;
  onSelect: (option: any) => void;
  extractKey: (option: any) => string;
  placeholder?: string;
  noItemsMessage?: string;
  dropdownWidth?: number | string;
  align?: 'left' | 'right';
  keepOpenOnSelect?: boolean;
  renderPreview?: (option: any, isHovered: boolean) => React.ReactNode;
}

const SearchSelect = ({
  trigger,
  triggerClassName,
  options,
  onSelect,
  renderOption,
  extractKey,
  placeholder,
  noItemsMessage,
  dropdownWidth,
  align = 'left',
  keepOpenOnSelect = false,
  renderPreview,
}: SearchSelectProps) => {
  const [open, setOpen] = useState(false);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const layoutRef = useRef<HTMLDivElement>(null);

  // Reset hover state when dropdown closes
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setHoveredKey(null);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <div ref={layoutRef} className="w-full">
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'w-full justify-center gap-x-2 bg-black/20 hover:bg-black/30',
              triggerClassName,
            )}>
            {trigger}
          </Button>
        </PopoverTrigger>
      </div>
      <PopoverContent
        className="p-0"
        align={align === 'right' ? 'end' : 'start'}
        style={{
          width:
            dropdownWidth ||
            (layoutRef.current ? layoutRef.current.offsetWidth : 0),
        }}>
        <Command>
          <CommandInput
            placeholder={placeholder || 'Search options...'}
            className="h-9"
          />
          <CommandEmpty>
            {noItemsMessage || 'No options available.'}
          </CommandEmpty>
          <CommandList>
            <CommandGroup heading="Suggestions">
              {options.map((option, index) => {
                const key = extractKey(option);
                const isHovered = hoveredKey === key;
                return (
                  <CommandItem
                    key={`${key}-${index}`}
                    value={key}
                    onMouseEnter={() => setHoveredKey(key)}
                    onMouseLeave={() => setHoveredKey(null)}
                    onSelect={() => {
                      onSelect(option);
                      if (!keepOpenOnSelect) {
                        setOpen(false);
                      }
                    }}>
                    {renderPreview && (
                      <div className="mr-3 shrink-0">
                        {renderPreview(option, isHovered)}
                      </div>
                    )}
                    <div className="flex-1">{renderOption(option)}</div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default SearchSelect;
