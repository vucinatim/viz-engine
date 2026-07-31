import { cn } from '@/lib/utils';
import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';

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
  const style = {
    '--preview-seeker-progress': `${percentage}%`,
  } as CSSProperties;

  const updateFromPointer = useCallback(
    (clientX: number) => {
      const slider = sliderRef.current;
      if (!slider) {
        return;
      }

      const rect = slider.getBoundingClientRect();
      const ratio = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width),
      );
      slider.style.setProperty('--preview-seeker-progress', `${ratio * 100}%`);
      onChange(ratio * max);
    },
    [max, onChange],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsDragging(true);
      updateFromPointer(event.clientX);
    },
    [updateFromPointer],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        updateFromPointer(event.clientX);
      }
    },
    [updateFromPointer],
  );

  const handlePointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsDragging(false);
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const step = Math.max(1 / 60, max / 100);
      const nextValue =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? max
            : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
              ? value - step
              : event.key === 'ArrowRight' || event.key === 'ArrowUp'
                ? value + step
                : undefined;
      if (nextValue === undefined) {
        return;
      }
      event.preventDefault();
      onChange(Math.max(0, Math.min(max, nextValue)));
    },
    [max, onChange, value],
  );

  return (
    <div
      ref={sliderRef}
      role="slider"
      tabIndex={0}
      aria-label="Preview position"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      data-testid="preview-seeker"
      className={cn(
        'relative h-1 w-full cursor-pointer touch-none rounded-full bg-white/20 transition-[height] duration-200',
        isHovering && 'h-2',
        className,
      )}
      style={style}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}>
      {/* Progress track */}
      <div className="absolute top-0 left-0 h-full w-[var(--preview-seeker-progress)] rounded-full bg-white/60" />

      {/* Thumb */}
      <div
        className={cn(
          'absolute top-1/2 left-[var(--preview-seeker-progress)] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white transition-[width,height] duration-200',
          isHovering && 'h-4 w-4',
          isDragging && 'h-5 w-5',
        )}
      />
    </div>
  );
};

export default CustomSeekerSlider;
