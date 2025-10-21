'use client';

import { AnimatedLiveValue } from '@/components/config/dynamic-form';
import { cn } from '@/lib/utils';
import { memo } from 'react';

interface AnimationItemProps {
  displayName: string;
  layerName: string;
  groupPath: string | null;
  parameterId: string;
  isActive?: boolean;
}

/**
 * Memoized animation item display
 * Only re-renders if its own props change, not when other animations update
 */
const AnimationItem = memo(
  ({
    displayName,
    layerName,
    groupPath,
    parameterId,
    isActive = false,
  }: AnimationItemProps) => {
    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-sm font-medium',
              isActive && 'font-semibold text-primary',
            )}>
            {displayName}
          </span>
          <AnimatedLiveValue
            parameterId={parameterId}
            className={cn(
              'font-mono text-xs',
              isActive ? 'text-primary' : 'text-blue-400',
            )}
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>{layerName}</span>
          {groupPath && (
            <>
              <span>›</span>
              <span>{groupPath}</span>
            </>
          )}
        </div>
      </div>
    );
  },
);

AnimationItem.displayName = 'AnimationItem';

export default AnimationItem;
