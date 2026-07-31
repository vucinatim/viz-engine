import editorControl from '@/lib/editor-control';
import useAudioEngineStore from '@/lib/stores/audio-engine-store';
import useEditorStore from '@/lib/stores/editor-store';
import { AUDIO_THEME } from '@/lib/theme/audio-theme';
import { getVizSessionState, vizSessionStore } from '@/lib/viz-session';
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
  onSeek?: (t: number) => void;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const width = useCanvasWidth(canvasRef);
  const audioElementRef = useAudioEngineStore((s) => s.audioElementRef);
  const visualTimeRef = useRef(getVizSessionState().audio.visualTime);
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
    const unsub = vizSessionStore.subscribe((state) => {
      visualTimeRef.current = state.audio.visualTime;
    });
    return () => unsub();
  }, []);

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

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!onSeek || duration <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const now = Math.max(0, visualTimeRef.current);
    const viewSpan = clamp(selectionDuration, 0.0001, 1);
    const followStart =
      duration > 0 ? clamp(now / duration - viewSpan / 2, 0, 1 - viewSpan) : 0;
    const viewStart = followPlayhead ? followStart : clamp(viewportStart, 0, 1);
    const viewEnd = followPlayhead
      ? viewStart + viewSpan
      : clamp(viewportEnd, viewStart + 0.0001, 1);
    const viewDuration = Math.max(0.0001, (viewEnd - viewStart) * duration);
    const viewStartTime = viewStart * duration;
    const t = Math.max(
      0,
      Math.min(duration, viewStartTime + (x / rect.width) * viewDuration),
    );
    onSeek(t);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!showHoverPlayhead) return;
    const rect = event.currentTarget.getBoundingClientRect();
    hoverXRef.current = event.clientX - rect.left;
    renderRef.current();
  };

  const handlePointerLeave = () => {
    if (!showHoverPlayhead) return;
    hoverXRef.current = null;
    renderRef.current();
  };

  return (
    <canvas
      ref={canvasRef}
      className="block h-full w-full"
      style={typeof height === 'number' ? { height } : undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
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
  const visualTimeRef = useRef(getVizSessionState().audio.visualTime);
  const rhythmSelection = useEditorStore((s) => s.rhythmSelection);
  const [viewMode, setViewMode] = useState<'static' | 'follow'>('static');
  const selectionOverlayRef = useRef<HTMLDivElement>(null);

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

  const viewStart = normalizedSelection.start;
  const viewEnd = viewStart + selectionDuration;

  useEffect(() => {
    const unsub = vizSessionStore.subscribe((state) => {
      visualTimeRef.current = state.audio.visualTime;
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
    strip.setPointerCapture(event.pointerId);
    const rect = strip.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const baseStart = normalizedSelection.start;
    const baseEnd = baseStart + selectionDuration;
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
        editorControl.ui.setRhythmSelection({
          start: newStart,
          end: endAtDrag,
        });
        return;
      }
      if (mode === 'right') {
        const newEnd = clamp(endAtDrag + delta, startAtDrag + MIN_SELECTION, 1);
        editorControl.ui.setRhythmSelection({
          start: startAtDrag,
          end: newEnd,
        });
        return;
      }
      if (mode === 'move') {
        const width = endAtDrag - startAtDrag;
        const newStart = clamp(startAtDrag + delta, 0, 1 - width);
        editorControl.ui.setRhythmSelection({
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
      editorControl.ui.setRhythmSelection({ start: newStart, end: newEnd });
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
    <div className="flex h-full min-h-0 flex-col gap-0">
      <div className="relative min-h-0 flex-1">
        <WaveformCanvas
          peaks={mainPeaks}
          duration={duration}
          peaksDuration={bufferDuration}
          progressColor={AUDIO_THEME.waveform.fallbackProgressColor}
          gradientStops={[...AUDIO_THEME.waveform.gradientStops]}
          viewportStart={viewStart}
          viewportEnd={viewEnd}
          followPlayhead={viewMode === 'follow'}
          selectionDuration={selectionDuration}
          amplitudeScale={MAIN_AMPLITUDE_SCALE}
          playheadColor="#ffffff"
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
            onSeek={handleSeek}
          />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0">
          <TimelineCanvas duration={duration} />
        </div>
        <div
          className="absolute inset-x-0 bottom-0 cursor-crosshair"
          style={{ height: TIMELINE_HEIGHT }}
          onPointerDown={handleSelectionPointerDown}>
          <div
            ref={selectionOverlayRef}
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
