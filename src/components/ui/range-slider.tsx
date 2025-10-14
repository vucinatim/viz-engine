'use client';

import { cn } from '@/lib/utils';
import * as SliderPrimitive from '@radix-ui/react-slider';
import * as React from 'react';

interface RangeSliderProps {
  value: [number, number];
  onChange: (value: [number, number]) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

const RangeSlider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  RangeSliderProps
>(({ value, onChange, min = 0, max = 1, step = 0.001, className }, ref) => {
  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        'relative flex w-full cursor-pointer touch-none select-none items-center',
        className,
      )}
      value={value}
      onValueChange={onChange}
      min={min}
      max={max}
      step={step}
      minStepsBetweenThumbs={1}>
      <SliderPrimitive.Track className="relative h-full w-full overflow-hidden">
        <SliderPrimitive.Range className="absolute h-full border-y-2 border-primary/80 bg-primary/30" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        className="relative z-20 block h-full w-1.5 cursor-ew-resize border border-gray-400 bg-white shadow-[0_0_8px_2px_rgba(255,255,255,0.3)] ring-offset-background transition-all hover:w-2 hover:shadow-[0_0_12px_3px_rgba(255,255,255,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        aria-label="Start time"
      />
      <SliderPrimitive.Thumb
        className="relative z-20 block h-full w-1.5 cursor-ew-resize border border-gray-400 bg-white shadow-[0_0_8px_2px_rgba(255,255,255,0.3)] ring-offset-background transition-all hover:w-2 hover:shadow-[0_0_12px_3px_rgba(255,255,255,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        aria-label="End time"
      />
    </SliderPrimitive.Root>
  );
});
RangeSlider.displayName = 'RangeSlider';

export { RangeSlider };
