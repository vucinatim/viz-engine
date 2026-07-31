import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';
import React, { useCallback, useEffect, useRef } from 'react';

interface NumberScrubInputProps {
  value: number;
  onChange: (value: number) => void;
  onTransientChange?: (value: number) => void;
  onCommit?: (value: number) => void;
  onGestureStart?: () => void;
  onGestureCancel?: () => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  inputClassName?: string;
  id?: string;
  name?: string;
  // How many pixels correspond to one step increment during drag
  pixelsPerStep?: number;
  ariaLabel?: string;
}

function clamp(value: number, min?: number, max?: number) {
  if (typeof min === 'number') value = Math.max(min, value);
  if (typeof max === 'number') value = Math.min(max, value);
  return value;
}

const NumberScrubInput = React.forwardRef<
  HTMLInputElement,
  NumberScrubInputProps
>(
  (
    {
      value,
      onChange,
      onTransientChange,
      onCommit,
      onGestureStart,
      onGestureCancel,
      min,
      max,
      step = 0.1,
      className,
      inputClassName,
      id,
      name,
      pixelsPerStep = 10,
      ariaLabel,
    },
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const generatedInputId = React.useId();
    const inputId = id ?? generatedInputId;
    const mergedRef = useCallback(
      (node: HTMLInputElement) => {
        inputRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref)
          (ref as React.MutableRefObject<HTMLInputElement | null>).current =
            node;
      },
      [ref],
    );

    const startYRef = useRef(0);
    const startValueRef = useRef(0);
    const isDraggingRef = useRef(false);
    const hasMovedRef = useRef(false);
    const isTypingRef = useRef(false);
    const handleRef = useRef<HTMLDivElement | null>(null);

    const setDragCursor = (active: boolean) => {
      const cursor = active ? 'ns-resize' : '';
      document.body.style.cursor = cursor;
      document.documentElement.style.cursor = cursor;
      document.body.style.userSelect = active ? 'none' : '';
      if (inputRef.current) {
        inputRef.current.style.cursor = cursor;
      }
    };

    // Keep latest props/values in refs so global handlers can read them
    const minRef = useRef(min);
    const maxRef = useRef(max);
    const stepRef = useRef(step);
    const onChangeRef = useRef(onChange);
    const onTransientChangeRef = useRef(onTransientChange);
    const onCommitRef = useRef(onCommit);
    const onGestureStartRef = useRef(onGestureStart);
    const onGestureCancelRef = useRef(onGestureCancel);
    const pxPerStepRef = useRef(pixelsPerStep);
    const latestDragValueRef = useRef(value);
    useEffect(() => {
      minRef.current = min;
      maxRef.current = max;
      stepRef.current = step;
      onChangeRef.current = onChange;
      onTransientChangeRef.current = onTransientChange;
      onCommitRef.current = onCommit;
      onGestureStartRef.current = onGestureStart;
      onGestureCancelRef.current = onGestureCancel;
      pxPerStepRef.current = pixelsPerStep;
    }, [
      min,
      max,
      step,
      onChange,
      onTransientChange,
      onCommit,
      onGestureStart,
      onGestureCancel,
      pixelsPerStep,
    ]);

    // Listener references to enable precise cleanup
    const moveListenerRef = useRef<((e: MouseEvent) => void) | null>(null);
    const upListenerRef = useRef<((e: MouseEvent) => void) | null>(null);
    const blurListenerRef = useRef<((e: Event) => void) | null>(null);

    const cleanupGlobalListeners = useCallback(() => {
      if (moveListenerRef.current) {
        window.removeEventListener('mousemove', moveListenerRef.current);
        moveListenerRef.current = null;
      }
      if (upListenerRef.current) {
        window.removeEventListener('mouseup', upListenerRef.current);
        upListenerRef.current = null;
      }
      if (blurListenerRef.current) {
        window.removeEventListener('blur', blurListenerRef.current as any);
        blurListenerRef.current = null;
      }
      isDraggingRef.current = false;
      hasMovedRef.current = false;
      setDragCursor(false);
    }, []);

    useEffect(() => {
      return () => {
        cleanupGlobalListeners();
      };
    }, [cleanupGlobalListeners]);

    const commitTypedValue = () => {
      if (!isTypingRef.current) return;
      isTypingRef.current = false;
      const parsed = Number.parseFloat(inputRef.current?.value ?? '');
      if (!Number.isFinite(parsed)) {
        if (inputRef.current) inputRef.current.value = String(value);
        onGestureCancelRef.current?.();
        return;
      }
      const nextValue = clamp(parsed, minRef.current, maxRef.current);
      latestDragValueRef.current = nextValue;
      if (onCommitRef.current) onCommitRef.current(nextValue);
      else if (onTransientChangeRef.current) onChangeRef.current(nextValue);
    };

    const handleHandleMouseDown: React.MouseEventHandler<HTMLDivElement> = (
      e,
    ) => {
      if (e.button !== 0) return; // only left click
      commitTypedValue();
      startYRef.current = e.clientY;
      startValueRef.current = value;
      latestDragValueRef.current = value;
      isDraggingRef.current = false;
      hasMovedRef.current = false;
      onGestureStartRef.current?.();

      const onMove = (ev: MouseEvent) => {
        const deltaY = ev.clientY - startYRef.current;
        if (!hasMovedRef.current && Math.abs(deltaY) < 6) {
          return;
        }
        if (!isDraggingRef.current) {
          isDraggingRef.current = true;
          setDragCursor(true);
        }
        const direction = -deltaY;
        const baseSteps = direction / (pxPerStepRef.current || 10);
        const modifier = ev.shiftKey ? 10 : ev.altKey ? 0.1 : 1;
        const next =
          startValueRef.current +
          baseSteps * (stepRef.current || 0.1) * modifier;
        const clamped = clamp(next, minRef.current, maxRef.current);
        latestDragValueRef.current = Number(clamped.toFixed(6));
        if (inputRef.current) {
          inputRef.current.value = String(latestDragValueRef.current);
        }
        (onTransientChangeRef.current ?? onChangeRef.current)?.(
          latestDragValueRef.current,
        );
        hasMovedRef.current = true;
      };
      const onUp = (_ev: MouseEvent) => {
        if (hasMovedRef.current) {
          (onCommitRef.current ?? onChangeRef.current)?.(
            latestDragValueRef.current,
          );
        } else {
          onGestureCancelRef.current?.();
        }
        cleanupGlobalListeners();
        inputRef.current?.focus();
      };
      const onBlur = (_ev: Event) => {
        if (inputRef.current) {
          inputRef.current.value = String(value);
        }
        onGestureCancelRef.current?.();
        cleanupGlobalListeners();
      };
      moveListenerRef.current = onMove;
      upListenerRef.current = onUp;
      blurListenerRef.current = onBlur;
      window.addEventListener('mousemove', onMove, { passive: true });
      window.addEventListener('mouseup', onUp, { passive: true });
      window.addEventListener('blur', onBlur);
    };

    const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
      const parsed = parseFloat(e.target.value);
      if (Number.isNaN(parsed)) return;
      const clamped = clamp(parsed, min, max);
      latestDragValueRef.current = clamped;
      (onTransientChange ?? onChange)(clamped);
    };

    const handleWheel: React.WheelEventHandler<HTMLInputElement> = (e) => {
      if (!inputRef.current) return;
      if (document.activeElement !== inputRef.current) return;
      e.preventDefault();
      const dir = e.deltaY < 0 ? 1 : -1;
      const modifier = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
      const next = latestDragValueRef.current + dir * step * modifier;
      const clamped = clamp(Number(next.toFixed(6)), min, max);
      latestDragValueRef.current = clamped;
      inputRef.current.value = String(clamped);
      (onTransientChangeRef.current ?? onChangeRef.current)(clamped);
    };

    const bump = (dir: 1 | -1, modifier = 1) => {
      const next = value + dir * step * modifier;
      onChange(clamp(Number(next.toFixed(6)), min, max));
    };

    return (
      <div className={cn('flex items-center', className)}>
        <input
          ref={mergedRef}
          id={inputId}
          name={name ?? inputId}
          type="number"
          aria-label={ariaLabel}
          className={cn(
            'h-8 w-16 rounded-md border border-input bg-background px-2 py-1 text-center text-xs ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
            inputClassName,
          )}
          value={Number.isFinite(value) ? value : 0}
          min={min}
          max={max}
          step={step}
          onChange={handleChange}
          onBlur={commitTypedValue}
          onWheel={handleWheel}
          onFocus={(e) => {
            if (!isTypingRef.current) {
              isTypingRef.current = true;
              latestDragValueRef.current = value;
              onGestureStartRef.current?.();
            }
            e.currentTarget.select();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur();
            } else if (event.key === 'Escape') {
              event.preventDefault();
              isTypingRef.current = false;
              event.currentTarget.value = String(value);
              onGestureCancelRef.current?.();
              event.currentTarget.blur();
            }
          }}
          inputMode="decimal"
        />
        <div
          ref={handleRef}
          className="ml-1 flex h-8 w-6 flex-col items-center justify-center rounded-md border border-input bg-background text-foreground select-none"
          style={{ cursor: 'ns-resize' }}
          onMouseDown={handleHandleMouseDown}
          title="Drag to adjust (Shift=10x, Alt=0.1x). Click arrows to step.">
          <button
            type="button"
            className="flex h-3 w-3 items-center justify-center"
            onClick={(e) => {
              e.preventDefault();
              const modifier = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
              bump(1, modifier);
            }}
            aria-label="Increase"
            tabIndex={-1}>
            <ChevronUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            className="flex h-3 w-3 items-center justify-center"
            onClick={(e) => {
              e.preventDefault();
              const modifier = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
              bump(-1, modifier);
            }}
            aria-label="Decrease"
            tabIndex={-1}>
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  },
);

NumberScrubInput.displayName = 'NumberScrubInput';

export { NumberScrubInput };
