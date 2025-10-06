'use client';

import * as TogglePrimitive from '@radix-ui/react-toggle';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';
import SimpleTooltip from './simple-tooltip';

const toggleVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        outline:
          'border data-[state=on]:border-white bg-transparent hover:bg-accent hover:text-accent-foreground',
        active: 'border border-cyan-700 bg-transparent text-cyan-700',
        highlighted: 'border border-purple-400 bg-transparent text-purple-400',
      },
      size: {
        default: 'h-8 w-8 p-2',
        sm: 'h-9 px-2.5',
        lg: 'h-11 px-5',
      },
    },
    defaultVariants: {
      variant: 'outline',
      size: 'default',
    },
  },
);

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> &
    VariantProps<typeof toggleVariants> & {
      tooltip?: string;
    }
>(({ className, variant, size, tooltip, ...props }, ref) => (
  <SimpleTooltip
    text={tooltip}
    trigger={
      <div>
        <TogglePrimitive.Root
          ref={ref}
          defaultPressed
          className={cn(toggleVariants({ variant, size, className }))}
          {...props}
        />
      </div>
    }
  />
));

Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle, toggleVariants };
