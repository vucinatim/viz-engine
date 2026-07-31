import { audioPresentationClock } from '@/lib/audio-presentation-clock';
import editorControl from '@/lib/editor-control';
import {
  rhythmSelectionPresentation,
  type RhythmSelectionWindow,
} from '@/lib/rhythm-selection-presentation';
import useAudioEngineStore from '@/lib/stores/audio-engine-store';
import useEditorStore from '@/lib/stores/editor-store';
import { AUDIO_THEME } from '@/lib/theme/audio-theme';
import { workspaceResizeCoordinator } from '@/lib/workspace-resize-coordinator';
import { useEffect, useMemo, useRef, useState } from 'react';

const MINIMAP_HEIGHT = 28;
const TIMELINE_HEIGHT = 32;
const TIMELINE_GAP = 6;
const MAIN_AMPLITUDE_SCALE = 0.85;
const MINIMAP_AMPLITUDE_SCALE = 0.65;
const MIN_SELECTION = 0.04;
const HANDLE_PX = 8;

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const getTimelineStep = (duration: number) => {
  if (duration <= 60) return 10;
  if (duration <= 180) return 15;
  if (duration <= 600) return 30;
  if (duration <= 1800) return 60;
  return 120;
};

const useCanvasWidth = (ref: React.RefObject<HTMLCanvasElement>) => {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let nextWidth = 0;
    const publishWidth = () => setWidth(nextWidth);
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      nextWidth = Math.max(1, Math.floor(rect.width));
      workspaceResizeCoordinator.schedule(publishWidth);
    });
    observer.observe(canvas);
    return () => {
      workspaceResizeCoordinator.cancel(publishWidth);
      observer.disconnect();
    };
  }, [ref]);

  return width;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const drawWaveform = ({
  ctx,
  width,
  height,
  peaks,
  viewStart,
  viewEnd,
  progressX,
  gradientStops,
  progressColor,
  showPlayhead,
  hoverX,
  amplitudeScale,
  playheadColor,
}: {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  peaks: Float32Array;
  viewStart: number;
  viewEnd: number;
  progressX: number;
  gradientStops: { offset: number; color: string }[];
  progressColor: string;
  showPlayhead: boolean;
  hoverX: number | null;
  amplitudeScale: number;
  playheadColor: string;
}) => {
  ctx.clearRect(0, 0, width, height);

  if (peaks.length === 0) return;

  const mid = height / 2;
  const amp = mid * amplitudeScale;
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradientStops.forEach((stop) => {
    gradient.addColorStop(stop.offset, stop.color);
  });

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(0, mid);
  const len = peaks.length;
  const span = Math.max(1, (viewEnd - viewStart) * len);
  const start = viewStart * len;
  for (let x = 0; x < width; x += 1) {
    const idx = start + (x / Math.max(1, width - 1)) * span;
    const i0 = Math.max(0, Math.min(len - 1, Math.floor(idx)));
    const i1 = Math.min(len - 1, i0 + 1);
    const frac = idx - i0;
    const ampValue = peaks[i0] * (1 - frac) + peaks[i1] * frac;
    ctx.lineTo(x, mid - ampValue * amp);
  }
  for (let x = width - 1; x >= 0; x -= 1) {
    const idx = start + (x / Math.max(1, width - 1)) * span;
    const i0 = Math.max(0, Math.min(len - 1, Math.floor(idx)));
    const i1 = Math.min(len - 1, i0 + 1);
    const frac = idx - i0;
    const ampValue = peaks[i0] * (1 - frac) + peaks[i1] * frac;
    ctx.lineTo(x, mid + ampValue * amp);
  }
  ctx.closePath();
  ctx.fill();

  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = progressColor;
  ctx.fillRect(0, 0, progressX, height);
  ctx.restore();

  if (showPlayhead) {
    ctx.fillStyle = playheadColor;
    ctx.fillRect(Math.max(0, progressX - 0.5), 0, 1, height);
  }

  if (hoverX !== null) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(Math.max(0, hoverX - 0.5), 0, 1, height);
  }
};

