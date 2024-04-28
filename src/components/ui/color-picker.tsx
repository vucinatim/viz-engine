import { forwardRef, useRef } from "react";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import ColorPicker from "react-best-gradient-color-picker";
import { debounce } from "lodash";

interface ColorPickerPopoverProps {
  value: string;
  onChange: (value: string) => void;
}

const ColorPickerPopover = forwardRef<
  HTMLButtonElement,
  ColorPickerPopoverProps
>(({ value, onChange }, ref) => {
  const debouncedOnChange = useRef(
    debounce(async (value) => {
      onChange(value);
    }, 500)
  ).current;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          ref={ref} // Apply the forwarded ref to the Button component
          variant="outline"
          className="relative h-8 text-xs w-full"
        >
          <div className="absolute inset-0 flex items-center justify-between gap-x-4 px-2">
            <div className="truncate grow">{value}</div>
            <div
              className="w-5 h-5 shrink-0 rounded-md border border-input"
              style={{ backgroundColor: value }}
            />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent side="right" className="w-80">
        <ColorPicker
          value={value}
          onChange={debouncedOnChange}
          hidePresets
          hideColorGuide
        />
      </PopoverContent>
    </Popover>
  );
});

ColorPickerPopover.displayName = "ColorPickerPopover";

export { ColorPickerPopover };
