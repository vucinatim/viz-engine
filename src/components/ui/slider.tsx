"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ value, onChange, min = 0, max = 1, step = 0.001 }, ref) => {
  return (
    <div className="flex gap-x-2 items-center pb-2">
      <div className="flex grow px-1">
        <SliderPrimitive.Root
          ref={ref}
          className="relative cursor-pointer flex w-full touch-none select-none items-center"
          value={[value]}
          onValueChange={(value) => onChange(value[0])}
          min={min}
          max={max}
          step={step}
        >
          <SliderPrimitive.Track className="relative h-6 w-full grow overflow-hidden rounded-full">
            <div className="absolute inset-x-0 inset-y-2.5 bg-zinc-700">
              <SliderPrimitive.Range className="absolute h-full bg-primary" />
            </div>
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
          <div className="absolute top-6 inset-x-0 text-2xs flex justify-between items-end">
            <p>{min}</p>
            <p>{max}</p>
          </div>
        </SliderPrimitive.Root>
      </div>
      <input
        type="number"
        className="w-16 px-2 py-1 bg-background border border-input text-center rounded-md ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        value={value || 0}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