const WaveformCanvas = ({
  peaks,
  duration,
  peaksDuration,
  height,
  progressColor,
  gradientStops,
  viewportStart = 0,
  viewportEnd = 1,
  followPlayhead = false,
  selectionDuration = 1,
  showPlayhead = true,
  showHoverPlayhead = true,
  amplitudeScale = 1,
  playheadColor = '#fff',
  ariaLabel = 'Audio position',
  followSelectionWindow = false,
  onSeek,
}: {
  peaks: Float32Array | null;
  duration: number;
  peaksDuration?: number;
  height?: number;
  progressColor: string;
  gradientStops: { offset: number; color: string }[];
  viewportStart?: number;
  viewportEnd?: number;
  followPlayhead?: boolean;
  selectionDuration?: number;
  showPlayhead?: boolean;
  showHoverPlayhead?: boolean;
  amplitudeScale?: number;
  playheadColor?: string;
  ariaLabel?: string;
  followSelectionWindow?: boolean;
  onSeek?: (t: number) => void;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const width = useCanvasWidth(canvasRef);
  const audioElementRef = useAudioEngineStore((s) => s.audioElementRef);
  const visualTimeRef = useRef(audioPresentationClock.getSnapshot().visualTime);
  const rafRef = useRef<number | null>(null);
  const hoverXRef = useRef<number | null>(null);
  const renderRef = useRef<() => void>(() => {});
  const loopRef = useRef<() => void>(() => {});
  const lastCssHeightRef = useRef(0);
  const widthRef = useRef(width);
  const peaksRef = useRef<Float32Array | null>(peaks);
  const durationRef = useRef(duration);
  const peaksDurationRef = useRef(peaksDuration);
  const viewportStartRef = useRef(viewportStart);
  const viewportEndRef = useRef(viewportEnd);
  const followPlayheadRef = useRef(followPlayhead);
  const selectionDurationRef = useRef(selectionDuration);
  const gradientStopsRef = useRef(gradientStops);
  const progressColorRef = useRef(progressColor);
  const showPlayheadRef = useRef(showPlayhead);
  const showHoverPlayheadRef = useRef(showHoverPlayhead);
  const amplitudeScaleRef = useRef(amplitudeScale);
  const playheadColorRef = useRef(playheadColor);

  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  useEffect(() => {
    peaksRef.current = peaks;
    durationRef.current = duration;
    peaksDurationRef.current = peaksDuration;
    viewportStartRef.current = viewportStart;
    viewportEndRef.current = viewportEnd;
    followPlayheadRef.current = followPlayhead;
    selectionDurationRef.current = selectionDuration;
    gradientStopsRef.current = gradientStops;
    progressColorRef.current = progressColor;
    showPlayheadRef.current = showPlayhead;
    showHoverPlayheadRef.current = showHoverPlayhead;
    amplitudeScaleRef.current = amplitudeScale;
    playheadColorRef.current = playheadColor;
    renderRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    amplitudeScale,
    duration,
    followPlayhead,
    gradientStops,
    peaks,
    playheadColor,
    progressColor,
    selectionDuration,
    showHoverPlayhead,
    showPlayhead,
    viewportEnd,
    viewportStart,
  ]);

  useEffect(() => {
    const unsub = audioPresentationClock.subscribe(
      ({ currentTime, visualTime }) => {
        visualTimeRef.current = visualTime;
        canvasRef.current?.setAttribute(
          'aria-valuenow',
          String(Math.min(durationRef.current, currentTime)),
        );
      },
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!followSelectionWindow) return;
    return rhythmSelectionPresentation.subscribe(({ start, end }) => {
      viewportStartRef.current = start;
      viewportEndRef.current = end;
      selectionDurationRef.current = end - start;
      renderRef.current();
    });
  }, [followSelectionWindow]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const cssHeight =
        typeof height === 'number'
          ? height
          : Math.max(1, Math.floor(rect.height));
      const dpr = window.devicePixelRatio || 1;
      const nextHeight = Math.max(1, Math.floor(cssHeight * dpr));
      const nextWidth = Math.max(1, Math.floor(widthRef.current * dpr));
      if (
        canvas.width !== nextWidth ||
        canvas.height !== nextHeight ||
        lastCssHeightRef.current !== cssHeight
      ) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
        canvas.style.height =
          typeof height === 'number' ? `${height}px` : '100%';
        canvas.style.width = '100%';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        lastCssHeightRef.current = cssHeight;
      }

      const now = Math.max(0, visualTimeRef.current);
      const durationNow = durationRef.current;
      const peaksDurationNow =
        peaksDurationRef.current && peaksDurationRef.current > 0
          ? peaksDurationRef.current
          : durationNow;
      const viewSpan = clamp(selectionDurationRef.current, 0.0001, 1);
      const followStart =
        durationNow > 0
          ? clamp(now / durationNow - viewSpan / 2, 0, 1 - viewSpan)
          : 0;
      const viewStart = followPlayheadRef.current
        ? followStart
        : clamp(viewportStartRef.current, 0, 1);
      const viewEnd = followPlayheadRef.current
        ? viewStart + viewSpan
        : clamp(viewportEndRef.current, viewStart + 0.0001, 1);
      const viewDuration = Math.max(
        0.0001,
        (viewEnd - viewStart) * durationNow,
      );
      const viewStartTime = viewStart * durationNow;
      const viewStartNorm =
        peaksDurationNow > 0 ? viewStartTime / peaksDurationNow : viewStart;
      const viewEndNorm =
        peaksDurationNow > 0
          ? (viewStartTime + viewDuration) / peaksDurationNow
          : viewEnd;
      const progressX =
        durationNow > 0
          ? Math.min(
              widthRef.current,
              Math.max(
                0,
                ((now - viewStartTime) / viewDuration) * widthRef.current,
              ),
            )
          : 0;

      drawWaveform({
        ctx,
        width: widthRef.current,
        height: typeof height === 'number' ? height : rect.height,
        peaks: peaksRef.current ?? new Float32Array(),
        viewStart: viewStartNorm,
        viewEnd: viewEndNorm,
        progressX,
        gradientStops: gradientStopsRef.current,
        progressColor: progressColorRef.current,
        showPlayhead: showPlayheadRef.current,
        hoverX: showHoverPlayheadRef.current ? hoverXRef.current : null,
        amplitudeScale: amplitudeScaleRef.current,
        playheadColor: playheadColorRef.current,
      });
    };
    renderRef.current = render;

    const loop = () => {
      render();
      const audio = audioElementRef.current;
      if (audio && !audio.paused) {
        rafRef.current = requestAnimationFrame(loop);
      } else {
        rafRef.current = null;
      }
    };
    loopRef.current = loop;

    render();
    const audio = audioElementRef.current;
    const handlePlay = () => {
      if (!rafRef.current) loop();
    };
    const handlePause = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      render();
    };
    const handleSeeked = () => render();

    audio?.addEventListener('play', handlePlay);
    audio?.addEventListener('pause', handlePause);
    audio?.addEventListener('seeked', handleSeeked);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      audio?.removeEventListener('play', handlePlay);
      audio?.removeEventListener('pause', handlePause);
      audio?.removeEventListener('seeked', handleSeeked);
    };
  }, [audioElementRef, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const render = () => renderRef.current();
    const observer = new ResizeObserver(() =>
      workspaceResizeCoordinator.schedule(render),
    );
    observer.observe(canvas);
    return () => {
      workspaceResizeCoordinator.cancel(render);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    renderRef.current();
    const audio = audioElementRef.current;
    if (audio && !audio.paused && !rafRef.current) {
      loopRef.current();
    }
  }, [audioElementRef, followPlayhead]);

  const seekFromClientX = (canvas: HTMLCanvasElement, clientX: number) => {
    const durationNow = durationRef.current;
    if (!onSeek || durationNow <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const now = Math.max(0, visualTimeRef.current);
    const viewSpan = clamp(selectionDurationRef.current, 0.0001, 1);
    const followStart =
      durationNow > 0
        ? clamp(now / durationNow - viewSpan / 2, 0, 1 - viewSpan)
        : 0;
    const viewStart = followPlayheadRef.current
      ? followStart
      : clamp(viewportStartRef.current, 0, 1);
    const viewEnd = followPlayheadRef.current
      ? viewStart + viewSpan
      : clamp(viewportEndRef.current, viewStart + 0.0001, 1);
    const viewDuration = Math.max(0.0001, (viewEnd - viewStart) * durationNow);
    const viewStartTime = viewStart * durationNow;
    const t = Math.max(
      0,
      Math.min(durationNow, viewStartTime + (x / rect.width) * viewDuration),
    );
    onSeek(t);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!onSeek) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    seekFromClientX(event.currentTarget, event.clientX);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      seekFromClientX(event.currentTarget, event.clientX);
    }

    if (!showHoverPlayhead) return;
    const rect = event.currentTarget.getBoundingClientRect();
    hoverXRef.current = event.clientX - rect.left;
    renderRef.current();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (!onSeek || duration <= 0) return;
    const currentTime = audioElementRef.current?.currentTime ?? 0;
    const step = event.shiftKey ? 5 : 1 / 30;
    if (event.key === 'ArrowLeft') onSeek(Math.max(0, currentTime - step));
    else if (event.key === 'ArrowRight')
      onSeek(Math.min(duration, currentTime + step));
    else if (event.key === 'Home') onSeek(0);
    else if (event.key === 'End') onSeek(duration);
    else return;
    event.preventDefault();
  };

  const handlePointerLeave = () => {
    if (!showHoverPlayhead) return;
    hoverXRef.current = null;
    renderRef.current();
  };

  return (
    <canvas
      ref={canvasRef}
      role="slider"
      tabIndex={onSeek ? 0 : undefined}
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={Math.min(
        duration,
        audioPresentationClock.getSnapshot().currentTime,
      )}
      className="block h-full w-full"
      style={typeof height === 'number' ? { height } : undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onKeyDown={handleKeyDown}
    />
  );
};

