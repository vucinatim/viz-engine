import useAudioStore from '@/lib/stores/audio-store';
import { AUDIO_THEME } from '@/lib/theme/audio-theme';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { useEffect, useRef } from 'react';

const VolumeFader = () => {
  const { gainNode, audioAnalyzer, audioContext, audioSource } =
    useAudioStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Toggle meter scale rendering on the left edge
  const SHOW_METER_SCALE = true;
  // RMS is in [0..1]. Full-scale sine RMS ≈ 0.707. Use 0.9 as clamp headroom.
  const MAX_RMS = 0.9;
  // Stereo analyzer refs
  const splitterRef = useRef<ChannelSplitterNode | null>(null);
  const leftAnalyzerRef = useRef<AnalyserNode | null>(null);
  const rightAnalyzerRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !audioAnalyzer || !gainNode) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Allocate time-domain buffers per channel and ballistics state
    let tdLeft = new Uint8Array(audioAnalyzer.fftSize);
    let tdRight = new Uint8Array(audioAnalyzer.fftSize);
    let tdMono = new Uint8Array(audioAnalyzer.fftSize);

    let smoothedL = 0; // EMA RMS left
    let smoothedR = 0; // EMA RMS right
    let peakHoldL = 0;
    let peakHoldR = 0;
    let lastTs =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    const tau = 0.3; // 300 ms integration constant
    const peakDecayPerSec = 1.2; // linear decay per second for peak hold

    const draw = () => {
      if (!ctx) {
        requestAnimationFrame(draw);
        return;
      }

      // Lazily set up per-channel analyzers once the source exists (no extra taps to destination)
      if (audioContext && audioSource.current && !splitterRef.current) {
        try {
          const splitter = audioContext.createChannelSplitter(2);
          const left = audioContext.createAnalyser();
          const right = audioContext.createAnalyser();
          left.fftSize = 2048;
          right.fftSize = 2048;
          audioSource.current.connect(splitter);
          splitter.connect(left, 0);
          splitter.connect(right, 1);
          splitterRef.current = splitter;
          leftAnalyzerRef.current = left;
          rightAnalyzerRef.current = right;
          tdLeft = new Uint8Array(left.fftSize);
          tdRight = new Uint8Array(right.fftSize);
        } catch {}
      }

      // Time since last frame
      const now =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      const dt = Math.max(0.0001, (now - lastTs) / 1000);
      lastTs = now;

      // Ensure device-pixel crispness by matching backing store to CSS size
      const dpr =
        typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      const targetW = Math.floor(width * dpr);
      const targetH = Math.floor(height * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      // Draw in CSS pixels; the transform maps to device pixels
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // We only draw rects/lines; disable smoothing for sharp edges
      (ctx as any).imageSmoothingEnabled = false;

      // Compute per-channel instantaneous RMS (fallback to mono if not ready)
      let instL = 0;
      let instR = 0;
      if (leftAnalyzerRef.current && rightAnalyzerRef.current) {
        const left = leftAnalyzerRef.current;
        const right = rightAnalyzerRef.current;
        left.getByteTimeDomainData(tdLeft);
        right.getByteTimeDomainData(tdRight);
        let sumL = 0;
        let sumR = 0;
        for (let i = 0; i < tdLeft.length; i++) {
          const v = (tdLeft[i] - 128) / 128; // [-1, 1]
          sumL += v * v;
        }
        for (let i = 0; i < tdRight.length; i++) {
          const v = (tdRight[i] - 128) / 128; // [-1, 1]
          sumR += v * v;
        }
        instL = Math.sqrt(sumL / tdLeft.length);
        instR = Math.sqrt(sumR / tdRight.length);
      } else {
        // Mono fallback using global analyzer
        audioAnalyzer.getByteTimeDomainData(tdMono);
        let sum = 0;
        for (let i = 0; i < tdMono.length; i++) {
          const v = (tdMono[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / tdMono.length);
        instL = rms;
        instR = rms;
      }

      // Exponential moving average toward inst RMS with 300ms time constant
      const alpha = 1 - Math.exp(-dt / tau);
      smoothedL = smoothedL + alpha * (instL - smoothedL);
      smoothedR = smoothedR + alpha * (instR - smoothedR);

      // Peak-hold with linear decay per channel
      peakHoldL = Math.max(
        instL,
        Math.max(0, peakHoldL - peakDecayPerSec * dt),
      );
      peakHoldR = Math.max(
        instR,
        Math.max(0, peakHoldR - peakDecayPerSec * dt),
      );

      const gain = Math.max(0, Math.min(1, gainNode.gain.value + 1));
      // Map to dB for visual alignment with the scale
      const DB_MIN = -30; // visible floor
      const ampL = Math.min(smoothedL / MAX_RMS, 1) * gain;
      const ampR = Math.min(smoothedR / MAX_RMS, 1) * gain;
      const dbL = 20 * Math.log10(Math.max(1e-6, ampL));
      const dbR = 20 * Math.log10(Math.max(1e-6, ampR));
      const tL = Math.max(0, Math.min(1, (dbL - DB_MIN) / (0 - DB_MIN)));
      const tR = Math.max(0, Math.min(1, (dbR - DB_MIN) / (0 - DB_MIN)));
      const barHeightL = tL * height;
      const barHeightR = tR * height;

      ctx.clearRect(0, 0, width, height); // Clear the canvas

      // Create gradients bottom (0) -> top (1) using left/right theme colors
      const gradientL = ctx.createLinearGradient(
        0,
        height,
        0,
        height - barHeightL,
      );
      gradientL.addColorStop(0, AUDIO_THEME.meter.left.start);
      gradientL.addColorStop(1, AUDIO_THEME.meter.left.end);

      const gradientR = ctx.createLinearGradient(
        0,
        height,
        0,
        height - barHeightR,
      );
      gradientR.addColorStop(0, AUDIO_THEME.meter.right.start);
      gradientR.addColorStop(1, AUDIO_THEME.meter.right.end);

      const barWidth = Math.max(
        4,
        Math.floor(width * AUDIO_THEME.meter.barWidthFraction),
      );

      // We'll overlay the scale AFTER drawing the bars, so no horizontal offset is needed
      const scaleWidth = 0;

      // Left bar
      ctx.fillStyle = gradientL;
      ctx.fillRect(0, height - barHeightL, barWidth, barHeightL);
      // Left peak line
      const peakAmpL = Math.min(peakHoldL / MAX_RMS, 1) * gain;
      const peakDbL = 20 * Math.log10(Math.max(1e-6, peakAmpL));
      const peakYL = Math.max(
        0,
        Math.min(
          height - 1,
          height - ((peakDbL - DB_MIN) / (0 - DB_MIN)) * height,
        ),
      );
      ctx.strokeStyle = AUDIO_THEME.meter.left.end;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, peakYL);
      ctx.lineTo(barWidth, peakYL);
      ctx.stroke();

      // Right bar
      ctx.fillStyle = gradientR;
      ctx.fillRect(width - barWidth, height - barHeightR, barWidth, barHeightR);
      // Right peak line
      const peakAmpR = Math.min(peakHoldR / MAX_RMS, 1) * gain;
      const peakDbR = 20 * Math.log10(Math.max(1e-6, peakAmpR));
      const peakYR = Math.max(
        0,
        Math.min(
          height - 1,
          height - ((peakDbR - DB_MIN) / (0 - DB_MIN)) * height,
        ),
      );
      ctx.strokeStyle = AUDIO_THEME.meter.right.end;
      ctx.beginPath();
      ctx.moveTo(width - barWidth, peakYR);
      ctx.lineTo(width, peakYR);
      ctx.stroke();

      // Overlay left-edge scale on top of bars
      if (SHOW_METER_SCALE) {
        // Distribute positions linearly in dB; show dense ticks but label only key marks
        const DB_MIN = -30;
        const majorTickDbs = [0, -3, -6, -9, -12, -18, -24, -30];
        const labelTickDbs = majorTickDbs; // same set, but collision-avoided below
        const minorDbTicks = [-1, -2, -4, -5, -7.5, -10.5, -15, -21, -27];
        const toY = (db: number) => {
          const t = (db - DB_MIN) / (0 - DB_MIN); // 0 at DB_MIN, 1 at 0 dB
          const y = height - t * height;
          return Math.max(6, Math.min(height - 6, y));
        };
        const labelSet = new Set(labelTickDbs);
        // Minor ticks
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 1;
        for (const db of minorDbTicks) {
          if (labelSet.has(db)) continue; // skip ticks where labels will be
          const y = toY(db);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(4, y);
          ctx.stroke();
        }
        // Major ticks
        ctx.strokeStyle = 'rgba(255,255,255,0.30)';
        for (const db of majorTickDbs) {
          if (labelSet.has(db)) continue; // skip tick at labeled positions
          const y = toY(db);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(6, y);
          ctx.stroke();
        }
        // Labels with simple collision avoidance
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = '8px ui-sans-serif, system-ui, -apple-system, Segoe UI';
        let lastLabelY = -Infinity;
        const minLabelSpacing = 11; // px
        for (const db of labelTickDbs) {
          const y = toY(db);
          if (y - lastLabelY < minLabelSpacing) continue;
          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,0.25)';
          ctx.shadowBlur = 1.5;
          ctx.fillText(`${db}`, 1, y);
          ctx.restore();
          lastLabelY = y;
        }
      }

      requestAnimationFrame(draw);
    };

    draw();
    return () => {
      try {
        if (splitterRef.current) splitterRef.current.disconnect();
        if (leftAnalyzerRef.current) leftAnalyzerRef.current.disconnect();
        if (rightAnalyzerRef.current) rightAnalyzerRef.current.disconnect();
      } catch {}
      splitterRef.current = null;
      leftAnalyzerRef.current = null;
      rightAnalyzerRef.current = null;
    };
  }, [audioAnalyzer, gainNode, audioContext, audioSource, SHOW_METER_SCALE]);

  useEffect(() => {
    if (!gainNode) return;
    gainNode.gain.value = 0; // Set the initial gain value
  }, [gainNode]);

  const handleVolumeChange = (value: number[]) => {
    if (!gainNode) return;
    gainNode.gain.value = value[0]; // Set gain based on slider input
  };

  return (
    <div className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        width={20}
        height={100}
        className="h-full w-full"
      />
      <SliderPrimitive.Root
        orientation="vertical"
        className="absolute inset-x-0 inset-y-4 flex cursor-pointer touch-none select-none items-center justify-center"
        defaultValue={[0]} // Default value as the middle of the slider
        onValueChange={handleVolumeChange}
        min={-1}
        max={0}
        step={0.01}>
        <SliderPrimitive.Track className="relative h-full w-2 overflow-hidden rounded-full">
          <div className="absolute inset-0 bg-zinc-700">
            <SliderPrimitive.Range className="absolute h-full bg-primary" />
          </div>
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-6 w-6 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
      </SliderPrimitive.Root>
    </div>
  );
};

export default VolumeFader;
