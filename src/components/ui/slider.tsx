'use client';

import { cn } from '@/lib/utils';
import * as SliderPrimitive from '@radix-ui/react-slider';
import * as React from 'react';

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(
  (
    {
      value,
      onChange,
      min = 0,
      max = 1,
      step = 0.001,
      className,
      onDragStart,
      onDragEnd,
    },
    ref,
  ) => {
    return (
      <div className={cn('flex items-center gap-x-2', className)}>
        <div className="flex grow px-1">
          <SliderPrimitive.Root
            ref={ref}
            className="relative flex w-full cursor-pointer touch-none select-none items-center"
            value={[value]}
            onValueChange={(value) => onChange(value[0])}
            onValueCommit={() => {
              // Called when user releases the slider
              // Turn off bypass BEFORE the final onChange happens
              // This ensures the debounced history push can execute
              onDragEnd?.();
            }}
            onPointerDown={() => {
              // Called when user starts dragging
              onDragStart?.();
            }}
            min={min}
            max={max}
            step={step}>
            <SliderPrimitive.Track className="relative h-5 w-full grow overflow-hidden rounded-full">
              <div className="absolute inset-x-0 inset-y-2 bg-zinc-700">
                <SliderPrimitive.Range className="absolute h-full bg-primary" />
              </div>
            </SliderPrimitive.Track>
            <SliderPrimitive.Thumb className="block h-3 w-3 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
            <div className="absolute inset-x-0 top-4 flex items-end justify-between text-2xs">
              <p>{min}</p>
              <p>{max}</p>
            </div>
          </SliderPrimitive.Root>
        </div>
        <input
          type="number"
          className="h-8 w-16 rounded-md border border-input bg-background px-2 py-1 text-center text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          value={value || 0}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          onFocus={(event) => {
            event.target.select();
          }}
        />
      </div>
    );
  },
);
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
