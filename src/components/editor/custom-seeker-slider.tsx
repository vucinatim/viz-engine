'use client';

import { cn } from '@/lib/utils';
import React, { useCallback, useRef, useState } from 'react';

interface CustomSeekerSliderProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
  className?: string;
}

const CustomSeekerSlider = ({
  value,
  max,
  onChange,
  className,
}: CustomSeekerSliderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const percentage = max > 0 ? (value / max) * 100 : 0;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!sliderRef.current) return;

      setIsDragging(true);
      const rect = sliderRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const newValue = Math.max(0, Math.min(max, (x / rect.width) * max));
      onChange(newValue);
    },
    [max, onChange],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !sliderRef.current) return;

      const rect = sliderRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const newValue = Math.max(0, Math.min(max, (x / rect.width) * max));
      onChange(newValue);
    },
    [isDragging, max, onChange],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global mouse event listeners when dragging
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={sliderRef}
      className={cn(
        'relative h-1 w-full cursor-pointer rounded-full bg-white/20 transition-all duration-200',
        isHovering && 'h-2',
        className,
      )}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}>
      {/* Progress track */}
      <div
        className="absolute left-0 top-0 h-full rounded-full bg-white/60 transition-all duration-200"
        style={{ width: `${percentage}%` }}
      />

      {/* Thumb */}
      <div
        className={cn(
          'absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white transition-all duration-200',
          isHovering && 'h-4 w-4',
          isDragging && 'h-5 w-5',
        )}
        style={{ left: `${percentage}%` }}
      />
    </div>
  );
};

export default CustomSeekerSlider;
