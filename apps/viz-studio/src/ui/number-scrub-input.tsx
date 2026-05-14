import { ChevronDown, ChevronUp } from "lucide-react";
import React, { useCallback, useEffect, useRef } from "react";

import { cn } from "../lib/cn";

interface NumberScrubInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  inputClassName?: string;
  pixelsPerStep?: number;
}

function clamp(value: number, min?: number, max?: number) {
  if (typeof min === "number") value = Math.max(min, value);
  if (typeof max === "number") value = Math.min(max, value);
  return value;
}

export const NumberScrubInput = React.forwardRef<
  HTMLInputElement,
  NumberScrubInputProps
>(
  (
    {
      value,
      onChange,
      min,
      max,
      step = 0.1,
      className,
      inputClassName,
      pixelsPerStep = 10,
    },
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const mergedRef = useCallback(
      (node: HTMLInputElement | null) => {
        inputRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) {
          ref.current = node;
        }
      },
      [ref],
    );

    const startYRef = useRef(0);
    const startValueRef = useRef(0);
    const isDraggingRef = useRef(false);
    const hasMovedRef = useRef(false);

    const setDragCursor = (active: boolean) => {
      const cursor = active ? "ns-resize" : "";
      document.body.style.cursor = cursor;
      document.documentElement.style.cursor = cursor;
      document.body.style.userSelect = active ? "none" : "";
      if (inputRef.current) {
        inputRef.current.style.cursor = cursor;
      }
    };

    const minRef = useRef(min);
    const maxRef = useRef(max);
    const stepRef = useRef(step);
    const onChangeRef = useRef(onChange);
    const pxPerStepRef = useRef(pixelsPerStep);

    useEffect(() => {
      minRef.current = min;
      maxRef.current = max;
      stepRef.current = step;
      onChangeRef.current = onChange;
      pxPerStepRef.current = pixelsPerStep;
    }, [min, max, step, onChange, pixelsPerStep]);

    const moveListenerRef = useRef<((e: MouseEvent) => void) | null>(null);
    const upListenerRef = useRef<((e: MouseEvent) => void) | null>(null);
    const blurListenerRef = useRef<((e: Event) => void) | null>(null);

    const cleanupGlobalListeners = useCallback(() => {
      if (moveListenerRef.current) {
        window.removeEventListener("mousemove", moveListenerRef.current);
        moveListenerRef.current = null;
      }
      if (upListenerRef.current) {
        window.removeEventListener("mouseup", upListenerRef.current);
        upListenerRef.current = null;
      }
      if (blurListenerRef.current) {
        window.removeEventListener("blur", blurListenerRef.current);
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

    const handleHandleMouseDown: React.MouseEventHandler<HTMLDivElement> = (
      event,
    ) => {
      if (event.button !== 0) return;
      startYRef.current = event.clientY;
      startValueRef.current = value;
      isDraggingRef.current = false;
      hasMovedRef.current = false;

      const onMove = (moveEvent: MouseEvent) => {
        const deltaY = moveEvent.clientY - startYRef.current;
        if (!hasMovedRef.current && Math.abs(deltaY) < 6) {
          return;
        }
        if (!isDraggingRef.current) {
          isDraggingRef.current = true;
          setDragCursor(true);
        }
        const direction = -deltaY;
        const baseSteps = direction / (pxPerStepRef.current || 10);
        const modifier = moveEvent.shiftKey ? 10 : moveEvent.altKey ? 0.1 : 1;
        const next =
          startValueRef.current +
          baseSteps * (stepRef.current || 0.1) * modifier;
        const clamped = clamp(next, minRef.current, maxRef.current);
        onChangeRef.current(Number(clamped.toFixed(6)));
        hasMovedRef.current = true;
      };

      const onUp = () => {
        cleanupGlobalListeners();
        inputRef.current?.focus();
      };

      const onBlur = () => {
        cleanupGlobalListeners();
      };

      moveListenerRef.current = onMove;
      upListenerRef.current = onUp;
      blurListenerRef.current = onBlur;
      window.addEventListener("mousemove", onMove, { passive: true });
      window.addEventListener("mouseup", onUp, { passive: true });
      window.addEventListener("blur", onBlur);
    };

    const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      const parsed = parseFloat(event.target.value);
      if (Number.isNaN(parsed)) return;
      const clamped = clamp(parsed, min, max);
      onChange(clamped);
    };

    const handleWheel: React.WheelEventHandler<HTMLInputElement> = (event) => {
      if (!inputRef.current) return;
      if (document.activeElement !== inputRef.current) return;
      event.preventDefault();
      const dir = event.deltaY < 0 ? 1 : -1;
      const modifier = event.shiftKey ? 10 : event.altKey ? 0.1 : 1;
      const next = value + dir * step * modifier;
      onChange(clamp(Number(next.toFixed(6)), min, max));
    };

    const bump = (dir: 1 | -1, modifier = 1) => {
      const next = value + dir * step * modifier;
      onChange(clamp(Number(next.toFixed(6)), min, max));
    };

    return (
      <div className={cn("flex items-center", className)}>
        <input
          ref={mergedRef}
          type="number"
          className={cn(
            "h-8 w-16 rounded-md border border-input bg-background px-2 py-1 text-center text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            inputClassName,
          )}
          value={Number.isFinite(value) ? value : 0}
          min={min}
          max={max}
          step={step}
          onChange={handleChange}
          onWheel={handleWheel}
          onFocus={(event) => event.currentTarget.select()}
          inputMode="decimal"
        />
        <div
          className="ml-1 flex h-8 w-6 select-none flex-col items-center justify-center rounded-md border border-input bg-background text-foreground"
          style={{ cursor: "ns-resize" }}
          onMouseDown={handleHandleMouseDown}
          title="Drag to adjust (Shift=10x, Alt=0.1x). Click arrows to step."
        >
          <button
            type="button"
            className="flex h-3 w-3 items-center justify-center"
            onClick={(event) => {
              event.preventDefault();
              const modifier = event.shiftKey ? 10 : event.altKey ? 0.1 : 1;
              bump(1, modifier);
            }}
            aria-label="Increase"
            tabIndex={-1}
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            className="flex h-3 w-3 items-center justify-center"
            onClick={(event) => {
              event.preventDefault();
              const modifier = event.shiftKey ? 10 : event.altKey ? 0.1 : 1;
              bump(-1, modifier);
            }}
            aria-label="Decrease"
            tabIndex={-1}
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  },
);

NumberScrubInput.displayName = "NumberScrubInput";
