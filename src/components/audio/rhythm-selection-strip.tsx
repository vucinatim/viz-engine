'use client';

import useEditorStore from '@/lib/stores/editor-store';
import { useMemo, useRef } from 'react';

const MIN_WINDOW = 0.01;
const HANDLE_PX = 8;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const RhythmSelectionStrip = () => {
  const rhythmSelection = useEditorStore((s) => s.rhythmSelection);
  const setRhythmSelection = useEditorStore((s) => s.setRhythmSelection);
  const stripRef = useRef<HTMLDivElement>(null);

  const normalized = useMemo(() => {
    const start = clamp(rhythmSelection.start, 0, 1 - MIN_WINDOW);
    const end = clamp(rhythmSelection.end, start + MIN_WINDOW, 1);
    return { start, end };
  }, [rhythmSelection]);

  const updateSelection = (start: number, end: number) => {
    const clampedStart = clamp(start, 0, 1 - MIN_WINDOW);
    const clampedEnd = clamp(end, clampedStart + MIN_WINDOW, 1);
    setRhythmSelection({ start: clampedStart, end: clampedEnd });
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const strip = stripRef.current;
    if (!strip) return;

    strip.setPointerCapture(event.pointerId);
    const rect = strip.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const selectionStartPx = normalized.start * rect.width;
    const selectionEndPx = normalized.end * rect.width;

    let mode: 'left' | 'right' | 'move' | 'jump' = 'jump';
    if (Math.abs(pointerX - selectionStartPx) <= HANDLE_PX) {
      mode = 'left';
    } else if (Math.abs(pointerX - selectionEndPx) <= HANDLE_PX) {
      mode = 'right';
    } else if (pointerX > selectionStartPx && pointerX < selectionEndPx) {
      mode = 'move';
    }

    const startAtDrag = normalized.start;
    const endAtDrag = normalized.end;
    const startX = pointerX;

    const update = (clientX: number) => {
      const localX = clientX - rect.left;
      const delta = (localX - startX) / rect.width;

      if (mode === 'left') {
        updateSelection(startAtDrag + delta, endAtDrag);
        return;
      }
      if (mode === 'right') {
        updateSelection(startAtDrag, endAtDrag + delta);
        return;
      }
      if (mode === 'move') {
        const width = endAtDrag - startAtDrag;
        const newStart = clamp(startAtDrag + delta, 0, 1 - width);
        updateSelection(newStart, newStart + width);
        return;
      }

      const width = endAtDrag - startAtDrag;
      let center = localX / rect.width;
      let newStart = center - width / 2;
      let newEnd = center + width / 2;
      if (newStart < 0) {
        newStart = 0;
        newEnd = width;
      }
      if (newEnd > 1) {
        newEnd = 1;
        newStart = 1 - width;
      }
      updateSelection(newStart, newEnd);
    };

    update(event.clientX);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      update(moveEvent.clientX);
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      strip.releasePointerCapture(upEvent.pointerId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <div
      ref={stripRef}
      className="absolute bottom-2 left-2 right-2 h-12 cursor-crosshair select-none rounded-md border border-white/10 bg-black/50"
      onPointerDown={handlePointerDown}>
      <div className="absolute inset-0 rounded-md border border-white/10 bg-black/20" />
      <div
        className="absolute top-0 h-full rounded-sm border border-cyan-400/70 bg-cyan-400/10"
        style={{
          left: `${normalized.start * 100}%`,
          width: `${(normalized.end - normalized.start) * 100}%`,
        }}>
        <div className="absolute left-0 top-0 h-full w-1 bg-cyan-300" />
        <div className="absolute right-0 top-0 h-full w-1 bg-cyan-300" />
      </div>
    </div>
  );
};

export default RhythmSelectionStrip;