const TimelineCanvas = ({ duration }: { duration: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const width = useCanvasWidth(canvasRef);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !width || duration <= 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(TIMELINE_HEIGHT * dpr));
    canvas.style.height = `${TIMELINE_HEIGHT}px`;
    canvas.style.width = '100%';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, width, TIMELINE_HEIGHT);
    const step = getTimelineStep(duration);
    const minorStep = step / 2;

    const labelHeight = 16;
    for (let t = 0; t <= duration; t += minorStep) {
      const x = (t / duration) * width;
      const isMajor = t % step === 0;
      ctx.strokeStyle = isMajor
        ? 'rgba(255,255,255,0.35)'
        : 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(x) + 0.5, labelHeight + (isMajor ? 6 : 10));
      ctx.lineTo(Math.round(x) + 0.5, TIMELINE_HEIGHT);
      ctx.stroke();

      if (isMajor && t > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(formatTime(t), x, labelHeight);
      }
    }
  }, [duration, width]);

  return <canvas ref={canvasRef} className="block w-full" />;
};

const pickPeaksLevel = (levels: Float32Array[], desiredLength: number) => {
  if (levels.length === 0) return new Float32Array();
  let best = levels[0];
  let bestDiff = Math.abs(levels[0].length - desiredLength);
  for (let i = 1; i < levels.length; i += 1) {
    const diff = Math.abs(levels[i].length - desiredLength);
    if (diff < bestDiff) {
      best = levels[i];
      bestDiff = diff;
    }
  }
  return best;
};

