'use client';

import * as React from 'react';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Separator } from './separator';
import SimpleTooltip from './simple-tooltip';

interface CollapsibleGroupProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  animatedParams?: string[]; // Array of parameter labels that are animated
}

const CollapsibleGroup = ({
  label,
  description,
  children,
  className,
  animatedParams = [],
}: CollapsibleGroupProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const hasAnimatedParams = animatedParams.length > 0;

  // Build tooltip text
  const tooltipText = React.useMemo(() => {
    if (!description && !hasAnimatedParams) return undefined;

    if (!hasAnimatedParams) return description;

    const animatedText = `Animated: ${animatedParams.join(', ')}`;

    if (!description) return animatedText;

    return `${description}\n\n${animatedText}`;
  }, [description, hasAnimatedParams, animatedParams]);

  return (
    <div className={className}>
      <Separator />
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
        <div className="flex items-center justify-between space-x-4 py-3">
          <CollapsibleTrigger asChild>
            <div className="flex w-full cursor-pointer items-center justify-between">
              <SimpleTooltip
                text={tooltipText}
                trigger={
                  <div className="flex w-full items-center px-4">
                    <div className="flex grow items-center gap-x-2">
                      {(description || hasAnimatedParams) && (
                        <Info
                          className={cn(
                            'h-3 w-3',
                            hasAnimatedParams
                              ? 'text-cyan-500 opacity-100'
                              : 'opacity-50',
                          )}
                        />
                      )}
                      <h4 className="text-xs font-semibold">{label}</h4>
                    </div>
                    {isOpen ? <ChevronUp /> : <ChevronDown />}
                  </div>
                }
              />
            </div>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="space-y-2">
          {children}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default CollapsibleGroup;
