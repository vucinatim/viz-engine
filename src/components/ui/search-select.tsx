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
              {options.map((option, index) => (
                <CommandItem
                  key={`${extractKey(option)}-${index}`}
                  value={extractKey(option)}
                  onSelect={() => {
                    onSelect(option);
                    setOpen(false);
                  }}>
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