const WaveformDisplay = ({
  peaksLevels,
  duration,
  bufferDuration,
  isLoading,
}: {
  peaksLevels: Float32Array[] | null;
  duration: number;
  bufferDuration: number;
  isLoading: boolean;
}) => {
  const visualTimeRef = useRef(audioPresentationClock.getSnapshot().visualTime);
  const rhythmSelection = useEditorStore((s) => s.rhythmSelection);
  const [viewMode, setViewMode] = useState<'static' | 'follow'>('static');
  const selectionOverlayRef = useRef<HTMLDivElement>(null);
  const wheelCommitRef = useRef<number | null>(null);

  const handleSeek = (t: number) => {
    editorControl.preview.seekToSeconds(t);
  };

  const minimapColors = useMemo(
    () => ({
      gradientStops: [...AUDIO_THEME.waveform.gradientStops],
      progressColor: AUDIO_THEME.waveform.minimap.progressColor,
    }),
    [],
  );

  const selectionDuration = useMemo(
    () => clamp(rhythmSelection.end - rhythmSelection.start, MIN_SELECTION, 1),
    [rhythmSelection.end, rhythmSelection.start],
  );
  const normalizedSelection = useMemo(() => {
    const start = clamp(rhythmSelection.start, 0, 1 - selectionDuration);
    return { start, end: start + selectionDuration };
  }, [rhythmSelection.start, selectionDuration]);
  const liveSelectionRef = useRef<RhythmSelectionWindow>(normalizedSelection);

  const viewStart = normalizedSelection.start;
  const viewEnd = viewStart + selectionDuration;

  const updateSelectionPresentation = (next: RhythmSelectionWindow) => {
    liveSelectionRef.current = next;
    rhythmSelectionPresentation.publish(next);
    const overlay = selectionOverlayRef.current;
    if (overlay) {
      overlay.style.left = `${next.start * 100}%`;
      overlay.style.width = `${(next.end - next.start) * 100}%`;
    }
  };

  const commitSelection = () => {
    const current = useEditorStore.getState().rhythmSelection;
    const next = liveSelectionRef.current;
    if (current.start === next.start && current.end === next.end) return;
    editorControl.ui.setRhythmSelection(next);
  };

  const transformSelection = (
    mode: 'zoom' | 'pan',
    amount: number,
    anchor = 0.5,
  ) => {
    const current = liveSelectionRef.current;
    const width = current.end - current.start;
    if (mode === 'pan') {
      const start = clamp(current.start + amount * width, 0, 1 - width);
      return { start, end: start + width };
    }
    const nextWidth = clamp(width * amount, MIN_SELECTION, 1);
    const anchorPosition = current.start + width * anchor;
    const start = clamp(anchorPosition - nextWidth * anchor, 0, 1 - nextWidth);
    return { start, end: start + nextWidth };
  };

  useEffect(() => {
    liveSelectionRef.current = normalizedSelection;
    rhythmSelectionPresentation.publish(normalizedSelection);
  }, [normalizedSelection]);

  useEffect(() => {
    const unsub = audioPresentationClock.subscribe(({ visualTime }) => {
      visualTimeRef.current = visualTime;
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const el = selectionOverlayRef.current;
    if (!el) return;
    el.style.width = `${selectionDuration * 100}%`;
    if (viewMode === 'follow') {
      let raf = 0;
      const tick = () => {
        const now = Math.max(0, visualTimeRef.current);
        const playheadNorm = duration > 0 ? now / duration : 0;
        const start = clamp(
          playheadNorm - selectionDuration / 2,
          0,
          1 - selectionDuration,
        );
        el.style.left = `${start * 100}%`;
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }
    el.style.left = `${viewStart * 100}%`;
  }, [duration, selectionDuration, viewMode, viewStart]);

  useEffect(
    () => () => {
      if (wheelCommitRef.current !== null) {
        window.clearTimeout(wheelCommitRef.current);
      }
    },
    [],
  );

  const handleSelectionWheel = (event: React.WheelEvent) => {
    if (event.deltaX === 0 && event.deltaY === 0) return;
    if (viewMode === 'follow') setViewMode('static');
    const rect = event.currentTarget.getBoundingClientRect();
    const anchor = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const isPan =
      event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY);
    const next = isPan
      ? transformSelection(
          'pan',
          clamp((event.deltaX || event.deltaY) / rect.width, -0.25, 0.25),
        )
      : transformSelection(
          'zoom',
          Math.exp(clamp(event.deltaY, -200, 200) * 0.0012),
          anchor,
        );
    updateSelectionPresentation(next);
    if (wheelCommitRef.current !== null) {
      window.clearTimeout(wheelCommitRef.current);
    }
    wheelCommitRef.current = window.setTimeout(() => {
      wheelCommitRef.current = null;
      commitSelection();
    }, 120);
  };

  const handleSelectionKeyDown = (event: React.KeyboardEvent) => {
    let next: RhythmSelectionWindow | null = null;
    if (event.key === 'ArrowLeft') next = transformSelection('pan', -0.1);
    else if (event.key === 'ArrowRight') next = transformSelection('pan', 0.1);
    else if (event.key === '+' || event.key === '=')
      next = transformSelection('zoom', 0.8);
    else if (event.key === '-') next = transformSelection('zoom', 1.25);
    else if (event.key === 'Home') {
      const width =
        liveSelectionRef.current.end - liveSelectionRef.current.start;
      next = { start: 0, end: width };
    } else if (event.key === 'End') {
      const width =
        liveSelectionRef.current.end - liveSelectionRef.current.start;
      next = { start: 1 - width, end: 1 };
    }
    if (!next) return;
    event.preventDefault();
    if (viewMode === 'follow') setViewMode('static');
    updateSelectionPresentation(next);
    commitSelection();
  };

  const mainPeaks = useMemo(() => {
    if (!peaksLevels || peaksLevels.length === 0) return null;
    const desiredBars = Math.max(
      256,
      Math.floor(selectionDuration > 0 ? 1200 : 800),
    );
    const target = desiredBars / Math.max(0.0001, viewEnd - viewStart);
    return pickPeaksLevel(peaksLevels, target);
  }, [peaksLevels, selectionDuration, viewEnd, viewStart]);

  const minimapPeaks = useMemo(() => {
    if (!peaksLevels || peaksLevels.length === 0) return null;
    return pickPeaksLevel(peaksLevels, 1024);
  }, [peaksLevels]);

  const handleSelectionPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    const strip = event.currentTarget;
    if (wheelCommitRef.current !== null) {
      window.clearTimeout(wheelCommitRef.current);
      wheelCommitRef.current = null;
      commitSelection();
    }
    strip.setPointerCapture(event.pointerId);
    const rect = strip.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const baseSelection = liveSelectionRef.current;
    const baseStart = baseSelection.start;
    const baseEnd = baseSelection.end;
    const selectionStartPx = baseStart * rect.width;
    const selectionEndPx = baseEnd * rect.width;

    let mode: 'left' | 'right' | 'move' | 'jump' = 'jump';
    if (Math.abs(pointerX - selectionStartPx) <= HANDLE_PX) {
      mode = 'left';
    } else if (Math.abs(pointerX - selectionEndPx) <= HANDLE_PX) {
      mode = 'right';
    } else if (pointerX > selectionStartPx && pointerX < selectionEndPx) {
      mode = 'move';
    }

    if (viewMode === 'follow' && (mode === 'move' || mode === 'jump')) {
      setViewMode('static');
    }

    const startAtDrag = baseStart;
    const endAtDrag = baseEnd;
    const startX = pointerX;

    const update = (clientX: number) => {
      const localX = clientX - rect.left;
      const delta = (localX - startX) / rect.width;

      if (mode === 'left') {
        const newStart = clamp(
          startAtDrag + delta,
          0,
          endAtDrag - MIN_SELECTION,
        );
        updateSelectionPresentation({
          start: newStart,
          end: endAtDrag,
        });
        return;
      }
      if (mode === 'right') {
        const newEnd = clamp(endAtDrag + delta, startAtDrag + MIN_SELECTION, 1);
        updateSelectionPresentation({
          start: startAtDrag,
          end: newEnd,
        });
        return;
      }
      if (mode === 'move') {
        const width = endAtDrag - startAtDrag;
        const newStart = clamp(startAtDrag + delta, 0, 1 - width);
        updateSelectionPresentation({
          start: newStart,
          end: newStart + width,
        });
        return;
      }

      const width = endAtDrag - startAtDrag;
      const center = localX / rect.width;
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
      updateSelectionPresentation({ start: newStart, end: newEnd });
    };

    update(event.clientX);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== event.pointerId) return;
      update(moveEvent.clientX);
    };

    const finishPointerGesture = (pointerId: number, commit: boolean) => {
      if (pointerId !== event.pointerId) return;
      if (strip.hasPointerCapture(pointerId)) {
        strip.releasePointerCapture(pointerId);
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      if (commit) commitSelection();
      else updateSelectionPresentation(baseSelection);
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      finishPointerGesture(upEvent.pointerId, true);
    };

    const handlePointerCancel = (cancelEvent: PointerEvent) => {
      finishPointerGesture(cancelEvent.pointerId, false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-0">
      <div className="relative min-h-0 flex-1" onWheel={handleSelectionWheel}>
        <WaveformCanvas
          peaks={mainPeaks}
          duration={duration}
          peaksDuration={bufferDuration}
          progressColor={AUDIO_THEME.waveform.fallbackProgressColor}
          gradientStops={[...AUDIO_THEME.waveform.gradientStops]}
          viewportStart={viewStart}
          viewportEnd={viewEnd}
          followPlayhead={viewMode === 'follow'}
          followSelectionWindow
          selectionDuration={selectionDuration}
          amplitudeScale={MAIN_AMPLITUDE_SCALE}
          playheadColor="#ffffff"
          ariaLabel="Waveform position"
          onSeek={handleSeek}
        />
        <button
          type="button"
          onClick={() =>
            setViewMode((mode) => (mode === 'static' ? 'follow' : 'static'))
          }
          className="absolute top-2 right-2 rounded-md border border-white/20 bg-black/50 px-2 py-1 text-[10px] tracking-wide text-white/70 uppercase hover:text-white">
          {viewMode === 'follow' ? 'Follow' : 'Static'}
        </button>
        {isLoading && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-white/60">
            Loading waveform...
          </div>
        )}
      </div>
      <div
        className="relative"
        onWheel={handleSelectionWheel}
        style={{ height: MINIMAP_HEIGHT + TIMELINE_HEIGHT + TIMELINE_GAP }}>
        <div className="absolute inset-x-0 top-0">
          <WaveformCanvas
            peaks={minimapPeaks}
            duration={duration}
            peaksDuration={bufferDuration}
            height={MINIMAP_HEIGHT}
            progressColor={minimapColors.progressColor}
            gradientStops={minimapColors.gradientStops}
            showPlayhead
            showHoverPlayhead={false}
            amplitudeScale={MINIMAP_AMPLITUDE_SCALE}
            playheadColor="#ffffff"
            ariaLabel="Track overview position"
            onSeek={handleSeek}
          />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0">
          <TimelineCanvas duration={duration} />
        </div>
        <div
          role="group"
          aria-label="Waveform view window"
          aria-keyshortcuts="ArrowLeft ArrowRight + - Home End"
          data-testid="waveform-view-window"
          tabIndex={0}
          className="absolute inset-x-0 bottom-0 cursor-crosshair"
          style={{ height: TIMELINE_HEIGHT }}
          onKeyDown={handleSelectionKeyDown}
          onPointerDown={handleSelectionPointerDown}>
          <div
            ref={selectionOverlayRef}
            data-testid="waveform-selection-window"
            className="absolute bottom-0 h-full rounded-sm border border-cyan-400/70 bg-cyan-400/10"
            style={{
              width: `${selectionDuration * 100}%`,
            }}>
            <div className="absolute top-0 left-0 h-full w-1 bg-cyan-300" />
            <div className="absolute top-0 right-0 h-full w-1 bg-cyan-300" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaveformDisplay;
