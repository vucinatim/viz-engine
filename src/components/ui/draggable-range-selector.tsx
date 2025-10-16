'use client';

import { cn } from '@/lib/utils';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

interface DraggableRangeSelectorProps {
  value: [number, number];
  onChange: (value: [number, number]) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  /**
   * If true, only call onChange on mouseup. Otherwise calls onChange during drag.
   * Default: true (optimized for performance)
   */
  onChangeOnMouseUp?: boolean;
}

const EDGE_THRESHOLD = 12; // Pixels from edge to activate edge dragging

type DragMode = 'none' | 'left-edge' | 'right-edge' | 'range';
type HoverZone = 'none' | 'left-edge' | 'right-edge' | 'middle';

const DraggableRangeSelectorComponent = ({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.001,
  className,
  onChangeOnMouseUp = true,
}: DraggableRangeSelectorProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<HTMLDivElement>(null);
  const leftHandleRef = useRef<HTMLDivElement>(null);
  const rightHandleRef = useRef<HTMLDivElement>(null);

  const [dragMode, setDragMode] = useState<DragMode>('none');
  const [hoverZone, setHoverZone] = useState<HoverZone>('none');
  const dragStartRef = useRef<{
    startValue: [number, number];
    mouseX: number;
  } | null>(null);

  // Track the current drag value without causing re-renders
  const currentDragValueRef = useRef<[number, number] | null>(null);

  const [start, end] = value;

  // Helper to update DOM directly without React re-renders
  const updateDOMPosition = useCallback(
    (newStart: number, newEnd: number) => {
      const startPercent = ((newStart - min) / (max - min)) * 100;
      const endPercent = ((newEnd - min) / (max - min)) * 100;

      if (rangeRef.current) {
        rangeRef.current.style.left = `${startPercent}%`;
        rangeRef.current.style.width = `${endPercent - startPercent}%`;
      }
      if (leftHandleRef.current) {
        leftHandleRef.current.style.left = `${startPercent}%`;
      }
      if (rightHandleRef.current) {
        rightHandleRef.current.style.left = `${endPercent}%`;
      }
    },
    [min, max],
  );

  // Calculate percentage positions for initial render
  const startPercent = ((start - min) / (max - min)) * 100;
  const endPercent = ((end - min) / (max - min)) * 100;

  // Clamp value to min/max and apply step
  const clampAndStep = useCallback(
    (val: number) => {
      const clamped = Math.max(min, Math.min(max, val));
      if (step > 0) {
        return Math.round(clamped / step) * step;
      }
      return clamped;
    },
    [min, max, step],
  );

  // Convert mouse X position to value
  const getValueFromMouseX = useCallback(
    (mouseX: number) => {
      if (!containerRef.current) return min;
      const rect = containerRef.current.getBoundingClientRect();
      const percent = (mouseX - rect.left) / rect.width;
      const rawValue = min + percent * (max - min);
      return clampAndStep(rawValue);
    },
    [min, max, clampAndStep],
  );

  // Determine which zone the mouse is in
  const getHoverZone = useCallback(
    (mouseX: number): HoverZone => {
      if (!containerRef.current) return 'none';
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = mouseX - rect.left;
      const width = rect.width;

      const startX = (startPercent / 100) * width;
      const endX = (endPercent / 100) * width;

      // Check if near left edge
      if (
        relativeX >= startX - EDGE_THRESHOLD &&
        relativeX <= startX + EDGE_THRESHOLD
      ) {
        return 'left-edge';
      }

      // Check if near right edge
      if (
        relativeX >= endX - EDGE_THRESHOLD &&
        relativeX <= endX + EDGE_THRESHOLD
      ) {
        return 'right-edge';
      }

      // Check if inside the range
      if (
        relativeX > startX + EDGE_THRESHOLD &&
        relativeX < endX - EDGE_THRESHOLD
      ) {
        return 'middle';
      }

      return 'none';
    },
    [startPercent, endPercent],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const zone = getHoverZone(e.clientX);
      const currentStart = value[0];
      const currentEnd = value[1];

      if (zone === 'left-edge') {
        setDragMode('left-edge');
        dragStartRef.current = {
          startValue: value,
          mouseX: e.clientX,
        };
        currentDragValueRef.current = value;
      } else if (zone === 'right-edge') {
        setDragMode('right-edge');
        dragStartRef.current = {
          startValue: value,
          mouseX: e.clientX,
        };
        currentDragValueRef.current = value;
      } else if (zone === 'middle') {
        setDragMode('range');
        dragStartRef.current = {
          startValue: value,
          mouseX: e.clientX,
        };
        currentDragValueRef.current = value;
      } else {
        // Clicked outside range - jump to that position
        const clickValue = getValueFromMouseX(e.clientX);
        const rangeSize = currentEnd - currentStart;
        const halfRange = rangeSize / 2;

        let newStart = clickValue - halfRange;
        let newEnd = clickValue + halfRange;

        // Adjust if out of bounds
        if (newStart < min) {
          newStart = min;
          newEnd = min + rangeSize;
        } else if (newEnd > max) {
          newEnd = max;
          newStart = max - rangeSize;
        }

        const newValue: [number, number] = [
          clampAndStep(newStart),
          clampAndStep(newEnd),
        ];
        onChange(newValue);
      }
    },
    [value, getHoverZone, getValueFromMouseX, min, max, onChange, clampAndStep],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (dragMode === 'none') {
        // Update hover zone when not dragging
        const zone = getHoverZone(e.clientX);
        setHoverZone(zone);
        return;
      }

      if (!dragStartRef.current) return;

      const { startValue, mouseX: startMouseX } = dragStartRef.current;
      const [origStart, origEnd] = startValue;
      let newValue: [number, number] | null = null;

      if (dragMode === 'left-edge') {
        const newStart = getValueFromMouseX(e.clientX);
        // Ensure left edge doesn't cross right edge
        if (newStart < origEnd) {
          newValue = [newStart, origEnd];
        }
      } else if (dragMode === 'right-edge') {
        const newEnd = getValueFromMouseX(e.clientX);
        // Ensure right edge doesn't cross left edge
        if (newEnd > origStart) {
          newValue = [origStart, newEnd];
        }
      } else if (dragMode === 'range') {
        const deltaValue =
          getValueFromMouseX(e.clientX) - getValueFromMouseX(startMouseX);
        let newStart = origStart + deltaValue;
        let newEnd = origEnd + deltaValue;

        // Keep within bounds
        if (newStart < min) {
          newStart = min;
          newEnd = origEnd - origStart + min;
        } else if (newEnd > max) {
          newEnd = max;
          newStart = origStart - (origEnd - max);
        }

        newValue = [clampAndStep(newStart), clampAndStep(newEnd)];
      }

      if (newValue) {
        // Store in ref for mouseup
        currentDragValueRef.current = newValue;

        // Update DOM directly - NO React re-renders!
        updateDOMPosition(newValue[0], newValue[1]);

        // Only notify parent if not waiting for mouseup
        if (!onChangeOnMouseUp) {
          onChange(newValue);
        }
      }
    },
    [
      dragMode,
      getHoverZone,
      getValueFromMouseX,
      onChange,
      min,
      max,
      clampAndStep,
      onChangeOnMouseUp,
      updateDOMPosition,
    ],
  );

  const handleMouseUp = useCallback(() => {
    // If we're batching updates until mouseup, send the final value now
    if (
      onChangeOnMouseUp &&
      dragMode !== 'none' &&
      currentDragValueRef.current
    ) {
      onChange(currentDragValueRef.current);
    }

    setDragMode('none');
    dragStartRef.current = null;
    currentDragValueRef.current = null;
  }, [onChangeOnMouseUp, dragMode, onChange]);

  const handleMouseLeave = useCallback(() => {
    if (dragMode === 'none') {
      setHoverZone('none');
    }
  }, [dragMode]);

  // Global mouse event listeners
  useEffect(() => {
    if (dragMode !== 'none') {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragMode, handleMouseMove, handleMouseUp]);

  // Determine cursor based on hover zone
  const getCursor = () => {
    if (dragMode === 'left-edge' || hoverZone === 'left-edge')
      return 'ew-resize';
    if (dragMode === 'right-edge' || hoverZone === 'right-edge')
      return 'ew-resize';
    if (dragMode === 'range' || hoverZone === 'middle') return 'grab';
    if (dragMode !== 'none') return 'grabbing';
    return 'default';
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex h-full w-full touch-none select-none items-center',
        className,
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={(e) => {
        if (dragMode === 'none') {
          const zone = getHoverZone(e.clientX);
          setHoverZone(zone);
        }
      }}
      onMouseLeave={handleMouseLeave}
      style={{ cursor: getCursor() }}>
      {/* Track background */}
      <div className="absolute inset-0" />

      {/* Selected range */}
      <div
        ref={rangeRef}
        className={cn(
          'absolute h-full border-y-2 bg-primary/30',
          dragMode === 'none' && 'transition-all',
          hoverZone === 'left-edge' || dragMode === 'left-edge'
            ? 'border-l-4 border-l-primary'
            : 'border-l-2 border-l-primary/80',
          hoverZone === 'right-edge' || dragMode === 'right-edge'
            ? 'border-r-4 border-r-primary'
            : 'border-r-2 border-r-primary/80',
          hoverZone === 'middle' && 'bg-primary/40',
        )}
        style={{
          left: `${startPercent}%`,
          width: `${endPercent - startPercent}%`,
        }}
      />

      {/* Left edge handle */}
      <div
        ref={leftHandleRef}
        className={cn(
          'absolute z-20 h-full w-1.5 border border-gray-400 bg-white shadow-[0_0_8px_2px_rgba(255,255,255,0.3)]',
          dragMode === 'none' && 'transition-all',
          (hoverZone === 'left-edge' || dragMode === 'left-edge') &&
            'w-2 shadow-[0_0_12px_3px_rgba(255,255,255,0.5)]',
        )}
        style={{
          left: `${startPercent}%`,
          transform: 'translateX(-50%)',
        }}
      />

      {/* Right edge handle */}
      <div
        ref={rightHandleRef}
        className={cn(
          'absolute z-20 h-full w-1.5 border border-gray-400 bg-white shadow-[0_0_8px_2px_rgba(255,255,255,0.3)]',
          dragMode === 'none' && 'transition-all',
          (hoverZone === 'right-edge' || dragMode === 'right-edge') &&
            'w-2 shadow-[0_0_12px_3px_rgba(255,255,255,0.5)]',
        )}
        style={{
          left: `${endPercent}%`,
          transform: 'translateX(-50%)',
        }}
      />
    </div>
  );
};

// Memoize to prevent re-renders when parent re-renders but props haven't changed
export const DraggableRangeSelector = memo(DraggableRangeSelectorComponent);
